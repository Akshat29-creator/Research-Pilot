export interface IngestedChunk {
  id: string;
  chunkIndex: number;
  pageNumber: number;
  tokenCount: number;
  textSnippet: string;
  vectorId: string;
}

export interface IngestedDocument {
  id: string;
  fileName: string;
  title: string;
  author?: string;
  doi?: string;
  fileSizeBytes: number;
  pageCount: number;
  chunkCount: number;
  status: "indexed" | "processing" | "failed";
  progressPct?: number;
  currentStage?: string;
  embeddingModel: string;
  vectorDimensions: number;
  createdAt: string;
  chunks: IngestedChunk[];
}

export const SAMPLE_DOCUMENTS: IngestedDocument[] = [
  {
    id: "doc_01JBM_ARXIV",
    fileName: "2407.10983v1.pdf",
    title: "Empirical Evaluation of Vector Index Algorithms in Relational Databases",
    author: "Zhang, L., & Mehta, A. (MIT CSAIL)",
    doi: "10.48550/arXiv.2407.10983",
    fileSizeBytes: 2450000, // 2.45 MB
    pageCount: 18,
    chunkCount: 42,
    status: "indexed",
    embeddingModel: "nomic-embed-text",
    vectorDimensions: 768,
    createdAt: "2026-11-14T18:22:10Z",
    chunks: [
      {
        id: "chk_01_p1",
        chunkIndex: 1,
        pageNumber: 1,
        tokenCount: 412,
        textSnippet: "We evaluate HNSW and IVFFlat across 1M 768-dimensional vectors in PostgreSQL 16 pgvector. HNSW achieves 98.4% recall@10 with 2.8ms p95 latency at the cost of 1.82GB memory.",
        vectorId: "vec_01_hnsw_001",
      },
      {
        id: "chk_02_p7",
        chunkIndex: 2,
        pageNumber: 7,
        tokenCount: 480,
        textSnippet: "Buffer pool contention analysis reveals that multi-layer graph traversals in HNSW trigger pseudo-random 8KB disk reads when total index footprint exceeds shared_buffers by more than 1.5x.",
        vectorId: "vec_01_hnsw_007",
      },
      {
        id: "chk_03_p14",
        chunkIndex: 3,
        pageNumber: 14,
        tokenCount: 395,
        textSnippet: "IVFFlat clustering maintains an inverted index with 1,000 centroid lists. Build memory scales with maintenance_work_mem, but probe latency grows linearly with nprobe.",
        vectorId: "vec_01_ivf_014",
      },
    ],
  },
  {
    id: "doc_02JBM_PGVEC",
    fileName: "pgvector-v0.7.0-reference.pdf",
    title: "pgvector: Open-Source Vector Similarity Search Technical Architecture",
    author: "pgvector Core Team",
    fileSizeBytes: 890000, // 890 KB
    pageCount: 12,
    chunkCount: 28,
    status: "indexed",
    embeddingModel: "nomic-embed-text",
    vectorDimensions: 768,
    createdAt: "2026-11-14T18:25:40Z",
    chunks: [
      {
        id: "chk_04_p1",
        chunkIndex: 1,
        pageNumber: 1,
        tokenCount: 380,
        textSnippet: "pgvector 0.7.0 introduces parallel HNSW index builds and halfvec (16-bit float) storage, reducing memory consumption by 50% while preserving cosine distance accuracy.",
        vectorId: "vec_02_pgv_001",
      },
    ],
  },
  {
    id: "doc_03JBM_EDB",
    fileName: "edb-scaling-vector-ann.pdf",
    title: "Scaling Approximate Nearest Neighbor Queries with pgvector and EnterpriseDB",
    author: "EnterpriseDB Research",
    fileSizeBytes: 1420000, // 1.42 MB
    pageCount: 14,
    chunkCount: 34,
    status: "indexed",
    embeddingModel: "nomic-embed-text",
    vectorDimensions: 768,
    createdAt: "2026-11-14T18:30:15Z",
    chunks: [
      {
        id: "chk_05_p5",
        chunkIndex: 1,
        pageNumber: 5,
        tokenCount: 460,
        textSnippet: "Benchmarking 100 concurrent clients executing HNSW queries: sizing shared_buffers to 4GB eliminates IO wait bottlenecks, capping p99 tail latency under 12ms.",
        vectorId: "vec_03_edb_005",
      },
    ],
  },
  {
    id: "doc_04JBM_QWEN",
    fileName: "qwen2.5-technical-report.pdf",
    title: "Qwen2.5 Technical Report: Dense & Sparse Architectures on Edge Hardware",
    author: "Qwen Team, Alibaba Cloud",
    fileSizeBytes: 4100000, // 4.1 MB
    pageCount: 32,
    chunkCount: 68,
    status: "indexed",
    embeddingModel: "nomic-embed-text",
    vectorDimensions: 768,
    createdAt: "2026-11-14T18:45:00Z",
    chunks: [
      {
        id: "chk_06_p12",
        chunkIndex: 1,
        pageNumber: 12,
        tokenCount: 512,
        textSnippet: "Quantization analysis of Qwen2.5 7B and 8B models indicates less than 0.8% perplexity degradation when compressed to 4-bit AWQ and GGUF Q4_K_M formats.",
        vectorId: "vec_04_qwen_012",
      },
    ],
  },
];
