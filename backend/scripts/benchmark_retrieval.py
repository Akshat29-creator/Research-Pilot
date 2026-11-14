import asyncio
import time
import uuid
from typing import Dict, List, Tuple

from app.database.session import async_session_factory
from app.models.user import User
from app.services.hybrid_search_service import (
    full_text_search,
    hybrid_search,
)
from app.services.ingestion_service import ingest_document
from app.services.retrieval_service import semantic_search

# Corpus of technical documents for empirical retrieval evaluation
CORPUS = [
    {
        "id": "doc_hnsw",
        "title": "Hierarchical Navigable Small World (HNSW) Graphs in pgvector",
        "content": (
            "HNSW creates a multi-layer graph where lower layers contain links between "
            "vector embeddings. In pgvector, HNSW is constructed with m=16 and "
            "ef_construction=64 using vector_cosine_ops for cosine similarity. "
            "It achieves logarithmic O(log N) search latency."
        ),
    },
    {
        "id": "doc_ivfflat",
        "title": "Inverted File Flat (IVFFlat) Indexing Architecture",
        "content": (
            "IVFFlat partitions the high-dimensional vector space into Voronoi cells using "
            "k-means clustering. While faster to build than HNSW graphs, IVFFlat requires "
            "periodic retraining as data distribution drifts, and delivers lower recall."
        ),
    },
    {
        "id": "doc_hardware",
        "title": "Lenovo Legion Pro 5 RTX 5060 Workstation Specification",
        "content": (
            "The hardware configuration features an AMD Ryzen 7 8745HX 8-core processor, "
            "32GB DDR5 system RAM, and an NVIDIA GeForce RTX 5060 Laptop GPU with 8,151 MiB "
            "GDDR6 VRAM. A global asyncio Semaphore(1) guards against parallel over-allocation."
        ),
    },
    {
        "id": "doc_embeddings",
        "title": "Vector Embeddings via Ollama nomic-embed-text",
        "content": (
            "The nomic-embed-text model generates 768-dimensional normalized float vectors. "
            "Operating under Ollama, it occupies approximately 274 MiB of GPU VRAM with low "
            "latency, making it ideal for co-location with reasoning models like Qwen-3-8B."
        ),
    },
    {
        "id": "doc_isolation",
        "title": "Prompt Isolation and SSRF Defense Architecture",
        "content": (
            "Untrusted web text retrieved by SearXNG is sanitized by defanging closing XML "
            "tags, ChatML tokens (<|im_start|>), and LLM control sequences. SSRF validation "
            "verifies DNS resolution and blocks private subnets and metadata (169.254.169.254)."
        ),
    },
]

# Benchmark queries paired with their ground-truth relevant document IDs
EVAL_QUERIES: List[Tuple[str, str]] = [
    ("logarithmic nearest neighbor search complexity", "doc_hnsw"),
    ("IVFFlat Voronoi cells clustering", "doc_ivfflat"),
    ("RTX 5060 Laptop GPU VRAM allocation", "doc_hardware"),
    ("nomic-embed-text 768-dimensional vectors", "doc_embeddings"),
    ("SSRF validation cloud metadata blocking 169.254.169.254", "doc_isolation"),
    ("pgvector vector_cosine_ops m=16 ef_construction=64", "doc_hnsw"),
    ("k-means vector space partitioning retraining", "doc_ivfflat"),
    ("asyncio Semaphore concurrency guard against OOM", "doc_hardware"),
    ("Ollama embedding co-location with Qwen 8B", "doc_embeddings"),
    ("defanging ChatML tokens prompt injection defense", "doc_isolation"),
]


async def run_benchmark():
    async with async_session_factory() as db:
        test_user = User(
            id=uuid.uuid4(),
            email=f"bench_{uuid.uuid4().hex[:8]}@example.com",
            hashed_password="bench_password",
            is_active=True,
        )
        db.add(test_user)
        await db.commit()

        print("Ingesting evaluation corpus into PostgreSQL + pgvector...")
        doc_id_map: Dict[str, uuid.UUID] = {}
        for doc in CORPUS:
            res = await ingest_document(
                db=db,
                user_id=test_user.id,
                title=doc["title"],
                content=doc["content"],
            )
            doc_id_map[doc["id"]] = res.document_id

        print(f"Ingested {len(CORPUS)} documents successfully.\n")

        modes = [
            ("Vector Only (pgvector HNSW)", "vector"),
            ("Text Only (PostgreSQL tsvector/GIN)", "text"),
            ("Hybrid Search (RRF k=60)", "hybrid"),
            ("Hybrid Search + Reranking (RRF + CPU Rerank)", "hybrid_rerank"),
        ]

        results_table: List[Dict[str, float | str]] = []

        for mode_name, mode_key in modes:
            latencies: List[float] = []
            hits_at_1 = 0
            hits_at_5 = 0

            for query, target_doc_key in EVAL_QUERIES:
                target_doc_id = doc_id_map[target_doc_key]
                t0 = time.perf_counter()

                if mode_key == "vector":
                    hits = await semantic_search(
                        db=db, user_id=test_user.id, query=query, top_k=5, min_similarity=0.20
                    )
                    hit_doc_ids = [h.document_id for h in hits]
                elif mode_key == "text":
                    text_hits = await full_text_search(
                        db=db, user_id=test_user.id, query=query, top_k=5
                    )
                    hit_doc_ids = [h.document_id for h in text_hits]
                elif mode_key == "hybrid":
                    h_hits = await hybrid_search(
                        db=db,
                        user_id=test_user.id,
                        query=query,
                        top_k=5,
                        min_similarity=0.20,
                        rerank=False,
                    )
                    hit_doc_ids = [h.document_id for h in h_hits]
                else:  # hybrid_rerank
                    hr_hits = await hybrid_search(
                        db=db,
                        user_id=test_user.id,
                        query=query,
                        top_k=5,
                        min_similarity=0.20,
                        rerank=True,
                    )
                    hit_doc_ids = [h.document_id for h in hr_hits]

                elapsed = (time.perf_counter() - t0) * 1000
                latencies.append(elapsed)

                if hit_doc_ids and hit_doc_ids[0] == target_doc_id:
                    hits_at_1 += 1
                if target_doc_id in hit_doc_ids[:5]:
                    hits_at_5 += 1

            total_q = len(EVAL_QUERIES)
            avg_latency = sum(latencies) / len(latencies)
            precision_at_1 = hits_at_1 / total_q
            recall_at_5 = hits_at_5 / total_q

            results_table.append(
                {
                    "mode": mode_name,
                    "precision_at_1": precision_at_1,
                    "recall_at_5": recall_at_5,
                    "avg_latency_ms": avg_latency,
                }
            )

        # Cleanup
        await db.delete(test_user)
        await db.commit()

        print("-" * 78)
        print(f"{'Retrieval Configuration':<44} | {'P@1':<8} | {'R@5':<8} | {'Latency':<10}")
        print("-" * 78)
        for r in results_table:
            p1 = f"{r['precision_at_1']:.1%}"
            r5 = f"{r['recall_at_5']:.1%}"
            lat = f"{r['avg_latency_ms']:.1f}ms"
            print(f"{r['mode']:<44} | {p1:<8} | {r5:<8} | {lat:<10}")
        print("-" * 78)


if __name__ == "__main__":
    asyncio.run(run_benchmark())
