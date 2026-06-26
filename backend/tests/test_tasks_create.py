"""Тесты создания/обновления задач через /api/v3/tasks.

Регрессия: при создании задачи с ответственным сериализация ответа
обращалась к связям assignee/creator/contact, которые не были загружены
(после session.refresh связи не подгружаются) → sqlalchemy MissingGreenlet → 500.
"""

import pytest
from app.models.user import User
from app.core.security import get_password_hash, create_access_token


@pytest.mark.asyncio
class TestCreateTask:
    async def test_teacher_creates_task_with_assignee(self, client, db_session):
        teacher = User(
            email="teacher_tasks@test.local",
            name="Teacher Tasks",
            role="teacher",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        student = User(
            email="student_tasks@test.local",
            name="Student Tasks",
            role="student",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add_all([teacher, student])
        await db_session.commit()

        token = create_access_token({"user_id": teacher.id, "role": teacher.role})
        response = await client.post(
            "/api/v3/tasks",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "QA task", "assignee_id": student.id},
        )
        assert response.status_code == 201, response.text
        data = response.json()["data"]
        assert data["title"] == "QA task"
        assert data["assignee_id"] == student.id
        assert data["assignee_name"] == "Student Tasks"
        assert data["creator_name"] == "Teacher Tasks"

    async def test_teacher_creates_task_without_assignee(self, client, db_session):
        teacher = User(
            email="teacher_tasks2@test.local",
            name="Teacher Tasks 2",
            role="teacher",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(teacher)
        await db_session.commit()

        token = create_access_token({"user_id": teacher.id, "role": teacher.role})
        response = await client.post(
            "/api/v3/tasks",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "Solo task"},
        )
        assert response.status_code == 201, response.text
        data = response.json()["data"]
        assert data["assignee_name"] is None
        assert data["creator_name"] == "Teacher Tasks 2"

    async def test_update_task_returns_assignee_name(self, client, db_session):
        teacher = User(
            email="teacher_tasks3@test.local",
            name="Teacher Tasks 3",
            role="teacher",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        student = User(
            email="student_tasks3@test.local",
            name="Student Tasks 3",
            role="student",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add_all([teacher, student])
        await db_session.commit()

        token = create_access_token({"user_id": teacher.id, "role": teacher.role})
        create = await client.post(
            "/api/v3/tasks",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "To update"},
        )
        assert create.status_code == 201, create.text
        task_id = create.json()["data"]["id"]

        update = await client.patch(
            f"/api/v3/tasks/{task_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"assignee_id": student.id},
        )
        assert update.status_code == 200, update.text
        data = update.json()["data"]
        assert data["assignee_id"] == student.id
        assert data["assignee_name"] == "Student Tasks 3"
