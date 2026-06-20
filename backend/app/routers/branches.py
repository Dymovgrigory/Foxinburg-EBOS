from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.organization import Branch, Organization
from app.schemas.organization import BranchCreate, BranchUpdate, BranchResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("")
async def list_branches(
    organization_id: Optional[int] = None,
    current_user=Depends(require_permission(Permission.BRANCH_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    query = select(Branch)
    if organization_id:
        query = query.where(Branch.organization_id == organization_id)
    query = query.order_by(Branch.created_at.desc())
    result = await db.execute(query)
    branches = result.scalars().all()
    return success_response(
        data=[BranchResponse.model_validate(b).model_dump() for b in branches],
        message="Список филиалов",
        meta={"total": len(branches)},
    )


@router.post("")
async def create_branch(
    data: BranchCreate,
    current_user=Depends(require_permission(Permission.BRANCH_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, data.organization_id)
    if not org:
        return error_response("Организация не найдена", status_code=404)

    branch = Branch(**data.model_dump())
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return success_response(
        data=BranchResponse.model_validate(branch).model_dump(),
        message="Филиал создан",
        status_code=201,
    )


@router.get("/{branch_id}")
async def get_branch(
    branch_id: int,
    current_user=Depends(require_permission(Permission.BRANCH_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    branch = await db.get(Branch, branch_id)
    if not branch:
        return error_response("Филиал не найден", status_code=404)
    return success_response(
        data=BranchResponse.model_validate(branch).model_dump(),
        message="Филиал",
    )


@router.patch("/{branch_id}")
async def update_branch(
    branch_id: int,
    data: BranchUpdate,
    current_user=Depends(require_permission(Permission.BRANCH_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    branch = await db.get(Branch, branch_id)
    if not branch:
        return error_response("Филиал не найден", status_code=404)

    update_data = data.model_dump(exclude_unset=True)
    if "organization_id" in update_data:
        org = await db.get(Organization, update_data["organization_id"])
        if not org:
            return error_response("Организация не найдена", status_code=404)

    for field, value in update_data.items():
        setattr(branch, field, value)
    await db.commit()
    await db.refresh(branch)
    return success_response(
        data=BranchResponse.model_validate(branch).model_dump(),
        message="Филиал обновлён",
    )


@router.delete("/{branch_id}")
async def delete_branch(
    branch_id: int,
    current_user=Depends(require_permission(Permission.BRANCH_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    branch = await db.get(Branch, branch_id)
    if not branch:
        return error_response("Филиал не найден", status_code=404)
    await db.delete(branch)
    await db.commit()
    return success_response(data=None, message="Филиал удалён")
