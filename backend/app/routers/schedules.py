from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.schedule import (
    ScheduleCreate, ScheduleUpdate, ScheduleResponse,
    ScheduleExceptionCreate, ScheduleExceptionUpdate, ScheduleExceptionResponse,
)
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("")
async def list_schedules(
    group_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    room: Optional[str] = None,
    status: Optional[str] = None,
    start_from: Optional[datetime] = None,
    start_to: Optional[datetime] = None,
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ScheduleService(uow)
    schedules = await service.list_schedules(
        group_id=group_id,
        teacher_id=teacher_id,
        branch_id=branch_id,
        room=room,
        status=status,
        start_from=start_from,
        start_to=start_to,
    )
    return success_response(
        data=[ScheduleResponse.model_validate(s).model_dump() for s in schedules],
        message="Список занятий",
        meta={"total": len(schedules)},
    )


@router.get("/calendar")
async def calendar_schedules(
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    group_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    room: Optional[str] = None,
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    """Развёрнутые события для календаря (с учётом recurrence и исключений)."""
    if not from_date:
        from_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if not to_date:
        to_date = from_date + timedelta(days=7)
    service = ScheduleService(uow)
    schedules = await service.list_schedules(
        group_id=group_id,
        teacher_id=teacher_id,
        branch_id=branch_id,
        room=room,
        start_from=from_date - timedelta(days=365),
        start_to=to_date,
        limit=500,
    )
    occurrences = []
    for schedule in schedules:
        occurrences.extend(await service.generate_occurrences(schedule, from_date, to_date))
    occurrences.sort(key=lambda x: x["start_time"])
    return success_response(
        data=occurrences,
        message="Календарь занятий",
        meta={"total": len(occurrences)},
    )


@router.post("")
async def create_schedule(
    data: ScheduleCreate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ScheduleService(uow)
    try:
        schedule = await service.create_schedule(
            title=data.title,
            group_id=data.group_id,
            teacher_id=data.teacher_id,
            start_time=data.start_time,
            end_time=data.end_time,
            description=data.description,
            branch_id=data.branch_id,
            course_id=data.course_id,
            lesson_id=data.lesson_id,
            room=data.room,
            recurrence=data.recurrence,
            recurrence_end=data.recurrence_end,
            status=data.status,
            color=data.color,
            is_online=data.is_online,
            topic=data.topic,
            replacement_teacher_id=data.replacement_teacher_id,
        )
    except ValueError as e:
        return error_response(str(e), status_code=409)
    return success_response(
        data=ScheduleResponse.model_validate(schedule).model_dump(),
        message="Занятие создано",
        status_code=201,
    )


@router.get("/{schedule_id}")
async def get_schedule(
    schedule_id: int,
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ScheduleService(uow)
    schedule = await service.get_by_id(schedule_id)
    if not schedule:
        return error_response("Занятие не найдено", status_code=404)
    return success_response(
        data=ScheduleResponse.model_validate(schedule).model_dump(),
        message="Занятие",
    )


@router.patch("/{schedule_id}")
async def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ScheduleService(uow)
    try:
        schedule = await service.update_schedule(schedule_id, data=data.model_dump(exclude_unset=True))
    except ValueError as e:
        return error_response(str(e), status_code=409)
    if not schedule:
        return error_response("Занятие не найдено", status_code=404)
    await uow.commit()
    await uow.session.refresh(schedule)
    return success_response(
        data=ScheduleResponse.model_validate(schedule).model_dump(),
        message="Занятие обновлено",
    )


@router.patch("/{schedule_id}/conduct")
async def conduct_schedule(
    schedule_id: int,
    current_user=Depends(require_permission(Permission.ATTENDANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    """Отметить занятие проведённым.

    Доступно тем, кто ведёт посещаемость (педагог/методист/админ) по праву
    ATTENDANCE_MANAGE, в отличие от полного редактирования расписания
    (GROUP_MANAGE). Используется при сохранении посещаемости.
    """
    service = ScheduleService(uow)
    try:
        schedule = await service.update_schedule(schedule_id, data={"status": "completed"})
    except ValueError as e:
        return error_response(str(e), status_code=409)
    if not schedule:
        return error_response("Занятие не найдено", status_code=404)
    await uow.commit()
    await uow.session.refresh(schedule)
    return success_response(
        data=ScheduleResponse.model_validate(schedule).model_dump(),
        message="Занятие проведено",
    )


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ScheduleService(uow)
    schedule = await service.delete_schedule(schedule_id)
    if not schedule:
        return error_response("Занятие не найдено", status_code=404)
    await uow.commit()
    return success_response(data=None, message="Занятие удалено")


# ---------- Schedule exceptions ----------

@router.get("/{schedule_id}/exceptions")
async def list_schedule_exceptions(
    schedule_id: int,
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ScheduleService(uow)
    schedule = await service.get_by_id(schedule_id)
    if not schedule:
        return error_response("Занятие не найдено", status_code=404)
    exceptions = await service.list_exceptions(schedule_id)
    return success_response(
        data=[ScheduleExceptionResponse.model_validate(e).model_dump() for e in exceptions],
        message="Исключения расписания",
    )


@router.post("/{schedule_id}/exceptions")
async def create_schedule_exception(
    schedule_id: int,
    data: ScheduleExceptionCreate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ScheduleService(uow)
    schedule = await service.get_by_id(schedule_id)
    if not schedule:
        return error_response("Занятие не найдено", status_code=404)
    try:
        exception = await service.create_or_update_exception(
            schedule_id=schedule_id,
            exception_date=data.exception_date,
            data=data.model_dump(exclude={"exception_date"}, exclude_unset=True),
        )
        await uow.commit()
        await uow.session.refresh(exception)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    return success_response(
        data=ScheduleExceptionResponse.model_validate(exception).model_dump(),
        message="Исключение создано",
        status_code=201,
    )


@router.patch("/{schedule_id}/exceptions/{exception_date}")
async def update_schedule_exception(
    schedule_id: int,
    exception_date: str,
    data: ScheduleExceptionUpdate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    from datetime import date as dt_date
    parsed_date = dt_date.fromisoformat(exception_date)
    service = ScheduleService(uow)
    try:
        exception = await service.create_or_update_exception(
            schedule_id=schedule_id,
            exception_date=parsed_date,
            data=data.model_dump(exclude_unset=True),
        )
        await uow.commit()
        await uow.session.refresh(exception)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    return success_response(
        data=ScheduleExceptionResponse.model_validate(exception).model_dump(),
        message="Исключение обновлено",
    )


@router.delete("/{schedule_id}/exceptions/{exception_date}")
async def delete_schedule_exception(
    schedule_id: int,
    exception_date: str,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    from datetime import date as dt_date
    parsed_date = dt_date.fromisoformat(exception_date)
    service = ScheduleService(uow)
    deleted = await service.delete_exception(schedule_id, parsed_date)
    if not deleted:
        return error_response("Исключение не найдено", status_code=404)
    await uow.commit()
    return success_response(data=None, message="Исключение удалено")
