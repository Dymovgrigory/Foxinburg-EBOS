from datetime import datetime
from typing import Optional
from sqlalchemy import select

from app.models.enrollment import Enrollment
from app.models.user import User
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.services.progress_service import ProgressService
from app.services.audit_service import AuditService
from app.core.events import EventBus, SystemEventType


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
            enrolled_at=datetime.utcnow(),
        )
        await self.add(enrollment)

        # Создаём прогресс по урокам
        progress_service = ProgressService(self.uow)
        await progress_service.create_progress_for_enrollment(enrollment.id)

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
