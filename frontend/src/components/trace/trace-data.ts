export interface TraceSpan {
  id: string;
  name: string;
  agent: "orchestrator" | "research" | "analysis" | "writer" | "reviewer" | "system";
  kind: "agent" | "tool" | "gate";
  parentSpanId?: string;
  startTimeMs: number;
  durationMs: number;
  status: "completed" | "running" | "failed" | "retried";
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
    tokPerSec?: number;
  };
  model?: string;
  retries?: number;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  attributes: Record<string, unknown>;
}

export interface TraceExecution {
  executionId: string;
  sessionId: string;
  query: string;
  totalDurationMs: number;
  totalTokens: number;
  incurredCost: string;
  hardwareDevice: string;
  startTime: string;
  endTime: string;
  spans: TraceSpan[];
}

export const SAMPLE_TRACE: TraceExecution = {
  executionId: "exec_01JBM8Z9Q4K8X32P",
  sessionId: "sess_01JBM8",
  query: "Empirical memory scaling and recall tradeoffs between HNSW and IVFFlat in pgvector on PostgreSQL 16",
  totalDurationMs: 4810,
  totalTokens: 2840,
  incurredCost: "$0.00 (Local RTX 5060)",
  hardwareDevice: "NVIDIA GeForce RTX 5060 Laptop (8GB VRAM)",
  startTime: "2026-11-14T19:42:01.104Z",
  endTime: "2026-11-14T19:42:05.914Z",
  spans: [
    {
      id: "span_orch_01",
      name: "orchestrator.plan_decomposition",
      agent: "orchestrator",
      kind: "agent",
      startTimeMs: 0,
      durationMs: 412,
      status: "completed",
      tokens: { prompt: 210, completion: 85, total: 295, tokPerSec: 34.2 },
      model: "qwen3:8b Q4_K_M",
      inputPayload: {
        raw_query: "Empirical memory scaling and recall tradeoffs between HNSW and IVFFlat in pgvector on PostgreSQL 16",
        max_subgoals: 3,
        temperature: 0.1,
      },
      outputPayload: {
        subgoals: [
          "HNSW memory footprint scaling O(N*M) vs IVFFlat inverted lists",
          "Recall@10 distributions under varying ef_construction and nprobe",
          "PostgreSQL 16 shared_buffers sizing constraints under concurrent queries",
        ],
        planner_verdict: "Decomposition complete, dispatching evidence retrieval",
      },
      attributes: {
        "otel.library.name": "researchpilot.orchestrator",
        "concurrency.semaphore": "acquired",
        "gpu.vram_used_mb": 5210,
      },
    },
    {
      id: "span_tool_searxng_01",
      name: "tool.searxng.query",
      agent: "research",
      kind: "tool",
      parentSpanId: "span_research_01",
      startTimeMs: 420,
      durationMs: 780,
      status: "completed",
      inputPayload: {
        query: "pgvector hnsw vs ivfflat memory overhead benchmark postgresql 16",
        engines: ["duckduckgo", "google_scholar", "arxiv"],
        max_results: 20,
      },
      outputPayload: {
        raw_hits: 14,
        deduped: 4,
        top_domains: ["arxiv.org", "github.com/pgvector", "postgresql.org"],
        avg_credibility: 0.89,
      },
      attributes: {
        "http.url": "http://127.0.0.1:8080/search",
        "http.status_code": 200,
        "searxng.container": "researchpilot-searxng:latest",
        "network.transport": "docker_bridge",
      },
    },
    {
      id: "span_tool_pgvector_01",
      name: "tool.pgvector.hybrid_similarity_search",
      agent: "research",
      kind: "tool",
      parentSpanId: "span_research_01",
      startTimeMs: 1210,
      durationMs: 390,
      status: "completed",
      inputPayload: {
        vector_dim: 768,
        distance_metric: "cosine",
        similarity_threshold: 0.78,
        limit: 10,
      },
      outputPayload: {
        matched_chunks: 6,
        top_chunk_id: "chk_arxiv_2407_10983_p7",
        min_cosine_distance: 0.142,
      },
      attributes: {
        "db.system": "postgresql",
        "db.name": "researchpilot",
        "db.statement": "SELECT * FROM document_chunks ORDER BY embedding <=> $1 LIMIT 10;",
        "index.type": "HNSW (m=16, ef_construction=64)",
      },
    },
    {
      id: "span_research_01",
      name: "research.evidence_ingestion",
      agent: "research",
      kind: "agent",
      startTimeMs: 415,
      durationMs: 1220,
      status: "completed",
      tokens: { prompt: 580, completion: 320, total: 900, tokPerSec: 36.8 },
      model: "qwen3:8b Q4_K_M",
      inputPayload: {
        target_subgoals: 3,
        retrieval_strategy: "hybrid_searxng_pgvector",
      },
      outputPayload: {
        verified_sources_count: 6,
        filtered_duplicates: 4,
        primary_academic_doi: "10.48550/arXiv.2407.10983",
      },
      attributes: {
        "evidence.count": 6,
        "concurrency.semaphore": "acquired",
      },
    },
    {
      id: "span_analysis_01",
      name: "analysis.contradiction_resolution",
      agent: "analysis",
      kind: "agent",
      startTimeMs: 1640,
      durationMs: 890,
      status: "completed",
      tokens: { prompt: 440, completion: 180, total: 620, tokPerSec: 37.5 },
      model: "qwen3:8b Q4_K_M",
      inputPayload: {
        claims: [
          { source: "pgvector docs", statement: "HNSW build memory scales with maintenance_work_mem" },
          { source: "EDB benchmark", statement: "pgvector 0.5.0 reduced index footprint by 40% via halfvec" },
        ],
      },
      outputPayload: {
        contradictions_found: 1,
        resolved: true,
        resolution_rationale: "Discrepancy resolved: pgvector 0.5.0+ halfvec halves RAM, while 0.7.0 adds parallel builds.",
      },
      attributes: {
        "analysis.cross_encoder": "qwen3:8b",
        "validation.p_value": "< 0.01",
      },
    },
    {
      id: "span_writer_01",
      name: "writer.synthesize_report_sections",
      agent: "writer",
      kind: "agent",
      startTimeMs: 2540,
      durationMs: 1420,
      status: "completed",
      tokens: { prompt: 780, completion: 540, total: 1320, tokPerSec: 38.1 },
      model: "qwen3:8b Q4_K_M",
      inputPayload: {
        sections: [
          "1. Executive Summary",
          "2. Index Architecture Comparison (HNSW vs IVFFlat)",
          "3. Empirical Latency & Memory Footprint",
          "4. PostgreSQL 16 Sizing Recommendations",
        ],
        citations_required: true,
      },
      outputPayload: {
        draft_markdown_bytes: 8420,
        inline_citations_count: 12,
        unsupported_claims_self_check: 0,
      },
      attributes: {
        "format": "github_markdown",
        "writer.iteration": 1,
      },
    },
    {
      id: "span_reviewer_01",
      name: "reviewer.adversarial_citation_gate",
      agent: "reviewer",
      kind: "agent",
      startTimeMs: 3970,
      durationMs: 490,
      status: "completed",
      tokens: { prompt: 360, completion: 110, total: 470, tokPerSec: 35.0 },
      model: "qwen3:8b Q4_K_M",
      inputPayload: {
        draft_sections: 4,
        citations_to_audit: 12,
      },
      outputPayload: {
        verified_citations: 11,
        flagged_extrapolations: 1,
        flagged_claim: "IVFFlat recall degrades exponentially when dataset exceeds maintenance_work_mem by more than 4x.",
        verdict: "AWAITING_HUMAN_APPROVAL",
      },
      attributes: {
        "adversarial.grounding_score": 0.916,
        "pause_for_human": true,
      },
    },
    {
      id: "span_gate_approval",
      name: "human_gate.interactive_checkpoint",
      agent: "system",
      kind: "gate",
      startTimeMs: 4470,
      durationMs: 340,
      status: "completed",
      inputPayload: {
        decision: "APPROVED_BY_USER",
        user_identity: "pilot@researchpilot.com",
        loop_iteration: 1,
      },
      outputPayload: {
        action: "PROCEED_TO_FINAL_ASSEMBLY",
      },
      attributes: {
        "gate.type": "human_in_the_loop",
        "gate.timeout_seconds": 3600,
      },
    },
  ],
};
