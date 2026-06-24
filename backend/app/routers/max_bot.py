from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from app.config import settings
from app.core.responses import success_response, error_response
from app.core.dependencies import require_active_user
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.max_service import MaxService
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/max", tags=["max"])


@router.post("/webhook")
async def max_webhook(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
):
    """Принимает события от MAX (bot_started, message_created и др.)."""
    if settings.MAX_WEBHOOK_SECRET:
        received_secret = request.headers.get("X-Max-Bot-Api-Secret")
        if received_secret != settings.MAX_WEBHOOK_SECRET:
            return error_response("Invalid webhook secret", status_code=401)

    try:
        payload = await request.json()
    except Exception:
        return error_response("Invalid JSON", status_code=400)

    updates = payload if isinstance(payload, list) else [payload]
    for update in updates:
        update_type = update.get("type") or update.get("update_type")
        if update_type in ("bot_started", "message_created"):
            user_id = None
            if "sender" in update:
                user_id = str(update["sender"].get("user_id"))
            elif "user" in update:
                user_id = str(update["user"].get("id"))
            elif "payload" in update and isinstance(update["payload"], dict):
                user_id = str(update["payload"].get("user_id"))

            if user_id:
                await MaxService.send_welcome(user_id)

    return success_response(message="OK")


@router.get("/miniapp-info")
async def max_miniapp_info(
    current_user: User = Depends(require_active_user),
):
    bot_info = await MaxService.get_bot_info()
    bot_username = bot_info.get("username") if bot_info else None
    link_token = MaxService.generate_link_token(current_user.id)
    return success_response(
        data={
            "bot_username": bot_username,
            "link_token": link_token,
            "miniapp_url": "https://foxinburg.ru/max-link",
        },
        message="Данные для мини-приложения MAX",
    )


@router.post("/link")
async def max_link(
    data: dict,
    uow: UnitOfWork = Depends(get_uow),
):
    """Привязывает MAX-аккаунт к пользователю Foxinburg из мини-приложения."""
    init_data = data.get("init_data")
    link_token = data.get("token")

    user_id = MaxService.verify_link_token(link_token)
    if not user_id:
        return error_response("Ссылка устарела или недействительна", status_code=400)

    init_info = MaxService.verify_init_data(init_data)
    if not init_info or not init_info.get("user_id"):
        return error_response("Неверные данные MAX", status_code=400)

    result = await uow.session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return error_response("Пользователь не найден", status_code=404)

    user.max_user_id = init_info["user_id"]
    await uow.commit()
    await uow.session.refresh(user)

    return success_response(
        data=UserResponse.model_validate(user).model_dump(),
        message="MAX успешно привязан",
    )
