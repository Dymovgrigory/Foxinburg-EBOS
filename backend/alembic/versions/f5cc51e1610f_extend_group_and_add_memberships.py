"""extend_group_and_add_memberships

Revision ID: f5cc51e1610f
Revises: ccda521901bf
Create Date: 2026-06-23 19:32:05.790979

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'f5cc51e1610f'
down_revision: Union[str, None] = 'ccda521901bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    return column_name in {col['name'] for col in inspector.get_columns(table_name)}


def _index_exists(table_name: str, index_name: str) -> bool:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    return any(idx['name'] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    # Таблица могла быть создана раньше через create_all — создаём только если её нет
    if not _table_exists('group_memberships'):
        op.create_table('group_memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('joined_at', sa.Date(), nullable=False),
        sa.Column('left_at', sa.Date(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('individual_hourly_rate', sa.Integer(), nullable=True),
        sa.Column('individual_lesson_count', sa.Integer(), nullable=True),
        sa.Column('discount_percent', sa.Integer(), nullable=False),
        sa.Column('individual_monthly_fee', sa.Integer(), nullable=True),
        sa.Column('auto_invoices_enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )

    for index_name, columns in [
        ('ix_group_memberships_group_id', ['group_id']),
        ('ix_group_memberships_id', ['id']),
        ('ix_group_memberships_student_id', ['student_id']),
    ]:
        if not _index_exists('group_memberships', index_name):
            op.create_index(op.f(index_name), 'group_memberships', columns, unique=False)

    # Новые поля сначала nullable, чтобы не ломать существующие группы
    new_group_columns = [
        ('room', sa.String(), True),
        ('study_type', sa.String(), True),
        ('language', sa.String(), True),
        ('level', sa.String(), True),
        ('start_date', sa.Date(), True),
        ('end_date', sa.Date(), True),
        ('academic_hour_minutes', sa.Integer(), True),
        ('balance_type', sa.String(), True),
        ('hourly_rate', sa.Integer(), True),
        ('monthly_fee', sa.Integer(), True),
        ('auto_invoices_enabled', sa.Boolean(), True),
        ('certificates_enabled', sa.Boolean(), True),
    ]
    for col_name, col_type, nullable in new_group_columns:
        if not _column_exists('groups', col_name):
            op.add_column('groups', sa.Column(col_name, col_type, nullable=nullable))

    # Заполняем дефолты для существующих групп (idempotent — повторный запуск не страшен)
    op.execute("UPDATE groups SET study_type = 'mini_group', academic_hour_minutes = 45, balance_type = 'lessons', hourly_rate = 0, auto_invoices_enabled = true, certificates_enabled = false WHERE study_type IS NULL")

    # Теперь делаем обязательными (если ещё nullable)
    op.alter_column('groups', 'study_type', nullable=False)
    op.alter_column('groups', 'academic_hour_minutes', nullable=False)
    op.alter_column('groups', 'balance_type', nullable=False)
    op.alter_column('groups', 'hourly_rate', nullable=False)
    op.alter_column('groups', 'auto_invoices_enabled', nullable=False)
    op.alter_column('groups', 'certificates_enabled', nullable=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_columns = {col['name'] for col in inspector.get_columns('groups')}

    for col_name in [
        'certificates_enabled',
        'auto_invoices_enabled',
        'monthly_fee',
        'hourly_rate',
        'balance_type',
        'academic_hour_minutes',
        'end_date',
        'start_date',
        'level',
        'language',
        'study_type',
        'room',
    ]:
        if col_name in existing_columns:
            op.drop_column('groups', col_name)

    if _table_exists('group_memberships'):
        existing_indexes = {idx['name'] for idx in inspector.get_indexes('group_memberships')}
        for index_name in [
            'ix_group_memberships_student_id',
            'ix_group_memberships_id',
            'ix_group_memberships_group_id',
        ]:
            if index_name in existing_indexes:
                op.drop_index(op.f(index_name), table_name='group_memberships')
        op.drop_table('group_memberships')
