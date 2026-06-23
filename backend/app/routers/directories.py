from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.directory import Directory
from app.schemas.directory import DirectoryCreate, DirectoryUpdate, DirectoryResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission

router = APIRouter(prefix="/directories", tags=["directories"])


@router.get("")
async def list_directories(
    kind: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    query = select(Directory)
    if kind:
        query = query.where(Directory.kind == kind)
    if search:
        query = query.where(Directory.name.ilike(f"%{search}%"))
    query = query.order_by(Directory.sort_order.asc(), Directory.name.asc())
    result = await db.execute(query)
    directories = result.scalars().all()
    return success_response(
        data=[DirectoryResponse.model_validate(d).model_dump() for d in directories],
        message="Список справочников",
        meta={"total": len(directories)},
    )


@router.post("")
async def create_directory(
    data: DirectoryCreate,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    directory = Directory(**data.model_dump())
    db.add(directory)
    await db.commit()
    await db.refresh(directory)
    return success_response(
        data=DirectoryResponse.model_validate(directory).model_dump(),
        message="Запись справочника создана",
        status_code=201,
    )


@router.get("/{directory_id}")
async def get_directory(
    directory_id: int,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    directory = await db.get(Directory, directory_id)
    if not directory:
        return error_response("Запись не найдена", status_code=404)
    return success_response(data=DirectoryResponse.model_validate(directory).model_dump())


@router.patch("/{directory_id}")
async def update_directory(
    directory_id: int,
    data: DirectoryUpdate,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    directory = await db.get(Directory, directory_id)
    if not directory:
        return error_response("Запись не найдена", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(directory, field, value)
    await db.commit()
    await db.refresh(directory)
    return success_response(
        data=DirectoryResponse.model_validate(directory).model_dump(),
        message="Запись обновлена",
    )


@router.delete("/{directory_id}")
async def delete_directory(
    directory_id: int,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    directory = await db.get(Directory, directory_id)
    if not directory:
        return error_response("Запись не найдена", status_code=404)
    await db.delete(directory)
    await db.commit()
    return success_response(message="Запись удалена")
