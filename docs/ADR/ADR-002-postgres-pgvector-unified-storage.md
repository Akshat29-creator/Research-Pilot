# ADR-002: Unified Persistence with PostgreSQL and pgvector

## Status
Accepted

## Context & Problem Statement
The application requires storing relational entities (users, sessions, reports, sources), time-series/audit logs (agent runs, token usage), workflow checkpoints (LangGraph state), and high-dimensional semantic embeddings (768d vectors from `nomic-embed-text`) with low-latency similarity search.

Using separate specialized databases (e.g. PostgreSQL for relational + Pinecone/Chroma/Qdrant for vectors) introduces:
- Dual-database synchronization issues.
- Complex distributed transactions.
- Cloud dependencies and privacy compromises (in the case of managed SaaS vector DBs).
- Increased operational and container overhead on a local development workstation.

## Considered Options
1. **PostgreSQL 16 with pgvector extension (Selected)**
2. **PostgreSQL + ChromaDB**
3. **PostgreSQL + Qdrant**
4. **SQLite + sqlite-vec**

## Decision Outcome
Chosen option: **PostgreSQL 16 with pgvector**, because:
- **Unified ACID Store**: Vector embeddings, document chunks, relational sessions, and user accounts reside in the same transactional boundary.
- **HNSW Indexing**: High-performance approximate nearest neighbor search (`vector_cosine_ops`) with configurable `m` and `ef_construction` parameters.
- **Hybrid Retrieval Synergy**: Enables querying vector similarity and BM25 full-text search (`tsvector` + GIN) on the exact same row in a single query.
- **Strict Multi-Tenancy**: Standard SQL `WHERE user_id = :id` filters enforce tenant isolation across both relational and vector queries without complex metadata filtering layers.

## Consequences
- **Positive**:
  - One database container to manage, backup, and monitor.
  - Zero synchronization lag between relational source records and vector embeddings.
  - Seamless integration with Alembic for all schema migrations.
- **Negative / Trade-offs**:
  - For extremely large corpora (> 10 million vectors), specialized distributed vector engines can offer higher indexing throughput, but for ResearchPilot's document and session scales, pgvector is significantly more than sufficient.
