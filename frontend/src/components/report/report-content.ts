import { CitationData } from "@/components/ui/citation-chip";
import { SourceCardData } from "@/components/ui/source-card";

export interface ReportSection {
  id: string;
  title: string;
  level: number;
}

export const REPORT_SECTIONS: ReportSection[] = [
  { id: "executive-summary", title: "Executive Summary", level: 2 },
  { id: "problem-scope", title: "1. Problem Formulation & Scope", level: 2 },
  { id: "architectural-comparison", title: "2. Vector Index Architectures", level: 2 },
  { id: "memory-scaling", title: "3. Empirical Memory Footprint", level: 2 },
  { id: "concurrency-buffers", title: "4. Shared Buffer Contention", level: 2 },
  { id: "recommendations", title: "5. Production Sizing Guide", level: 2 },
  { id: "audit-verdict", title: "6. Verification & Grounding Audit", level: 2 },
  { id: "references", title: "7. References & Citations", level: 2 },
];

export const REPORT_CITATIONS: Record<number, CitationData> = {
  1: {
    index: 1,
    title: "pgvector: Open-source vector similarity search for Postgres (v0.7.0)",
    url: "https://github.com/pgvector/pgvector",
    excerpt: "HNSW indexes support L2 distance, inner product, and cosine distance. Build memory requirements scale with max_parallel_maintenance_workers and maintenance_work_mem.",
    credibilityScore: 0.96,
    page: 1,
  },
  2: {
    index: 2,
    title: "Empirical Evaluation of Vector Index Algorithms in Relational Databases",
    url: "https://arxiv.org/abs/2407.10983",
    excerpt: "Comparing HNSW vs IVFFlat on 1M 768-d vectors: HNSW achieves 98.4% recall@10 with 2.8ms latency, but incurs 1.8GB index footprint compared to 240MB for IVFFlat.",
    credibilityScore: 0.98,
    page: 7,
  },
  3: {
    index: 3,
    title: "PostgreSQL 16 Shared Buffer Allocation & High-Concurrency Vector Query Contention",
    url: "https://www.postgresql.org/docs/16/runtime-config-resource.html",
    excerpt: "Shared buffers hold shared memory blocks for tables and indexes. When vector index graph traversal exceeds shared_buffers, random disk reads dominate query p99 latency.",
    credibilityScore: 0.99,
    page: 42,
  },
  4: {
    index: 4,
    title: "Benchmark Analysis: pgvector HNSW Tuning (M=16, ef_construction=64)",
    url: "https://jkatz05.com/post/postgres-vector-hnsw-tuning",
    excerpt: "Higher M values increase recall at the cost of larger index sizes and longer build times. M=16 provides the optimal sweet spot for 768-dimension embeddings.",
    credibilityScore: 0.88,
    page: 2,
  },
  5: {
    index: 5,
    title: "Scaling Approximate Nearest Neighbor Queries with pgvector and EDB",
    url: "https://www.enterprisedb.com/blog/scaling-pgvector-hnsw-benchmarks",
    excerpt: "PostgreSQL 16's improved parallel index builds accelerate HNSW construction by 3.2x when maintenance_work_mem is sized to 4GB.",
    credibilityScore: 0.92,
    page: 5,
  },
};

export const INITIAL_REPORT_MARKDOWN = `# Empirical Memory Scaling and Recall Tradeoffs Between HNSW and IVFFlat in pgvector on PostgreSQL 16

## Executive Summary
This technical investigation delivers an empirical comparative evaluation of **Hierarchical Navigable Small World (HNSW)** versus **Inverted File Flat (IVFFlat)** indexing algorithms in \`pgvector\` on PostgreSQL 16. Using a benchmark corpus of 1,000,000 768-dimensional embeddings, we evaluate memory consumption, index build duration, query latency percentiles, and cache locality under concurrent transaction workloads.

Key takeaways:
- **Index Footprint**: HNSW consumes **1.82 GB** (~7.6x larger than IVFFlat at **240 MB**) for $10^6$ 768-d vectors with $M=16$.
- **Recall & Latency**: HNSW achieves **98.4% recall@10** at **2.8ms p95 latency**, whereas IVFFlat requires probing $nprobe \ge 24$ to exceed 85% recall, causing latency degradation to **14.2ms**.
- **Buffer Cache Sizing**: When HNSW index graphs exceed \`shared_buffers\`, p99 latency degrades by up to 12x due to random NVMe read IOPS during neighbor graph traversals.

---

## 1. Problem Formulation & Scope
Modern autonomous agent architectures and retrieval-augmented generation (RAG) pipelines rely on vector databases to serve low-latency nearest neighbor queries over dense semantic embeddings. PostgreSQL 16, equipped with the \`pgvector\` extension, offers an enterprise-grade hybrid storage solution combining ACID relational guarantees with vector indexing.

However, database engineers face a critical dilemma when provisioning local hardware: **HNSW graph traversal vs. IVFFlat inverted cell clustering**. Choosing incorrectly leads to excessive RAM consumption, Out-Of-Memory (OOM) killer invocations, or severe query degradation under concurrent query loads.

---

## 2. Vector Index Architectures
### HNSW (Hierarchical Navigable Small World)
HNSW constructs a multi-layer graph where lower layers contain high-density link topologies and upper layers contain long-range skip links. Query routing executes greedy best-first traversal from top to bottom.
- **Parameters**: $M=16$ (bidirectional links per node), $ef\\_construction=64$ (size of the dynamic candidate list during build).
- **Index Complexity**: Memory complexity scales as $\\mathcal{O}(N \\cdot M \\cdot d)$, requiring continuous random pointer lookups.

### IVFFlat (Inverted File Flat)
IVFFlat partitions the vector space into $k$ Voronoi cells using $k$-means clustering. During query execution, only vectors belonging to the $nprobe$ closest centroids are scanned.
- **Parameters**: $lists=1000$, $nprobe=10$.
- **Index Complexity**: Memory overhead is negligible ($\mathcal{O}(k \cdot d)$ centroids plus contiguous vector arrays).

---

## 3. Empirical Memory Footprint
Our empirical benchmarks measured index creation memory and resident set size (RSS) across varying corpus sizes (100k, 500k, 1M vectors):

| Metric | IVFFlat ($lists=1000$) | HNSW ($M=16, ef=64$) | Delta Factor |
| :--- | :--- | :--- | :--- |
| **Index Size (1M 768-d)** | 240 MB | 1,820 MB | +7.58x |
| **Index Build Time** | 42 seconds | 184 seconds | +4.38x |
| **Build RAM (\`maintenance_work_mem\`)** | 512 MB | 2,048 MB | +4.00x |
| **Recall@10** | 84.6% | 98.4% | +13.8% |
| **Query Latency (p95)** | 14.2 ms | 2.8 ms | -80.3% |

As observed in academic evaluations, HNSW retains superior recall fidelity across all dimensional distributions, but incurs an unavoidable RAM penalty that must be budgeted for in hardware provisioning.

---

## 4. Shared Buffer Contention
PostgreSQL uses \`shared_buffers\` to cache active relational pages. In high-concurrency environments:
1. **IVFFlat Sequential Reads**: Scans over selected centroid lists exhibit high sequential read locality, fitting cleanly into the Linux page cache.
2. **HNSW Random Graph Pointer Reads**: Multi-layer graph traversal performs semi-random 8KB buffer accesses. If the HNSW index exceeds available \`shared_buffers\`, kernel disk reads dominate query p99 latency, causing tail latencies to spike from 3ms to 38ms.

---

## 5. Production Sizing Guide
For production deployments on local or dedicated hardware:
1. **Rule of Thumb for RAM**: Size dedicated PostgreSQL memory to at least **1.5x the combined HNSW index footprint** plus table data:
   $$\\text{RAM}_{\\min} \\ge 1.5 \\times \\left( N \\times d \\times 4\\,\\text{bytes} + N \\times M \\times 8\\,\\text{bytes} \\right)$$
2. **PostgreSQL Configuration**:
   - \`shared_buffers = 4GB\` (minimum for 1M vectors)
   - \`maintenance_work_mem = 2GB\` (accelerates parallel HNSW construction)
   - \`max_parallel_maintenance_workers = 4\`

---

## 6. Verification & Grounding Audit
- **Grounding Audit Score**: **91.6%**
- **Supported Claims**: 11 / 12
- **Adversarial Gate Verdict**: APPROVED
- **Reviewer Note**: One theoretical claim regarding exponential IVFFlat recall degradation was reviewed and confirmed as acceptable domain extrapolation by human operator \`pilot@researchpilot.com\`.

---

## 7. References & Citations
1. [1] pgvector Core Contributors, *pgvector: Open-source vector similarity search for Postgres*, v0.7.0.
2. [2] Zhang, L., & Mehta, A. (MIT CSAIL), *Empirical Evaluation of Vector Index Algorithms in Relational Databases*, arXiv:2407.10983v1, 2024.
3. [3] PostgreSQL Global Development Group, *PostgreSQL 16 Documentation: Resource Consumption & Shared Buffers*, 2023.
4. [4] Jonathan Katz, *Benchmark Analysis: pgvector HNSW Tuning*, 2023.
5. [5] EnterpriseDB Research, *Scaling Approximate Nearest Neighbor Queries with pgvector*, 2024.
`;
