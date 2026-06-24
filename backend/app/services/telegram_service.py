import hmac
import hashlib
import logging
from typing import Optional

from telegram import Bot
from telegram.request import HTTPXRequest

from app.config import settings

logger = logging.getLogger(__name__)


class TelegramService:
    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.TELEGRAM_BOT_TOKEN
        self._bot: Optional[Bot] = None

    def _get_bot(self) -> Optional[Bot]:
        if not self.token:
            return None
        if self._bot is None:
            request = None
            if settings.TELEGRAM_PROXY_URL:
                request = HTTPXRequest(proxy_url=settings.TELEGRAM_PROXY_URL)
            self._bot = Bot(token=self.token, request=request)
        return self._bot

    async def send_message(self, chat_id: str, text: str) -> bool:
        bot = self._get_bot()
        if not bot:
            logger.warning("Telegram бот не настроен")
            return False
        try:
            await bot.send_message(chat_id=chat_id, text=text)
            return True
        except Exception as e:
            logger.exception("Ошибка отправки Telegram: %s", e)
            return False


def verify_telegram_widget(data: dict, bot_token: str) -> bool:
    """Проверяет подпись данных от Telegram Login Widget."""
    if not bot_token:
        return False

    data = dict(data)
    received_hash = data.pop("hash", None)
    if not received_hash:
        return False

    # Собираем строку из отсортированных полей, исключая None-значения
    data_check_arr = []
    for key in sorted(data):
        value = data[key]
        if value is None:
            continue
        data_check_arr.append(f"{key}={value}")
    data_check_string = "\n".join(data_check_arr)

    secret_key = hashlib.sha256(bot_token.encode()).digest()
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(computed_hash, received_hash)
