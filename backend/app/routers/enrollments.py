from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.enrollment import EnrollmentCreate, EnrollmentResponse
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.enrollment_service import EnrollmentService

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


@router.get("")
async def list_enrollments(
    current_user=Depends(require_permission(Permission.ENROLLMENT_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    result = await uow.session.execute(select(EnrollmentService.model).order_by(EnrollmentService.model.enrolled_at.desc()))
    enrollments = result.scalars().all()
    return success_response(
        data=[EnrollmentResponse.model_validate(e).model_dump() for e in enrollments],
        message="Список зачислений",
        meta={"total": len(enrollments)},
    )


@router.post("")
async def create_enrollment(
    data: EnrollmentCreate,
    current_user=Depends(require_permission(Permission.ENROLLMENT_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EnrollmentService(uow)
    try:
        enrollment = await service.enroll_student(
            student_id=data.student_id,
            course_id=data.course_id,
            group_id=data.group_id,
            current_user=current_user,
        )
    except ValueError as e:
        return error_response(str(e), status_code=400)
    return success_response(
        data=EnrollmentResponse.model_validate(enrollment).model_dump(),
        message="Студент зачислен",
        status_code=201,
    )
