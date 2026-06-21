"""add_homework_title_description_and_cascade_deletes

Revision ID: 848f320276d2
Revises: d4facd73125c
Create Date: 2026-06-21 21:18:06.733893

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = '848f320276d2'
down_revision: Union[str, None] = 'd4facd73125c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _column_exists("homeworks", "title"):
        op.add_column("homeworks", sa.Column("title", sa.String(), nullable=True))
    if not _column_exists("homeworks", "description"):
        op.add_column("homeworks", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    if _column_exists("homeworks", "description"):
        op.drop_column("homeworks", "description")
    if _column_exists("homeworks", "title"):
        op.drop_column("homeworks", "title")
