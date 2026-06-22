import hashlib
from datetime import datetime, timezone
from typing import Optional, Tuple

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.config import settings
from app.services.redis_client import get_redis

_serializer = URLSafeTimedSerializer(
    secret_key=settings.CONTENT_TOKEN_SECRET or settings.JWT_SECRET,
    salt="foxinburg-content-token",
)

TOKEN_MAX_AGE_SECONDS = int(getattr(settings, "CONTENT_TOKEN_MAX_AGE", 600))
TOKEN_MAX_USES = int(getattr(settings, "CONTENT_TOKEN_MAX_USES", 100))


class ContentTokenError(Exception):
    pass


class ContentTokenExpired(ContentTokenError):
    pass


class ContentTokenInvalid(ContentTokenError):
    pass


def _redis_key(token: str) -> str:
    return f"content_token:{hashlib.sha256(token.encode()).hexdigest()}"


async def create_content_token(*, content_id: int, user_id: int) -> str:
    """Создаёт подписанный content-токен, привязанный к материалу и пользователю."""
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "content_id": content_id,
        "user_id": user_id,
        "created_at": now,
    }
    token = _serializer.dumps(data)
    redis = await get_redis()
    await redis.setex(
        _redis_key(token),
        TOKEN_MAX_AGE_SECONDS,
        "0",
    )
    return token


async def validate_content_token(token: str) -> Tuple[int, int]:
    """Проверяет подпись, срок действия и количество использований токена.

    Возвращает (content_id, user_id). При каждой валидации увеличивает счётчик использований.
    """
    try:
        data = _serializer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired as exc:
        raise ContentTokenExpired("Токен истёк") from exc
    except BadSignature as exc:
        raise ContentTokenInvalid("Недействительный токен") from exc

    content_id = data.get("content_id")
    user_id = data.get("user_id")
    if not isinstance(content_id, int) or not isinstance(user_id, int):
        raise ContentTokenInvalid("Некорректный токен")

    redis = await get_redis()
    key = _redis_key(token)
    # Если ключ отсутствует — токен отозван или истёк
    if not await redis.exists(key):
        raise ContentTokenInvalid("Токен недействителен")
    uses = await redis.incr(key)
    if uses > TOKEN_MAX_USES:
        await redis.delete(key)
        raise ContentTokenInvalid("Превышено количество использований токена")

    ttl = await redis.ttl(key)
    if ttl <= 0:
        await redis.delete(key)
        raise ContentTokenExpired("Токен истёк")

    return content_id, user_id


async def revoke_content_token(token: str) -> None:
    """Отзывает токен досрочно."""
    redis = await get_redis()
    await redis.delete(_redis_key(token))
