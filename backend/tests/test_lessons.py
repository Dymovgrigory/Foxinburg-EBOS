"""Тесты endpoint'ов /api/v3/lessons."""

import json
import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role
from app.core.security import create_access_token


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_lessons_data(db_session, user_factory):
    yield
    await db_session.rollback()
    await db_session.execute(
        text("""
            TRUNCATE TABLE
                lessons,
                lesson_contents,
                tests,
                test_questions,
                test_attempts,
                homeworks,
                homework_reviews,
                lesson_progress,
                enrollments,
                modules,
                courses,
                groups,
                audit_logs,
                system_events
            CASCADE
        """)
    )
    await db_session.commit()


async def _create_course_and_module(client, headers):
    course_res = await client.post("/api/v3/courses", json={
        "title": "Course For Lessons",
    }, headers=headers)
    course_id = course_res.json()["data"]["id"]
    module_res = await client.post("/api/v3/modules", json={
        "course_id": course_id,
        "title": "Модуль 1",
        "order_index": 0,
    }, headers=headers)
    return course_id, module_res.json()["data"]["id"]


async def test_get_lesson_by_id(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    _, module_id = await _create_course_and_module(client, methodist)

    create_res = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Первый урок",
        "lesson_type": "text",
        "order_index": 0,
    }, headers=methodist)
    lesson_id = create_res.json()["data"]["id"]

    response = await client.get(f"/api/v3/lessons/{lesson_id}", headers=methodist)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["title"] == "Первый урок"
    assert data["lesson_type"] == "text"
    assert data["test"] is None
    assert data["contents"] == []


async def test_get_missing_lesson_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.get("/api/v3/lessons/999999", headers=headers)
    assert response.status_code == 404


async def test_create_lesson(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    _, module_id = await _create_course_and_module(client, methodist)

    response = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Новый урок",
        "lesson_type": "video",
        "order_index": 1,
        "duration_minutes": 30,
    }, headers=methodist)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["title"] == "Новый урок"
    assert data["lesson_type"] == "video"
    assert data["duration_minutes"] == 30


async def test_create_lesson_with_test(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    _, module_id = await _create_course_and_module(client, methodist)

    response = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Урок-тест",
        "lesson_type": "test",
        "order_index": 0,
        "test": {
            "title": "Контрольный тест",
            "passing_score": 80,
            "questions": [
                {
                    "question_text": "Сколько будет 2+2?",
                    "question_type": "single",
                    "options": json.dumps(["3", "4"]),
                    "correct_answers": json.dumps(["4"]),
                    "points": 1,
                    "order_index": 0,
                }
            ],
        },
    }, headers=methodist)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["test"] is not None
    assert data["test"]["title"] == "Контрольный тест"
    assert len(data["test"]["questions"]) == 1


async def test_create_lesson_missing_module_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.post("/api/v3/lessons", json={
        "module_id": 999999,
        "title": "Orphan Lesson",
        "lesson_type": "text",
    }, headers=headers)
    assert response.status_code == 404


async def test_student_cannot_create_lesson(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await auth_headers_factory(Role.STUDENT)
    _, module_id = await _create_course_and_module(client, methodist)

    response = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Student Lesson",
    }, headers=student)
    assert response.status_code == 403


async def test_update_lesson(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    _, module_id = await _create_course_and_module(client, methodist)

    create_res = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Lesson To Update",
        "lesson_type": "text",
    }, headers=methodist)
    lesson_id = create_res.json()["data"]["id"]

    response = await client.patch(f"/api/v3/lessons/{lesson_id}", json={
        "title": "Updated Lesson",
        "duration_minutes": 45,
    }, headers=methodist)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["title"] == "Updated Lesson"
    assert data["duration_minutes"] == 45


async def test_update_missing_lesson_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.patch("/api/v3/lessons/999999", json={
        "title": "No Lesson",
    }, headers=headers)
    assert response.status_code == 404


async def test_delete_lesson(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    _, module_id = await _create_course_and_module(client, methodist)

    create_res = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Lesson To Delete",
    }, headers=methodist)
    lesson_id = create_res.json()["data"]["id"]

    delete_res = await client.delete(f"/api/v3/lessons/{lesson_id}", headers=methodist)
    assert delete_res.status_code == 200
    assert delete_res.json()["success"] is True

    get_res = await client.get(f"/api/v3/lessons/{lesson_id}", headers=methodist)
    assert get_res.status_code == 404


async def test_delete_missing_lesson_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.METHODIST)
    response = await client.delete("/api/v3/lessons/999999", headers=headers)
    assert response.status_code == 404


async def test_complete_lesson(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "complete_lesson_student@example.com")

    course_id, module_id = await _create_course_and_module(client, methodist)
    lesson_res = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Текстовый урок",
        "lesson_type": "text",
        "order_index": 0,
    }, headers=methodist)
    lesson_id = lesson_res.json()["data"]["id"]

    await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course_id,
    }, headers=manager)

    student_headers = {"Authorization": f"Bearer {create_access_token({'user_id': student.id, 'role': student.role})}"}
    response = await client.post(f"/api/v3/lessons/{lesson_id}/complete", headers=student_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "completed"


async def test_reorder_lessons(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    course_id, module_id = await _create_course_and_module(client, methodist)

    lessons = []
    for title in ["Урок 1", "Урок 2", "Урок 3"]:
        res = await client.post("/api/v3/lessons", json={
            "module_id": module_id,
            "title": title,
            "lesson_type": "text",
        }, headers=methodist)
        lessons.append(res.json()["data"]["id"])

    # Новый порядок: 3, 1, 2
    new_order = [lessons[2], lessons[0], lessons[1]]
    response = await client.post("/api/v3/lessons/reorder", json={
        "module_id": module_id,
        "lesson_ids": new_order,
    }, headers=methodist)
    assert response.status_code == 200
    data = response.json()["data"]
    assert [l["id"] for l in data] == new_order
    assert data[0]["order_index"] == 0
    assert data[1]["order_index"] == 1
    assert data[2]["order_index"] == 2


async def test_reorder_lessons_invalid_list(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    _, module_id = await _create_course_and_module(client, methodist)

    res = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "Урок",
        "lesson_type": "text",
    }, headers=methodist)
    lesson_id = res.json()["data"]["id"]

    response = await client.post("/api/v3/lessons/reorder", json={
        "module_id": module_id,
        "lesson_ids": [lesson_id, 999999],
    }, headers=methodist)
    assert response.status_code == 400
