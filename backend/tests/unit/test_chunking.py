from app.services.chunking import (
    chunk_parsed_document,
    chunk_text,
    estimate_token_count,
    split_text_recursive,
)
from app.tools.pdf_parser import ParsedDocument, ParsedPage


def test_estimate_token_count():
    assert estimate_token_count("") == 0
    assert estimate_token_count("Hello world") >= 1
    # ~4 chars per token rule
    sample = "a" * 400
    assert estimate_token_count(sample) == 100


def test_split_text_recursive_short_text():
    text = "Short scientific statement regarding vector databases."
    chunks = split_text_recursive(text, chunk_size_chars=100, overlap_chars=20)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_split_text_recursive_preserves_paragraphs():
    p1 = "Paragraph 1: Hierarchical Navigable Small World (HNSW) graphs offer logarithmic latency."
    p2 = "Paragraph 2: Inverted File Flat (IVFFlat) partitions vector space into Voronoi cells."
    p3 = "Paragraph 3: Empirical evaluations show HNSW achieves superior recall at high throughput."
    full_text = f"{p1}\n\n{p2}\n\n{p3}"

    chunks = split_text_recursive(full_text, chunk_size_chars=120, overlap_chars=30)
    assert len(chunks) >= 3
    # Ensure paragraphs start cleanly
    assert any("Paragraph 1" in c for c in chunks)
    assert any("Paragraph 2" in c for c in chunks)
    assert any("Paragraph 3" in c for c in chunks)


def test_split_text_recursive_overlap():
    text = (
        "Sentence one describes vector embeddings. "
        "Sentence two details cosine distance calculations. "
        "Sentence three contrasts L2 Euclidean distance. "
        "Sentence four summarizes index trade-offs."
    )
    chunks = split_text_recursive(text, chunk_size_chars=90, overlap_chars=30)
    assert len(chunks) >= 2
    # Verify adjacent chunks share overlap text
    for i in range(len(chunks) - 1):
        words_current = set(chunks[i].split())
        words_next = set(chunks[i + 1].split())
        assert len(words_current.intersection(words_next)) > 0


def test_chunk_text_metadata():
    text = "Section A: Memory architecture.\n\nSection B: GPU semaphore scheduling."
    chunks = chunk_text(text, chunk_size_chars=50, overlap_chars=10, page_number=2)
    assert len(chunks) >= 2
    for i, c in enumerate(chunks):
        assert c.chunk_index == i
        assert c.page_number == 2
        assert c.token_count > 0
        assert c.char_offset >= 0


def test_chunk_parsed_document_multipage():
    page1 = ParsedPage(
        page_number=1,
        content="Abstract: High-dimensional vector indexing in relational engines.",
        char_count=65,
        word_count=7,
    )
    page2 = ParsedPage(
        page_number=2,
        content="Methodology: We benchmarked pgvector with 100,000 768-dimensional vectors.",
        char_count=74,
        word_count=8,
    )
    doc = ParsedDocument(
        filename="benchmark.pdf",
        total_pages=2,
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        pages=[page1, page2],
        full_text=f"{page1.content}\n\n{page2.content}",
    )

    chunks = chunk_parsed_document(doc, chunk_size_chars=100, overlap_chars=20)
    assert len(chunks) >= 2
    assert chunks[0].page_number == 1
    assert chunks[0].chunk_index == 0
    assert chunks[1].page_number == 2
    assert chunks[1].chunk_index == 1
