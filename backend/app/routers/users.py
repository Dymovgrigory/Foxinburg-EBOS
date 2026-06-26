from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.file import File
from app.core.permissions import Role
from app.schemas.user import UserCreate, UserResponse, UserListResponse, UserTelegramLink, UserUpdate
from app.schemas.finance import PayrollRequest
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.config import settings
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.user_service import UserService
from app.services.finance_service import FinanceService
from app.services.telegram_service import verify_telegram_widget

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


@router.get("/employees")
async def list_employees(
    role: Optional[str] = None,
    hr_status: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(require_permission(Permission.USER_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    employees = await service.get_employees(role=role, hr_status=hr_status, search=search)
    return success_response(
        data=[UserListResponse.model_validate(u).model_dump() for u in employees],
        message="Список сотрудников",
        meta={"total": len(employees)},
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
        Role.MANAGER.value,
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


@router.get("/{user_id}")
async def get_user(
    user_id: int,
    current_user=Depends(require_permission(Permission.USER_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    user = await service.get_by_id(user_id)
    if not user:
        return error_response("Пользователь не найден", status_code=404)
    return success_response(data=UserResponse.model_validate(user).model_dump())


@router.patch("/{user_id}")
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_user=Depends(require_permission(Permission.USER_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    user = await service.get_by_id(user_id)
    if not user:
        return error_response("Пользователь не найден", status_code=404)
    try:
        updated = await service.update_user(user, data.model_dump(exclude_unset=True), current_user)
        await uow.commit()
        await uow.session.refresh(updated)
        return success_response(data=UserResponse.model_validate(updated).model_dump(), message="Пользователь обновлён")
    except ValueError as e:
        return error_response(str(e), status_code=400)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user=Depends(require_permission(Permission.USER_DELETE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = UserService(uow)
    user = await service.get_by_id(user_id)
    if not user:
        return error_response("Пользователь не найден", status_code=404)
    # Мягкое удаление через деактивацию
    user.is_active = False
    user.hr_status = "fired"
    await uow.commit()
    return success_response(message="Пользователь деактивирован")


@router.get("/me/telegram-info")
async def get_telegram_info(current_user: User = Depends(require_active_user)):
    if not settings.TELEGRAM_BOT_USERNAME:
        return error_response("Telegram-бот не настроен", status_code=404)
    return success_response(
        data={
            "bot_username": settings.TELEGRAM_BOT_USERNAME,
            "bot_link": f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}",
        },
        message="Информация о Telegram-боте",
    )


@router.patch("/me/telegram")
async def link_telegram(
    data: UserTelegramLink,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    chat_id = data.telegram_chat_id

    # Если пришли данные от Telegram Login Widget — проверяем подпись
    if data.hash is not None and data.id is not None:
        widget_data = data.model_dump(exclude_none=True)
        if not verify_telegram_widget(widget_data, settings.TELEGRAM_BOT_TOKEN):
            return error_response("Неверная подпись Telegram", status_code=400)
        chat_id = str(data.id)

    # Обновляем пользователя внутри той же сессии, что и UoW
    result = await uow.session.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        return error_response("Пользователь не найден", status_code=404)

    if chat_id == "":
        user.telegram_chat_id = None
    elif chat_id:
        user.telegram_chat_id = chat_id
    else:
        return error_response("Не передан Telegram ID", status_code=400)

    await uow.commit()
    await uow.session.refresh(user)
    return success_response(
        data=UserResponse.model_validate(user).model_dump(),
        message="Telegram привязан",
    )


@router.get("/{user_id}/documents")
async def list_user_documents(
    user_id: int,
    current_user=Depends(require_permission(Permission.USER_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    result = await uow.session.execute(
        select(File)
        .where(File.entity_type == "staff_document", File.entity_id == user_id)
        .order_by(File.created_at.desc())
    )
    files = result.scalars().all()
    return success_response(
        data=[
            {
                "id": f.id,
                "original_name": f.original_name,
                "public_url": f.public_url,
                "file_type": f.file_type,
                "size_bytes": f.size_bytes,
                "created_at": f.created_at,
            }
            for f in files
        ],
        message="Документы сотрудника",
    )


@router.get("/{user_id}/payroll")
async def employee_payroll(
    user_id: int,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user=Depends(require_permission(Permission.USER_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    from datetime import date as dt
    service = FinanceService(uow)
    today = dt.today()
    start = dt.fromisoformat(from_date) if from_date else today.replace(day=1)
    end = dt.fromisoformat(to_date) if to_date else today
    try:
        result = await service.calculate_teacher_payroll(user_id, start, end)
        return success_response(data=result, message="Расчёт зарплаты сотрудника")
    except ValueError as e:
        return error_response(str(e), status_code=400)
