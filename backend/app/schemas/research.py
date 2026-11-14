import uuid
from datetime import datetime
from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field


class ResearchSessionCreate(BaseModel):
    query: str = Field(..., min_length=3, max_length=1000)
    title: str | None = Field(default=None, max_length=255)
    max_iterations: int = Field(default=3, ge=1, le=5)
    approval_required: bool = Field(default=False)


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    title: str
    summary: str
    markdown_content: str
    citation_map: Dict[str, Any] = Field(default_factory=dict)
    is_final: bool = False
    created_at: datetime


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    title: str
    url: str
    domain: str
    status: str
    retrieved_at: datetime


class ResearchSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    initial_query: str
    status: str
    created_at: datetime
    updated_at: datetime


class ResearchSessionDetail(ResearchSessionResponse):
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    report: ReportResponse | None = None
    sources_count: int = 0


class ApprovalResumeRequest(BaseModel):
    approved: bool = True
    feedback: str | None = None
