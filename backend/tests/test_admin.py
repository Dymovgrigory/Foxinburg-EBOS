"""Тесты админ-панели SQLAdmin."""

import pytest

from app.core.permissions import Role


@pytest.mark.asyncio
async def test_admin_anonymous_redirected_to_login(client):
    response = await client.get("/admin/", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert "/admin/login" in response.headers.get("location", "")


@pytest.mark.asyncio
async def test_admin_login_success_and_access(client, user_factory):
    admin = await user_factory(Role.ADMIN, "adminpanel@test.local", "password123")

    login_response = await client.post(
        "/admin/login",
        data={"username": admin.email, "password": "password123"},
        follow_redirects=False,
    )
    assert login_response.status_code in (302, 303)

    list_response = await client.get("/admin/user/list")
    assert list_response.status_code == 200
    assert admin.email in list_response.text


@pytest.mark.asyncio
async def test_admin_student_cannot_access(client, user_factory):
    student = await user_factory(Role.STUDENT, "studentpanel@test.local", "password123")

    login_response = await client.post(
        "/admin/login",
        data={"username": student.email, "password": "password123"},
        follow_redirects=False,
    )
    # SQLAdmin возвращает ошибку авторизации (200/400) и не редиректит
    assert login_response.status_code in (200, 400)

    list_response = await client.get("/admin/user/list", follow_redirects=False)
    assert list_response.status_code in (302, 307)


@pytest.mark.asyncio
async def test_admin_logout(client, user_factory):
    admin = await user_factory(Role.ADMIN, "adminlogout@test.local", "password123")

    await client.post(
        "/admin/login",
        data={"username": admin.email, "password": "password123"},
        follow_redirects=False,
    )

    logout_response = await client.get("/admin/logout", follow_redirects=False)
    assert logout_response.status_code in (302, 303)

    list_response = await client.get("/admin/user/list", follow_redirects=False)
    assert list_response.status_code in (302, 307)
