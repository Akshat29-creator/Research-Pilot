import hashlib
import logging
import time
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.llm.factory import get_embedding_provider
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.services.chunking import chunk_parsed_document, chunk_text
from app.tools.pdf_parser import parse_pdf_bytes

logger = logging.getLogger("researchpilot.services.ingestion")


@dataclass(frozen=True)
class IngestionResult:
    """Telemetry and outcome container for document ingestion operations."""

    document_id: uuid.UUID
    chunk_count: int
    content_hash: str
    is_duplicate: bool
    execution_time_ms: float
    title: str


def compute_sha256(content: str | bytes) -> str:
    """Compute cryptographic SHA256 hex digest of raw content."""
    hasher = hashlib.sha256()
    if isinstance(content, str):
        hasher.update(content.encode("utf-8"))
    else:
        hasher.update(content)
    return hasher.hexdigest()


async def ingest_document(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    content: str | bytes,
    file_type: str = "text/plain",
    file_path: str = "",
    chunk_size_chars: int = 2400,
    overlap_chars: int = 400,
) -> IngestionResult:
    """Ingest, deduplicate, chunk, embed, and persist a document into pgvector.

    Enforces tenant isolation by indexing under the caller's `user_id`.
    Skips redundant embedding computation if a document with identical SHA-256
    already exists for this tenant.
    """
    start_time = time.perf_counter()
    content_bytes = content.encode("utf-8") if isinstance(content, str) else content
    content_hash = compute_sha256(content_bytes)

    # 1. Deduplication check: inspect if document already indexed for this user
    stmt = select(Document).where(
        Document.user_id == user_id,
        Document.content_hash == content_hash,
    )
    res = await db.execute(stmt)
    existing_doc = res.scalar_one_or_none()

    if existing_doc is not None:
        # Fetch chunk count for telemetry
        count_stmt = select(DocumentChunk).where(DocumentChunk.document_id == existing_doc.id)
        chunk_res = await db.execute(count_stmt)
        chunks = chunk_res.scalars().all()

        elapsed = (time.perf_counter() - start_time) * 1000
        logger.info(
            "Document '%s' already indexed for user %s (hash: %s). "
            "Skipping re-embedding in %.1fms.",
            title,
            user_id,
            content_hash[:8],
            elapsed,
        )
        return IngestionResult(
            document_id=existing_doc.id,
            chunk_count=len(chunks),
            content_hash=content_hash,
            is_duplicate=True,
            execution_time_ms=elapsed,
            title=existing_doc.title,
        )

    # 2. Chunking based on file type
    if file_type == "application/pdf" or (file_path and file_path.lower().endswith(".pdf")):
        parsed_pdf = parse_pdf_bytes(content_bytes, filename=title)
        raw_chunks = chunk_parsed_document(
            parsed_pdf,
            chunk_size_chars=chunk_size_chars,
            overlap_chars=overlap_chars,
        )
    else:
        text_str = (
            content
            if isinstance(content, str)
            else content.decode("utf-8", errors="replace")
        )
        raw_chunks = chunk_text(
            text=text_str,
            chunk_size_chars=chunk_size_chars,
            overlap_chars=overlap_chars,
        )

    if not raw_chunks:
        # Fallback if empty document
        raw_chunks = chunk_text(
            text="[Empty document content]",
            chunk_size_chars=chunk_size_chars,
            overlap_chars=overlap_chars,
        )

    # 3. Generate 768-d vector embeddings in batches via Ollama nomic-embed-text
    embedding_provider = get_embedding_provider()
    chunk_texts = [c.content for c in raw_chunks]
    provider_name = getattr(embedding_provider, "model_name", type(embedding_provider).__name__)
    logger.info(
        "Generating %d vector embeddings for '%s' via %s",
        len(chunk_texts),
        title,
        provider_name,
    )

    embeddings = await embedding_provider.embed_batch(chunk_texts)

    # 4. Transactional persistence in PostgreSQL
    doc_id = uuid.uuid4()
    new_doc = Document(
        id=doc_id,
        user_id=user_id,
        title=title,
        file_path=file_path or f"virtual://{doc_id}",
        file_type=file_type,
        file_size_bytes=len(content_bytes),
        content_hash=content_hash,
    )
    db.add(new_doc)

    for chunk_meta, emb in zip(raw_chunks, embeddings, strict=False):
        chunk_row = DocumentChunk(
            id=uuid.uuid4(),
            document_id=doc_id,
            source_id=None,
            chunk_index=chunk_meta.chunk_index,
            page_number=chunk_meta.page_number,
            content=chunk_meta.content,
            embedding=emb,
            token_count=chunk_meta.token_count,
        )
        db.add(chunk_row)

    await db.commit()

    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(
        "Ingested document '%s' with %d chunks in %.1fms (doc_id=%s)",
        title,
        len(raw_chunks),
        elapsed,
        doc_id,
    )

    return IngestionResult(
        document_id=doc_id,
        chunk_count=len(raw_chunks),
        content_hash=content_hash,
        is_duplicate=False,
        execution_time_ms=elapsed,
        title=title,
    )
