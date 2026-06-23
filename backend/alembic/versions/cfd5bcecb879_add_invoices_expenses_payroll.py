"""add_invoices_expenses_payroll

Revision ID: cfd5bcecb879
Revises: 4e5832dba6ed
Create Date: 2026-06-23 21:20:07.564140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.migration_helpers import table_exists, index_exists, column_exists, foreign_key_exists


# revision identifiers, used by Alembic.
revision: str = 'cfd5bcecb879'
down_revision: Union[str, None] = '4e5832dba6ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if not table_exists('expenses'):
        op.create_table('expenses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('expense_date', sa.Date(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
    if not index_exists('expenses', 'ix_expenses_id'):
        op.create_index(op.f('ix_expenses_id'), 'expenses', ['id'], unique=False)

    if not table_exists('invoices'):
        op.create_table('invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=True),
        sa.Column('membership_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('period_start', sa.Date(), nullable=True),
        sa.Column('period_end', sa.Date(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['membership_id'], ['group_memberships.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
    if not index_exists('invoices', 'ix_invoices_id'):
        op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)

    if not column_exists('payments', 'invoice_id'):
        op.add_column('payments', sa.Column('invoice_id', sa.Integer(), nullable=True))
    if not column_exists('payments', 'period_start'):
        op.add_column('payments', sa.Column('period_start', sa.Date(), nullable=True))
    if not column_exists('payments', 'period_end'):
        op.add_column('payments', sa.Column('period_end', sa.Date(), nullable=True))

    if not foreign_key_exists('payments', ['invoice_id'], 'invoices'):
        op.create_foreign_key(None, 'payments', 'invoices', ['invoice_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint(None, 'payments', type_='foreignkey')
    op.drop_column('payments', 'period_end')
    op.drop_column('payments', 'period_start')
    op.drop_column('payments', 'invoice_id')
    op.drop_index(op.f('ix_invoices_id'), table_name='invoices')
    op.drop_table('invoices')
    op.drop_index(op.f('ix_expenses_id'), table_name='expenses')
    op.drop_table('expenses')
