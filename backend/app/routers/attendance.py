from typing import Optional
from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.schedule import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.schedule_service import ScheduleService, AttendanceService
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("/schedule/{schedule_id}")
async def list_attendance_by_schedule(
    schedule_id: int,
    current_user=Depends(require_permission(Permission.ATTENDANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    schedule_service = ScheduleService(uow)
    schedule = await schedule_service.get_by_id(schedule_id)
    if not schedule:
        return error_response("Занятие не найдено", status_code=404)

    service = AttendanceService(uow)
    attendances = await service.list_by_schedule(schedule_id)
    return success_response(
        data=[AttendanceResponse.model_validate(a).model_dump() for a in attendances],
        message="Посещаемость по занятию",
        meta={"total": len(attendances)},
    )


@router.get("/student/{student_id}")
async def list_attendance_by_student(
    student_id: int,
    current_user=Depends(require_permission(Permission.ATTENDANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = AttendanceService(uow)
    attendances = await service.list_by_student(student_id)
    return success_response(
        data=[AttendanceResponse.model_validate(a).model_dump() for a in attendances],
        message="Посещаемость ученика",
        meta={"total": len(attendances)},
    )


@router.post("")
async def mark_attendance(
    data: AttendanceCreate,
    current_user=Depends(require_permission(Permission.ATTENDANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = AttendanceService(uow)
    schedule_service = ScheduleService(uow)
    finance_service = FinanceService(uow)

    schedule = await schedule_service.get_by_id(data.schedule_id)
    if not schedule:
        return error_response("Занятие не найдено", status_code=404)

    attendance = await service.mark_attendance(
        schedule_id=data.schedule_id,
        student_id=data.student_id,
        status=data.status,
        marked_by_id=current_user.id,
        notes=data.notes,
    )

    # Автоматическое списание с баланса за занятие
    await finance_service.charge_for_lesson(schedule, data.student_id, data.status)

    # При отметке посещаемости занятие считается проведённым
    if schedule.status != "completed":
        schedule.status = "completed"
        await uow.session.flush()

    await uow.commit()
    await uow.session.refresh(attendance)
    return success_response(
        data=AttendanceResponse.model_validate(attendance).model_dump(),
        message="Посещаемость отмечена",
        status_code=201,
    )


@router.patch("/{attendance_id}")
async def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    current_user=Depends(require_permission(Permission.ATTENDANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = AttendanceService(uow)
    attendance = await service.get_by_id(attendance_id)
    if not attendance:
        return error_response("Запись посещаемости не найдена", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(attendance, field, value)
    attendance.marked_by_id = current_user.id
    await uow.commit()
    await uow.session.refresh(attendance)
    return success_response(
        data=AttendanceResponse.model_validate(attendance).model_dump(),
        message="Посещаемость обновлена",
    )
