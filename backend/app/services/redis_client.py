from redis.asyncio import from_url
from app.config import settings

_redis = None


async def get_redis():
    global _redis
    if _redis is None:
        _redis = from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
    return _redis
