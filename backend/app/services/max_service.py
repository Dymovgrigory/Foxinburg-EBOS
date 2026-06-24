import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class MaxService:
    """Отправка уведомлений через бота МАКС (business.max.ru)."""

    @staticmethod
    async def send_message(
        user_id: str,
        text: str,
        chat_id: Optional[str] = None,
    ) -> bool:
        if not settings.MAX_BOT_TOKEN:
            logger.warning("MAX бот не настроен, сообщение не отправлено")
            return False

        url = f"{settings.MAX_BOT_API_URL.rstrip('/')}/messages"
        params: dict[str, str] = {"user_id": user_id}
        if chat_id:
            params["chat_id"] = chat_id

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    url,
                    params=params,
                    headers={
                        "Authorization": settings.MAX_BOT_TOKEN,
                        "Content-Type": "application/json",
                    },
                    json={"text": text},
                )
            if response.status_code == 200:
                return True
            logger.error(
                "Ошибка отправки MAX: status=%s body=%s",
                response.status_code,
                response.text,
            )
            return False
        except Exception as e:
            logger.exception("Ошибка отправки MAX: %s", e)
            return False
