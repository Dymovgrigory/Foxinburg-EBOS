"""Негативные RBAC-тесты на создание/изменение/удаление данных.

Проверяем, что пользователи без нужных прав не могут выполнять
опасные операции (POST/PUT/PATCH/DELETE) в ключевых модулях.
"""

import pytest

from app.core.permissions import Role


_USER_CREATE_PAYLOAD = {
    "email": "new_user_rbac@test.local",
    "name": "New RBAC User",
    "password": "password123",
    "role": "student",
    "plan": "FREE",
    "target_language": "en",
}

_COURSE_CREATE_PAYLOAD = {
    "title": "RBAC Course",
    "description": "created by rbac test",
    "type": "academy",
    "passing_score": 70,
}

_COURSE_UPDATE_PAYLOAD = {"title": "Updated RBAC Course"}

_MODULE_CREATE_PAYLOAD = {
    "course_id": 1,
    "title": "RBAC Module",
    "order_index": 1,
}

_MODULE_UPDATE_PAYLOAD = {"title": "Updated RBAC Module"}

_LESSON_CREATE_PAYLOAD = {
    "module_id": 1,
    "title": "RBAC Lesson",
    "lesson_type": "text",
    "order_index": 1,
    "duration_minutes": 15,
}

_LESSON_UPDATE_PAYLOAD = {"title": "Updated RBAC Lesson"}

_SCHEDULE_CREATE_PAYLOAD = {
    "title": "RBAC Schedule",
    "group_id": 1,
    "teacher_id": 1,
    "branch_id": 1,
    "course_id": 1,
    "lesson_id": 1,
    "room": "101",
    "start_time": "2025-01-01T10:00:00Z",
    "end_time": "2025-01-01T11:00:00Z",
    "recurrence": "none",
    "status": "scheduled",
}

_SCHEDULE_UPDATE_PAYLOAD = {"title": "Updated RBAC Schedule"}

_ATTENDANCE_CREATE_PAYLOAD = {
    "schedule_id": 1,
    "student_id": 1,
    "status": "present",
    "notes": "test",
}

_ATTENDANCE_UPDATE_PAYLOAD = {"status": "absent"}

_PAYMENT_CREATE_PAYLOAD = {
    "student_id": 1,
    "amount": 1000,
    "type": "income",
    "method": "cash",
    "status": "completed",
    "description": "rbac payment",
}

_PAYMENT_UPDATE_PAYLOAD = {"amount": 2000}

_TRANSACTION_CREATE_PAYLOAD = {
    "user_id": 1,
    "amount": 100,
    "type": "payment",
    "balance_after": 100,
    "description": "rbac transaction",
}

_DEAL_CREATE_PAYLOAD = {
    "lead_id": 1,
    "title": "RBAC Deal",
    "amount": 1000,
    "status": "in_progress",
}

_DEAL_UPDATE_PAYLOAD = {"amount": 2000}

_LEAD_UPDATE_PAYLOAD = {"status": "contacted"}


class TestUsersWrite:
    """Создание пользователей доступно только OWNER/SUPER_ADMIN/ADMIN."""

    async def test_unauthorized_create_user_returns_401(self, client):
        response = await client.post("/api/v3/users", json=_USER_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_user(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/users", json=_USER_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403


class TestCoursesWrite:
    """Изменение курсов доступно OWNER/SUPER_ADMIN/ADMIN/METHODIST."""

    async def test_unauthorized_create_course_returns_401(self, client):
        response = await client.post("/api/v3/courses", json=_COURSE_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_course(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/courses", json=_COURSE_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_course_returns_401(self, client):
        response = await client.patch("/api/v3/courses/1", json=_COURSE_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_course(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/courses/1", json=_COURSE_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_course_returns_401(self, client):
        response = await client.delete("/api/v3/courses/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_course(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/courses/1", headers=headers)
        assert response.status_code == 403


class TestModulesWrite:
    """Изменение модулей доступно OWNER/SUPER_ADMIN/ADMIN/METHODIST."""

    async def test_unauthorized_create_module_returns_401(self, client):
        response = await client.post("/api/v3/modules", json=_MODULE_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_module(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/modules", json=_MODULE_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_module_returns_401(self, client):
        response = await client.patch("/api/v3/modules/1", json=_MODULE_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_module(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/modules/1", json=_MODULE_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_module_returns_401(self, client):
        response = await client.delete("/api/v3/modules/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_module(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/modules/1", headers=headers)
        assert response.status_code == 403


class TestLessonsWrite:
    """Изменение уроков доступно OWNER/SUPER_ADMIN/ADMIN/METHODIST."""

    async def test_unauthorized_create_lesson_returns_401(self, client):
        response = await client.post("/api/v3/lessons", json=_LESSON_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_lesson(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/lessons", json=_LESSON_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_lesson_returns_401(self, client):
        response = await client.patch("/api/v3/lessons/1", json=_LESSON_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_lesson(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/lessons/1", json=_LESSON_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_lesson_returns_401(self, client):
        response = await client.delete("/api/v3/lessons/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_lesson(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/lessons/1", headers=headers)
        assert response.status_code == 403


class TestSchedulesWrite:
    """Изменение расписания доступно OWNER/SUPER_ADMIN/ADMIN/METHODIST."""

    async def test_unauthorized_create_schedule_returns_401(self, client):
        response = await client.post("/api/v3/schedules", json=_SCHEDULE_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_schedule(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/schedules", json=_SCHEDULE_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_schedule_returns_401(self, client):
        response = await client.patch("/api/v3/schedules/1", json=_SCHEDULE_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_schedule(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/schedules/1", json=_SCHEDULE_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_schedule_returns_401(self, client):
        response = await client.delete("/api/v3/schedules/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_schedule(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/schedules/1", headers=headers)
        assert response.status_code == 403


class TestAttendanceWrite:
    """Изменение посещаемости доступно OWNER/SUPER_ADMIN/ADMIN/METHODIST/TEACHER."""

    async def test_unauthorized_mark_attendance_returns_401(self, client):
        response = await client.post("/api/v3/attendance", json=_ATTENDANCE_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_mark_attendance(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/attendance", json=_ATTENDANCE_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_attendance_returns_401(self, client):
        response = await client.patch("/api/v3/attendance/1", json=_ATTENDANCE_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_attendance(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/attendance/1", json=_ATTENDANCE_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403


class TestFinanceWrite:
    """Управление финансами доступно OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    async def test_unauthorized_create_payment_returns_401(self, client):
        response = await client.post("/api/v3/finance/payments", json=_PAYMENT_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_payment(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/payments", json=_PAYMENT_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_payment_returns_401(self, client):
        response = await client.patch("/api/v3/finance/payments/1", json=_PAYMENT_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_payment(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/finance/payments/1", json=_PAYMENT_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_payment_returns_401(self, client):
        response = await client.delete("/api/v3/finance/payments/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_payment(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/finance/payments/1", headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_create_transaction_returns_401(self, client):
        response = await client.post("/api/v3/finance/transactions", json=_TRANSACTION_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_transaction(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/transactions", json=_TRANSACTION_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403


class TestDealsWrite:
    """Управление сделками доступно OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    async def test_unauthorized_create_deal_returns_401(self, client):
        response = await client.post("/api/v3/deals", json=_DEAL_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_deal(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/deals", json=_DEAL_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_deal_returns_401(self, client):
        response = await client.patch("/api/v3/deals/1", json=_DEAL_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_deal(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/deals/1", json=_DEAL_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_deal_returns_401(self, client):
        response = await client.delete("/api/v3/deals/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_deal(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/deals/1", headers=headers)
        assert response.status_code == 403


class TestLeadsWrite:
    """Управление заявками доступно OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    async def test_unauthorized_update_lead_returns_401(self, client):
        response = await client.patch("/api/v3/leads/1", json=_LEAD_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_lead(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/leads/1", json=_LEAD_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_demo_request_is_public(self, client):
        """Публичная заявка на демо должна оставаться доступной без авторизации."""
        payload = {
            "name": "Public Lead",
            "email": "public_lead@test.local",
            "phone": "+79990000000",
            "source": "demo_request",
        }
        response = await client.post("/api/v3/leads/demo", json=payload)
        # ресурсы могут отсутствовать, но доступ разрешён
        assert response.status_code in (201, 200, 404)


class TestTeacherAcademyWrite:
    """Управление Академией педагогов доступно только административным ролям."""

    async def test_unauthorized_sync_academy_returns_401(self, client):
        response = await client.post("/api/v3/teacher-academy/sync")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_sync_academy(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/teacher-academy/sync", headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_enroll_group_returns_401(self, client):
        response = await client.post("/api/v3/teacher-academy/enroll-group", json={"group_id": 1})
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_enroll_group(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post(
            "/api/v3/teacher-academy/enroll-group", json={"group_id": 1}, headers=headers
        )
        assert response.status_code == 403

    async def test_unauthorized_access_log_returns_401(self, client):
        response = await client.get("/api/v3/teacher-academy/access-log")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_view_access_log(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/teacher-academy/access-log", headers=headers)
        assert response.status_code == 403
