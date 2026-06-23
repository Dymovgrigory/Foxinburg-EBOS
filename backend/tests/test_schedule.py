"""Тесты расписания и посещаемости."""

import uuid
from datetime import datetime, timedelta, date

import pytest
from sqlalchemy import select
from app.core.permissions import Role
from app.utils import utc_now


@pytest.fixture
async def sample_group(db_session, user_factory):
    from app.models.group import Group, GroupMembership
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
        study_type="mini_group",
        academic_hour_minutes=45,
        balance_type="lessons",
        hourly_rate=0,
        auto_invoices_enabled=True,
        certificates_enabled=False,
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
        start_time=utc_now() + timedelta(days=1),
        end_time=utc_now() + timedelta(days=1, hours=1),
    )
    db_session.add(schedule)
    await db_session.commit()
    await db_session.refresh(schedule)
    yield schedule

    await db_session.delete(schedule)
    await db_session.commit()


@pytest.fixture
async def group_student(db_session, sample_group, user_factory):
    from app.models.group import GroupMembership

    unique = uuid.uuid4().hex[:8]
    student = await user_factory(Role.STUDENT, f"student_group_{unique}@test.local")
    membership = GroupMembership(
        group_id=sample_group.id,
        student_id=student.id,
        status="active",
        joined_at=date.today(),
    )
    db_session.add(membership)
    await db_session.commit()
    yield student


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
            "start_time": (utc_now() + timedelta(days=2)).isoformat(),
            "end_time": (utc_now() + timedelta(days=2, hours=1)).isoformat(),
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
            "start_time": (utc_now() + timedelta(days=2)).isoformat(),
            "end_time": (utc_now() + timedelta(days=2, hours=1)).isoformat(),
        }
        response = await client.post("/api/v3/schedules", json=payload, headers=headers)
        assert response.status_code == 403

    async def test_manager_cannot_create_schedule(self, client, auth_headers_factory, sample_group):
        headers = await auth_headers_factory(Role.MANAGER)
        payload = {
            "title": "Manager Schedule",
            "group_id": sample_group.id,
            "teacher_id": 1,
            "start_time": (utc_now() + timedelta(days=2)).isoformat(),
            "end_time": (utc_now() + timedelta(days=2, hours=1)).isoformat(),
        }
        response = await client.post("/api/v3/schedules", json=payload, headers=headers)
        assert response.status_code == 403

    async def test_calendar_includes_occurrence_id_and_date(
        self, client, auth_headers_factory, sample_schedule
    ):
        headers = await auth_headers_factory(Role.TEACHER)
        occurrence_date = sample_schedule.start_time.date().isoformat()
        response = await client.get(
            f"/api/v3/schedules/calendar?from_date={occurrence_date}T00:00:00&to_date={occurrence_date}T23:59:59",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) >= 1
        occurrence = data[0]
        assert "occurrence_id" in occurrence
        assert "occurrence_date" in occurrence
        assert occurrence["schedule_id"] == sample_schedule.id

    async def test_recurring_schedule_generates_occurrences(
        self, client, auth_headers_factory, sample_group
    ):
        from app.models.schedule import Schedule

        headers = await auth_headers_factory(Role.OWNER)
        teacher_headers = await auth_headers_factory(Role.TEACHER)
        from app.core.security import decode_token
        token_payload = decode_token(teacher_headers["Authorization"].split(" ")[1])
        teacher_id = token_payload["user_id"]

        start = utc_now() + timedelta(days=1)
        payload = {
            "title": "Weekly Lesson",
            "group_id": sample_group.id,
            "teacher_id": teacher_id,
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=1)).isoformat(),
            "recurrence": "weekly",
            "recurrence_end": (start + timedelta(weeks=3)).isoformat(),
        }
        response = await client.post("/api/v3/schedules", json=payload, headers=headers)
        assert response.status_code == 201
        schedule_id = response.json()["data"]["id"]

        from_date = start.date().isoformat()
        to_date = (start + timedelta(weeks=4)).date().isoformat()
        response = await client.get(
            f"/api/v3/schedules/calendar?from_date={from_date}T00:00:00&to_date={to_date}T23:59:59",
            headers=headers,
        )
        assert response.status_code == 200
        occurrences = [o for o in response.json()["data"] if o["schedule_id"] == schedule_id]
        assert len(occurrences) == 4


class TestScheduleExceptions:
    async def test_cancel_single_occurrence(
        self, client, auth_headers_factory, sample_schedule
    ):
        headers = await auth_headers_factory(Role.OWNER)
        occurrence_date = sample_schedule.start_time.date().isoformat()
        payload = {
            "exception_date": occurrence_date,
            "is_cancelled": True,
        }
        response = await client.post(
            f"/api/v3/schedules/{sample_schedule.id}/exceptions",
            json=payload,
            headers=headers,
        )
        assert response.status_code == 201

        response = await client.get(
            f"/api/v3/schedules/calendar?from_date={occurrence_date}T00:00:00&to_date={occurrence_date}T23:59:59",
            headers=headers,
        )
        assert response.status_code == 200
        occurrences = [o for o in response.json()["data"] if o["schedule_id"] == sample_schedule.id]
        assert len(occurrences) == 0

    async def test_update_single_occurrence_time(
        self, client, auth_headers_factory, sample_schedule
    ):
        headers = await auth_headers_factory(Role.OWNER)
        occurrence_date = sample_schedule.start_time.date().isoformat()
        new_start = (sample_schedule.start_time + timedelta(hours=2)).isoformat()
        new_end = (sample_schedule.end_time + timedelta(hours=2)).isoformat()
        payload = {
            "exception_date": occurrence_date,
            "start_time": new_start,
            "end_time": new_end,
        }
        response = await client.post(
            f"/api/v3/schedules/{sample_schedule.id}/exceptions",
            json=payload,
            headers=headers,
        )
        assert response.status_code == 201

        response = await client.get(
            f"/api/v3/schedules/calendar?from_date={occurrence_date}T00:00:00&to_date={occurrence_date}T23:59:59",
            headers=headers,
        )
        assert response.status_code == 200
        occurrences = [o for o in response.json()["data"] if o["schedule_id"] == sample_schedule.id]
        assert len(occurrences) == 1
        assert occurrences[0]["start_time"] == new_start


class TestAttendance:
    async def test_teacher_can_mark_attendance(
        self, client, auth_headers_factory, sample_schedule, group_student
    ):
        teacher_headers = await auth_headers_factory(Role.TEACHER)
        occurrence_date = sample_schedule.start_time.date().isoformat()
        payload = {
            "schedule_id": sample_schedule.id,
            "student_id": group_student.id,
            "occurrence_date": occurrence_date,
            "status": "present",
        }
        response = await client.post("/api/v3/attendance", json=payload, headers=teacher_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "present"
        assert data["data"]["occurrence_date"] == occurrence_date

    async def test_attendance_requires_group_membership(
        self, client, auth_headers_factory, sample_schedule, user_factory
    ):
        teacher_headers = await auth_headers_factory(Role.TEACHER)
        unique = uuid.uuid4().hex[:8]
        external_student = await user_factory(Role.STUDENT, f"external_{unique}@test.local")
        occurrence_date = sample_schedule.start_time.date().isoformat()
        payload = {
            "schedule_id": sample_schedule.id,
            "student_id": external_student.id,
            "occurrence_date": occurrence_date,
            "status": "present",
        }
        response = await client.post("/api/v3/attendance", json=payload, headers=teacher_headers)
        assert response.status_code == 400

    async def test_student_cannot_mark_attendance(
        self, client, auth_headers_factory, sample_schedule, group_student
    ):
        headers = await auth_headers_factory(Role.STUDENT)
        occurrence_date = sample_schedule.start_time.date().isoformat()
        payload = {
            "schedule_id": sample_schedule.id,
            "student_id": group_student.id,
            "occurrence_date": occurrence_date,
            "status": "present",
        }
        response = await client.post("/api/v3/attendance", json=payload, headers=headers)
        assert response.status_code == 403
