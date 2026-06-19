from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, TokenWithUserResponse
from app.schemas.user import UserResponse
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user,
)
from app.core.events import EventBus, SystemEventType
from app.core.responses import success_response, error_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        return error_response("Неверный email или пароль", status_code=status.HTTP_400_BAD_REQUEST)

    if not user.is_active:
        return error_response("Пользователь заблокирован", status_code=status.HTTP_403_FORBIDDEN)

    user.last_login_at = datetime.utcnow()
    await db.commit()

    token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    })

    await EventBus.publish(
        db,
        SystemEventType.USER_LOGGED_IN,
        {"user_id": user.id, "email": user.email},
        user_id=user.id,
    )

    return success_response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user).model_dump(),
        },
        message="Вход выполнен успешно",
    )


@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        return error_response("Email уже зарегистрирован", status_code=status.HTTP_400_BAD_REQUEST)

    user = User(
        email=data.email.lower().strip(),
        name=data.name,
        password_hash=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    })

    await EventBus.publish(
        db,
        SystemEventType.USER_CREATED,
        {"user_id": user.id, "email": user.email, "role": user.role},
        user_id=user.id,
    )

    return success_response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user).model_dump(),
        },
        message="Регистрация успешна",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_active_user)):
    return current_user
