"""Тесты endpoint'ов /api/v3/employee-groups."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_employee_groups(db_session, user_factory):
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
            audit_logs,
            system_events
        CASCADE
    """))
    await db_session.commit()


async def test_methodist_can_crud_employee_group(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)

    create_res = await client.post("/api/v3/employee-groups", json={
        "name": "Методисты",
        "description": "Группа методистов",
        "group_type": "internal",
    }, headers=methodist)
    assert create_res.status_code == 201
    group = create_res.json()["data"]
    assert group["name"] == "Методисты"
    assert group["group_type"] == "internal"

    list_res = await client.get("/api/v3/employee-groups", headers=methodist)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) == 1

    detail_res = await client.get(f"/api/v3/employee-groups/{group['id']}", headers=methodist)
    assert detail_res.status_code == 200
    assert detail_res.json()["data"]["id"] == group["id"]

    update_res = await client.patch(f"/api/v3/employee-groups/{group['id']}", json={
        "name": "Методисты обновлённые",
    }, headers=methodist)
    assert update_res.status_code == 200
    assert update_res.json()["data"]["name"] == "Методисты обновлённые"

    delete_res = await client.delete(f"/api/v3/employee-groups/{group['id']}", headers=methodist)
    assert delete_res.status_code == 200

    list_after = await client.get("/api/v3/employee-groups", headers=methodist)
    assert list_after.json()["data"] == []


async def test_manage_group_members(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "teacher_eg@test.local")

    create_res = await client.post("/api/v3/employee-groups", json={
        "name": "Педагоги",
        "group_type": "internal",
    }, headers=methodist)
    group_id = create_res.json()["data"]["id"]

    add_res = await client.post(f"/api/v3/employee-groups/{group_id}/members", json={
        "user_id": teacher.id,
    }, headers=methodist)
    assert add_res.status_code == 200
    assert len(add_res.json()["data"]["members"]) == 1

    remove_res = await client.delete(f"/api/v3/employee-groups/{group_id}/members/{teacher.id}", headers=methodist)
    assert remove_res.status_code == 200
    assert remove_res.json()["data"]["members"] == []


async def test_enroll_employee_group_to_course(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    teacher = await user_factory(Role.TEACHER, "teacher_eg_enroll@test.local")

    group_res = await client.post("/api/v3/employee-groups", json={
        "name": "Группа для зачисления",
        "member_ids": [teacher.id],
    }, headers=methodist)
    group_id = group_res.json()["data"]["id"]

    course_res = await client.post("/api/v3/courses", json={
        "title": "Курс для сотрудников",
        "description": "Тест",
    }, headers=methodist)
    course_id = course_res.json()["data"]["id"]

    module_res = await client.post("/api/v3/modules", json={
        "course_id": course_id,
        "title": "Модуль 1",
    }, headers=methodist)
    assert module_res.status_code == 201

    enroll_res = await client.post(f"/api/v3/employee-groups/{group_id}/enroll", json={
        "course_id": course_id,
    }, headers=methodist)
    assert enroll_res.status_code == 200
    assert enroll_res.json()["data"]["enrolled_count"] == 1


async def test_student_cannot_manage_employee_groups(client, auth_headers_factory):
    student = await auth_headers_factory(Role.STUDENT)

    create_res = await client.post("/api/v3/employee-groups", json={
        "name": "Группа",
    }, headers=student)
    assert create_res.status_code == 403


async def test_methodist_can_delete_homework(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await user_factory(Role.STUDENT, "student_hw_delete@test.local")

    course_res = await client.post("/api/v3/courses", json={"title": "Курс с ДЗ"}, headers=methodist)
    course_id = course_res.json()["data"]["id"]
    module_res = await client.post("/api/v3/modules", json={
        "course_id": course_id,
        "title": "М1",
    }, headers=methodist)
    module_id = module_res.json()["data"]["id"]
    lesson_res = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "ДЗ",
        "lesson_type": "homework",
        "order_index": 0,
        "homework_title": "Эссе",
    }, headers=methodist)
    lesson_id = lesson_res.json()["data"]["id"]

    await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course_id,
    }, headers=methodist)

    from app.core.security import create_access_token
    student_headers = {"Authorization": f"Bearer {create_access_token({'user_id': student.id, 'role': student.role})}"}
    homeworks_res = await client.get(f"/api/v3/homeworks?lesson_id={lesson_id}", headers=student_headers)
    homework_id = homeworks_res.json()["data"][0]["id"]

    delete_res = await client.delete(f"/api/v3/homeworks/{homework_id}", headers=methodist)
    assert delete_res.status_code == 200

    list_after = await client.get(f"/api/v3/homeworks?lesson_id={lesson_id}", headers=student_headers)
    assert list_after.json()["data"] == []


async def test_student_cannot_delete_homework(client, auth_headers_factory, user_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await user_factory(Role.STUDENT, "student_hw_delete_forbid@test.local")

    course_res = await client.post("/api/v3/courses", json={"title": "Курс с ДЗ 2"}, headers=methodist)
    course_id = course_res.json()["data"]["id"]
    module_res = await client.post("/api/v3/modules", json={
        "course_id": course_id,
        "title": "М1",
    }, headers=methodist)
    module_id = module_res.json()["data"]["id"]
    lesson_res = await client.post("/api/v3/lessons", json={
        "module_id": module_id,
        "title": "ДЗ",
        "lesson_type": "homework",
        "order_index": 0,
        "homework_title": "Эссе",
    }, headers=methodist)
    lesson_id = lesson_res.json()["data"]["id"]

    await client.post("/api/v3/enrollments", json={
        "student_id": student.id,
        "course_id": course_id,
    }, headers=methodist)

    from app.core.security import create_access_token
    student_headers = {"Authorization": f"Bearer {create_access_token({'user_id': student.id, 'role': student.role})}"}
    homeworks_res = await client.get(f"/api/v3/homeworks?lesson_id={lesson_id}", headers=student_headers)
    homework_id = homeworks_res.json()["data"][0]["id"]

    delete_res = await client.delete(f"/api/v3/homeworks/{homework_id}", headers=student_headers)
    assert delete_res.status_code == 403
