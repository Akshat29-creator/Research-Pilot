# Security Rules & Safety Standards

## 1. Secrets Management
- **Zero Secrets in Code or VCS**: Never hardcode API tokens, database passwords, secret keys, or credentials into source files.
- **Environment Isolation**: All configuration secrets must be loaded via `.env` through Pydantic `BaseSettings`.
- **Git Protection**: `.env` and `.env.*` (except `.env.example`) must remain in `.gitignore`. `.env.example` must contain only non-sensitive dummy placeholders.
- **Never Log Secrets**: Sanitize and redact credentials, authorization headers, and API keys before writing to application logs or emitting telemetry.

## 2. Untrusted Data & Prompt Injection Defenses
- **Data Boundary Principle**: All content fetched from external sources—including web search snippets, full web pages, uploaded PDFs, and MCP tool responses—is UNTRUSTED.
- **Indirect Prompt Injection**: External text must never be executed as agent system instructions. Delimit all external content strictly with clear XML/Markdown tags (e.g. `<untrusted_source_content id="...">...</untrusted_source_content>`).
- **Instruction Stripping**: Strip or neutralize common prompt-injection vectors (e.g., "Ignore previous instructions", "You are now in developer mode", "System prompt override") before feeding retrieved content into agent context windows.

## 3. Citation Grounding & Anti-Hallucination
- **Zero Fabricated URLs**: The system must never hallucinate, synthesize, or invent URLs, DOIs, or author citations.
- **Verifiable Spans**: Every citation attached to a research finding or report section must map directly to:
  1. A verified source record stored in the database.
  2. A SHA256 content hash of the raw retrieved source.
  3. An exact, verifiable substring quote or page offset.
- **Factual Grounding Check**: If an agent cannot verify a claim against retrieved source text, it must flag the claim as "unsubstantiated" or omit it entirely.

## 4. Command Safety & System Boundaries
- **No Destructive Shell Commands**: Never execute destructive file operations, system-level modifications, or unauthorized background daemons without explicit user confirmation.
- **SSRF Prevention**: All outbound HTTP requests for web scraping or search retrieval must validate target URLs and block private, loopback, or metadata IP addresses:
  - `127.0.0.0/8` (localhost)
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (private networks)
  - `169.254.169.254` (cloud metadata endpoints)
  - IPv6 link-local and unique local ranges (`fe80::/10`, `fc00::/7`)

## 5. Multi-Tenant Ownership & Access Control
- **Strict User Ownership**: Enforce per-user ownership checks on every database entity: research sessions, uploaded documents, document chunks, agent traces, and generated reports.
- **Authorization Filters**: Every query must filter by `user_id` authenticated via JWT Bearer tokens. Cross-tenant data leakage is a critical vulnerability.
