"""add_schedule_enhancements

Revision ID: 4e5832dba6ed
Revises: f5cc51e1610f
Create Date: 2026-06-23 21:03:20.466885

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.migration_helpers import column_exists, foreign_key_exists


# revision identifiers, used by Alembic.
revision: str = '4e5832dba6ed'
down_revision: Union[str, None] = 'f5cc51e1610f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if not column_exists('schedules', 'color'):
        op.add_column('schedules', sa.Column('color', sa.String(), nullable=True))
    if not column_exists('schedules', 'is_online'):
        op.add_column('schedules', sa.Column('is_online', sa.Boolean(), nullable=True))
    if not column_exists('schedules', 'topic'):
        op.add_column('schedules', sa.Column('topic', sa.String(), nullable=True))
    if not column_exists('schedules', 'replacement_teacher_id'):
        op.add_column('schedules', sa.Column('replacement_teacher_id', sa.Integer(), nullable=True))

    if not foreign_key_exists('schedules', ['replacement_teacher_id'], 'users'):
        op.create_foreign_key(None, 'schedules', 'users', ['replacement_teacher_id'], ['id'])

    op.execute("UPDATE schedules SET is_online = false WHERE is_online IS NULL")
    op.alter_column('schedules', 'is_online', existing_type=sa.Boolean(), nullable=False)


def downgrade() -> None:
    op.drop_constraint(None, 'schedules', type_='foreignkey')
    op.drop_column('schedules', 'replacement_teacher_id')
    op.drop_column('schedules', 'topic')
    op.drop_column('schedules', 'is_online')
    op.drop_column('schedules', 'color')
