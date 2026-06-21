"""Тесты endpoint'ов /api/v3/methodists."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_methodist_data(db_session, user_factory):
    yield
    await db_session.execute(text("""
        TRUNCATE TABLE
            employee_group_members,
            employee_groups,
            homeworks,
            homework_reviews,
            lesson_progress,
            enrollments,
            lesson_contents,
            tests,
            test_questions,
            test_attempts,
            lessons,
            modules,
            courses,
            schedules,
            attendances,
            groups,
            audit_logs,
            system_events
        CASCADE
    """))
    await db_session.commit()


async def test_methodist_can_get_dashboard(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    res = await client.get("/api/v3/methodists/dashboard", headers=methodist)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "courses_count" in data
    assert "groups_count" in data
    assert "students_count" in data
    assert "pending_homeworks_count" in data


async def test_methodist_can_get_analytics(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    res = await client.get("/api/v3/methodists/analytics", headers=methodist)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "overview" in data
    assert "courses" in data
    assert "students" in data
    assert "homeworks_and_tests" in data
    assert "teachers" in data
    assert "upcoming_schedule" in data


async def test_analytics_includes_course_stats(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)

    course_res = await client.post("/api/v3/courses", json={
        "title": "Английский A1",
        "description": "Базовый курс",
    }, headers=methodist)
    assert course_res.status_code == 201
    course_id = course_res.json()["data"]["id"]

    publish_res = await client.patch(f"/api/v3/courses/{course_id}", json={"status": "published"}, headers=methodist)
    assert publish_res.status_code == 200

    module_res = await client.post("/api/v3/modules", json={
        "course_id": course_id,
        "title": "Модуль 1",
    }, headers=methodist)
    assert module_res.status_code == 201
    module_id = module_res.json()["data"]["id"]

    await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Урок 1",
        "lesson_type": "text",
        "order_index": 0,
    }, headers=methodist)

    analytics_res = await client.get("/api/v3/methodists/analytics", headers=methodist)
    assert analytics_res.status_code == 200
    courses = analytics_res.json()["data"]["courses"]
    course_stat = next((c for c in courses if c["id"] == course_id), None)
    assert course_stat is not None
    assert course_stat["modules_count"] == 1
    assert course_stat["lessons_count"] == 1
    assert course_stat["status"] == "published"


async def test_analytics_includes_student_and_teacher_stats(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "teacher_dash@test.local")
    student = await user_factory(Role.STUDENT, "student_dash@test.local")

    analytics_res = await client.get("/api/v3/methodists/analytics", headers=methodist)
    assert analytics_res.status_code == 200
    data = analytics_res.json()["data"]

    assert data["overview"]["teachers_count"] >= 1
    assert data["overview"]["students_count"] >= 1

    teacher_stat = next((t for t in data["teachers"] if t["id"] == teacher.id), None)
    assert teacher_stat is not None
    assert teacher_stat["name"] == teacher.name

    student_stat = next((s for s in data["students"] if s["id"] == student.id), None)
    assert student_stat is not None
    assert student_stat["risk_status"] in ("low", "medium", "high")


async def test_student_cannot_access_methodist_analytics(client, auth_headers_factory):
    student = await auth_headers_factory(Role.STUDENT)
    res = await client.get("/api/v3/methodists/analytics", headers=student)
    assert res.status_code == 403
