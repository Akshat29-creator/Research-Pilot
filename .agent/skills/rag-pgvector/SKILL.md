---
name: rag-pgvector
description: Implementation standards for retrieval-augmented generation using PostgreSQL pgvector, HNSW indexing, chunking strategies, embeddings via Ollama nomic-embed-text (768 dimensions), metadata filtering, citation verification, and retrieval evaluation.
---

# RAG & pgvector Engineering Skill

## When to Use
Use when implementing document ingestion, text splitting/chunking, embedding generation, vector database schema, HNSW indexing, similarity queries, citation quote verification, and retrieval accuracy evaluations.

## Vector Architecture
- **Embedding Model**: `nomic-embed-text` via Ollama (768 dimensions).
- **Storage**: PostgreSQL with `pgvector` extension enabled (`CREATE EXTENSION IF NOT EXISTS vector;`).
- **Index Type**: HNSW (Hierarchical Navigable Small World) with cosine distance (`vector_cosine_ops`).
- **Schema Mapping**:
  - `documents`: Document-level metadata, user ID, source type, raw file hash (SHA256).
  - `document_chunks`: Chunk content, chunk index, page number, token count, embedding vector (`vector(768)`).

## Step-by-Step Procedure

### 1. Ingestion & Content Deduplication
- Compute SHA256 hash of incoming raw file or webpage content before processing.
- Check existing `documents` table by `(user_id, content_hash)`. If match exists, skip re-embedding to save compute.

### 2. Chunking Strategy
- Split text using recursive token/character splitters:
  - Target chunk size: 500-800 tokens (~2000-3200 characters).
  - Chunk overlap: 100-150 tokens (~400-600 characters).
  - Retain structural boundaries: preserve paragraph breaks and PDF page numbers.
- Tag every chunk with metadata: `{ "source_id": uuid, "page_number": int, "char_offset": int }`.

### 3. Embedding Generation
- Call Ollama embedding endpoint (`POST /api/embeddings`) in batches.
- Handle model unload / VRAM safety: perform embedding operations sequentially or during dedicated ingestion phases.

### 4. pgvector HNSW Indexing
- In Alembic migration:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```

### 5. Semantic Retrieval & Filtering
- Always enforce tenant isolation:
  ```sql
  SELECT c.id, c.content, c.page_number, c.source_id,
         1 - (c.embedding <=> :query_vector) AS similarity
  FROM document_chunks c
  JOIN documents d ON d.id = c.document_id
  WHERE d.user_id = :current_user_id
    AND 1 - (c.embedding <=> :query_vector) >= :min_similarity_threshold
  ORDER BY c.embedding <=> :query_vector
  LIMIT :top_k;
  ```
- Default `min_similarity_threshold = 0.65`, `top_k = 5`.

### 6. Citation Grounding & Verification
- When an agent generates a report claim citing a source, run an exact substring / fuzzy match check against the stored chunk text.
- If the cited quote does not exist in the source chunks, fail citation validation and demand correction.

## Verification Checklist
- [ ] pgvector extension loaded in PostgreSQL container and Alembic migration.
- [ ] Embedding dimensionality exactly 768 to match `nomic-embed-text`.
- [ ] HNSW index created with `vector_cosine_ops`.
- [ ] All vector queries enforce `WHERE user_id = :user_id`.
- [ ] Deduplication hash checks prevent redundant embedding.
- [ ] Citation verifier confirms cited text exists in stored raw source.

## Common Mistakes to Avoid
- **Dimension Mismatch**: Creating a `vector(1536)` column while embedding with `nomic-embed-text` (768 dimensions), causing fatal insert errors.
- **Missing Index on Production**: Performing linear sequential vector scans (`<=>` without HNSW or IVFFlat), causing query latency to explode as chunk counts grow.
- **OOM During Large PDF Ingestion**: Reading multi-megabyte PDFs entirely into memory and embedding hundreds of chunks concurrently. Process in small sequential batches.
- **Leaking Chunks Across Tenants**: Forgetting the `JOIN documents d WHERE d.user_id = ...` filter in the vector similarity query.
