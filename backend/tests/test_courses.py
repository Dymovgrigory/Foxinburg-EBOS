import json
import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_course_data(db_session, user_factory):
    yield
    await db_session.execute(text("""
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
    """))
    await db_session.commit()


async def test_create_lesson_with_test_and_homework(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)

    course_res = await client.post("/api/v3/courses", json={
        "title": "Форматы уроков",
        "description": "Тест форматов",
        "is_sequential": True,
    }, headers=methodist)
    assert course_res.status_code == 201
    course = course_res.json()["data"]

    module_res = await client.post("/api/v3/modules", json={
        "course_id": course["id"],
        "title": "Модуль 1",
    }, headers=methodist)
    assert module_res.status_code == 201
    module = module_res.json()["data"]

    test_lesson_res = await client.post("/api/v3/lessons", json={
        "module_id": module["id"],
        "title": "Тестовый урок",
        "lesson_type": "test",
        "order_index": 0,
        "test": {
            "title": "Контрольный тест",
            "passing_score": 50,
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
    assert test_lesson_res.status_code == 201
    test_lesson = test_lesson_res.json()["data"]
    assert test_lesson["lesson_type"] == "test"
    assert test_lesson["test"]["title"] == "Контрольный тест"
    assert len(test_lesson["test"]["questions"]) == 1

    hw_lesson_res = await client.post("/api/v3/lessons", json={
        "module_id": module["id"],
        "title": "Урок с ДЗ",
        "lesson_type": "homework",
        "order_index": 1,
        "homework_title": "Написать эссе",
        "homework_description": "Опишите свою цель",
    }, headers=methodist)
    assert hw_lesson_res.status_code == 201
    hw_lesson = hw_lesson_res.json()["data"]
    assert hw_lesson["lesson_type"] == "homework"
    assert hw_lesson["homework_title"] == "Написать эссе"


async def test_enrollment_creates_homework_and_progress(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await user_factory(Role.STUDENT, "student_hw@test.local")

    course_res = await client.post("/api/v3/courses", json={
        "title": "Курс с ДЗ",
        "is_sequential": True,
    }, headers=methodist)
    course = course_res.json()["data"]

    module_res = await client.post("/api/v3/modules", json={
        "course_id": course["id"],
        "title": "Модуль 1",
    }, headers=methodist)
    module = module_res.json()["data"]

    await client.post("/api/v3/lessons", json={
        "module_id": module["id"],
        "title": "Текстовый урок",
        "lesson_type": "text",
        "order_index": 0,
    }, headers=methodist)

    hw_lesson_res = await client.post("/api/v3/lessons", json={
        "module_id": module["id"],
        "title": "Урок с ДЗ",
        "lesson_type": "homework",
        "order_index": 1,
        "homework_title": "ДЗ",
    }, headers=methodist)
    hw_lesson = hw_lesson_res.json()["data"]

    student_headers = {"Authorization": f"Bearer {student_token(student)}"}

    enroll_res = await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course["id"],
    }, headers=methodist)
    assert enroll_res.status_code == 201

    homeworks_res = await client.get(f"/api/v3/homeworks?lesson_id={hw_lesson['id']}", headers=student_headers)
    assert homeworks_res.status_code == 200
    homeworks = homeworks_res.json()["data"]
    assert len(homeworks) == 1
    assert homeworks[0]["student_id"] == student.id
    assert homeworks[0]["status"] == "assigned"

    progress_res = await client.get("/api/v3/progress", headers=student_headers)
    assert progress_res.status_code == 200
    progress = progress_res.json()["data"]
    assert len(progress) == 2
    statuses = {p["lesson_id"]: p["status"] for p in progress}
    first, second = sorted(statuses.keys())
    assert statuses[first] == "available"
    assert statuses[second] == "locked"


async def test_complete_text_unlocks_next(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await user_factory(Role.STUDENT, "student_seq@test.local")

    course = (await client.post("/api/v3/courses", json={"title": "Последовательный"}, headers=methodist)).json()["data"]
    module = (await client.post("/api/v3/modules", json={"course_id": course["id"], "title": "М1"}, headers=methodist)).json()["data"]

    l1 = (await client.post("/api/v3/lessons", json={
        "module_id": module["id"], "title": "Урок 1", "lesson_type": "text", "order_index": 0,
    }, headers=methodist)).json()["data"]
    l2 = (await client.post("/api/v3/lessons", json={
        "module_id": module["id"], "title": "Урок 2", "lesson_type": "text", "order_index": 1,
    }, headers=methodist)).json()["data"]

    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course["id"]}, headers=methodist)
    student_headers = {"Authorization": f"Bearer {student_token(student)}"}

    complete_res = await client.post(f"/api/v3/lessons/{l1['id']}/complete", headers=student_headers)
    assert complete_res.status_code == 200

    progress = (await client.get("/api/v3/progress", headers=student_headers)).json()["data"]
    statuses = {p["lesson_id"]: p["status"] for p in progress}
    assert statuses[l1["id"]] == "completed"
    assert statuses[l2["id"]] == "available"


async def test_test_completion_unlocks_next(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await user_factory(Role.STUDENT, "student_test@test.local")

    course = (await client.post("/api/v3/courses", json={"title": "Курс с тестом"}, headers=methodist)).json()["data"]
    module = (await client.post("/api/v3/modules", json={"course_id": course["id"], "title": "М1"}, headers=methodist)).json()["data"]

    l1 = (await client.post("/api/v3/lessons", json={
        "module_id": module["id"], "title": "Текст", "lesson_type": "text", "order_index": 0,
    }, headers=methodist)).json()["data"]
    l2 = (await client.post("/api/v3/lessons", json={
        "module_id": module["id"], "title": "Тест", "lesson_type": "test", "order_index": 1,
        "test": {
            "title": "Тест",
            "passing_score": 100,
            "questions": [{
                "question_text": "Вопрос",
                "question_type": "single",
                "options": json.dumps(["A", "B"]),
                "correct_answers": json.dumps(["A"]),
                "points": 1,
            }],
        },
    }, headers=methodist)).json()["data"]
    l3 = (await client.post("/api/v3/lessons", json={
        "module_id": module["id"], "title": "Финал", "lesson_type": "text", "order_index": 2,
    }, headers=methodist)).json()["data"]

    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course["id"]}, headers=methodist)
    student_headers = {"Authorization": f"Bearer {student_token(student)}"}

    await client.post(f"/api/v3/lessons/{l1['id']}/complete", headers=student_headers)

    test_id = l2["test"]["id"]
    question_id = l2["test"]["questions"][0]["id"]

    attempt_res = await client.post(f"/api/v3/tests/{test_id}/attempts", json={}, headers=student_headers)
    assert attempt_res.status_code == 201
    attempt = attempt_res.json()["data"]

    await client.patch(f"/api/v3/tests/{test_id}/attempts/{attempt['id']}", json={
        "answers": json.dumps({str(question_id): "A"}),
    }, headers=student_headers)

    submit_res = await client.post(f"/api/v3/tests/{test_id}/attempts/{attempt['id']}/submit", headers=student_headers)
    assert submit_res.status_code == 200
    scored = submit_res.json()["data"]
    assert scored["is_passed"] is True

    progress = (await client.get("/api/v3/progress", headers=student_headers)).json()["data"]
    statuses = {p["lesson_id"]: p["status"] for p in progress}
    assert statuses[l2["id"]] == "completed"
    assert statuses[l3["id"]] == "available"


async def test_homework_approval_unlocks_next(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await user_factory(Role.STUDENT, "student_hwflow@test.local")

    course = (await client.post("/api/v3/courses", json={"title": "Курс с ДЗ"}, headers=methodist)).json()["data"]
    module = (await client.post("/api/v3/modules", json={"course_id": course["id"], "title": "М1"}, headers=methodist)).json()["data"]

    l1 = (await client.post("/api/v3/lessons", json={
        "module_id": module["id"], "title": "Текст", "lesson_type": "text", "order_index": 0,
    }, headers=methodist)).json()["data"]
    l2 = (await client.post("/api/v3/lessons", json={
        "module_id": module["id"], "title": "ДЗ", "lesson_type": "homework", "order_index": 1,
        "homework_title": "Эссе",
    }, headers=methodist)).json()["data"]
    l3 = (await client.post("/api/v3/lessons", json={
        "module_id": module["id"], "title": "Финал", "lesson_type": "text", "order_index": 2,
    }, headers=methodist)).json()["data"]

    await client.post("/api/v3/enrollments", json={"student_id": student.id, "course_id": course["id"]}, headers=methodist)
    student_headers = {"Authorization": f"Bearer {student_token(student)}"}

    await client.post(f"/api/v3/lessons/{l1['id']}/complete", headers=student_headers)

    homeworks_res = await client.get(f"/api/v3/homeworks?lesson_id={l2['id']}", headers=student_headers)
    homework = homeworks_res.json()["data"][0]

    submit_res = await client.post(f"/api/v3/homeworks/{homework['id']}/submit", json={"content": "Мой ответ"}, headers=student_headers)
    assert submit_res.status_code == 200

    review_res = await client.post(f"/api/v3/homeworks/{homework['id']}/reviews", json={
        "status": "approved",
        "comment": "Отлично",
    }, headers=methodist)
    assert review_res.status_code == 201

    progress = (await client.get("/api/v3/progress", headers=student_headers)).json()["data"]
    statuses = {p["lesson_id"]: p["status"] for p in progress}
    assert statuses[l2["id"]] == "completed"
    assert statuses[l3["id"]] == "available"


def student_token(user):
    from app.core.security import create_access_token
    return create_access_token({"user_id": user.id, "role": user.role})
