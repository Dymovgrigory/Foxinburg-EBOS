import asyncio
import os

# Переключаем все сессии БД приложения на тестовую базу до импорта модулей
os.environ["DATABASE_URL"] = "postgresql+asyncpg://foxinburg:foxinburg_dev_pass@localhost:5432/foxinburg_test"

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.database import Base, get_db, AsyncSessionLocal
from app.models.user import User
from app.models.organization import Organization, Branch
from app.models.course import Course, Module
from app.models.group import Group
from app.core.security import get_password_hash, create_access_token
from app.core.permissions import Role

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Создаём event loop для всей сессии тестов."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Создаём и удаляем таблицы перед/после сессии тестов."""
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session():
    """Свежая сессия БД для каждого теста."""
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
    created = []

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
        created.append(user)
        return user

    yield _create

    # cleanup: удаляем связанные записи и затем самих пользователей
    for user in created:
        # Сообщения и участники в чатах, созданных пользователем
        await db_session.execute(
            text("""
                DELETE FROM chat_messages
                WHERE room_id IN (SELECT id FROM chat_rooms WHERE created_by_id = :uid)
            """).bindparams(uid=user.id)
        )
        await db_session.execute(
            text("""
                DELETE FROM chat_participants
                WHERE room_id IN (SELECT id FROM chat_rooms WHERE created_by_id = :uid)
            """).bindparams(uid=user.id)
        )
        await db_session.execute(
            text("DELETE FROM chat_rooms WHERE created_by_id = :uid").bindparams(uid=user.id)
        )
        # Собственные сообщения/участники в чужих чатах
        await db_session.execute(
            text("DELETE FROM chat_messages WHERE sender_id = :uid").bindparams(uid=user.id)
        )
        await db_session.execute(
            text("DELETE FROM chat_participants WHERE user_id = :uid").bindparams(uid=user.id)
        )
        await db_session.execute(
            text("DELETE FROM notifications WHERE user_id = :uid").bindparams(uid=user.id)
        )
        await db_session.execute(
            text("DELETE FROM system_events WHERE user_id = :uid").bindparams(uid=user.id)
        )
        await db_session.delete(user)
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
