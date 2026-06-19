from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.core.security import get_current_active_user
from app.core.permissions import (
    Role,
    require_role,
    can_manage_role,
    MODULE_PERMISSIONS,
    has_permission,
)
from app.core.responses import success_response, error_response

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def list_users(
    current_user: User = Depends(require_role([Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return success_response(
        data=[UserListResponse.model_validate(u).model_dump() for u in users],
        message="Список пользователей",
        meta={"total": len(users)},
    )


@router.post("")
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_role([Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    if not can_manage_role(current_user, data.role):
        return error_response("Вы не можете назначить эту роль", status_code=403)

    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        return error_response("Email уже зарегистрирован", status_code=400)

    from app.core.security import get_password_hash
    user = User(
        email=data.email.lower().strip(),
        name=data.name,
        password_hash=get_password_hash(data.password),
        role=data.role,
        plan=data.plan,
        target_language=data.target_language,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return success_response(
        data=UserResponse.model_validate(user).model_dump(),
        message="Пользователь создан",
        status_code=201,
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_active_user)):
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="Текущий пользователь",
    )
