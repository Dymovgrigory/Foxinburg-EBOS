"""Тесты CRUD endpoint'ов /api/v3/courses."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_courses_data(db_session, user_factory):
    yield
    await db_session.rollback()
    await db_session.execute(
        text("""
            TRUNCATE TABLE
                courses,
                modules,
                lessons,
                lesson_contents,
                tests,
                test_questions,
                test_attempts,
                homeworks,
                homework_reviews,
                lesson_progress,
                enrollments,
                audit_logs,
                system_events
            CASCADE
        """)
    )
    await db_session.commit()


async def test_list_courses_empty(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.STUDENT)
    response = await client.get("/api/v3/courses", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []
    assert data["meta"]["total"] == 0


async def test_create_and_list_courses(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    create_res = await client.post("/api/v3/courses", json={
        "title": "Английский A1",
        "description": "Базовый курс",
        "type": "academy",
    }, headers=methodist)
    assert create_res.status_code == 201
    course = create_res.json()["data"]
    assert course["title"] == "Английский A1"
    assert course["status"] == "draft"

    student = await auth_headers_factory(Role.STUDENT)
    list_res = await client.get("/api/v3/courses", headers=student)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) == 1


async def test_list_courses_with_status_filter(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    await client.post("/api/v3/courses", json={
        "title": "Draft Course",
    }, headers=methodist)

    response = await client.get("/api/v3/courses?status=published", headers=methodist)
    assert response.status_code == 200
    assert response.json()["data"] == []


async def test_get_course_by_id(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    create_res = await client.post("/api/v3/courses", json={
        "title": "Course By Id",
    }, headers=methodist)
    course_id = create_res.json()["data"]["id"]

    response = await client.get(f"/api/v3/courses/{course_id}", headers=methodist)
    assert response.status_code == 200
    assert response.json()["data"]["title"] == "Course By Id"


async def test_get_missing_course_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.get("/api/v3/courses/999999", headers=headers)
    assert response.status_code == 404
    assert response.json()["success"] is False


async def test_student_cannot_create_course(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.STUDENT)
    response = await client.post("/api/v3/courses", json={
        "title": "Student Course",
    }, headers=headers)
    assert response.status_code == 403


async def test_update_course(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    create_res = await client.post("/api/v3/courses", json={
        "title": "Course To Update",
    }, headers=methodist)
    course_id = create_res.json()["data"]["id"]

    update_res = await client.patch(f"/api/v3/courses/{course_id}", json={
        "title": "Updated Title",
        "status": "published",
    }, headers=methodist)
    assert update_res.status_code == 200
    data = update_res.json()["data"]
    assert data["title"] == "Updated Title"
    assert data["status"] == "published"


async def test_update_missing_course_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.patch("/api/v3/courses/999999", json={
        "title": "No Course",
    }, headers=headers)
    assert response.status_code == 404


async def test_delete_course(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    create_res = await client.post("/api/v3/courses", json={
        "title": "Course To Delete",
    }, headers=methodist)
    course_id = create_res.json()["data"]["id"]

    delete_res = await client.delete(f"/api/v3/courses/{course_id}", headers=methodist)
    assert delete_res.status_code == 200
    assert delete_res.json()["success"] is True

    get_res = await client.get(f"/api/v3/courses/{course_id}", headers=methodist)
    assert get_res.status_code == 404


async def test_delete_missing_course_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.delete("/api/v3/courses/999999", headers=headers)
    assert response.status_code == 404


async def test_list_course_modules(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    course_res = await client.post("/api/v3/courses", json={
        "title": "Course With Modules",
    }, headers=methodist)
    course_id = course_res.json()["data"]["id"]

    module_res = await client.post("/api/v3/modules", json={
        "course_id": course_id,
        "title": "Модуль 1",
        "order_index": 0,
    }, headers=methodist)
    assert module_res.status_code == 201

    response = await client.get(f"/api/v3/courses/{course_id}/modules", headers=methodist)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["title"] == "Модуль 1"


async def test_list_modules_for_missing_course_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.get("/api/v3/courses/999999/modules", headers=headers)
    assert response.status_code == 404
