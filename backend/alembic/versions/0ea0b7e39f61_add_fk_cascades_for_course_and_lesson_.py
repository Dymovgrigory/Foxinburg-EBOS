"""add fk cascades for course and lesson deletion

Revision ID: 0ea0b7e39f61
Revises: 848f320276d2
Create Date: 2026-06-21 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0ea0b7e39f61"
down_revision: Union[str, None] = "848f320276d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_fk(table: str, constraint: str) -> None:
    op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint}")


def _add_fk(table: str, constraint: str, column: str, ref_table: str, ref_column: str, ondelete: str) -> None:
    op.execute(
        f"ALTER TABLE {table} ADD CONSTRAINT {constraint} "
        f"FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_column}) ON DELETE {ondelete}"
    )


def upgrade() -> None:
    # groups.course_id -> set null when course is deleted
    _drop_fk("groups", "groups_course_id_fkey")
    _add_fk("groups", "groups_course_id_fkey", "course_id", "courses", "id", "SET NULL")

    # schedules.course_id -> set null when course is deleted
    _drop_fk("schedules", "schedules_course_id_fkey")
    _add_fk("schedules", "schedules_course_id_fkey", "course_id", "courses", "id", "SET NULL")

    # schedules.lesson_id -> set null when lesson is deleted
    _drop_fk("schedules", "schedules_lesson_id_fkey")
    _add_fk("schedules", "schedules_lesson_id_fkey", "lesson_id", "lessons", "id", "SET NULL")

    # lesson_progress.lesson_id -> cascade delete with lesson
    _drop_fk("lesson_progress", "lesson_progress_lesson_id_fkey")
    _add_fk("lesson_progress", "lesson_progress_lesson_id_fkey", "lesson_id", "lessons", "id", "CASCADE")


def downgrade() -> None:
    _drop_fk("groups", "groups_course_id_fkey")
    _add_fk("groups", "groups_course_id_fkey", "course_id", "courses", "id", "NO ACTION")

    _drop_fk("schedules", "schedules_course_id_fkey")
    _add_fk("schedules", "schedules_course_id_fkey", "course_id", "courses", "id", "NO ACTION")

    _drop_fk("schedules", "schedules_lesson_id_fkey")
    _add_fk("schedules", "schedules_lesson_id_fkey", "lesson_id", "lessons", "id", "NO ACTION")

    _drop_fk("lesson_progress", "lesson_progress_lesson_id_fkey")
    _add_fk("lesson_progress", "lesson_progress_lesson_id_fkey", "lesson_id", "lessons", "id", "NO ACTION")
