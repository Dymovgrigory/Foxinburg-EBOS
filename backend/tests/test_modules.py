"""Тесты endpoint'ов /api/v3/modules."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_modules_data(db_session, auth_headers_factory):
    # auth_headers_factory запрашивается для порядка finalizer'ов:
    # сначала чистим курсы/модули, потом user_factory удаляет пользователей.
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


async def _create_course(client, headers):
    res = await client.post("/api/v3/courses", json={"title": "Reorder Course"}, headers=headers)
    return res.json()["data"]["id"]


async def test_reorder_modules(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    course_id = await _create_course(client, methodist)

    modules = []
    for title in ["Модуль A", "Модуль B", "Модуль C"]:
        res = await client.post(
            "/api/v3/modules",
            json={"course_id": course_id, "title": title},
            headers=methodist,
        )
        modules.append(res.json()["data"]["id"])

    # Новый порядок: C, A, B
    new_order = [modules[2], modules[0], modules[1]]
    response = await client.post(
        "/api/v3/modules/reorder",
        json={"course_id": course_id, "module_ids": new_order},
        headers=methodist,
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert [m["id"] for m in data] == new_order
    assert data[0]["order_index"] == 0
    assert data[1]["order_index"] == 1
    assert data[2]["order_index"] == 2


async def test_reorder_modules_invalid_list(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    course_id = await _create_course(client, methodist)

    res = await client.post(
        "/api/v3/modules",
        json={"course_id": course_id, "title": "Модуль"},
        headers=methodist,
    )
    module_id = res.json()["data"]["id"]

    response = await client.post(
        "/api/v3/modules/reorder",
        json={"course_id": course_id, "module_ids": [module_id, 999999]},
        headers=methodist,
    )
    assert response.status_code == 400


async def test_reorder_modules_forbidden_for_student(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await auth_headers_factory(Role.STUDENT)
    course_id = await _create_course(client, methodist)

    res = await client.post(
        "/api/v3/modules",
        json={"course_id": course_id, "title": "Модуль"},
        headers=methodist,
    )
    module_id = res.json()["data"]["id"]

    response = await client.post(
        "/api/v3/modules/reorder",
        json={"course_id": course_id, "module_ids": [module_id]},
        headers=student,
    )
    assert response.status_code == 403
