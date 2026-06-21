from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.core.permissions import Role
from app.schemas.user import UserCreate, UserResponse, UserListResponse, UserTelegramLink
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def list_users(
    current_user=Depends(require_permission(Permission.USER_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    users = await service.get_many()
    return success_response(
        data=[UserListResponse.model_validate(u).model_dump() for u in users],
        message="Список пользователей",
        meta={"total": len(users)},
    )


@router.post("")
async def create_user(
    data: UserCreate,
    current_user=Depends(require_permission(Permission.USER_CREATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    try:
        user = await service.create_user(
            email=data.email,
            name=data.name,
            password=data.password,
            role=data.role,
            plan=data.plan,
            target_language=data.target_language,
            current_user=current_user,
        )
    except ValueError as e:
        return error_response(str(e), status_code=400)

    return success_response(
        data=UserResponse.model_validate(user).model_dump(),
        message="Пользователь создан",
        status_code=201,
    )


@router.get("/students")
async def list_my_students(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    if current_user.role in (
        Role.OWNER.value,
        Role.SUPER_ADMIN.value,
        Role.ADMIN.value,
        Role.METHODIST.value,
    ):
        students = await service.get_students()
    elif current_user.role == Role.TEACHER.value:
        students = await service.get_teacher_students(current_user.id)
    else:
        return error_response("Недостаточно прав", status_code=403)
    return success_response(
        data=[UserListResponse.model_validate(u).model_dump() for u in students],
        message="Список учеников",
    )


@router.get("/me")
async def get_me(
    current_user=Depends(require_permission(Permission.USER_READ)),
):
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="Текущий пользователь",
    )


@router.patch("/me/telegram")
async def link_telegram(
    data: UserTelegramLink,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    current_user.telegram_chat_id = data.telegram_chat_id
    await uow.commit()
    await uow.session.refresh(current_user)
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="Telegram привязан",
    )
