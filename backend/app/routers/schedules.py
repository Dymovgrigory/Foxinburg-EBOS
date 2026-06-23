from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
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
    """Развёрнутые события для календаря (с учётом recurrence)."""
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
        occurrences.extend(service.generate_occurrences(schedule, from_date, to_date))
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
