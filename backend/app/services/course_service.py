from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.course import Course, Module
from app.models.user import User
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.services.audit_service import AuditService
from app.core.events import EventBus, SystemEventType


class CourseService(BaseService[Course]):
    model = Course

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, course_id: int) -> Optional[Course]:
        result = await self.uow.session.execute(
            select(Course)
            .where(Course.id == course_id)
            .options(selectinload(Course.modules).selectinload(Module.lessons))
        )
        return result.scalar_one_or_none()

    async def list_courses(self, *, status: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Course]:
        query = select(Course).options(
            selectinload(Course.modules).selectinload(Module.lessons)
        )
        if status:
            query = query.where(Course.status == status)
        query = query.limit(limit).offset(offset)
        result = await self.uow.session.execute(query)
        return list(result.scalars().all())

    async def create_course(
        self,
        *,
        title: str,
        description: Optional[str] = None,
        short_description: Optional[str] = None,
        type_: str = "academy",
        status: str = "draft",
        passing_score: int = 70,
        is_sequential: bool = True,
        certificate_enabled: bool = True,
        organization_id: Optional[int] = None,
        author: Optional[User] = None,
    ) -> Course:
        course = Course(
            title=title,
            description=description,
            short_description=short_description,
            type=type_,
            status=status,
            passing_score=passing_score,
            is_sequential=is_sequential,
            certificate_enabled=certificate_enabled,
            organization_id=organization_id,
            author_id=author.id if author else None,
        )
        await self.add(course)

        await AuditService.log_action(
            self.uow,
            action="CREATE",
            entity_type="course",
            entity_id=course.id,
            new_values={"title": title, "type": type_, "status": status},
            user_id=author.id if author else None,
        )

        await EventBus.publish(
            self.uow,
            SystemEventType.COURSE_CREATED,
            {"course_id": course.id, "title": course.title},
            user_id=author.id if author else None,
        )
        return await self.get_by_id(course.id)

    async def update_course(
        self,
        course: Course,
        *,
        title: Optional[str] = None,
        description: Optional[str] = None,
        short_description: Optional[str] = None,
        status: Optional[str] = None,
        passing_score: Optional[int] = None,
        is_sequential: Optional[bool] = None,
        certificate_enabled: Optional[bool] = None,
    ) -> Course:
        if title is not None:
            course.title = title
        if description is not None:
            course.description = description
        if short_description is not None:
            course.short_description = short_description
        if status is not None:
            course.status = status
        if passing_score is not None:
            course.passing_score = passing_score
        if is_sequential is not None:
            course.is_sequential = is_sequential
        if certificate_enabled is not None:
            course.certificate_enabled = certificate_enabled
        await self.uow.session.flush()
        await self.uow.session.refresh(course)
        return await self.get_by_id(course.id)

    async def delete_course(self, course: Course) -> None:
        await self.uow.session.delete(course)
