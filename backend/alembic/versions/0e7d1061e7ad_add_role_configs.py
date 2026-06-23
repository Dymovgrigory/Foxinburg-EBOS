"""add_role_configs

Revision ID: 0e7d1061e7ad
Revises: 635a2481c0f7
Create Date: 2026-06-23 21:31:18.532359

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.migration_helpers import table_exists, index_exists


# revision identifiers, used by Alembic.
revision: str = '0e7d1061e7ad'
down_revision: Union[str, None] = '635a2481c0f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if not table_exists('role_configs'):
        op.create_table('role_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=False),
        sa.Column('is_custom', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
        )
    if not index_exists('role_configs', 'ix_role_configs_id'):
        op.create_index(op.f('ix_role_configs_id'), 'role_configs', ['id'], unique=False)
    if not index_exists('role_configs', 'ix_role_configs_role'):
        op.create_index(op.f('ix_role_configs_role'), 'role_configs', ['role'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_role_configs_role'), table_name='role_configs')
    op.drop_index(op.f('ix_role_configs_id'), table_name='role_configs')
    op.drop_table('role_configs')
