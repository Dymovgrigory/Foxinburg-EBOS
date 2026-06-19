from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.crm import Deal
from app.schemas.crm import DealCreate, DealUpdate, DealResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("")
async def list_deals(
    current_user=Depends(require_permission(Permission.CRM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Deal).order_by(Deal.created_at.desc()))
    deals = result.scalars().all()
    return success_response(
        data=[DealResponse.model_validate(d).model_dump() for d in deals],
        message="Список сделок",
    )


@router.post("")
async def create_deal(
    data: DealCreate,
    current_user=Depends(require_permission(Permission.CRM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    deal = Deal(**data.model_dump())
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    return success_response(
        data=DealResponse.model_validate(deal).model_dump(),
        message="Сделка создана",
        status_code=201,
    )


@router.get("/{deal_id}")
async def get_deal(
    deal_id: int,
    current_user=Depends(require_permission(Permission.CRM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        return error_response("Сделка не найдена", status_code=404)
    return success_response(data=DealResponse.model_validate(deal).model_dump())


@router.patch("/{deal_id}")
async def update_deal(
    deal_id: int,
    data: DealUpdate,
    current_user=Depends(require_permission(Permission.CRM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        return error_response("Сделка не найдена", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(deal, field, value)
    await db.commit()
    await db.refresh(deal)
    return success_response(data=DealResponse.model_validate(deal).model_dump(), message="Сделка обновлена")


@router.delete("/{deal_id}")
async def delete_deal(
    deal_id: int,
    current_user=Depends(require_permission(Permission.CRM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        return error_response("Сделка не найдена", status_code=404)
    await db.delete(deal)
    await db.commit()
    return success_response(message="Сделка удалена")
