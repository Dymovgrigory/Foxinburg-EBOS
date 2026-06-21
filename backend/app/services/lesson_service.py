from typing import List, Optional
from sqlalchemy import select

from app.models.course import Lesson
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService


class LessonService(BaseService[Lesson]):
    model = Lesson

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, lesson_id: int) -> Optional[Lesson]:
        result = await self.uow.session.execute(select(Lesson).where(Lesson.id == lesson_id))
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
    ) -> Lesson:
        lesson = Lesson(
            module_id=module_id,
            title=title,
            description=description,
            lesson_type=lesson_type,
            order_index=order_index,
            duration_minutes=duration_minutes,
            is_active=is_active,
        )
        await self.add(lesson)
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
    ) -> Lesson:
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
        await self.uow.session.flush()
        await self.uow.session.refresh(lesson)
        return lesson

    async def delete_lesson(self, lesson: Lesson) -> None:
        await self.uow.session.delete(lesson)
