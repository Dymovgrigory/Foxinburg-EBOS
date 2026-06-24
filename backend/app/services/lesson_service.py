from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.course import Lesson
from app.models.test import Test, TestQuestion
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService


class LessonService(BaseService[Lesson]):
    model = Lesson

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, lesson_id: int) -> Optional[Lesson]:
        result = await self.uow.session.execute(
            select(Lesson)
            .where(Lesson.id == lesson_id)
            .options(
                selectinload(Lesson.module),
                selectinload(Lesson.tests).selectinload(Test.questions),
                selectinload(Lesson.homeworks),
                selectinload(Lesson.contents),
            )
        )
        return result.scalar_one_or_none()

    async def list_by_module(self, module_id: int) -> List[Lesson]:
        result = await self.uow.session.execute(
            select(Lesson).where(Lesson.module_id == module_id).order_by(Lesson.order_index)
        )
        return list(result.scalars().all())

    async def create_lesson(
        self,
        *,
        module_id: int,
        title: str,
        description: Optional[str] = None,
        lesson_type: str = "text",
        order_index: int = 0,
        duration_minutes: int = 15,
        is_active: bool = True,
        homework_title: Optional[str] = None,
        homework_description: Optional[str] = None,
        test: Optional[dict] = None,
        homework: Optional[dict] = None,
    ) -> Lesson:
        if lesson_type == "homework" and homework:
            homework_title = homework.get("title") or homework_title or title
            homework_description = homework.get("description") or homework_description

        lesson = Lesson(
            module_id=module_id,
            title=title,
            description=description,
            lesson_type=lesson_type,
            order_index=order_index,
            duration_minutes=duration_minutes,
            is_active=is_active,
            homework_title=homework_title,
            homework_description=homework_description,
        )
        await self.add(lesson)

        if lesson_type == "test" and test:
            await self._create_test_for_lesson(lesson, test)

        return lesson

    async def update_lesson(
        self,
        lesson: Lesson,
        *,
        title: Optional[str] = None,
        description: Optional[str] = None,
        lesson_type: Optional[str] = None,
        order_index: Optional[int] = None,
        duration_minutes: Optional[int] = None,
        is_active: Optional[bool] = None,
        homework_title: Optional[str] = None,
        homework_description: Optional[str] = None,
        test: Optional[dict] = None,
        homework: Optional[dict] = None,
    ) -> Lesson:
        old_type = lesson.lesson_type
        if title is not None:
            lesson.title = title
        if description is not None:
            lesson.description = description
        if lesson_type is not None:
            lesson.lesson_type = lesson_type
        if order_index is not None:
            lesson.order_index = order_index
        if duration_minutes is not None:
            lesson.duration_minutes = duration_minutes
        if is_active is not None:
            lesson.is_active = is_active

        new_type = lesson.lesson_type

        if new_type == "homework":
            if homework:
                lesson.homework_title = homework.get("title") or lesson.title
                lesson.homework_description = homework.get("description")
            elif homework_title is not None:
                lesson.homework_title = homework_title
            if homework_description is not None:
                lesson.homework_description = homework_description

        # Если тип урока меняется с теста на другой — удаляем тест
        if old_type == "test" and new_type != "test":
            await self._delete_test_for_lesson(lesson)

        # Если урок тестовый — обновляем/создаём тест
        if new_type == "test" and test:
            await self._delete_test_for_lesson(lesson)
            await self._create_test_for_lesson(lesson, test)

        await self.uow.session.flush()
        await self.uow.session.refresh(lesson)
        return lesson

    async def delete_lesson(self, lesson: Lesson) -> None:
        await self.uow.session.delete(lesson)

    async def _create_test_for_lesson(self, lesson: Lesson, test: dict) -> Test:
        test_obj = Test(
            lesson_id=lesson.id,
            title=test.get("title") or lesson.title,
            description=test.get("description"),
            passing_score=test.get("passing_score", 70),
            time_limit_minutes=test.get("time_limit_minutes"),
            max_attempts=test.get("max_attempts", 3),
            is_active=True,
        )
        self.uow.session.add(test_obj)
        await self.uow.session.flush()
        await self.uow.session.refresh(test_obj)

        questions = test.get("questions", [])
        for idx, q in enumerate(questions):
            question = TestQuestion(
                test_id=test_obj.id,
                question_text=q.get("question_text"),
                question_type=q.get("question_type", "single"),
                options=q.get("options"),
                correct_answers=q.get("correct_answers"),
                points=q.get("points", 1),
                order_index=q.get("order_index", idx),
            )
            self.uow.session.add(question)

        return test_obj

    async def _delete_test_for_lesson(self, lesson: Lesson) -> None:
        result = await self.uow.session.execute(select(Test).where(Test.lesson_id == lesson.id))
        existing = result.scalar_one_or_none()
        if existing:
            await self.uow.session.delete(existing)
