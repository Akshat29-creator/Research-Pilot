import hashlib

import pymupdf
import pytest

from app.tools.pdf_parser import parse_pdf_bytes, parse_pdf_file


def create_in_memory_pdf() -> bytes:
    """Create a minimal 2-page PDF in-memory for testing."""
    doc = pymupdf.open()

    page1 = doc.new_page()
    page1.insert_text((50, 50), "Page 1: Research on Transformer Attention Mechanisms.")

    page2 = doc.new_page()
    page2.insert_text((50, 50), "Page 2: Vector Search Latency with HNSW Indexes.")

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_parse_pdf_bytes_success():
    pdf_bytes = create_in_memory_pdf()
    expected_hash = hashlib.sha256(pdf_bytes).hexdigest()

    parsed = parse_pdf_bytes(pdf_bytes, filename="paper.pdf")

    assert parsed.filename == "paper.pdf"
    assert parsed.total_pages == 2
    assert parsed.sha256_hash == expected_hash
    assert len(parsed.pages) == 2

    # Check 1-based page indexing
    assert parsed.pages[0].page_number == 1
    assert "Transformer Attention" in parsed.pages[0].content
    assert parsed.pages[0].word_count > 0

    assert parsed.pages[1].page_number == 2
    assert "Vector Search Latency" in parsed.pages[1].content

    assert "Transformer Attention" in parsed.full_text
    assert "Vector Search Latency" in parsed.full_text


def test_parse_pdf_bytes_empty():
    with pytest.raises(ValueError) as exc:
        parse_pdf_bytes(b"")
    assert "empty" in str(exc.value).lower()


def test_parse_pdf_file_missing():
    with pytest.raises(FileNotFoundError):
        parse_pdf_file("nonexistent_path_to_file.pdf")
