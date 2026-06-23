"""add_hr_fields_and_leaves_kpis

Revision ID: 635a2481c0f7
Revises: cfd5bcecb879
Create Date: 2026-06-23 21:26:30.319300

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.migration_helpers import table_exists, index_exists, column_exists


# revision identifiers, used by Alembic.
revision: str = '635a2481c0f7'
down_revision: Union[str, None] = 'cfd5bcecb879'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if not table_exists('staff_kpis'):
        op.create_table('staff_kpis',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('metric', sa.String(), nullable=False),
        sa.Column('target', sa.Integer(), nullable=False),
        sa.Column('actual', sa.Integer(), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
    if not index_exists('staff_kpis', 'ix_staff_kpis_id'):
        op.create_index(op.f('ix_staff_kpis_id'), 'staff_kpis', ['id'], unique=False)

    if not table_exists('staff_leaves'):
        op.create_table('staff_leaves',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('leave_type', sa.String(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
    if not index_exists('staff_leaves', 'ix_staff_leaves_id'):
        op.create_index(op.f('ix_staff_leaves_id'), 'staff_leaves', ['id'], unique=False)

    for col_name, col_type in [
        ('position', sa.String()),
        ('employment_date', sa.Date()),
        ('salary_type', sa.String()),
        ('salary_rate', sa.Integer()),
        ('hr_status', sa.String()),
        ('contract_number', sa.String()),
    ]:
        if not column_exists('users', col_name):
            op.add_column('users', sa.Column(col_name, col_type, nullable=True))

    op.execute("UPDATE users SET salary_type = 'hourly' WHERE salary_type IS NULL")
    op.execute("UPDATE users SET salary_rate = 0 WHERE salary_rate IS NULL")
    op.execute("UPDATE users SET hr_status = 'active' WHERE hr_status IS NULL")
    op.alter_column('users', 'salary_type', existing_type=sa.String(), nullable=False)
    op.alter_column('users', 'salary_rate', existing_type=sa.Integer(), nullable=False)
    op.alter_column('users', 'hr_status', existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'contract_number')
    op.drop_column('users', 'hr_status')
    op.drop_column('users', 'salary_rate')
    op.drop_column('users', 'salary_type')
    op.drop_column('users', 'employment_date')
    op.drop_column('users', 'position')
    op.drop_index(op.f('ix_staff_leaves_id'), table_name='staff_leaves')
    op.drop_table('staff_leaves')
    op.drop_index(op.f('ix_staff_kpis_id'), table_name='staff_kpis')
    op.drop_table('staff_kpis')
