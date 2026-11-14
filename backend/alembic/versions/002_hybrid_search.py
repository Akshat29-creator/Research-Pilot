"""Add content_tsvector generated column and GIN index to document_chunks.

Revision ID: 002_hybrid_search
Revises: 001_initial_schema
Create Date: 2026-11-15
"""

from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_hybrid_search"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add generated STORED tsvector column
    op.execute(
        "ALTER TABLE document_chunks "
        "ADD COLUMN content_tsvector tsvector "
        "GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;"
    )
    # 2. Add GIN index for full-text search
    op.execute(
        "CREATE INDEX idx_document_chunks_content_tsvector_gin "
        "ON document_chunks USING gin (content_tsvector);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_document_chunks_content_tsvector_gin;")
    op.execute("ALTER TABLE document_chunks DROP COLUMN IF EXISTS content_tsvector;")
