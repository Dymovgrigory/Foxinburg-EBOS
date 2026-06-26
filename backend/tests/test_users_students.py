"""Тесты endpoint'а /api/v3/users/students."""

import pytest
from app.models.user import User
from app.models.group import Group
from app.core.security import get_password_hash, create_access_token


@pytest.mark.asyncio
class TestListMyStudents:
    async def test_teacher_sees_only_assigned_group_students(self, client, db_session):
        teacher = User(
            email="teacher_students@test.local",
            name="Teacher",
            role="teacher",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        other_teacher = User(
            email="other_teacher_students@test.local",
            name="Other Teacher",
            role="teacher",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        assigned_student = User(
            email="assigned_student@test.local",
            name="Assigned Student",
            role="student",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        other_student = User(
            email="other_student@test.local",
            name="Other Student",
            role="student",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add_all([teacher, other_teacher, assigned_student, other_student])
        await db_session.flush()

        group_for_teacher = Group(name="Group Teacher", teacher_id=teacher.id)
        group_for_other = Group(name="Group Other", teacher_id=other_teacher.id)
        db_session.add_all([group_for_teacher, group_for_other])
        await db_session.flush()

        assigned_student.group_id = group_for_teacher.id
        other_student.group_id = group_for_other.id
        await db_session.commit()

        token = create_access_token({"user_id": teacher.id, "role": teacher.role})
        response = await client.get(
            "/api/v3/users/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        emails = {u["email"] for u in data}
        assert emails == {"assigned_student@test.local"}

    async def test_teacher_without_groups_sees_empty_list(self, client, db_session):
        teacher = User(
            email="teacher_empty@test.local",
            name="Teacher Empty",
            role="teacher",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(teacher)
        await db_session.commit()

        token = create_access_token({"user_id": teacher.id, "role": teacher.role})
        response = await client.get(
            "/api/v3/users/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["data"] == []

    async def test_methodist_can_list_all_students(self, client, db_session):
        methodist = User(
            email="methodist_students@test.local",
            name="Methodist",
            role="methodist",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        student = User(
            email="student_methodist@test.local",
            name="Student",
            role="student",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add_all([methodist, student])
        await db_session.commit()

        token = create_access_token({"user_id": methodist.id, "role": methodist.role})
        response = await client.get(
            "/api/v3/users/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        emails = {u["email"] for u in response.json()["data"]}
        assert "student_methodist@test.local" in emails

    async def test_manager_can_list_all_students(self, client, db_session):
        manager = User(
            email="manager_students@test.local",
            name="Manager",
            role="manager",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        student = User(
            email="student_manager@test.local",
            name="Student",
            role="student",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add_all([manager, student])
        await db_session.commit()

        token = create_access_token({"user_id": manager.id, "role": manager.role})
        response = await client.get(
            "/api/v3/users/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        emails = {u["email"] for u in response.json()["data"]}
        assert "student_manager@test.local" in emails

    async def test_student_cannot_list_students(self, client, db_session):
        student = User(
            email="student_forbidden@test.local",
            name="Student",
            role="student",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(student)
        await db_session.commit()

        token = create_access_token({"user_id": student.id, "role": student.role})
        response = await client.get(
            "/api/v3/users/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
