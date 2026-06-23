"""Тесты endpoint'ов /api/v3/enrollments."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_enrollments_data(db_session, user_factory):
    yield
    await db_session.rollback()
    await db_session.execute(
        text("""
            TRUNCATE TABLE
                enrollments,
                lesson_progress,
                homeworks,
                homework_reviews,
                lessons,
                lesson_contents,
                tests,
                test_questions,
                test_attempts,
                modules,
                courses,
                groups,
                audit_logs,
                system_events
            CASCADE
        """)
    )
    await db_session.commit()


async def test_list_enrollments_empty(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.MANAGER)
    response = await client.get("/api/v3/enrollments", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []


async def test_create_enrollment(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "enroll_student@example.com")

    course_res = await client.post("/api/v3/courses", json={
        "title": "Курс для зачисления",
    }, headers=methodist)
    course_id = course_res.json()["data"]["id"]

    enroll_res = await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course_id,
    }, headers=manager)
    assert enroll_res.status_code == 201
    data = enroll_res.json()["data"]
    assert data["student_id"] == student.id
    assert data["course_id"] == course_id
    assert data["status"] == "active"


async def test_create_enrollment_is_listed(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "enroll_listed@example.com")

    course_id = (await client.post("/api/v3/courses", json={
        "title": "Listed Course",
    }, headers=methodist)).json()["data"]["id"]

    await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course_id,
    }, headers=manager)

    list_res = await client.get("/api/v3/enrollments", headers=manager)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) == 1


async def test_duplicate_enrollment_returns_400(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "enroll_dup@example.com")

    course_id = (await client.post("/api/v3/courses", json={
        "title": "Dup Course",
    }, headers=methodist)).json()["data"]["id"]

    first = await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course_id,
    }, headers=manager)
    assert first.status_code == 201

    second = await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course_id,
    }, headers=manager)
    assert second.status_code == 400
    assert "уже зачислен" in second.json()["message"].lower()


async def test_teacher_cannot_create_enrollment(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await auth_headers_factory(Role.TEACHER)
    student = await user_factory(Role.STUDENT, "enroll_teacher_student@example.com")

    course_id = (await client.post("/api/v3/courses", json={
        "title": "Teacher Course",
    }, headers=methodist)).json()["data"]["id"]

    response = await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course_id,
    }, headers=teacher)
    assert response.status_code == 403
    # 403 выдаётся из зависимости require_permission, а не error_response
