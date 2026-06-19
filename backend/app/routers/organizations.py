from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.organization import Organization, Branch
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    BranchCreate,
    BranchUpdate,
    BranchResponse,
)
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("")
async def list_organizations(
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).order_by(Organization.created_at.desc()))
    orgs = result.scalars().all()
    return success_response(
        data=[OrganizationResponse.model_validate(o).model_dump() for o in orgs],
        message="Список организаций",
    )


@router.post("")
async def create_organization(
    data: OrganizationCreate,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    org = Organization(**data.model_dump())
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return success_response(
        data=OrganizationResponse.model_validate(org).model_dump(),
        message="Организация создана",
        status_code=201,
    )


@router.get("/{org_id}")
async def get_organization(
    org_id: int,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, org_id)
    if not org:
        return error_response("Организация не найдена", status_code=404)
    return success_response(data=OrganizationResponse.model_validate(org).model_dump())


@router.patch("/{org_id}")
async def update_organization(
    org_id: int,
    data: OrganizationUpdate,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, org_id)
    if not org:
        return error_response("Организация не найдена", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    await db.commit()
    await db.refresh(org)
    return success_response(data=OrganizationResponse.model_validate(org).model_dump(), message="Организация обновлена")


@router.get("/{org_id}/branches")
async def list_branches(
    org_id: int,
    current_user=Depends(require_permission(Permission.BRANCH_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Branch).where(Branch.organization_id == org_id).order_by(Branch.created_at.desc()))
    branches = result.scalars().all()
    return success_response(
        data=[BranchResponse.model_validate(b).model_dump() for b in branches],
        message="Список филиалов",
    )


@router.post("/{org_id}/branches")
async def create_branch(
    org_id: int,
    data: BranchCreate,
    current_user=Depends(require_permission(Permission.BRANCH_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, org_id)
    if not org:
        return error_response("Организация не найдена", status_code=404)
    branch = Branch(organization_id=org_id, **data.model_dump(exclude={"organization_id"}))
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return success_response(
        data=BranchResponse.model_validate(branch).model_dump(),
        message="Филиал создан",
        status_code=201,
    )


@router.patch("/{org_id}/branches/{branch_id}")
async def update_branch(
    org_id: int,
    branch_id: int,
    data: BranchUpdate,
    current_user=Depends(require_permission(Permission.BRANCH_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Branch).where(Branch.id == branch_id, Branch.organization_id == org_id))
    branch = result.scalar_one_or_none()
    if not branch:
        return error_response("Филиал не найден", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(branch, field, value)
    await db.commit()
    await db.refresh(branch)
    return success_response(data=BranchResponse.model_validate(branch).model_dump(), message="Филиал обновлён")
