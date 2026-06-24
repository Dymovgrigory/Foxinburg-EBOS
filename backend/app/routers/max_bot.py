import logging
from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from app.config import settings
from app.core.responses import success_response, error_response

logger = logging.getLogger(__name__)
from app.core.dependencies import require_active_user
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.ai_service import AiService
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
        logger.warning("MAX webhook update_type=%s payload_keys=%s", update_type, list(update.keys()))

        if update_type == "bot_started":
            user_id = _extract_user_id(update)
            logger.warning("MAX bot_started user_id=%s", user_id)
            if user_id:
                ok = await MaxService.send_welcome(user_id)
                logger.warning("MAX send_welcome result=%s", ok)

        elif update_type == "message_created":
            message = update.get("message") or update
            sender = message.get("sender") or {}
            # Не отвечаем на свои же сообщения
            if sender.get("is_bot"):
                continue
            user_id = str(sender.get("user_id")) if sender.get("user_id") else None
            if not user_id:
                continue
            text = (message.get("body") or {}).get("text", "").strip()
            logger.warning("MAX message_created user_id=%s text=%s", user_id, text)
            lowered = text.lower()
            if lowered in ("/start", "start", "привет"):
                await MaxService.send_welcome(user_id)
            elif lowered in ("/help", "помощь"):
                await MaxService.send_message(
                    user_id,
                    "Доступные возможности:\n"
                    "• Напишите любой вопрос — ответит AI-помощник\n"
                    "• /start — показать приветствие\n"
                    "• /help — эта справка\n\n"
                    "Для привязки аккаунта откройте личный кабинет на сайте.",
                )
            elif lowered.startswith("/"):
                await MaxService.send_message(
                    user_id,
                    "Я не знаю такой команды. Напишите /help или просто задайте вопрос.",
                )
            else:
                await _handle_ai_message(user_id, text, uow)

        elif update_type == "message_callback":
            # Пока просто подтверждаем callback, чтобы кнопка не зависала
            callback_id = update.get("callback_id") or update.get("id")
            if callback_id:
                await MaxService.answer_callback(callback_id)

    return success_response(message="OK")


def _extract_user_id(update: dict) -> Optional[str]:
    if "user_id" in update and update.get("user_id"):
        return str(update["user_id"])
    if "sender" in update:
        return str(update["sender"].get("user_id")) if update["sender"].get("user_id") else None
    if "user" in update:
        return str(update["user"].get("id")) if update["user"].get("id") else None
    if "payload" in update and isinstance(update["payload"], dict):
        return str(update["payload"].get("user_id")) if update["payload"].get("user_id") else None
    return None


async def _handle_ai_message(user_id: str, text: str, uow: UnitOfWork) -> None:
    service = AiService(uow)
    try:
        reply, provider = await service.get_reply(text)
    except Exception:
        reply = (
            "Произошла ошибка при обработке вопроса. "
            "Попробуйте позже или обратитесь к администратору."
        )
        provider = "error"
    prefix = "🤖 AI-помощник:\n\n" if provider in ("yandexgpt", "rule") else ""
    await MaxService.send_message(user_id, f"{prefix}{reply}")


@router.get("/miniapp-info")
async def max_miniapp_info(
    current_user: User = Depends(require_active_user),
):
    bot_info = await MaxService.get_bot_info()
    bot_username = bot_info.get("username") if bot_info else None
    link_token = await MaxService.generate_link_token(current_user.id)
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

    user_id = await MaxService.verify_link_token(link_token)
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
