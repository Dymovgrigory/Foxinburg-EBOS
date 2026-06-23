"""add occurrence_date to attendance and schedule_exceptions

Revision ID: baaeed2374f2
Revises: 6ac060bb18bb
Create Date: 2026-06-24 00:10:15.407333

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.migration_helpers import table_exists, index_exists, column_exists


# revision identifiers, used by Alembic.
revision: str = 'baaeed2374f2'
down_revision: Union[str, None] = '6ac060bb18bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if not table_exists('schedule_exceptions'):
        op.create_table('schedule_exceptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('schedule_id', sa.Integer(), nullable=False),
        sa.Column('exception_date', sa.Date(), nullable=False),
        sa.Column('is_cancelled', sa.Boolean(), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('room', sa.String(), nullable=True),
        sa.Column('teacher_id', sa.Integer(), nullable=True),
        sa.Column('replacement_teacher_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['replacement_teacher_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['schedule_id'], ['schedules.id'], ),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('schedule_id', 'exception_date', name='uq_schedule_exception_date')
        )
    if not index_exists('schedule_exceptions', 'ix_schedule_exceptions_id'):
        op.create_index(op.f('ix_schedule_exceptions_id'), 'schedule_exceptions', ['id'], unique=False)

    # Добавляем occurrence_date как nullable, заполняем существующие записи, затем делаем NOT NULL
    if not column_exists('attendances', 'occurrence_date'):
        op.add_column('attendances', sa.Column('occurrence_date', sa.Date(), nullable=True))
        op.execute("""
            UPDATE attendances
            SET occurrence_date = schedules.start_time::date
            FROM schedules
            WHERE attendances.schedule_id = schedules.id
              AND attendances.occurrence_date IS NULL
        """)

    # Удаляем дубли по (schedule_id, occurrence_date, student_id), оставляя последнюю запись
    op.execute("""
        DELETE FROM attendances
        WHERE id NOT IN (
            SELECT MAX(id)
            FROM attendances
            GROUP BY schedule_id, occurrence_date, student_id
        )
    """)

    op.alter_column('attendances', 'occurrence_date', nullable=False)
    if not index_exists('attendances', 'uq_attendance_occurrence'):
        op.create_unique_constraint('uq_attendance_occurrence', 'attendances', ['schedule_id', 'occurrence_date', 'student_id'])


def downgrade() -> None:
    op.drop_constraint('uq_attendance_occurrence', 'attendances', type_='unique')
    op.drop_column('attendances', 'occurrence_date')
    if table_exists('schedule_exceptions'):
        op.drop_index(op.f('ix_schedule_exceptions_id'), table_name='schedule_exceptions')
        op.drop_table('schedule_exceptions')
