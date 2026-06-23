"""Тесты endpoint'ов /api/v3/auth."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role
from app.core.security import create_access_token


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_auth_data(db_session, user_factory):
    """Удаляем служебные логи; пользователи чистятся через user_factory."""
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


async def test_register_success(client):
    response = await client.post("/api/v3/auth/register", json={
        "email": "new_user_auth@example.com",
        "password": "password123",
        "name": "New User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "new_user_auth@example.com"
    assert data["data"]["user"]["role"] == "student"
    assert "access_token" in data["data"]


async def test_register_duplicate_email(client):
    payload = {
        "email": "dup_auth@example.com",
        "password": "password123",
        "name": "Dup User",
    }
    first = await client.post("/api/v3/auth/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v3/auth/register", json=payload)
    assert second.status_code == 400
    assert second.json()["success"] is False
    assert "Email" in second.json()["message"]


async def test_login_success(client, user_factory):
    user = await user_factory(Role.STUDENT, "login_auth@example.com", "password123")
    response = await client.post("/api/v3/auth/login", data={
        "username": user.email,
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == user.email
    assert "access_token" in data["data"]


async def test_login_wrong_password(client, user_factory):
    user = await user_factory(Role.STUDENT, "login_wrong@example.com", "password123")
    response = await client.post("/api/v3/auth/login", data={
        "username": user.email,
        "password": "wrongpass",
    })
    assert response.status_code == 400
    assert response.json()["success"] is False


async def test_login_inactive_user(client, db_session, user_factory):
    user = await user_factory(Role.STUDENT, "login_inactive@example.com", "password123")
    user.is_active = False
    await db_session.commit()

    response = await client.post("/api/v3/auth/login", data={
        "username": user.email,
        "password": "password123",
    })
    assert response.status_code == 403
    assert response.json()["success"] is False


async def test_me_endpoint(client, user_factory):
    user = await user_factory(Role.TEACHER, "me_auth@example.com")
    headers = {"Authorization": f"Bearer {create_access_token({'user_id': user.id, 'role': user.role})}"}
    response = await client.get("/api/v3/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == user.email
    assert data["data"]["role"] == "teacher"


async def test_update_me(client, db_session, user_factory):
    user = await user_factory(Role.STUDENT, "update_me@example.com")
    headers = {"Authorization": f"Bearer {create_access_token({'user_id': user.id, 'role': user.role})}"}

    response = await client.patch("/api/v3/auth/me", json={"name": "Updated Name"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Updated Name"


async def test_change_password_success(client, user_factory):
    user = await user_factory(Role.STUDENT, "change_pass@example.com", "oldpassword")
    headers = {"Authorization": f"Bearer {create_access_token({'user_id': user.id, 'role': user.role})}"}

    patch_res = await client.patch("/api/v3/auth/me/password", json={
        "current_password": "oldpassword",
        "new_password": "newsecurepassword",
    }, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["success"] is True

    login_res = await client.post("/api/v3/auth/login", data={
        "username": user.email,
        "password": "newsecurepassword",
    })
    assert login_res.status_code == 200
    assert login_res.json()["success"] is True


async def test_change_password_wrong_current(client, user_factory):
    user = await user_factory(Role.STUDENT, "change_pass_wrong@example.com", "oldpassword")
    headers = {"Authorization": f"Bearer {create_access_token({'user_id': user.id, 'role': user.role})}"}

    response = await client.patch("/api/v3/auth/me/password", json={
        "current_password": "notthepassword",
        "new_password": "newsecurepassword",
    }, headers=headers)
    assert response.status_code == 400
    assert response.json()["success"] is False
