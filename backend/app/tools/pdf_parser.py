import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List

import pymupdf
from pydantic import BaseModel, Field

logger = logging.getLogger("researchpilot.tools.pdf_parser")


class ParsedPage(BaseModel):
    """Normalized content and provenance for a single document page."""

    page_number: int = Field(description="1-based page index within the PDF.")
    content: str = Field(description="Extracted plain text of the page.")
    char_count: int = Field(default=0, description="Character count on this page.")
    word_count: int = Field(default=0, description="Word count on this page.")


class ParsedDocument(BaseModel):
    """Full representation of a parsed PDF document with cryptographic checksum."""

    filename: str = Field(description="Original document filename.")
    total_pages: int = Field(description="Total number of pages in the PDF.")
    sha256_hash: str = Field(description="Cryptographic SHA256 hash of the source PDF bytes.")
    pages: List[ParsedPage] = Field(default_factory=list, description="Per-page content objects.")
    full_text: str = Field(description="Aggregated document text.")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Embedded PDF metadata properties."
    )


def parse_pdf_bytes(pdf_bytes: bytes, filename: str = "document.pdf") -> ParsedDocument:
    """Parse raw PDF byte stream into page-aligned text with cryptographic provenance."""
    if not pdf_bytes:
        raise ValueError("PDF content is empty.")

    sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()

    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error("PyMuPDF failed to parse byte stream for %s: %s", filename, str(e))
        raise ValueError(f"Failed to parse PDF document '{filename}': {str(e)}") from e

    pages: List[ParsedPage] = []
    full_text_parts: List[str] = []

    try:
        total_pages = len(doc)
        doc_metadata = doc.metadata or {}

        for page_idx in range(total_pages):
            page = doc[page_idx]
            raw_text = page.get_text("text") or ""
            clean_text = raw_text.strip()
            page_words = len(clean_text.split())

            parsed_page = ParsedPage(
                page_number=page_idx + 1,  # 1-based indexing for academic citation
                content=clean_text,
                char_count=len(clean_text),
                word_count=page_words,
            )
            pages.append(parsed_page)
            if clean_text:
                full_text_parts.append(clean_text)

        aggregated_text = "\n\n".join(full_text_parts)

        return ParsedDocument(
            filename=filename,
            total_pages=total_pages,
            sha256_hash=sha256_hash,
            pages=pages,
            full_text=aggregated_text,
            metadata={
                "title": doc_metadata.get("title", ""),
                "author": doc_metadata.get("author", ""),
                "creation_date": doc_metadata.get("creationDate", ""),
                "subject": doc_metadata.get("subject", ""),
            },
        )
    finally:
        doc.close()


def parse_pdf_file(filepath: str | Path) -> ParsedDocument:
    """Read a local PDF file from disk and parse into a ParsedDocument."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {path}")

    pdf_bytes = path.read_bytes()
    return parse_pdf_bytes(pdf_bytes=pdf_bytes, filename=path.name)
