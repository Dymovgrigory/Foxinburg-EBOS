from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserListResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission
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


@router.get("/me")
async def get_me(
    current_user=Depends(require_permission(Permission.USER_READ)),
):
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="Текущий пользователь",
    )
