"""Тесты LMS-уведомлений, создаваемых через EventBus."""

import json
import pytest
import pytest_asyncio
from sqlalchemy import text, select

from app.core.permissions import Role
from app.core.security import create_access_token
from app.models.notification import Notification


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_notification_events(db_session, auth_headers_factory):
    _ = auth_headers_factory
    yield
    await db_session.rollback()
    await db_session.execute(
        text("""
            TRUNCATE TABLE
                notifications,
                system_events,
                test_attempts,
                homeworks,
                homework_reviews,
                lesson_progress,
                enrollments,
                lessons,
                lesson_contents,
                tests,
                test_questions,
                modules,
                courses,
                groups,
                audit_logs
            CASCADE
        """)
    )
    await db_session.commit()


async def _create_course_and_module(client, headers):
    course_res = await client.post("/api/v3/courses", json={"title": "Notify Course", "is_sequential": True}, headers=headers)
    course_id = course_res.json()["data"]["id"]
    module_res = await client.post(
        "/api/v3/modules",
        json={"course_id": course_id, "title": "Модуль", "order_index": 0},
        headers=headers,
    )
    return course_id, module_res.json()["data"]["id"]


async def _student_headers(user):
    return {"Authorization": f"Bearer {create_access_token({'user_id': user.id, 'role': user.role})}"}


async def _student_notifications(client, user):
    headers = await _student_headers(user)
    response = await client.get("/api/v3/notifications", headers=headers)
    assert response.status_code == 200
    return response.json()["data"]


async def test_lesson_available_notification(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "notify_available@example.com")

    course_id, module_id = await _create_course_and_module(client, methodist)
    lessons = []
    for idx, title in enumerate(["Урок 1", "Урок 2"]):
        res = await client.post(
            "/api/v3/lessons",
            json={"module_id": module_id, "title": title, "lesson_type": "text", "order_index": idx},
            headers=methodist,
        )
        lessons.append(res.json()["data"]["id"])

    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course_id}, headers=manager)

    # Завершаем первый урок — второй разблокируется
    student_headers = await _student_headers(student)
    complete_res = await client.post(f"/api/v3/lessons/{lessons[0]}/complete", headers=student_headers)
    assert complete_res.status_code == 200

    notifications = await _student_notifications(client, student)
    titles = [n["title"] for n in notifications]
    assert "Урок завершён" in titles
    assert "Доступен новый урок" in titles


async def test_homework_assigned_notification(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "notify_hw@example.com")

    course_id, module_id = await _create_course_and_module(client, methodist)
    await client.post(
        "/api/v3/lessons",
        json={"module_id": module_id, "title": "Урок ДЗ", "lesson_type": "homework", "order_index": 0},
        headers=methodist,
    )

    # При зачислении автоматически создаётся ДЗ для уроков-формата homework
    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course_id}, headers=manager)

    notifications = await _student_notifications(client, student)
    titles = [n["title"] for n in notifications]
    assert "Новое домашнее задание" in titles


async def test_homework_reviewed_notification(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "notify_hw_review@example.com")

    course_id, module_id = await _create_course_and_module(client, methodist)
    lesson_res = await client.post(
        "/api/v3/lessons",
        json={"module_id": module_id, "title": "Урок ДЗ", "lesson_type": "homework", "order_index": 0},
        headers=methodist,
    )
    lesson_id = lesson_res.json()["data"]["id"]

    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course_id}, headers=manager)

    # ДЗ уже создано при зачислении
    student_headers = await _student_headers(student)
    hw_list = await client.get(f"/api/v3/homeworks?lesson_id={lesson_id}", headers=student_headers)
    homework_id = hw_list.json()["data"][0]["id"]

    student_headers = await _student_headers(student)
    await client.post(f"/api/v3/homeworks/{homework_id}/submit", json={"content": "ответ"}, headers=student_headers)

    review_res = await client.post(
        f"/api/v3/homeworks/{homework_id}/reviews",
        json={"status": "approved", "score": 10, "comment": "Отлично"},
        headers=methodist,
    )
    assert review_res.status_code == 201

    notifications = await _student_notifications(client, student)
    titles = [n["title"] for n in notifications]
    assert "Домашнее задание проверено" in titles


async def test_test_result_notification(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    manager = await auth_headers_factory(Role.MANAGER)
    student = await user_factory(Role.STUDENT, "notify_test@example.com")

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
    test_id = lesson_res.json()["data"]["test"]["id"]

    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course_id}, headers=manager)

    student_headers = await _student_headers(student)
    attempt_res = await client.post(f"/api/v3/tests/{test_id}/attempts", json={}, headers=student_headers)
    assert attempt_res.status_code == 201
    attempt_id = attempt_res.json()["data"]["id"]

    # Отправляем неправильный ответ — тест не пройден
    await client.patch(
        f"/api/v3/tests/{test_id}/attempts/{attempt_id}",
        json={"answers": json.dumps({"1": "3"})},
        headers=student_headers,
    )
    submit_res = await client.post(f"/api/v3/tests/{test_id}/attempts/{attempt_id}/submit", headers=student_headers)
    assert submit_res.status_code == 200

    notifications = await _student_notifications(client, student)
    titles = [n["title"] for n in notifications]
    assert "Тест не пройден" in titles
