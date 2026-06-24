import hashlib
import hmac
import logging
import secrets
import urllib.parse
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class MaxService:
    """Отправка уведомлений и работа с ботом МАКС (business.max.ru)."""

    @staticmethod
    async def get_bot_info() -> Optional[dict]:
        if not settings.MAX_BOT_TOKEN:
            return None
        url = f"{settings.MAX_BOT_API_URL.rstrip('/')}/me"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    url,
                    headers={"Authorization": settings.MAX_BOT_TOKEN},
                )
            if response.status_code == 200:
                return response.json()
            logger.error("Ошибка MAX /me: status=%s body=%s", response.status_code, response.text)
            return None
        except Exception as e:
            logger.exception("Ошибка MAX /me: %s", e)
            return None

    @staticmethod
    async def send_message(
        user_id: str,
        text: str,
        chat_id: Optional[str] = None,
        attachments: Optional[list] = None,
    ) -> bool:
        if not settings.MAX_BOT_TOKEN:
            logger.warning("MAX бот не настроен, сообщение не отправлено")
            return False

        url = f"{settings.MAX_BOT_API_URL.rstrip('/')}/messages"
        params: dict[str, str] = {"user_id": user_id}
        if chat_id:
            params["chat_id"] = chat_id

        body: dict = {"text": text}
        if attachments:
            body["attachments"] = attachments

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    url,
                    params=params,
                    headers={
                        "Authorization": settings.MAX_BOT_TOKEN,
                        "Content-Type": "application/json",
                    },
                    json=body,
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

    @staticmethod
    async def answer_callback(callback_id: str, notification: Optional[str] = None) -> bool:
        if not settings.MAX_BOT_TOKEN:
            return False
        url = f"{settings.MAX_BOT_API_URL.rstrip('/')}/answers"
        params = {"callback_id": callback_id}
        body: dict = {}
        if notification:
            body["notification"] = notification
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    url,
                    params=params,
                    headers={
                        "Authorization": settings.MAX_BOT_TOKEN,
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
            return response.status_code == 200
        except Exception as e:
            logger.exception("Ошибка answer_callback MAX: %s", e)
            return False

    @staticmethod
    async def send_welcome(user_id: str) -> bool:
        logger.warning("MAX send_welcome called for user_id=%s token_set=%s", user_id, bool(settings.MAX_BOT_TOKEN))
        text = (
            "Добро пожаловать в Foxinburg! 🦊\n\n"
            "Здесь вы будете получать уведомления о занятиях, домашних заданиях и курсах.\n\n"
            "А ещё вы можете задать вопрос нашему AI-помощнику — просто напишите сообщение."
        )
        attachments = [
            {
                "type": "inline_keyboard",
                "payload": {
                    "buttons": [
                        [
                            {
                                "type": "link",
                                "text": "О школе",
                                "url": "https://foxinburg.ru",
                            }
                        ],
                        [
                            {
                                "type": "link",
                                "text": "Курсы",
                                "url": "https://foxinburg.ru/courses",
                            }
                        ],
                        [
                            {
                                "type": "link",
                                "text": "Привязать аккаунт",
                                "url": "https://foxinburg.ru/settings",
                            }
                        ],
                        [
                            {
                                "type": "link",
                                "text": "Поддержка",
                                "url": "https://foxinburg.ru",
                            }
                        ],
                    ]
                },
            }
        ]
        return await MaxService.send_message(user_id, text, attachments=attachments)

    @staticmethod
    async def generate_link_token(user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        # start_param в MAX допускает только A-Za-z0-9_-
        token = "".join(c for c in token if c.isalnum() or c in "_-")
        try:
            from app.services.redis_client import get_redis

            redis = await get_redis()
            await redis.setex(f"max:link:{token}", 600, str(user_id))
        except Exception:
            logger.exception("Ошибка записи MAX link token в Redis")
        return token

    @staticmethod
    async def verify_link_token(token: str) -> Optional[int]:
        try:
            from app.services.redis_client import get_redis

            redis = await get_redis()
            user_id = await redis.get(f"max:link:{token}")
            if user_id:
                await redis.delete(f"max:link:{token}")
                return int(user_id)
        except Exception:
            logger.exception("Ошибка чтения MAX link token из Redis")
        return None

    @staticmethod
    def verify_init_data(init_data: str) -> Optional[dict]:
        """Проверяет подпись initData из MAX Bridge и возвращает user.id."""
        if not settings.MAX_BOT_TOKEN or not init_data:
            return None

        parsed = urllib.parse.parse_qs(init_data)
        received_hash = parsed.pop("hash", [None])[0]
        if not received_hash:
            return None

        data_pairs = []
        for key in sorted(parsed.keys()):
            for value in sorted(parsed[key]):
                data_pairs.append(f"{key}={value}")
        data_check_string = "\n".join(data_pairs)

        secret = hmac.new(
            key=b"WebAppData",
            msg=settings.MAX_BOT_TOKEN.encode(),
            digestmod=hashlib.sha256,
        ).digest()
        computed_hash = hmac.new(
            key=secret,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(computed_hash, received_hash):
            return None

        user_raw = parsed.get("user", ["{}"])[0]
        try:
            import json

            user = json.loads(user_raw)
            return {"user_id": str(user.get("id"))}
        except Exception:
            return None
