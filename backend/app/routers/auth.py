from datetime import datetime
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.events import EventBus, SystemEventType
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.schemas.auth import RegisterRequest
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.user_service import UserService
from app.database import get_db
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    user = await service.get_by_email(form_data.username)

    if not user or not verify_password(form_data.password, user.password_hash):
        return error_response("Неверный email или пароль", status_code=status.HTTP_400_BAD_REQUEST)

    if not user.is_active:
        return error_response("Пользователь заблокирован", status_code=status.HTTP_403_FORBIDDEN)

    await service.update_last_login(user)

    await EventBus.publish(
        uow,
        SystemEventType.USER_LOGGED_IN,
        {"user_id": user.id, "email": user.email},
        user_id=user.id,
    )

    token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    })

    return success_response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user).model_dump(),
        },
        message="Вход выполнен успешно",
    )


@router.post("/register")
async def register(
    data: RegisterRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    try:
        user = await service.create_user(
            email=data.email,
            name=data.name,
            password=data.password,
            role=data.role or "student",
        )
    except ValueError as e:
        return error_response(str(e), status_code=status.HTTP_400_BAD_REQUEST)

    await EventBus.publish(
        uow,
        SystemEventType.USER_CREATED,
        {"user_id": user.id, "email": user.email, "role": user.role},
        user_id=user.id,
    )

    token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    })

    return success_response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user).model_dump(),
        },
        message="Регистрация успешна",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/me")
async def me(
    current_user: User = Depends(require_active_user),
):
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="Текущий пользователь",
    )


@router.patch("/me")
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="Профиль обновлён",
    )


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


@router.patch("/me/password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        return error_response("Неверный текущий пароль", status_code=status.HTTP_400_BAD_REQUEST)
    current_user.password_hash = get_password_hash(data.new_password)
    await db.commit()
    await db.refresh(current_user)
    return success_response(data=None, message="Пароль изменён")
