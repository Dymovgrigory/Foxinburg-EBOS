from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.crm import Lead
from app.schemas.crm import LeadCreate, LeadUpdate, LeadResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/demo")
async def create_demo_request(data: LeadCreate, db: AsyncSession = Depends(get_db)):
    """Публичная заявка на демо-доступ."""
    lead = Lead(
        name=data.name,
        email=data.email,
        phone=data.phone,
        source=data.source or "demo_request",
        status="new",
        comment=data.comment,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return success_response(
        data=LeadResponse.model_validate(lead).model_dump(),
        message="Заявка на демо-доступ отправлена",
        status_code=201,
    )


@router.get("")
async def list_leads(
    current_user=Depends(require_permission(Permission.CRM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lead).order_by(Lead.created_at.desc()))
    leads = result.scalars().all()
    return success_response(
        data=[LeadResponse.model_validate(l).model_dump() for l in leads],
        message="Список заявок",
    )


@router.patch("/{lead_id}")
async def update_lead(
    lead_id: int,
    data: LeadUpdate,
    current_user=Depends(require_permission(Permission.CRM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        return error_response("Заявка не найдена", status_code=404)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    await db.commit()
    await db.refresh(lead)
    return success_response(
        data=LeadResponse.model_validate(lead).model_dump(),
        message="Заявка обновлена",
    )
