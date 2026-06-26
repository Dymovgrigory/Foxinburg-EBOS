"""Тесты endpoint'ов /api/v3/groups."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role
from app.core.security import create_access_token


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_groups_data(db_session, user_factory):
    yield
    await db_session.rollback()
    await db_session.execute(
        text("""
            TRUNCATE TABLE
                groups,
                audit_logs,
                system_events
            CASCADE
        """)
    )
    await db_session.commit()


async def test_list_groups_empty(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.TEACHER)
    response = await client.get("/api/v3/groups", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"] == []


async def test_create_group_by_methodist(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "group_teacher_a1@example.com")
    response = await client.post("/api/v3/groups", json={
        "name": "Группа A1",
        "description": "Утренняя группа",
        "max_students": 10,
        "teacher_id": teacher.id,
    }, headers=methodist)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Группа A1"
    assert data["max_students"] == 10


async def test_create_group_without_teacher_by_admin(client, auth_headers_factory):
    """Регресс: админ создаёт группу без преподавателя.

    Раньше авто-создание чата группы использовало created_by_id=teacher_id or 0,
    и при отсутствии teacher_id значение 0 нарушало FK на chat_rooms.created_by_id
    -> 500. Теперь fallback — id текущего пользователя.
    """
    admin = await auth_headers_factory(Role.ADMIN)
    response = await client.post("/api/v3/groups", json={
        "name": "Группа без преподавателя",
        "max_students": 10,
    }, headers=admin)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Группа без преподавателя"
    assert data["teacher_id"] is None


async def test_student_cannot_create_group(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.STUDENT)
    response = await client.post("/api/v3/groups", json={
        "name": "Student Group",
    }, headers=headers)
    assert response.status_code == 403


async def test_teacher_cannot_create_group(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.TEACHER)
    response = await client.post("/api/v3/groups", json={
        "name": "Teacher Group",
    }, headers=headers)
    assert response.status_code == 403


async def test_get_group_by_id(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "group_teacher_byid@example.com")
    create_res = await client.post("/api/v3/groups", json={
        "name": "Group By Id",
        "teacher_id": teacher.id,
    }, headers=methodist)
    group_id = create_res.json()["data"]["id"]

    response = await client.get(f"/api/v3/groups/{group_id}", headers=methodist)
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Group By Id"


async def test_get_missing_group_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.get("/api/v3/groups/999999", headers=headers)
    assert response.status_code == 404


async def test_update_group(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "group_teacher_update@example.com")
    create_res = await client.post("/api/v3/groups", json={
        "name": "Group To Update",
        "teacher_id": teacher.id,
    }, headers=methodist)
    group_id = create_res.json()["data"]["id"]

    response = await client.patch(f"/api/v3/groups/{group_id}", json={
        "name": "Updated Group",
        "max_students": 15,
    }, headers=methodist)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "Updated Group"
    assert data["max_students"] == 15


async def test_update_missing_group_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.patch("/api/v3/groups/999999", json={
        "name": "No Group",
    }, headers=headers)
    assert response.status_code == 404


async def test_delete_group(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "group_teacher_delete@example.com")
    create_res = await client.post("/api/v3/groups", json={
        "name": "Group To Delete",
        "teacher_id": teacher.id,
    }, headers=methodist)
    group_id = create_res.json()["data"]["id"]

    delete_res = await client.delete(f"/api/v3/groups/{group_id}", headers=methodist)
    assert delete_res.status_code == 200
    assert delete_res.json()["success"] is True

    get_res = await client.get(f"/api/v3/groups/{group_id}", headers=methodist)
    assert get_res.status_code == 404


async def test_delete_missing_group_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.delete("/api/v3/groups/999999", headers=headers)
    assert response.status_code == 404


async def test_list_my_groups_as_teacher(client, db_session, user_factory, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "teacher_my_groups@example.com")

    create_res = await client.post("/api/v3/groups", json={
        "name": "Teacher Group",
        "teacher_id": teacher.id,
    }, headers=methodist)
    assert create_res.status_code == 201
    group_id = create_res.json()["data"]["id"]

    teacher_headers = {"Authorization": f"Bearer {create_access_token({'user_id': teacher.id, 'role': teacher.role})}"}
    response = await client.get("/api/v3/groups/my", headers=teacher_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == group_id


async def test_list_my_groups_as_student(client, db_session, user_factory, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "student_group_teacher@example.com")
    student = await user_factory(Role.STUDENT, "student_my_groups@example.com")

    create_res = await client.post("/api/v3/groups", json={
        "name": "Student Group",
        "teacher_id": teacher.id,
    }, headers=methodist)
    group_id = create_res.json()["data"]["id"]

    student.group_id = group_id
    await db_session.commit()

    student_headers = {"Authorization": f"Bearer {create_access_token({'user_id': student.id, 'role': student.role})}"}
    response = await client.get("/api/v3/groups/my", headers=student_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == group_id
