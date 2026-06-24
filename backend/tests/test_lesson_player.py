"""Тесты плеера урока и серверной блокировки."""

import json
import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role
from app.core.security import create_access_token


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_player_data(db_session, auth_headers_factory):
    # auth_headers_factory запрашивается только для порядка finalizer'ов:
    # сначала эта фикстура почистит курсы, затем user_factory удалит пользователей.
    _ = auth_headers_factory
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
    course_res = await client.post("/api/v3/courses", json={"title": "Player Course"}, headers=headers)
    course_id = course_res.json()["data"]["id"]
    module_res = await client.post(
        "/api/v3/modules",
        json={"course_id": course_id, "title": "Модуль 1", "order_index": 0},
        headers=headers,
    )
    return course_id, module_res.json()["data"]["id"]


async def _student_headers(user):
    return {"Authorization": f"Bearer {create_access_token({'user_id': user.id, 'role': user.role})}"}


async def test_player_unauthorized(client):
    response = await client.get("/api/v3/lessons/1/player")
    assert response.status_code == 401


async def test_student_without_enrollment_forbidden(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await user_factory(Role.STUDENT, "no_enroll@example.com")

    _, module_id = await _create_course_and_module(client, methodist)
    lesson_res = await client.post(
        "/api/v3/lessons",
        json={"module_id": module_id, "title": "Урок 1", "lesson_type": "text", "order_index": 0},
        headers=methodist,
    )
    lesson_id = lesson_res.json()["data"]["id"]

    response = await client.get(f"/api/v3/lessons/{lesson_id}/player", headers=await _student_headers(student))
    assert response.status_code == 403


async def test_student_first_lesson_unlocks_and_locks_next(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "sequential@example.com")

    course_id, module_id = await _create_course_and_module(client, methodist)

    # Два текстовых урока подряд
    for idx, title in enumerate(["Урок 1", "Урок 2"]):
        await client.post(
            "/api/v3/lessons",
            json={"module_id": module_id, "title": title, "lesson_type": "text", "order_index": idx},
            headers=methodist,
        )

    course = await client.get(f"/api/v3/courses/{course_id}", headers=methodist)
    lessons = [l for m in course.json()["data"]["modules"] for l in m["lessons"]]
    lesson1_id, lesson2_id = lessons[0]["id"], lessons[1]["id"]

    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course_id}, headers=manager)

    student_headers = await _student_headers(student)

    # Второй урок заблокирован до прохождения первого
    locked = await client.get(f"/api/v3/lessons/{lesson2_id}/player", headers=student_headers)
    assert locked.status_code == 403

    # Первый урок доступен
    first = await client.get(f"/api/v3/lessons/{lesson1_id}/player", headers=student_headers)
    assert first.status_code == 200
    data = first.json()["data"]
    assert data["is_locked"] is False
    assert data["can_complete"] is True
    assert data["progress"]["status"] == "in_progress"

    # Завершаем первый урок
    complete_res = await client.post(f"/api/v3/lessons/{lesson1_id}/complete", headers=student_headers)
    assert complete_res.status_code == 200

    # Теперь второй урок доступен
    second = await client.get(f"/api/v3/lessons/{lesson2_id}/player", headers=student_headers)
    assert second.status_code == 200
    assert second.json()["data"]["is_locked"] is False


async def test_player_hides_correct_answers(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "hide_answers@example.com")

    course_id, module_id = await _create_course_and_module(client, methodist)
    lesson_res = await client.post(
        "/api/v3/lessons",
        json={
            "module_id": module_id,
            "title": "Урок-тест",
            "lesson_type": "test",
            "order_index": 0,
            "test": {
                "title": "Тест",
                "passing_score": 50,
                "questions": [
                    {
                        "question_text": "2+2=?",
                        "question_type": "single",
                        "options": json.dumps(["3", "4"]),
                        "correct_answers": json.dumps(["4"]),
                        "points": 1,
                        "order_index": 0,
                    }
                ],
            },
        },
        headers=methodist,
    )
    lesson_id = lesson_res.json()["data"]["id"]

    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course_id}, headers=manager)
    student_headers = await _student_headers(student)

    response = await client.get(f"/api/v3/lessons/{lesson_id}/player", headers=student_headers)
    assert response.status_code == 200
    question = response.json()["data"]["lesson"]["test"]["questions"][0]
    assert "correct_answers" not in question
    assert question["question_text"] == "2+2=?"


async def test_teacher_can_preview_locked_lesson(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "preview_teacher@example.com")

    course_id, module_id = await _create_course_and_module(client, methodist)
    lesson_res = await client.post(
        "/api/v3/lessons",
        json={"module_id": module_id, "title": "Урок", "lesson_type": "text", "order_index": 0},
        headers=methodist,
    )
    lesson_id = lesson_res.json()["data"]["id"]

    response = await client.get(f"/api/v3/lessons/{lesson_id}/player", headers=await _student_headers(teacher))
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["is_locked"] is False
    assert data["can_complete"] is True


async def test_manager_cannot_access_player(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await user_factory(Role.MANAGER, "preview_manager@example.com")

    course_id, module_id = await _create_course_and_module(client, methodist)
    lesson_res = await client.post(
        "/api/v3/lessons",
        json={"module_id": module_id, "title": "Урок", "lesson_type": "text", "order_index": 0},
        headers=methodist,
    )
    lesson_id = lesson_res.json()["data"]["id"]

    response = await client.get(f"/api/v3/lessons/{lesson_id}/player", headers=await _student_headers(manager))
    assert response.status_code == 403
