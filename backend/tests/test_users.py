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


async def test_owner_can_view_and_change_student_password(client, auth_headers_factory):
    admin = await auth_headers_factory(Role.ADMIN)
    create = await client.post("/api/v3/users", json={
        "email": "pwd_student@example.com",
        "name": "Pwd Student",
        "password": "InitialPass123",
        "role": "student",
    }, headers=admin)
    assert create.status_code == 201
    sid = create.json()["data"]["id"]

    owner = await auth_headers_factory(Role.OWNER)
    # Управляющая роль видит расшифрованный пароль входа.
    get1 = await client.get(f"/api/v3/users/{sid}", headers=owner)
    assert get1.status_code == 200
    assert get1.json()["data"]["password"] == "InitialPass123"

    # И может его изменить.
    upd = await client.patch(f"/api/v3/users/{sid}", json={"password": "NewPass456"}, headers=owner)
    assert upd.status_code == 200

    get2 = await client.get(f"/api/v3/users/{sid}", headers=owner)
    assert get2.json()["data"]["password"] == "NewPass456"

    # Новый пароль реально работает для входа.
    login = await client.post(
        "/api/v3/auth/login",
        data={"username": "pwd_student@example.com", "password": "NewPass456"},
    )
    assert login.status_code == 200
    assert login.json()["success"] is True


async def test_manager_cannot_view_student_password(client, auth_headers_factory):
    admin = await auth_headers_factory(Role.ADMIN)
    create = await client.post("/api/v3/users", json={
        "email": "secret_student@example.com",
        "name": "Secret Student",
        "password": "Secret123",
        "role": "student",
    }, headers=admin)
    assert create.status_code == 201
    sid = create.json()["data"]["id"]

    # Менеджер (USER_READ, без USER_UPDATE) пароль входа не видит.
    manager = await auth_headers_factory(Role.MANAGER)
    get = await client.get(f"/api/v3/users/{sid}", headers=manager)
    assert get.status_code == 200
    assert "password" not in get.json()["data"]


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
