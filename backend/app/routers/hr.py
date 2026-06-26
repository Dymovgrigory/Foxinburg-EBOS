from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select, and_

from app.models.hr import StaffLeave, StaffKpi
from app.schemas.hr import StaffLeaveCreate, StaffLeaveUpdate, StaffLeaveResponse, StaffKpiCreate, StaffKpiUpdate, StaffKpiResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/hr", tags=["hr"])


# ---------- Leaves ----------

@router.get("/leaves")
async def list_leaves(
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user=Depends(require_permission(Permission.USER_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    query = select(StaffLeave)
    filters = []
    if user_id:
        filters.append(StaffLeave.user_id == user_id)
    if status:
        filters.append(StaffLeave.status == status)
    if filters:
        query = query.where(and_(*filters))
    result = await uow.session.execute(query.order_by(StaffLeave.start_date.desc()))
    leaves = result.scalars().all()
    return success_response(
        data=[StaffLeaveResponse.model_validate(l).model_dump() for l in leaves],
        message="Список отпусков/больничных",
    )


@router.post("/leaves")
async def create_leave(
    data: StaffLeaveCreate,
    current_user=Depends(require_permission(Permission.USER_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    leave = StaffLeave(**data.model_dump())
    uow.session.add(leave)
    await uow.commit()
    await uow.session.refresh(leave)
    return success_response(
        data=StaffLeaveResponse.model_validate(leave).model_dump(),
        message="Запись создана",
        status_code=201,
    )


@router.patch("/leaves/{leave_id}")
async def update_leave(
    leave_id: int,
    data: StaffLeaveUpdate,
    current_user=Depends(require_permission(Permission.USER_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    leave = await uow.session.get(StaffLeave, leave_id)
    if not leave:
        return error_response("Запись не найдена", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(leave, field, value)
    await uow.commit()
    await uow.session.refresh(leave)
    return success_response(data=StaffLeaveResponse.model_validate(leave).model_dump(), message="Запись обновлена")


@router.delete("/leaves/{leave_id}")
async def delete_leave(
    leave_id: int,
    current_user=Depends(require_permission(Permission.USER_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    leave = await uow.session.get(StaffLeave, leave_id)
    if not leave:
        return error_response("Запись не найдена", status_code=404)
    await uow.session.delete(leave)
    await uow.commit()
    return success_response(message="Запись удалена")


# ---------- KPI ----------

@router.get("/kpis")
async def list_kpis(
    user_id: Optional[int] = None,
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    current_user=Depends(require_permission(Permission.USER_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    query = select(StaffKpi)
    filters = []
    if user_id:
        filters.append(StaffKpi.user_id == user_id)
    if period_start and period_end:
        filters.append(
            and_(
                StaffKpi.period_start <= period_end,
                StaffKpi.period_end >= period_start,
            )
        )
    if filters:
        query = query.where(and_(*filters))
    result = await uow.session.execute(query.order_by(StaffKpi.period_start.desc()))
    kpis = result.scalars().all()
    return success_response(
        data=[StaffKpiResponse.model_validate(k).model_dump() for k in kpis],
        message="Список KPI",
    )


@router.post("/kpis")
async def create_kpi(
    data: StaffKpiCreate,
    current_user=Depends(require_permission(Permission.USER_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    kpi = StaffKpi(**data.model_dump())
    uow.session.add(kpi)
    await uow.commit()
    await uow.session.refresh(kpi)
    return success_response(
        data=StaffKpiResponse.model_validate(kpi).model_dump(),
        message="KPI создан",
        status_code=201,
    )


@router.patch("/kpis/{kpi_id}")
async def update_kpi(
    kpi_id: int,
    data: StaffKpiUpdate,
    current_user=Depends(require_permission(Permission.USER_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    kpi = await uow.session.get(StaffKpi, kpi_id)
    if not kpi:
        return error_response("KPI не найден", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(kpi, field, value)
    await uow.commit()
    await uow.session.refresh(kpi)
    return success_response(data=StaffKpiResponse.model_validate(kpi).model_dump(), message="KPI обновлён")


@router.delete("/kpis/{kpi_id}")
async def delete_kpi(
    kpi_id: int,
    current_user=Depends(require_permission(Permission.USER_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    kpi = await uow.session.get(StaffKpi, kpi_id)
    if not kpi:
        return error_response("KPI не найден", status_code=404)
    await uow.session.delete(kpi)
    await uow.commit()
    return success_response(message="KPI удалён")
