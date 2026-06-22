from typing import Optional

from app.services.redis_client import get_redis


class RateLimitExceeded(Exception):
    pass


async def check_rate_limit(
    key: str,
    *,
    max_requests: int,
    window_seconds: int,
    increment: int = 1,
) -> None:
    """Простой sliding-window rate limiter на Redis.

    Ключ должен быть уникальным для лимитируемой операции.
    """
    redis = await get_redis()
    pipe = redis.pipeline()
    pipe.incrby(key, increment)
    pipe.expire(key, window_seconds, nx=True)
    results = await pipe.execute()
    current = results[0]
    if current > max_requests:
        raise RateLimitExceeded("Превышен лимит запросов. Попробуйте позже.")


async def check_burst_rate_limit(
    identifier: str,
    *,
    max_requests: int,
    window_seconds: int,
) -> None:
    """Вспомогательный метод для одного burst-лимита."""
    await check_rate_limit(
        f"rate:{identifier}",
        max_requests=max_requests,
        window_seconds=window_seconds,
    )


async def check_content_token_rate_limit(user_id: int) -> None:
    """Лимит на создание content-токенов: 120/мин, 600/час.

    На одном уроке может быть десяток материалов, поэтому лимит должен
    позволять одновременную выдачу токенов на весь открытый урок.
    """
    await check_rate_limit(
        f"content_token:create:min:{user_id}",
        max_requests=120,
        window_seconds=60,
    )
    await check_rate_limit(
        f"content_token:create:hour:{user_id}",
        max_requests=600,
        window_seconds=3600,
    )


async def check_content_stream_rate_limit(user_id: int, content_id: int, content_length: Optional[int] = None) -> None:
    """Лимит на потоковое скачивание: 50 МБ/мин, 3 одновременных потока."""
    await check_rate_limit(
        f"content_stream:mb:min:{user_id}",
        max_requests=50,
        window_seconds=60,
        increment=(content_length or 0) // (1024 * 1024) or 1,
    )
    await check_rate_limit(
        f"content_stream:concurrent:{user_id}:{content_id}",
        max_requests=3,
        window_seconds=300,
    )


async def check_content_id_enumeration_rate_limit(ip_address: str) -> None:
    """Лимит на перебор content_id: 20 неуспешных попыток/мин с одного IP."""
    await check_rate_limit(
        f"content_token:enum:{ip_address}",
        max_requests=20,
        window_seconds=60,
    )
