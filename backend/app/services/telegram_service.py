import logging
from typing import Optional

from telegram import Bot

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
            self._bot = Bot(token=self.token)
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
