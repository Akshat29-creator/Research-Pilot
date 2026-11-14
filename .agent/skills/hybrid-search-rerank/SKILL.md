---
name: hybrid-search-rerank
description: Procedures for implementing PostgreSQL full-text search (tsvector/GIN) combined with pgvector, Reciprocal Rank Fusion (RRF), and VRAM-aware reranking.
---

# Hybrid Search & Reranking Skill

## When to Use
Use when implementing or tuning hybrid retrieval algorithms, combining PostgreSQL full-text search with vector embeddings, implementing Reciprocal Rank Fusion (RRF), or evaluating reranking models within GPU VRAM limits.

## Retrieval Strategy Comparison
- **Vector-Only Search**: Excels at semantic similarity and conceptual matches, but struggles with exact keyword precision, acronyms, product names, or code identifiers.
- **Full-Text Keyword Search (BM25 / tsvector)**: Excels at exact term matching and rare keywords, but ignores synonyms and semantic paraphrasing.
- **Hybrid Search (Vector + Full-Text via RRF)**: Combines strengths of both, producing balanced candidate sets with higher recall.
- **Reranking**: Scores the combined top candidate set using a cross-encoder or local LLM prompt to push the most faithful evidence chunks to the top.

## Step-by-Step Procedure

### 1. PostgreSQL Full-Text Search Schema
- Add a generated `tsvector` column and GIN index to `document_chunks`:
  ```sql
  ALTER TABLE document_chunks
  ADD COLUMN content_tsvector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

  CREATE INDEX IF NOT EXISTS idx_document_chunks_content_tsvector_gin
  ON document_chunks USING gin (content_tsvector);
  ```

### 2. Reciprocal Rank Fusion (RRF) Implementation
- Fetch top-$K$ candidates from pgvector and top-$K$ candidates from full-text search:
  ```python
  def reciprocal_rank_fusion(
      vector_results: List[SearchResult],
      text_results: List[SearchResult],
      k: int = 60
  ) -> List[ScoredChunk]:
      scores: Dict[str, float] = defaultdict(float)
      chunks: Dict[str, SearchResult] = {}

      for rank, item in enumerate(vector_results):
          scores[item.chunk_id] += 1.0 / (k + rank + 1)
          chunks[item.chunk_id] = item

      for rank, item in enumerate(text_results):
          scores[item.chunk_id] += 1.0 / (k + rank + 1)
          chunks[item.chunk_id] = item

      sorted_chunks = sorted(
          chunks.keys(),
          key=lambda cid: scores[cid],
          reverse=True
      )
      return [chunks[cid] for cid in sorted_chunks]
  ```

### 3. VRAM-Safe Reranking
- In a local environment with 8GB VRAM (RTX 5060), running an active LLM alongside a separate heavy cross-encoder model can cause VRAM thrashing.
- Options:
  1. **Configurable / Disableable**: Reranking must be toggleable via environment variable (`ENABLE_RERANKER=true|false`).
  2. **Lightweight Model**: If using cross-encoder, use an ultra-compact CPU-runnable model (e.g. `cross-encoder/ms-marco-MiniLM-L-6-v2` on CPU) or a zero-shot LLM prompt pass using the already-loaded Ollama model.

### 4. Mandatory Empirical Benchmark
- Evaluate the same 25-50 query dataset across three configurations:
  1. Vector-only retrieval.
  2. Hybrid search (pgvector + tsvector via RRF).
  3. Hybrid search + Reranking.
- Measure: Context Recall@5, Context Precision@5, Retrieval Latency (ms).
- Never claim retrieval improvements without presenting real comparative numbers.

## Verification Checklist
- [ ] GIN index created on `content_tsvector` in PostgreSQL.
- [ ] RRF algorithm properly weights vector and full-text ranks.
- [ ] Reranker can be disabled cleanly via configuration without code changes.
- [ ] Retrieval interface remains consistent across all search modes.
- [ ] Empirical comparison benchmarks recorded in `docs/HYBRID_SEARCH.md`.

## Common Mistakes to Avoid
- **GPU OOM from Simultaneous Models**: Loading a large cross-encoder directly into GPU VRAM while Ollama is running, causing an out-of-memory crash.
- **Unindexed tsvector Queries**: Running `to_tsvector()` on the fly during queries without a persisted column and GIN index.
- **Ignoring Stopwords and Language Dictionaries**: Using raw string matching instead of language-aware stemming and tokenization in PostgreSQL.
- **Claiming Superiority Without Numbers**: Writing that "hybrid is better" without empirical benchmark metrics.
