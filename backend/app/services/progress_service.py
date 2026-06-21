from datetime import datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from sqlalchemy import desc

from app.models.course import Course, Module, Lesson
from app.models.enrollment import Enrollment, LessonProgress
from app.models.test import Test, TestAttempt
from app.models.homework import Homework, HomeworkReview
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.core.events import EventBus, SystemEventType


class ProgressService(BaseService[LessonProgress]):
    model = LessonProgress

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_lesson_progress(
        self, student_id: int, lesson_id: int
    ) -> Optional[LessonProgress]:
        result = await self.uow.session.execute(
            select(LessonProgress).where(
                LessonProgress.student_id == student_id,
                LessonProgress.lesson_id == lesson_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_progress_for_enrollment(self, enrollment_id: int) -> List[LessonProgress]:
        """Создаёт записи прогресса для всех уроков курса при зачислении."""
        result = await self.uow.session.execute(
            select(Enrollment)
            .where(Enrollment.id == enrollment_id)
            .options(
                selectinload(Enrollment.course)
                .selectinload(Course.modules)
                .selectinload(Module.lessons)
            )
        )
        enrollment = result.scalar_one_or_none()
        if not enrollment:
            raise ValueError("Зачисление не найдено")

        existing = (
            await self.uow.session.execute(
                select(LessonProgress).where(LessonProgress.enrollment_id == enrollment_id)
            )
        ).scalars().all()
        if existing:
            return list(existing)

        course = enrollment.course
        lessons = self._ordered_lessons(course)
        progress_records = []
        for idx, lesson in enumerate(lessons):
            status = "available" if idx == 0 or not course.is_sequential else "locked"
            progress_records.append(
                LessonProgress(
                    student_id=enrollment.student_id,
                    lesson_id=lesson.id,
                    enrollment_id=enrollment.id,
                    status=status,
                )
            )

        self.uow.session.add_all(progress_records)
        await self.uow.session.flush()
        return progress_records

    async def ensure_progress_records_for_enrollment(self, enrollment_id: int) -> List[LessonProgress]:
        """Создаёт недостающие записи прогресса (например, после добавления новых уроков в курс)."""
        result = await self.uow.session.execute(
            select(Enrollment)
            .where(Enrollment.id == enrollment_id)
            .options(
                selectinload(Enrollment.course)
                .selectinload(Course.modules)
                .selectinload(Module.lessons)
            )
        )
        enrollment = result.scalar_one_or_none()
        if not enrollment:
            raise ValueError("Зачисление не найдено")

        course = enrollment.course
        lessons = self._ordered_lessons(course)
        existing_result = await self.uow.session.execute(
            select(LessonProgress).where(LessonProgress.enrollment_id == enrollment_id)
        )
        existing = {p.lesson_id: p for p in existing_result.scalars().all()}

        new_records: List[LessonProgress] = []
        prev_completed = True
        for idx, lesson in enumerate(lessons):
            progress = existing.get(lesson.id)
            if progress:
                prev_completed = progress.status == "completed"
                continue

            if not course.is_sequential or idx == 0 or prev_completed:
                status = "available"
            else:
                status = "locked"

            new_records.append(
                LessonProgress(
                    student_id=enrollment.student_id,
                    lesson_id=lesson.id,
                    enrollment_id=enrollment.id,
                    status=status,
                )
            )
            prev_completed = False

        if new_records:
            self.uow.session.add_all(new_records)
            await self.uow.session.flush()

        return list(existing.values()) + new_records

    async def complete_lesson(self, student_id: int, lesson_id: int) -> LessonProgress:
        """Отмечает урок завершённым и разблокирует следующий при необходимости."""
        result = await self.uow.session.execute(
            select(LessonProgress)
            .where(
                LessonProgress.student_id == student_id,
                LessonProgress.lesson_id == lesson_id,
            )
            .options(
                selectinload(LessonProgress.lesson)
                .selectinload(Lesson.module)
                .selectinload(Module.course)
            )
        )
        progress = result.scalar_one_or_none()
        if not progress:
            raise ValueError("Прогресс урока не найден")
        if progress.status == "locked":
            raise ValueError("Урок заблокирован")
        if progress.status == "completed":
            return progress

        lesson_type = progress.lesson.lesson_type
        if lesson_type == "test":
            await self._ensure_test_passed(progress.student_id, progress.lesson_id)
        elif lesson_type == "homework":
            await self._ensure_homework_approved(progress.student_id, progress.lesson_id)

        progress.status = "completed"
        progress.completed_at = datetime.utcnow()
        await self.uow.session.flush()

        course = progress.lesson.module.course
        enrollment_id = progress.enrollment_id

        # Обновляем процент прохождения
        await self._update_enrollment_progress(enrollment_id)

        # Разблокируем следующий урок
        if course.is_sequential:
            next_lesson = await self._get_next_lesson(progress.lesson, course)
            if next_lesson:
                await self._unlock_lesson(enrollment_id, next_lesson.id)

        await EventBus.publish(
            self.uow,
            SystemEventType.LESSON_COMPLETED,
            {
                "student_id": student_id,
                "lesson_id": lesson_id,
                "enrollment_id": enrollment_id,
            },
            user_id=student_id,
        )
        return progress

    async def get_available_lessons(self, student_id: int, course_id: int) -> List[Lesson]:
        result = await self.uow.session.execute(
            select(LessonProgress)
            .where(LessonProgress.student_id == student_id)
            .options(selectinload(LessonProgress.lesson))
        )
        progresses = result.scalars().all()
        available = [p.lesson for p in progresses if p.status in ("available", "in_progress")]
        # Фильтруем по курсу
        return [lesson for lesson in available if lesson.module.course_id == course_id]

    def _ordered_lessons(self, course: Course) -> List[Lesson]:
        lessons = []
        for module in sorted(course.modules, key=lambda m: m.order_index):
            for lesson in sorted(module.lessons, key=lambda l: l.order_index):
                lessons.append(lesson)
        return lessons

    async def _get_next_lesson(
        self, current_lesson: Lesson, course: Course
    ) -> Optional[Lesson]:
        lessons = self._ordered_lessons(course)
        current_id = current_lesson.id
        idx = next((i for i, l in enumerate(lessons) if l.id == current_id), -1)
        if idx == -1 or idx + 1 >= len(lessons):
            return None
        return lessons[idx + 1]

    async def _ensure_test_passed(self, student_id: int, lesson_id: int) -> None:
        test_result = await self.uow.session.execute(
            select(Test).where(Test.lesson_id == lesson_id, Test.is_active == True)
        )
        test = test_result.scalar_one_or_none()
        if not test:
            return

        attempt_result = await self.uow.session.execute(
            select(TestAttempt)
            .where(TestAttempt.test_id == test.id, TestAttempt.student_id == student_id)
            .order_by(desc(TestAttempt.finished_at))
        )
        latest_attempt = attempt_result.scalars().first()
        if not latest_attempt or not latest_attempt.is_passed:
            raise ValueError(f"Необходимо успешно пройти тест «{test.title}»")

    async def _ensure_homework_approved(self, student_id: int, lesson_id: int) -> None:
        hw_result = await self.uow.session.execute(
            select(Homework).where(Homework.lesson_id == lesson_id, Homework.student_id == student_id)
        )
        homework = hw_result.scalar_one_or_none()
        if not homework:
            raise ValueError("Домашнее задание не назначено")
        if homework.status != "reviewed":
            raise ValueError("Домашнее задание ещё не проверено методистом")

        review_result = await self.uow.session.execute(
            select(HomeworkReview)
            .where(HomeworkReview.homework_id == homework.id)
            .order_by(desc(HomeworkReview.id))
        )
        latest_review = review_result.scalars().first()
        if not latest_review or latest_review.status != "approved":
            raise ValueError("Домашнее задание требует доработки или не принято")

    async def _unlock_lesson(self, enrollment_id: int, lesson_id: int) -> None:
        result = await self.uow.session.execute(
            select(LessonProgress).where(
                LessonProgress.enrollment_id == enrollment_id,
                LessonProgress.lesson_id == lesson_id,
            )
        )
        progress = result.scalar_one_or_none()
        if progress and progress.status == "locked":
            progress.status = "available"
            await self.uow.session.flush()
            await EventBus.publish(
                self.uow,
                SystemEventType.LESSON_AVAILABLE,
                {
                    "student_id": progress.student_id,
                    "lesson_id": lesson_id,
                    "enrollment_id": enrollment_id,
                },
                user_id=progress.student_id,
            )

    async def _update_enrollment_progress(self, enrollment_id: int) -> None:
        result = await self.uow.session.execute(
            select(Enrollment)
            .where(Enrollment.id == enrollment_id)
            .options(
                selectinload(Enrollment.course)
                .selectinload(Course.modules)
                .selectinload(Module.lessons)
            )
        )
        enrollment = result.scalar_one_or_none()
        if not enrollment:
            return

        progress_result = await self.uow.session.execute(
            select(LessonProgress).where(LessonProgress.enrollment_id == enrollment_id)
        )
        progresses = progress_result.scalars().all()
        total = len(progresses)
        completed = sum(1 for p in progresses if p.status == "completed")
        enrollment.progress_percent = int((completed / total) * 100) if total else 0

        if enrollment.progress_percent >= 100:
            enrollment.status = "completed"
            enrollment.completed_at = datetime.utcnow()

        await self.uow.session.flush()
