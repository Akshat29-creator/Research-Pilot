"""Unit tests for Academic PDF Export Engine."""

from app.services.pdf_export import AcademicPdfGenerator, academic_pdf_generator


def test_sanitize_for_reportlab():
    generator = AcademicPdfGenerator()
    raw = (
        "Research & Development: <tag> & `code_snippet` with **bold** "
        "and *italic* and [link](https://example.com) [^1]"
    )
    sanitized = generator._sanitize_for_reportlab(raw)

    assert "&amp;" in sanitized
    assert "&lt;tag&gt;" in sanitized
    assert "<b>bold</b>" in sanitized
    assert "<i>italic</i>" in sanitized
    assert '<font name="Courier"' in sanitized
    assert '<a href="https://example.com"' in sanitized
    assert "<sup>" in sanitized


def test_generate_pdf_basic():
    title = "Empirical Evaluation of Vector Indexing in PostgreSQL"
    md = (
        "## Abstract\n\n"
        "This paper evaluates **pgvector** indexing mechanisms for RAG.\n\n"
        "## Key Findings\n\n"
        "- High throughput HNSW searches\n"
        "- Sub-millisecond latency\n"
    )
    pdf_bytes = academic_pdf_generator.generate_pdf(
        title=title,
        markdown_content=md,
        metadata={"session_id": "test-session-123", "status": "COMPLETED", "grounding_score": 0.95},
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_generate_pdf_with_tables_and_callouts():
    title = "Complex Report with Tables and Badges"
    md = (
        "> [!NOTE]\n"
        "> **Adversarial Grounding Audit**: PASSED (95%) • 5 Verified Sources\n\n"
        "## Benchmark Results\n\n"
        "| Architecture | QPS | Recall@10 | Memory (MB) |\n"
        "|---|---|---|---|\n"
        "| HNSW m=16 | 452.1 | 0.985 | 340 |\n"
        "| IVFFlat lists=100 | 120.4 | 0.912 | 85 |\n\n"
        "```python\n"
        "# Python query script\n"
        "result = db.execute('SELECT * FROM docs')\n"
        "```\n"
    )
    pdf_bytes = academic_pdf_generator.generate_pdf(
        title=title,
        markdown_content=md,
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")


def test_generate_pdf_with_sources():
    title = "Report With Academic Citations"
    md = (
        "## Empirical Background\n\n"
        "Vector search mechanisms have been systematically analyzed [^1]. "
        "Further empirical grounding verifies latency profiles [^2].\n"
    )
    sources = [
        {
            "title": "pgvector: Open-source vector similarity search for Postgres",
            "url": "https://github.com/pgvector/pgvector",
            "domain": "github.com",
        },
        {
            "title": "Efficient and Robust Approximate Nearest Neighbor Search Using HNSW",
            "url": "https://arxiv.org/abs/1603.09320",
            "domain": "arxiv.org",
        },
    ]

    pdf_bytes = academic_pdf_generator.generate_pdf(
        title=title,
        markdown_content=md,
        sources=sources,
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")


def test_generate_multipage_pdf():
    title = "Extensive Multi-Page Academic Paper"
    # Generate long content to span multiple pages and trigger NumberedCanvas page numbering
    sections = []
    for i in range(15):
        sections.append(
            f"## Section {i}: Advanced Architectural Trade-offs\n\n"
            f"Paragraph {i}.1: In-depth exploration of memory layouts and cache locality. "
            f"Concurrency gating prevents thermal trips on mobile workstations.\n\n"
            f"Paragraph {i}.2: Comprehensive comparative benchmarks demonstrate resilience.\n\n"
        )
    md = "\n".join(sections)

    pdf_bytes = academic_pdf_generator.generate_pdf(
        title=title,
        markdown_content=md,
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 3500
    assert pdf_bytes.startswith(b"%PDF")
