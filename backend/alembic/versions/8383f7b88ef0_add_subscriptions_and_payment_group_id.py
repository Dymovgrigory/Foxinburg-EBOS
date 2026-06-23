"""add_subscriptions_and_payment_group_id

Revision ID: 8383f7b88ef0
Revises: 0e7d1061e7ad
Create Date: 2026-06-23 22:16:30.497215

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.migration_helpers import table_exists, index_exists, column_exists, foreign_key_exists


# revision identifiers, used by Alembic.
revision: str = '8383f7b88ef0'
down_revision: Union[str, None] = '0e7d1061e7ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if not table_exists('subscriptions'):
        op.create_table('subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('membership_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('lessons_total', sa.Integer(), nullable=False),
        sa.Column('lessons_used', sa.Integer(), nullable=False),
        sa.Column('frozen_at', sa.DateTime(), nullable=True),
        sa.Column('frozen_until', sa.Date(), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), nullable=False),
        sa.Column('monthly_fee', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['membership_id'], ['group_memberships.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
    if not index_exists('subscriptions', 'ix_subscriptions_id'):
        op.create_index(op.f('ix_subscriptions_id'), 'subscriptions', ['id'], unique=False)

    if not column_exists('payments', 'group_id'):
        op.add_column('payments', sa.Column('group_id', sa.Integer(), nullable=True))

    if not foreign_key_exists('payments', ['group_id'], 'groups'):
        op.create_foreign_key(None, 'payments', 'groups', ['group_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint(None, 'payments', type_='foreignkey')
    op.drop_column('payments', 'group_id')
    op.drop_index(op.f('ix_subscriptions_id'), table_name='subscriptions')
    op.drop_table('subscriptions')
