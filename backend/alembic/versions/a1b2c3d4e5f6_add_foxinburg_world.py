"""add foxinburg world: gamification streak, parent link, world fields, user subscriptions

Revision ID: a1b2c3d4e5f6
Revises: cb2bf4597759
Create Date: 2026-06-26 22:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'cb2bf4597759'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Геймификация: ежедневный стрик
    op.add_column('users', sa.Column('streak_days', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_activity_date', sa.Date(), nullable=True))
    # Связь родитель → ребёнок
    op.add_column('users', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_parent_id', 'users', 'users', ['parent_id'], ['id'])

    # Foxinburg World: поля мира на курсе
    op.add_column('courses', sa.Column('cefr_level', sa.String(), nullable=True))
    op.add_column('courses', sa.Column('world_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('courses', sa.Column('world_theme', sa.String(), nullable=True))

    # Платформенные подписки (Foxinburg World)
    op.create_table(
        'user_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan', sa.String(), nullable=False, server_default='world_monthly'),
        sa.Column('status', sa.String(), nullable=False, server_default='trialing'),
        sa.Column('price', sa.Integer(), nullable=False, server_default='50000'),
        sa.Column('currency', sa.String(), nullable=False, server_default='RUB'),
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('tinkoff_customer_key', sa.String(), nullable=True),
        sa.Column('tinkoff_rebill_id', sa.String(), nullable=True),
        sa.Column('last_order_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['last_order_id'], ['orders.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_subscriptions_user_id', 'user_subscriptions', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_subscriptions_user_id', table_name='user_subscriptions')
    op.drop_table('user_subscriptions')

    op.drop_column('courses', 'world_theme')
    op.drop_column('courses', 'world_order')
    op.drop_column('courses', 'cefr_level')

    op.drop_constraint('fk_users_parent_id', 'users', type_='foreignkey')
    op.drop_column('users', 'parent_id')
    op.drop_column('users', 'last_activity_date')
    op.drop_column('users', 'streak_days')
