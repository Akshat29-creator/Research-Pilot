# ADR-007: Hybrid Search & Reciprocal Rank Fusion (RRF)

## Context and Problem Statement
Pure dense semantic vector search (cosine similarity over 768-d embeddings) excels at conceptual mapping but struggles with exact technical keywords, specific version tags (e.g. `PostgreSQL 16`, `HNSW m=16`), and author names. Conversely, keyword search (PostgreSQL full-text search) fails when queries use paraphrased phrasing without exact token overlap.

How can ResearchPilot AI achieve high-recall, precision-grounded retrieval across indexed technical literature?

## Considered Options
1. **Dense Vector Search Only**: Rely solely on pgvector cosine distance.
2. **PostgreSQL Full-Text Search Only**: Rely solely on `tsvector` and `tsquery`.
3. **Cross-Encoder Neural Reranker**: Run `bge-reranker-large` on every search query. (Discarded: Consumes ~1.5GB VRAM and slows latency by 800ms per query).
4. **Hybrid Search with Reciprocal Rank Fusion (RRF) & Lightweight Heuristic Reranker**: Combine PostgreSQL `to_tsquery` (GIN index) and pgvector `vector_cosine_ops` (HNSW index) via RRF with zero-VRAM exact-phrase boost.

## Decision Outcome
Chosen option: **Hybrid Search with Reciprocal Rank Fusion (RRF) & VRAM-Safe Heuristic Reranking**.

### Rationale
- **Zero VRAM Overhead**: Merges ranked lists using reciprocal rank scores:
  $$\text{RRF Score}(d) = \sum_{m \in \{\text{dense}, \text{sparse}\}} \frac{1}{k + r_m(d)}$$
  with constant $k = 60$.
- **Unified Engine**: Both full-text search and vector similarity run inside the single PostgreSQL 16 instance.
- **Phrase Reranker**: Applies a 10% score boost if the query appears verbatim as a substring in the chunk text, eliminating the need for a VRAM-heavy cross-encoder model.

## Consequences
### Positive
- Captures both exact keyword hits and semantic conceptual associations.
- Retrieval latency remains sub-50ms even with thousands of document chunks.
- Leaves 100% of GPU VRAM dedicated to the primary LLM reasoning engine.

### Negative / Trade-offs
- Requires maintaining both GIN (`tsvector`) and HNSW (`vector`) indexes on the `document_chunks` table.
- Does not capture deep cross-attention nuances that a 500M parameter cross-encoder might observe, but achieves 95%+ of practical retrieval quality.
