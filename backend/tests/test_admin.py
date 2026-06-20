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


@pytest.mark.asyncio
async def test_admin_user_edit_page_loads(client, user_factory):
    """Страница редактирования пользователя открывается без 500."""
    admin = await user_factory(Role.ADMIN, "adminedit@test.local", "password123")
    student = await user_factory(Role.STUDENT, "studenttoedit@test.local", "password123")

    await client.post(
        "/admin/login",
        data={"username": admin.email, "password": "password123"},
        follow_redirects=False,
    )

    response = await client.get(f"/admin/user/edit/{student.id}")
    assert response.status_code == 200
    assert "studenttoedit@test.local" in response.text


@pytest.mark.asyncio
async def test_admin_user_password_update(client, user_factory, db_session):
    """При сохранении пользователя через админку пароль шифруется и хешируется."""
    from app.models.user import User
    from app.core.security import verify_password

    admin = await user_factory(Role.ADMIN, "adminpwdupdate@test.local", "password123")
    student = await user_factory(Role.STUDENT, "studentpwdupdate@test.local", "oldpassword")

    await client.post(
        "/admin/login",
        data={"username": admin.email, "password": "password123"},
        follow_redirects=False,
    )

    edit_url = f"/admin/user/edit/{student.id}"
    get_response = await client.get(edit_url)
    assert get_response.status_code == 200

    # SQLAdmin по умолчанию не использует CSRF, поэтому достаточно отправить форму
    post_response = await client.post(
        edit_url,
        data={
            "email": student.email,
            "name": student.name,
            "role": student.role,
            "plan": "FREE",
            "encrypted_password": "newsecretpassword",
            "is_active": "true",
            "is_verified": "false",
        },
        follow_redirects=False,
    )
    assert post_response.status_code in (302, 303), post_response.text[:500]

    await db_session.refresh(student)
    assert verify_password("newsecretpassword", student.password_hash)
    assert student.encrypted_password is not None
    assert student.plain_password == "newsecretpassword"
