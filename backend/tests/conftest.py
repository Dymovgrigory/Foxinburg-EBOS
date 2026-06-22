import inspect
import os

# Переключаем все сессии БД приложения на тестовую базу до импорта модулей
os.environ["DATABASE_URL"] = "postgresql+asyncpg://foxinburg:foxinburg_dev_pass@localhost:5432/foxinburg_test"
# Тестовый ключ для шифрования паролей в админке
os.environ["PASSWORD_ENCRYPTION_KEY"] = "xKGm1ySf1VtWfrOwu6uv1p6E0F-wpCObX7fxo_AhmvU="

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.core.security import get_password_hash, create_access_token
from app.core.permissions import Role

TEST_DATABASE_URL = os.environ["DATABASE_URL"]


# Все асинхронные тесты запускаются в сессионном event loop, чтобы разделять
# один цикл с session-scoped движком БД и избежать "Future attached to a different loop".
def pytest_collection_modifyitems(config, items):
    for item in items:
        if not isinstance(item, pytest.Function):
            continue
        func = getattr(item, "obj", None)
        if not inspect.iscoroutinefunction(func):
            continue
        marker = item.get_closest_marker("asyncio")
        if marker is not None:
            marker.kwargs.pop("scope", None)
            marker.kwargs["loop_scope"] = "session"
        else:
            item.add_marker(pytest.mark.asyncio(loop_scope="session"))


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """Единый async-движок на всю тестовую сессию."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database(db_engine):
    """Создаём и удаляем таблицы перед/после сессии тестов."""
    async with db_engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with db_engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))


@pytest_asyncio.fixture
async def db_session(db_engine):
    """Свежая сессия БД для каждого теста."""
    TestingSessionLocal = async_sessionmaker(
        db_engine, expire_on_commit=False, class_=AsyncSession
    )
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    """Async HTTP-клиент с подменённой БД."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def user_factory(db_session):
    """Фабрика тестовых пользователей."""
    created_ids = []

    async def _create(role: Role, email: str, password: str = "password123"):
        user = User(
            email=email,
            name=f"Test {role.value}",
            role=role.value,
            password_hash=get_password_hash(password),
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        created_ids.append(user.id)
        return user

    yield _create

    # cleanup: удаляем связанные записи и затем самих пользователей по id
    for uid in created_ids:
        await db_session.execute(
            text("""
                DELETE FROM chat_messages
                WHERE room_id IN (SELECT id FROM chat_rooms WHERE created_by_id = :uid)
            """).bindparams(uid=uid)
        )
        await db_session.execute(
            text("""
                DELETE FROM chat_participants
                WHERE room_id IN (SELECT id FROM chat_rooms WHERE created_by_id = :uid)
            """).bindparams(uid=uid)
        )
        await db_session.execute(
            text("DELETE FROM chat_rooms WHERE created_by_id = :uid").bindparams(uid=uid)
        )
        await db_session.execute(
            text("DELETE FROM chat_messages WHERE sender_id = :uid").bindparams(uid=uid)
        )
        await db_session.execute(
            text("DELETE FROM chat_participants WHERE user_id = :uid").bindparams(uid=uid)
        )
        await db_session.execute(
            text("DELETE FROM notifications WHERE user_id = :uid").bindparams(uid=uid)
        )
        await db_session.execute(
            text("DELETE FROM system_events WHERE user_id = :uid").bindparams(uid=uid)
        )
        await db_session.execute(text("DELETE FROM users WHERE id = :uid").bindparams(uid=uid))
    await db_session.commit()


@pytest_asyncio.fixture
async def auth_headers_factory(user_factory):
    """Фабрика заголовков авторизации по роли."""
    counter = 0

    async def _make(role: Role):
        nonlocal counter
        counter += 1
        user = await user_factory(role, f"{role.value}_{counter}@test.local")
        token = create_access_token({"user_id": user.id, "role": user.role})
        return {"Authorization": f"Bearer {token}"}

    return _make


@pytest_asyncio.fixture(scope="session", autouse=True)
async def close_redis():
    """Закрываем глобальное Redis-подключение до завершения event loop."""
    yield
    from app.services.redis_client import _redis
    if _redis is not None:
        await _redis.aclose()
