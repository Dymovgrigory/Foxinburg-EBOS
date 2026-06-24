from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import require_active_user
from app.core.responses import success_response, error_response
from app.models.user import User
from app.services.ai_service import AiService
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/ai", tags=["ai"])


class AskRequest(BaseModel):
    message: str
    context: Optional[str] = None


class AskResponse(BaseModel):
    reply: str
    provider: str = "rule"


@router.post("/ask")
async def ask(
    data: AskRequest,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Задать вопрос AI-помощнику."""
    if not data.message or not data.message.strip():
        return error_response("Сообщение не может быть пустым", status_code=400)

    service = AiService(uow)
    reply, provider = await service.get_reply(data.message.strip(), data.context)
    return success_response(
        data=AskResponse(reply=reply, provider=provider).model_dump(),
        message="Ответ от YandexGPT" if provider == "yandexgpt" else "Ответ AI-помощника",
    )
