import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chunk_index: int
    page_number: int
    content: str
    token_count: int


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    file_type: str
    file_size_bytes: int
    content_hash: str
    chunk_count: int = Field(default=0)
    created_at: datetime
