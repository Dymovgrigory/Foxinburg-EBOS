"""add homework template fields to lessons

Revision ID: 4aa5d017b8a5
Revises: 0ea0b7e39f61
Create Date: 2026-06-21 22:49:31.742299

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4aa5d017b8a5'
down_revision: Union[str, None] = '0ea0b7e39f61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('lessons', sa.Column('homework_title', sa.String(), nullable=True))
    op.add_column('lessons', sa.Column('homework_description', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('lessons', 'homework_description')
    op.drop_column('lessons', 'homework_title')
