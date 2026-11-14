# Research Agent & Search Provider Specification

## 1. Overview & Responsibility
The Research Agent is the primary information-gathering engine in ResearchPilot AI. Given research sub-queries formulated by the Orchestrator, it:
1. Queries search providers to discover authoritative web sources.
2. Fetches web pages with strict SSRF validation and extracts clean main-text content.
3. Retrieves relevant passages from local uploaded PDFs stored in `document_chunks`.
4. Deduplicates sources using URL canonicalization and SHA256 content hashing.
5. Emits structured evidence records with source IDs and exact excerpts.

---

## 2. Search Provider Architecture

```mermaid
flowchart TD
    Agent["Research Agent"] --> Interface["SearchProvider (Abstract Interface)"]
    Interface -->|Default (Local, Free)| SearXNG["SearXNGProvider (Container: searxng:8080)"]
    Interface -->|Optional (Paid Key)| Tavily["TavilySearchProvider (api.tavily.com)"]
    Interface -->|Optional (Paid Key)| Brave["BraveSearchProvider (api.search.brave.com)"]

    SearXNG --> Web["Metasearch: DuckDuckGo, Wikipedia, Google, Bing, Qwant"]
```

### Provider Selection via Environment
- `SEARCH_PROVIDER=searxng` (Default): Uses the local SearXNG container in Docker Compose. No API key required.
- `SEARCH_PROVIDER=tavily` (Optional): Enabled when `TAVILY_API_KEY` is provided.
- `SEARCH_PROVIDER=brave` (Optional): Enabled when `BRAVE_API_KEY` is provided.

---

## 3. SearXNG: Operational Characteristics & Limitations

### 3.1 Advantages
- **100% Free & Self-Hosted**: Runs entirely in a local Docker container (`searxng/searxng:latest`) alongside Postgres and Redis.
- **Privacy Respecting**: Does not track queries, set profiling cookies, or log user IP addresses.
- **Aggregated Coverage**: Queries multiple search engines concurrently (DuckDuckGo, Wikipedia, Qwant, Brave, Startpage).

### 3.2 Known Limitations & Mitigation Strategies

| Limitation | Impact | Architectural Mitigation in ResearchPilot AI |
|---|---|---|
| **Upstream Bot Detection & CAPTCHAs** | Public search engines (Google, Bing) frequently block or CAPTCHA repeated automated requests from datacenter/residential IPs. | Enable engine failover in `searxng/settings.yml` (prioritize bot-tolerant engines like DuckDuckGo, Wikipedia, Qwant, and Wikidata; disable fragile scraping engines). |
| **Response Latency Variances** | Aggregating results across 5+ external engines can take 2.0s to 5.0s depending on upstream response times. | Enforce per-engine timeouts in SearXNG configuration (e.g. 2.5s) and async connection pooling in `SearXNGSearchProvider`. |
| **HTML Scraping Brittleness** | If an upstream engine changes its DOM layout, SearXNG parser updates may lag. | Rely on robust JSON APIs and Wikipedia/DuckDuckGo backends. The Research Agent deduplicates results across multiple queries. |
| **Snippet Quality & Brevity** | SearXNG returns short search snippets (100-250 characters) rather than complete answers. | The Research Agent does not rely solely on snippets: it actively visits candidate URLs to extract full-text content via `trafilatura` / `readability`. |

---

## 4. Content Extraction & Deduplication Pipeline

1. **URL Canonicalization**:
   - Strip tracking parameters (`utm_*`, `ref`, `fbclid`, `gclid`).
   - Normalize protocols and lowercase domain names.
2. **SSRF Guardrail**:
   - Target URL hostnames are resolved to IP addresses before initiating HTTP GET.
   - Connections to private, loopback, or link-local ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`) are aborted immediately.
3. **Main Content Extraction**:
   - Web pages: Cleaned via `trafilatura` to extract clean Markdown/text, discarding headers, navbars, and advertisements.
   - PDFs: Parsed page-by-page via `PyMuPDF` (`fitz`), preserving 1-based page indices.
4. **Content Deduplication**:
   - Compute SHA256 hash of extracted text. Discard duplicate pages across multiple queries.

---

## 5. Untrusted Data Boundary & Anti-Injection
Retrieved text is wrapped inside explicit delimiters before insertion into LLM prompts:
```markdown
<untrusted_source_document id="src_01" domain="example.org" title="Research Paper">
[Extracted page content]
</untrusted_source_document>
```
System prompts explicitly forbid following any instructions found within `<untrusted_source_document>` tags.
