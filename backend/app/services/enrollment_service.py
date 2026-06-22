from datetime import datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.enrollment import Enrollment
from app.models.user import User
from app.models.chat import ChatRoom
from app.models.course import Course, Module, Lesson
from app.models.homework import Homework
from app.models.employee_group import EmployeeGroup
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.services.progress_service import ProgressService
from app.services.audit_service import AuditService
from app.services.chat_service import ChatService
from app.core.events import EventBus, SystemEventType
from app.utils import utc_now


class EnrollmentService(BaseService[Enrollment]):
    model = Enrollment

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_student_and_course(
        self, student_id: int, course_id: int
    ) -> Optional[Enrollment]:
        result = await self.uow.session.execute(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.course_id == course_id,
            )
        )
        return result.scalar_one_or_none()

    async def enroll_student(
        self,
        *,
        student_id: int,
        course_id: int,
        group_id: Optional[int] = None,
        current_user: Optional[User] = None,
    ) -> Enrollment:
        existing = await self.get_by_student_and_course(student_id, course_id)
        if existing and existing.status == "active":
            raise ValueError("Студент уже зачислен на этот курс")

        enrollment = Enrollment(
            student_id=student_id,
            course_id=course_id,
            group_id=group_id,
            status="active",
            progress_percent=0,
            enrolled_at=utc_now(),
        )
        await self.add(enrollment)

        # Привязываем студента к группе и добавляем в групповой чат
        if group_id:
            student_result = await self.uow.session.execute(
                select(User).where(User.id == student_id)
            )
            student = student_result.scalar_one_or_none()
            if student:
                student.group_id = group_id
                room_result = await self.uow.session.execute(
                    select(ChatRoom.id).where(ChatRoom.group_id == group_id)
                )
                room_id = room_result.scalar_one_or_none()
                if room_id:
                    chat_service = ChatService(self.uow)
                    await chat_service.add_participant(
                        room_id=room_id,
                        user_id=student_id,
                        role="member",
                    )

        # Создаём прогресс по урокам
        progress_service = ProgressService(self.uow)
        await progress_service.create_progress_for_enrollment(enrollment.id)

        # Создаём персональные ДЗ для уроков-формата homework
        await self._create_homeworks_for_enrollment(student_id, course_id)

        await AuditService.log_action(
            self.uow,
            action="CREATE",
            entity_type="enrollment",
            entity_id=enrollment.id,
            new_values={
                "student_id": enrollment.student_id,
                "course_id": enrollment.course_id,
                "group_id": enrollment.group_id,
                "status": enrollment.status,
            },
            user_id=current_user.id if current_user else None,
        )

        await EventBus.publish(
            self.uow,
            SystemEventType.COURSE_ENROLLED,
            {
                "enrollment_id": enrollment.id,
                "student_id": student_id,
                "course_id": course_id,
                "group_id": group_id,
            },
            user_id=current_user.id if current_user else None,
        )
        return enrollment

    async def enroll_employee_group(
        self,
        *,
        group: EmployeeGroup,
        course_id: int,
        current_user: Optional[User] = None,
    ) -> List[Enrollment]:
        """Зачисляет всех участников группы сотрудников на курс."""
        results = []
        for member in group.members:
            existing = await self.get_by_student_and_course(member.id, course_id)
            if existing:
                continue
            enrollment = await self.enroll_student(
                student_id=member.id,
                course_id=course_id,
                group_id=None,
                current_user=current_user,
            )
            results.append(enrollment)
        return results

    async def _create_homeworks_for_enrollment(self, student_id: int, course_id: int) -> None:
        result = await self.uow.session.execute(
            select(Course)
            .where(Course.id == course_id)
            .options(selectinload(Course.modules).selectinload(Module.lessons))
        )
        course = result.scalar_one_or_none()
        if not course:
            return

        for module in course.modules:
            for lesson in module.lessons:
                if lesson.lesson_type == "homework":
                    homework = Homework(
                        lesson_id=lesson.id,
                        student_id=student_id,
                        title=lesson.homework_title or lesson.title,
                        description=lesson.homework_description,
                        status="assigned",
                    )
                    self.uow.session.add(homework)
