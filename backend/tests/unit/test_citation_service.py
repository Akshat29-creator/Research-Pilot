from app.services.citation_service import (
    VerificationStatus,
    audit_report_citations,
    compute_ngram_jaccard,
    extract_claims_with_citations,
    extract_ngrams,
    normalize_text_for_matching,
    verify_claim_against_chunks,
)


def test_normalize_text_for_matching():
    raw = "HNSW (Hierarchical Navigable Small World), indexed via pgvector: 99.4% recall!"
    norm = normalize_text_for_matching(raw)
    assert norm == "hnsw hierarchical navigable small world indexed via pgvector 99 4 recall"


def test_extract_ngrams():
    tokens = ["vector", "search", "latency", "benchmarks"]
    ngrams = extract_ngrams(tokens, n=3)
    assert len(ngrams) == 2
    assert ("vector", "search", "latency") in ngrams
    assert ("search", "latency", "benchmarks") in ngrams


def test_compute_ngram_jaccard_identical():
    text = "PostgreSQL pgvector extension enables efficient similarity search."
    score = compute_ngram_jaccard(text, text, n=3)
    assert score == 1.0


def test_compute_ngram_jaccard_disjoint():
    t1 = "Quantum computing relies on qubits."
    t2 = "Relational databases use B-tree and HNSW indexes."
    score = compute_ngram_jaccard(t1, t2, n=3)
    assert score == 0.0


def test_verify_claim_exact_match():
    evidence = [
        "HNSW graphs with m=16 and ef_construction=64 deliver sub-10ms query latency on RTX 5060."
    ]
    claim = "HNSW graphs with m=16 and ef_construction=64 deliver sub-10ms query latency."
    res = verify_claim_against_chunks(claim, evidence, citation_ref="[^1]")

    assert res.status == VerificationStatus.VERIFIED
    assert res.confidence_score == 1.0
    assert res.citation_ref == "[^1]"
    assert res.matched_snippet is not None


def test_verify_claim_high_ngram_overlap():
    evidence = ["Experimental benchmarks indicate pgvector scales linearly across 500,000 vectors."]
    claim = "Benchmarks indicate that pgvector scales linearly across 500,000 vectors."
    res = verify_claim_against_chunks(claim, evidence, citation_ref="[^2]")

    assert res.status in (VerificationStatus.VERIFIED, VerificationStatus.PARTIAL)
    assert res.confidence_score >= 0.50


def test_verify_claim_unverified():
    evidence = ["Local inference on NVIDIA RTX 5060 uses 5.2GB VRAM for Qwen3 8B model."]
    claim = "Quantum teleportation was demonstrated using superconductor qubits in 2024."
    res = verify_claim_against_chunks(claim, evidence, citation_ref="[^3]")

    assert res.status == VerificationStatus.UNVERIFIED
    assert res.confidence_score < 0.20


def test_extract_claims_with_citations():
    markdown = """
# Research Report

## Findings
- HNSW indexing provides logarithmic search time [^1].
- PostgreSQL pgvector supports cosine and L2 distance metrics [^2].
- General assertion without footnote reference for testing claim filtering.

## References
[^1]: ArXiv 2024 paper on vector search.
[^2]: pgvector documentation.
"""
    claims = extract_claims_with_citations(markdown)
    assert len(claims) >= 2
    refs = [c[1] for c in claims]
    assert "[^1]" in refs
    assert "[^2]" in refs


def test_audit_report_citations_passing():
    evidence = [
        "HNSW indexing provides logarithmic search time in relational vector stores.",
        "PostgreSQL pgvector supports cosine and L2 distance metrics natively.",
    ]
    markdown = """
## Results
- HNSW indexing provides logarithmic search time [^1].
- PostgreSQL pgvector supports cosine and L2 distance metrics [^2].
"""
    audit = audit_report_citations(markdown, evidence, passing_threshold=0.85)
    assert audit.total_claims == 2
    assert audit.verified_claims == 2
    assert audit.grounding_ratio >= 0.85
    assert audit.is_passing is True


def test_audit_report_citations_failing():
    evidence = ["HNSW indexing provides logarithmic search time."]
    markdown = """
## Results
- Unsubstantiated speedup claims of 1000x without evidence [^1].
- Completely fictional hardware architecture demonstrated [^2].
"""
    audit = audit_report_citations(markdown, evidence, passing_threshold=0.85)
    assert audit.total_claims == 2
    assert audit.grounding_ratio < 0.50
    assert audit.is_passing is False
