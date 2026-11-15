from prometheus_client import Counter, Gauge, Histogram

# Histograms
RESEARCH_WORKFLOW_DURATION = Histogram(
    "research_workflow_duration_seconds",
    "Total runtime of multi-agent research workflow in seconds",
    buckets=[1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0],
)

AGENT_NODE_DURATION = Histogram(
    "agent_node_duration_seconds",
    "Execution duration of individual agent nodes in seconds",
    ["node_name"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
)

REVIEWER_GROUNDING_SCORE = Histogram(
    "reviewer_grounding_score",
    "Adversarial fact-checking factual grounding score (0.0 - 1.0)",
    buckets=[0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0],
)

# Counters
LLM_TOKEN_COUNT = Counter(
    "llm_token_count_total",
    "Cumulative count of processed LLM tokens",
    ["model", "type"],
)

REVIEWER_VERDICT_COUNT = Counter(
    "reviewer_verdict_total",
    "Reviewer verdict outcomes (pass vs revision)",
    ["verdict"],
)

# Gauges
ACTIVE_RESEARCH_JOBS = Gauge(
    "active_research_jobs",
    "Number of currently executing research workflows",
)

GPU_VRAM_USED_BYTES = Gauge(
    "gpu_vram_used_bytes",
    "Reported GPU VRAM usage in bytes",
    ["device"],
)

CONCURRENCY_WAITING_GAUGE = Gauge(
    "concurrency_waiting_gauge",
    "Number of inference requests currently queued waiting for GPU slot",
)
