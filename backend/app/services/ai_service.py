from typing import Optional

import httpx
from sqlalchemy import select

from app.config import settings
from app.models.knowledge import KnowledgeArticle
from app.services.unit_of_work import UnitOfWork

YANDEXGPT_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"


def _rule_reply(message: str, articles: list[KnowledgeArticle]) -> str:
    lowered = message.lower()

    if any(w in lowered for w in ("привет", "здравствуй")):
        return (
            "Привет! Я AI-помощник FOXINBURG EBOS. "
            "Задавайте вопросы по платформе, Академии педагогов, расписанию или домашним заданиям."
        )
    if any(w in lowered for w in ("сертификат", "сертификация")):
        return (
            "Сертификат Академии педагогов доступен после завершения всех модулей "
            "в разделе «Сертификация»."
        )
    if any(w in lowered for w in ("академия", "курс", "модуль")):
        return (
            "Академия педагогов находится в разделе «Академия педагогов». "
            "После прохождения всех модулей откроется сертификат."
        )
    if any(w in lowered for w in ("расписание", "урок", "занятие")):
        return "Ваше расписание доступно в разделе «Календарь» (преподаватель)."
    if any(w in lowered for w in ("дз", "домашн", "задани")):
        return (
            "Домашние задания находятся в разделе «Домашние задания». "
            "Педагоги видят свои задания; методисты и администраторы могут проверять работы."
        )
    if any(w in lowered for w in ("база знаний", "статья", "материал")):
        return "Полезные материалы собраны в разделе «База знаний»."
    if any(w in lowered for w in ("контакт", "поддержка", "помощь")):
        return "Для технической поддержки обратитесь к администратору школы или методисту."

    if articles:
        titles = "\n".join(f"• {a.title}" for a in articles[:5])
        return (
            f"Возможно, вам помогут статьи из базы знаний:\n{titles}\n\n"
            "Уточните вопрос — я постараюсь дать более точный ответ."
        )

    return (
        "Я пока не знаю точного ответа на этот вопрос. "
        "Попробуйте переформулировать или обратитесь к методисту/администратору."
    )


async def _yandexgpt_reply(message: str, context: Optional[str] = None) -> Optional[str]:
    api_key = getattr(settings, "YANDEXGPT_API_KEY", "")
    folder_id = getattr(settings, "YANDEXGPT_FOLDER_ID", "")
    if not api_key or not folder_id:
        return None

    system_prompt = (
        "Ты полезный ассистент образовательной платформы FOXINBURG EBOS. "
        "Отвечай кратко, по делу, на русском языке. "
        "Если не знаешь ответа, предложи обратиться к методисту или администратору."
    )
    if context:
        system_prompt += f"\nКонтекст разговора: {context}"

    payload = {
        "modelUri": f"gpt://{folder_id}/yandexgpt-lite",
        "completionOptions": {"stream": False, "temperature": 0.3, "maxTokens": 800},
        "messages": [
            {"role": "system", "text": system_prompt},
            {"role": "user", "text": message},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                YANDEXGPT_URL,
                headers={
                    "Authorization": f"Api-Key {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            alternatives = data.get("result", {}).get("alternatives", [])
            if alternatives:
                return alternatives[0].get("message", {}).get("text", "")
    except Exception:
        return None
    return None


class AiService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def get_reply(self, message: str, context: Optional[str] = None) -> tuple[str, str]:
        query = f"%{message.strip()[:50]}%"
        result = await self.uow.session.execute(
            select(KnowledgeArticle)
            .where(KnowledgeArticle.is_published == True)
            .where(KnowledgeArticle.title.ilike(query))
            .limit(5)
        )
        articles = list(result.scalars().all())

        llm_reply = await _yandexgpt_reply(message.strip(), context)
        if llm_reply:
            return llm_reply, "yandexgpt"

        return _rule_reply(message.strip(), articles), "rule"
