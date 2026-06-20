"""Тесты расписания и посещаемости."""

import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select
from app.core.permissions import Role


@pytest.fixture
async def sample_group(db_session, user_factory):
    from app.models.group import Group
    from app.models.organization import Organization, Branch

    unique = uuid.uuid4().hex[:8]
    org = Organization(name=f"Test Org {unique}")
    db_session.add(org)
    await db_session.flush()

    branch = Branch(name=f"Test Branch {unique}", organization_id=org.id)
    db_session.add(branch)
    await db_session.flush()

    teacher = await user_factory(Role.TEACHER, f"teacher_{unique}@test.local")
    group = Group(
        name=f"Test Group {unique}",
        branch_id=branch.id,
        teacher_id=teacher.id,
        max_students=12,
    )
    db_session.add(group)
    await db_session.commit()
    await db_session.refresh(group)
    yield group

    # cleanup: сначала занятия, потом группу, чтобы не ловить SET NULL на not-null поле
    from app.models.schedule import Schedule
    result = await db_session.execute(select(Schedule).where(Schedule.group_id == group.id))
    for schedule in result.scalars().all():
        await db_session.delete(schedule)
    await db_session.commit()
    await db_session.delete(group)
    await db_session.delete(branch)
    await db_session.delete(org)
    await db_session.commit()


@pytest.fixture
async def sample_schedule(db_session, sample_group, user_factory):
    from app.models.schedule import Schedule

    unique = uuid.uuid4().hex[:8]
    teacher = await user_factory(Role.TEACHER, f"teacher_sched_{unique}@test.local")
    schedule = Schedule(
        title=f"Test Lesson {unique}",
        group_id=sample_group.id,
        teacher_id=teacher.id,
        start_time=datetime.utcnow() + timedelta(days=1),
        end_time=datetime.utcnow() + timedelta(days=1, hours=1),
    )
    db_session.add(schedule)
    await db_session.commit()
    await db_session.refresh(schedule)
    yield schedule

    await db_session.delete(schedule)
    await db_session.commit()


class TestSchedules:
    async def test_unauthorized_list_schedules(self, client):
        response = await client.get("/api/v3/schedules")
        assert response.status_code == 401

    async def test_teacher_can_list_schedules(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.TEACHER)
        response = await client.get("/api/v3/schedules", headers=headers)
        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_owner_can_create_schedule(self, client, auth_headers_factory, sample_group):
        headers = await auth_headers_factory(Role.OWNER)
        teacher_headers = await auth_headers_factory(Role.TEACHER)
        from app.core.security import decode_token
        payload = decode_token(teacher_headers["Authorization"].split(" ")[1])
        teacher_user_id = payload["user_id"]

        payload = {
            "title": "New Schedule",
            "group_id": sample_group.id,
            "teacher_id": teacher_user_id,
            "start_time": (datetime.utcnow() + timedelta(days=2)).isoformat(),
            "end_time": (datetime.utcnow() + timedelta(days=2, hours=1)).isoformat(),
        }
        response = await client.post("/api/v3/schedules", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == "New Schedule"

    async def test_student_cannot_create_schedule(self, client, auth_headers_factory, sample_group):
        headers = await auth_headers_factory(Role.STUDENT)
        payload = {
            "title": "Hack",
            "group_id": sample_group.id,
            "teacher_id": 1,
            "start_time": (datetime.utcnow() + timedelta(days=2)).isoformat(),
            "end_time": (datetime.utcnow() + timedelta(days=2, hours=1)).isoformat(),
        }
        response = await client.post("/api/v3/schedules", json=payload, headers=headers)
        assert response.status_code == 403


class TestAttendance:
    async def test_teacher_can_mark_attendance(
        self, client, auth_headers_factory, sample_schedule, user_factory
    ):
        teacher_headers = await auth_headers_factory(Role.TEACHER)
        unique = uuid.uuid4().hex[:8]
        student = await user_factory(Role.STUDENT, f"student_att_{unique}@test.local")
        payload = {
            "schedule_id": sample_schedule.id,
            "student_id": student.id,
            "status": "present",
        }
        response = await client.post("/api/v3/attendance", json=payload, headers=teacher_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "present"

    async def test_student_cannot_mark_attendance(self, client, auth_headers_factory, sample_schedule, user_factory):
        unique = uuid.uuid4().hex[:8]
        student_user = await user_factory(Role.STUDENT, f"student_att2_{unique}@test.local")
        headers = await auth_headers_factory(Role.STUDENT)
        payload = {
            "schedule_id": sample_schedule.id,
            "student_id": student_user.id,
            "status": "present",
        }
        response = await client.post("/api/v3/attendance", json=payload, headers=headers)
        assert response.status_code == 403
