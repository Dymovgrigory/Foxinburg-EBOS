"""RBAC-тесты для домашних заданий: teacher видит только свои ДЗ из академии."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_homework_data(db_session, user_factory):
    yield
    await db_session.execute(text("""
        TRUNCATE TABLE
            homework_reviews,
            homeworks,
            lesson_progress,
            enrollments,
            lesson_contents,
            tests,
            test_questions,
            test_attempts,
            lessons,
            modules,
            courses,
            audit_logs,
            system_events
        CASCADE
    """))
    await db_session.commit()


@pytest_asyncio.fixture
async def academy_homeworks(client, user_factory):
    """Создаёт курс с домашним заданием, зачисляет teacher и student, возвращает их ДЗ."""
    from app.core.security import create_access_token

    methodist = await user_factory(Role.METHODIST, "methodist_hw@test.local")
    methodist_headers = {"Authorization": f"Bearer {create_access_token({'user_id': methodist.id, 'role': methodist.role})}"}
    teacher = await user_factory(Role.TEACHER, "teacher_hw@test.local")
    student = await user_factory(Role.STUDENT, "student_hw@test.local")

    course_res = await client.post(
        "/api/v3/courses",
        json={
            "title": "Академия педагогов",
            "description": "Тестовый курс",
            "type": "teacher_academy",
        },
        headers=methodist_headers,
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["data"]["id"]

    module_res = await client.post(
        "/api/v3/modules",
        json={"course_id": course_id, "title": "Модуль 1", "order_index": 0},
        headers=methodist_headers,
    )
    assert module_res.status_code == 201
    module_id = module_res.json()["data"]["id"]

    lesson_res = await client.post(
        "/api/v3/lessons",
        json={
            "module_id": module_id,
            "title": "Урок с ДЗ",
            "lesson_type": "homework",
            "order_index": 0,
            "homework_title": "Напишите эссе",
            "homework_description": "Опишите вашу педагогическую философию",
        },
        headers=methodist_headers,
    )
    assert lesson_res.status_code == 201

    for user in (teacher, student):
        enroll_res = await client.post(
            "/api/v3/enrollments",
            json={"student_id": user.id, "course_id": course_id},
            headers=methodist_headers,
        )
        assert enroll_res.status_code == 201

    # Получаем ID домашних заданий
    methodist_list = await client.get("/api/v3/homeworks", headers=methodist_headers)
    assert methodist_list.status_code == 200
    homeworks = methodist_list.json()["data"]
    teacher_hw = next(h for h in homeworks if h["student_id"] == teacher.id)
    student_hw = next(h for h in homeworks if h["student_id"] == student.id)

    teacher_headers = {"Authorization": f"Bearer {create_access_token({'user_id': teacher.id, 'role': teacher.role})}"}
    student_headers = {"Authorization": f"Bearer {create_access_token({'user_id': student.id, 'role': student.role})}"}

    return {
        "teacher": teacher,
        "student": student,
        "teacher_hw": teacher_hw,
        "student_hw": student_hw,
        "teacher_headers": teacher_headers,
        "student_headers": student_headers,
        "methodist_headers": methodist_headers,
    }


async def test_teacher_list_homeworks_shows_only_own(academy_homeworks, client):
    res = await client.get("/api/v3/homeworks", headers=academy_homeworks["teacher_headers"])
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    assert data[0]["student_id"] == academy_homeworks["teacher"].id


async def test_teacher_cannot_review_other_homework(academy_homeworks, client):
    res = await client.post(
        f"/api/v3/homeworks/{academy_homeworks['student_hw']['id']}/reviews",
        json={"status": "approved", "comment": "OK"},
        headers=academy_homeworks["teacher_headers"],
    )
    assert res.status_code == 403


async def test_teacher_cannot_update_other_homework(academy_homeworks, client):
    res = await client.patch(
        f"/api/v3/homeworks/{academy_homeworks['student_hw']['id']}",
        json={"status": "reviewed"},
        headers=academy_homeworks["teacher_headers"],
    )
    assert res.status_code == 403


async def test_teacher_cannot_delete_other_homework(academy_homeworks, client):
    res = await client.delete(
        f"/api/v3/homeworks/{academy_homeworks['student_hw']['id']}",
        headers=academy_homeworks["teacher_headers"],
    )
    assert res.status_code == 403


async def test_teacher_can_submit_own_homework(academy_homeworks, client):
    res = await client.post(
        f"/api/v3/homeworks/{academy_homeworks['teacher_hw']['id']}/submit",
        json={"content": "Мой ответ"},
        headers=academy_homeworks["teacher_headers"],
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "submitted"


async def test_teacher_cannot_submit_other_homework(academy_homeworks, client):
    res = await client.post(
        f"/api/v3/homeworks/{academy_homeworks['student_hw']['id']}/submit",
        json={"content": "Чужой ответ"},
        headers=academy_homeworks["teacher_headers"],
    )
    assert res.status_code == 403


async def test_teacher_cannot_list_reviews_of_other_homework(academy_homeworks, client):
    res = await client.get(
        f"/api/v3/homeworks/{academy_homeworks['student_hw']['id']}/reviews",
        headers=academy_homeworks["teacher_headers"],
    )
    assert res.status_code == 403


async def test_teacher_can_list_reviews_of_own_homework(academy_homeworks, client):
    methodist = academy_homeworks["methodist_headers"]
    hw_id = academy_homeworks["teacher_hw"]["id"]

    await client.post(f"/api/v3/homeworks/{hw_id}/submit", json={"content": "Ответ"}, headers=academy_homeworks["teacher_headers"])
    review_res = await client.post(
        f"/api/v3/homeworks/{hw_id}/reviews",
        json={"status": "approved", "comment": "Хорошо"},
        headers=methodist,
    )
    assert review_res.status_code == 201

    res = await client.get(f"/api/v3/homeworks/{hw_id}/reviews", headers=academy_homeworks["teacher_headers"])
    assert res.status_code == 200
    assert len(res.json()["data"]) == 1
