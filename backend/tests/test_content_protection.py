import uuid

import pytest
import pytest_asyncio

from app.services.content_token_service import (
    create_content_token,
    validate_content_token,
    revoke_content_token,
)
from app.services.rate_limit_service import (
    check_content_token_rate_limit,
    RateLimitExceeded,
)


@pytest_asyncio.fixture
async def redis_available():
    """Пропускает тест, если Redis недоступен."""
    try:
        from app.services.redis_client import get_redis
        redis = await get_redis()
        await redis.ping()
        return True
    except Exception:
        pytest.skip("Redis недоступен")


@pytest.mark.asyncio
async def test_create_and_validate_content_token(redis_available):
    token = await create_content_token(content_id=42, user_id=7)
    assert isinstance(token, str)

    content_id, user_id = await validate_content_token(token)
    assert content_id == 42
    assert user_id == 7


@pytest.mark.asyncio
async def test_content_token_tied_to_content_id(redis_available):
    token = await create_content_token(content_id=1, user_id=2)
    with pytest.raises(Exception):
        await validate_content_token(token + "x")


@pytest.mark.asyncio
async def test_revoke_content_token(redis_available):
    token = await create_content_token(content_id=10, user_id=20)
    await revoke_content_token(token)
    with pytest.raises(Exception):
        await validate_content_token(token)


@pytest.mark.asyncio
async def test_content_token_rate_limit(redis_available):
    user_id = int(uuid.uuid4().int % 1_000_000_000)
    for _ in range(120):
        await check_content_token_rate_limit(user_id)
    with pytest.raises(RateLimitExceeded):
        await check_content_token_rate_limit(user_id)
