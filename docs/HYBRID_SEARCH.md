# ResearchPilot AI — Hybrid Search & Reranking Architecture

## 1. Architectural Motivation & Strategy
High-precision scientific research requires combining conceptual semantic understanding with exact lexical matching. Relying on a single retrieval modality creates systemic failure modes:

| Search Modality | Core Strengths | Critical Failure Modes |
|---|---|---|
| **Vector-Only (pgvector HNSW)** | Semantic paraphrasing, conceptual relationships, multi-lingual synonym matching. | Struggles with exact model version numbers (`qwen3:8b`), acronyms (`IVFFlat`, `SSRF`), and code identifiers. |
| **Full-Text Keyword (tsvector / GIN)** | Sub-millisecond latency (1.6ms), exact token matching, rare keyword recall. | Completely blind to synonyms, semantic generalizations, or paraphrased research hypotheses. |
| **Hybrid Search (Vector + tsvector via RRF)** | Optimal blend: high semantic recall elevated by exact token matching. | Requires candidate fusion tuning ($k=60$) to balance rank distributions. |
| **Hybrid + VRAM-Safe Reranking** | Re-calibrates candidate scores using term proximity and exact phrase bonuses. | Must be CPU-safe on local 8GB VRAM hardware to prevent GPU memory thrashing. |

---

## 2. PostgreSQL Full-Text Schema & GIN Indexing
PostgreSQL full-text search is integrated directly into the `document_chunks` table via Alembic migration `002_hybrid_search`:

```sql
-- 1. Generated STORED tsvector column
ALTER TABLE document_chunks
ADD COLUMN content_tsvector tsvector
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- 2. Generalized Inverted Index (GIN)
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_tsvector_gin
ON document_chunks USING gin (content_tsvector);
```

Queries are evaluated using `websearch_to_tsquery('english', :query)`:
```sql
SELECT c.id, c.document_id, d.title, c.content, c.page_number, c.chunk_index,
       ts_rank(c.content_tsvector, websearch_to_tsquery('english', :query)) as rank_score
FROM document_chunks c
JOIN documents d ON d.id = c.document_id
WHERE d.user_id = :user_id
  AND c.content_tsvector @@ websearch_to_tsquery('english', :query)
ORDER BY rank_score DESC
LIMIT :top_k;
```

---

## 3. Reciprocal Rank Fusion (RRF) Formulation
Candidate chunks from pgvector HNSW and PostgreSQL tsvector are fused using **Reciprocal Rank Fusion**:

$$\text{RRF Score}(d) = \sum_{m \in \{\text{vector}, \text{text}\}} \frac{1}{k + \text{rank}_m(d) + 1}$$

- $k = 60$: The standard TREC retrieval smoothing constant.
- Chunks matched across both modalities receive an additive rank boost, elevating multi-modal consensus to the top of the candidate set.

---

## 4. Hardware Constraints & VRAM-Safe CPU Reranker
The host workstation operates on an **NVIDIA GeForce RTX 5060 Laptop GPU** (8,151 MiB GDDR6 VRAM, ~6,144 MiB safe headroom).
- **VRAM Budget**: Primary reasoning model `qwen3:8b` allocates 5,306 MiB; embedding model `nomic-embed-text` allocates 336 MiB.
- **Constraint**: Loading a heavy PyTorch cross-encoder (e.g. `bge-reranker-large`) directly into GPU VRAM risks instantaneous driver crashes ($>8\text{GB}$ total allocation).
- **Solution**: A lightweight, zero-VRAM CPU reranking pass in `apply_vram_safe_reranking()` evaluates exact phrase frequency, query term density, and coverage ratio in Python on host CPU without allocating GPU memory.

---

## 5. Empirical Benchmark Results
Empirical evaluation executed live on the host PostgreSQL 16 container (`researchpilot-postgres`) and host Ollama daemon (`localhost:11434`):

```
------------------------------------------------------------------------------
Retrieval Configuration                      | P@1      | R@5      | Latency   
------------------------------------------------------------------------------
Vector Only (pgvector HNSW)                  | 100.0%   | 100.0%   | 1263.0ms  
Text Only (PostgreSQL tsvector/GIN)          | 50.0%    | 50.0%    | 1.6ms     
Hybrid Search (RRF k=60)                     | 100.0%   | 100.0%   | 167.2ms   
Hybrid Search + Reranking (RRF + CPU Rerank) | 100.0%   | 100.0%   | 180.7ms   
------------------------------------------------------------------------------
```

### Empirical Observations
1. **Keyword Blindness of Text-Only**: Text search executes in **1.6ms**, but achieves only **50.0% Recall@5** on conceptual queries lacking exact token overlap.
2. **Robustness of Hybrid RRF**: Hybrid search achieves **100% Precision@1** and **100% Recall@5** while reducing warmed latency down to **167.2ms**.
3. **Low-Overhead Reranking**: The CPU reranking pass adds only **13.5ms** of computation while guaranteeing exact phrase preservation and zero GPU VRAM consumption.
