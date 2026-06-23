"""Тесты endpoint'ов /api/v3/users."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role
from app.core.security import create_access_token


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_users_data(db_session, user_factory):
    """Пользователи чистятся через user_factory."""
    yield
    await db_session.rollback()
    await db_session.execute(
        text("""
            TRUNCATE TABLE
                audit_logs,
                system_events
            CASCADE
        """)
    )
    await db_session.commit()


async def test_admin_can_list_users(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.ADMIN)
    response = await client.get("/api/v3/users", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "total" in data["meta"]


async def test_manager_can_list_users(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.MANAGER)
    response = await client.get("/api/v3/users", headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True


async def test_student_cannot_list_users(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.STUDENT)
    response = await client.get("/api/v3/users", headers=headers)
    assert response.status_code == 403


async def test_admin_can_create_user(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.ADMIN)
    response = await client.post("/api/v3/users", json={
        "email": "created_user@example.com",
        "name": "Created User",
        "password": "password123",
        "role": "student",
        "plan": "STANDARD",
        "target_language": "en",
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "created_user@example.com"
    assert data["data"]["role"] == "student"
    assert data["data"]["plan"] == "STANDARD"


async def test_manager_cannot_create_user(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.MANAGER)
    response = await client.post("/api/v3/users", json={
        "email": "manager_created@example.com",
        "name": "Manager Created",
        "password": "password123",
        "role": "student",
    }, headers=headers)
    assert response.status_code == 403


async def test_get_me_users_endpoint(client, user_factory):
    user = await user_factory(Role.ADMIN, "me_users@example.com")
    headers = {"Authorization": f"Bearer {create_access_token({'user_id': user.id, 'role': user.role})}"}
    response = await client.get("/api/v3/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["role"] == "admin"


@pytest.mark.xfail(reason="/users/me/telegram смешивает сессии get_db и UoW: баг в роутере")
async def test_link_telegram(client, user_factory):
    user = await user_factory(Role.STUDENT, "telegram_link@example.com")
    headers = {"Authorization": f"Bearer {create_access_token({'user_id': user.id, 'role': user.role})}"}
    response = await client.patch("/api/v3/users/me/telegram", json={
        "telegram_chat_id": "123456789",
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["telegram_chat_id"] == "123456789"
