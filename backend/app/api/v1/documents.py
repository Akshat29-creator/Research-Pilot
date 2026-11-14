import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.errors import EntityNotFoundError, ValidationError
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.models.user import User
from app.schemas.document import ChunkResponse, DocumentResponse
from app.services.ingestion_service import ingest_document

logger = logging.getLogger("researchpilot.api.documents")
router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Upload and index a research document into pgvector with chunking and embeddings."""
    if not file.filename:
        raise ValidationError("File name must not be empty.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise ValidationError("Uploaded file is empty.")

    mime_type = file.content_type or (
        "application/pdf" if file.filename.lower().endswith(".pdf") else "text/plain"
    )

    ingestion_result = await ingest_document(
        db=db,
        user_id=current_user.id,
        title=file.filename,
        content=file_bytes,
        file_type=mime_type,
        file_path=f"uploads/{file.filename}",
    )

    # Fetch document entity to return full response
    stmt = select(Document).where(Document.id == ingestion_result.document_id)
    res = await db.execute(stmt)
    doc = res.scalar_one()

    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes,
        content_hash=doc.content_hash,
        chunk_count=ingestion_result.chunk_count,
        created_at=doc.created_at,
    )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DocumentResponse]:
    """Retrieve all indexed documents for the current user."""
    # Query documents with aggregated chunk count
    stmt = (
        select(Document, func.count(DocumentChunk.id).label("chunk_count"))
        .outerjoin(DocumentChunk, Document.id == DocumentChunk.document_id)
        .where(Document.user_id == current_user.id)
        .group_by(Document.id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    res = await db.execute(stmt)
    rows = res.all()

    return [
        DocumentResponse(
            id=doc.id,
            title=doc.title,
            file_type=doc.file_type,
            file_size_bytes=doc.file_size_bytes,
            content_hash=doc.content_hash,
            chunk_count=chunk_count,
            created_at=doc.created_at,
        )
        for doc, chunk_count in rows
    ]


@router.get("/{document_id}/chunks", response_model=List[ChunkResponse])
async def list_document_chunks(
    document_id: uuid.UUID,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ChunkResponse]:
    """Inspect indexed text chunks for a document."""
    # Verify ownership
    doc_stmt = select(Document).where(
        Document.id == document_id,
        Document.user_id == current_user.id,
    )
    doc_res = await db.execute(doc_stmt)
    if not doc_res.scalar_one_or_none():
        raise EntityNotFoundError("Document", str(document_id))

    stmt = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .offset(skip)
        .limit(limit)
    )
    res = await db.execute(stmt)
    chunks = res.scalars().all()

    return [
        ChunkResponse(
            id=c.id,
            chunk_index=c.chunk_index,
            page_number=c.page_number,
            content=c.content,
            token_count=c.token_count,
        )
        for c in chunks
    ]


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an indexed document and its associated vector chunks."""
    stmt = select(Document).where(
        Document.id == document_id,
        Document.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise EntityNotFoundError("Document", str(document_id))

    await db.delete(doc)
    await db.commit()
    logger.info("Deleted document %s for user %s", document_id, current_user.id)
    return {"deleted": True, "id": str(document_id)}
