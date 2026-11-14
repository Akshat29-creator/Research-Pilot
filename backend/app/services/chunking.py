from dataclasses import dataclass
from typing import List

from app.tools.pdf_parser import ParsedDocument


@dataclass(frozen=True)
class TextChunk:
    """Represents a discrete semantic chunk of a larger document."""

    content: str
    chunk_index: int
    page_number: int
    char_offset: int
    token_count: int


def estimate_token_count(text: str) -> int:
    """Fast approximation of token count based on whitespace and punctuation heuristics."""
    if not text:
        return 0
    # Rule of thumb for English/technical prose: ~4 characters per token
    return max(1, len(text) // 4)


def split_text_recursive(
    text: str,
    chunk_size_chars: int = 2400,
    overlap_chars: int = 400,
) -> List[str]:
    """Recursively split text preserving paragraphs and sentence boundaries.

    Ensures chunk boundaries do not bisect sentences or words.
    """
    clean_text = text.strip()
    if not clean_text:
        return []

    if len(clean_text) <= chunk_size_chars:
        return [clean_text]

    chunks: List[str] = []
    # Primary split candidates in descending priority
    delimiters = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "]

    start_idx = 0
    text_len = len(clean_text)

    while start_idx < text_len:
        end_idx = min(start_idx + chunk_size_chars, text_len)

        # If we have reached the end of the text, take the remaining slice
        if end_idx == text_len:
            slice_text = clean_text[start_idx:end_idx].strip()
            if slice_text:
                chunks.append(slice_text)
            break

        # Attempt to find the best boundary delimiter near the end_idx
        chosen_split = -1
        search_start = max(start_idx + chunk_size_chars // 2, end_idx - overlap_chars)
        window = clean_text[search_start:end_idx]

        for delim in delimiters:
            rpos = window.rfind(delim)
            if rpos != -1:
                # Boundary found
                chosen_split = search_start + rpos + len(delim)
                break

        # If no delimiter was found in the search window, split at end_idx
        if chosen_split == -1 or chosen_split <= start_idx:
            chosen_split = end_idx

        chunk_content = clean_text[start_idx:chosen_split].strip()
        if chunk_content:
            chunks.append(chunk_content)

        # Calculate next starting position considering overlap
        next_start = chosen_split - overlap_chars
        if next_start <= start_idx:
            next_start = chosen_split

        start_idx = next_start

    return chunks


def chunk_text(
    text: str,
    chunk_size_chars: int = 2400,
    overlap_chars: int = 400,
    page_number: int = 1,
) -> List[TextChunk]:
    """Chunk raw text and produce structured TextChunk instances with metadata."""
    raw_pieces = split_text_recursive(
        text=text,
        chunk_size_chars=chunk_size_chars,
        overlap_chars=overlap_chars,
    )

    chunks: List[TextChunk] = []
    current_offset = 0

    for idx, piece in enumerate(raw_pieces):
        token_count = estimate_token_count(piece)
        chunks.append(
            TextChunk(
                content=piece,
                chunk_index=idx,
                page_number=page_number,
                char_offset=current_offset,
                token_count=token_count,
            )
        )
        current_offset += len(piece)

    return chunks


def chunk_parsed_document(
    doc: ParsedDocument,
    chunk_size_chars: int = 2400,
    overlap_chars: int = 400,
) -> List[TextChunk]:
    """Chunk a PyMuPDF ParsedDocument preserving page numbers and source provenance."""
    chunks: List[TextChunk] = []
    global_chunk_idx = 0

    for page in doc.pages:
        page_chunks = split_text_recursive(
            text=page.content,
            chunk_size_chars=chunk_size_chars,
            overlap_chars=overlap_chars,
        )

        char_offset = 0
        for piece in page_chunks:
            chunks.append(
                TextChunk(
                    content=piece,
                    chunk_index=global_chunk_idx,
                    page_number=page.page_number,
                    char_offset=char_offset,
                    token_count=estimate_token_count(piece),
                )
            )
            global_chunk_idx += 1
            char_offset += len(piece)

    return chunks
