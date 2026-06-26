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
_INVOICE_CREATE_PAYLOAD = {
    "student_id": 1,
    "group_id": 1,
    "amount": 10000,
    "due_date": "2026-07-01",
    "period_start": "2026-06-01",
    "period_end": "2026-06-30",
}

_INVOICE_UPDATE_PAYLOAD = {"amount": 20000}

_EXPENSE_CREATE_PAYLOAD = {
    "category": "marketing",
    "amount": 5000,
    "expense_date": "2026-06-01",
    "description": "rbac expense",
}

_EXPENSE_UPDATE_PAYLOAD = {"amount": 6000}

_SUBSCRIPTION_CREATE_PAYLOAD = {
    "student_id": 1,
    "group_id": 1,
    "type": "lessons",
    "start_date": "2026-06-01",
    "end_date": "2026-07-01",
    "lessons_total": 8,
}

_SUBSCRIPTION_UPDATE_PAYLOAD = {"lessons_total": 10}

_LEAVE_CREATE_PAYLOAD = {
    "user_id": 1,
    "leave_type": "vacation",
    "start_date": "2026-07-01",
    "end_date": "2026-07-10",
    "status": "approved",
}

_LEAVE_UPDATE_PAYLOAD = {"status": "pending"}

_KPI_CREATE_PAYLOAD = {
    "user_id": 1,
    "period_start": "2026-06-01",
    "period_end": "2026-06-30",
    "metric": "lessons",
    "target": 10,
    "actual": 5,
    "unit": "lessons",
}

_KPI_UPDATE_PAYLOAD = {"actual": 6}

_ROLE_CONFIG_CREATE_PAYLOAD = {
    "role": "rbac_test_role",
    "label": "RBAC Test Role",
    "permissions": ["user:read"],
    "is_custom": True,
}

_ROLE_CONFIG_UPDATE_PAYLOAD = {"label": "Updated RBAC Role"}


class TestFinanceInvoicesWrite:
    """Управление счетами доступно OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    async def test_unauthorized_create_invoice_returns_401(self, client):
        response = await client.post("/api/v3/finance/invoices", json=_INVOICE_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_invoice(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/invoices", json=_INVOICE_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_invoice_returns_401(self, client):
        response = await client.patch("/api/v3/finance/invoices/1", json=_INVOICE_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_invoice(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/finance/invoices/1", json=_INVOICE_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_invoice_returns_401(self, client):
        response = await client.delete("/api/v3/finance/invoices/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_invoice(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/finance/invoices/1", headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_generate_invoices_returns_401(self, client):
        response = await client.post("/api/v3/finance/invoices/generate", json={
            "group_id": 1,
            "period_start": "2026-06-01",
            "period_end": "2026-06-30",
        })
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_generate_invoices(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/invoices/generate", json={
            "group_id": 1,
            "period_start": "2026-06-01",
            "period_end": "2026-06-30",
        }, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_pay_invoice_returns_401(self, client):
        response = await client.post("/api/v3/finance/invoices/1/pay", json={"amount": 10000})
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_pay_invoice(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/invoices/1/pay", json={"amount": 10000}, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_download_invoice_pdf_returns_401(self, client):
        response = await client.get("/api/v3/finance/invoices/1/pdf")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_download_invoice_pdf(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/finance/invoices/1/pdf", headers=headers)
        assert response.status_code == 403


class TestFinanceExpensesWrite:
    """Управление расходами доступно OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    async def test_unauthorized_create_expense_returns_401(self, client):
        response = await client.post("/api/v3/finance/expenses", json=_EXPENSE_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_expense(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/expenses", json=_EXPENSE_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_expense_returns_401(self, client):
        response = await client.patch("/api/v3/finance/expenses/1", json=_EXPENSE_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_expense(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/finance/expenses/1", json=_EXPENSE_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_expense_returns_401(self, client):
        response = await client.delete("/api/v3/finance/expenses/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_expense(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/finance/expenses/1", headers=headers)
        assert response.status_code == 403


class TestFinancePayrollWrite:
    """Расчёт и начисление зарплат доступно OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    async def test_unauthorized_get_payroll_returns_401(self, client):
        response = await client.get("/api/v3/finance/payroll?teacher_id=1&from_date=2026-06-01&to_date=2026-06-30")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_get_payroll(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/finance/payroll?teacher_id=1&from_date=2026-06-01&to_date=2026-06-30", headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_run_payroll_returns_401(self, client):
        response = await client.post("/api/v3/finance/payroll/run", json={
            "teacher_id": 1,
            "from_date": "2026-06-01",
            "to_date": "2026-06-30",
        })
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_run_payroll(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/payroll/run", json={
            "teacher_id": 1,
            "from_date": "2026-06-01",
            "to_date": "2026-06-30",
        }, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_get_pnl_returns_401(self, client):
        response = await client.get("/api/v3/finance/pnl?from_date=2026-06-01&to_date=2026-06-30")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_get_pnl(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/finance/pnl?from_date=2026-06-01&to_date=2026-06-30", headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_download_payment_act_pdf_returns_401(self, client):
        response = await client.get("/api/v3/finance/payments/1/act/pdf")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_download_payment_act_pdf(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/finance/payments/1/act/pdf", headers=headers)
        assert response.status_code == 403


class TestFinanceSubscriptionsWrite:
    """Управление абонементами доступно OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    async def test_unauthorized_create_subscription_returns_401(self, client):
        response = await client.post("/api/v3/finance/subscriptions", json=_SUBSCRIPTION_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_subscription(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/subscriptions", json=_SUBSCRIPTION_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_subscription_returns_401(self, client):
        response = await client.patch("/api/v3/finance/subscriptions/1", json=_SUBSCRIPTION_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_subscription(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/finance/subscriptions/1", json=_SUBSCRIPTION_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_subscription_returns_401(self, client):
        response = await client.delete("/api/v3/finance/subscriptions/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_subscription(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/finance/subscriptions/1", headers=headers)
        assert response.status_code == 403

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_renew_subscription(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/subscriptions/1/renew", headers=headers)
        assert response.status_code == 403

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_freeze_subscription(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/subscriptions/1/freeze", headers=headers)
        assert response.status_code == 403

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_cancel_subscription(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/finance/subscriptions/1/cancel", headers=headers)
        assert response.status_code == 403


class TestHrLeavesWrite:
    """Управление отпусками доступно OWNER/SUPER_ADMIN/ADMIN."""

    async def test_unauthorized_create_leave_returns_401(self, client):
        response = await client.post("/api/v3/hr/leaves", json=_LEAVE_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_leave(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/hr/leaves", json=_LEAVE_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_leave_returns_401(self, client):
        response = await client.patch("/api/v3/hr/leaves/1", json=_LEAVE_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_leave(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/hr/leaves/1", json=_LEAVE_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_leave_returns_401(self, client):
        response = await client.delete("/api/v3/hr/leaves/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_leave(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/hr/leaves/1", headers=headers)
        assert response.status_code == 403

    @pytest.mark.parametrize("role", [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN])
    async def test_privileged_user_can_delete_leave(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/hr/leaves/999999", headers=headers)
        # Права есть: не 403. Записи нет → 404 (либо 200, если создана).
        assert response.status_code != 403
        assert response.status_code in (200, 404)


class TestHrKpisWrite:
    """Управление KPI доступно OWNER/SUPER_ADMIN/ADMIN."""

    async def test_unauthorized_create_kpi_returns_401(self, client):
        response = await client.post("/api/v3/hr/kpis", json=_KPI_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_kpi(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/hr/kpis", json=_KPI_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_kpi_returns_401(self, client):
        response = await client.patch("/api/v3/hr/kpis/1", json=_KPI_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_kpi(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/hr/kpis/1", json=_KPI_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_kpi_returns_401(self, client):
        response = await client.delete("/api/v3/hr/kpis/1")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_kpi(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/hr/kpis/1", headers=headers)
        assert response.status_code == 403

    @pytest.mark.parametrize("role", [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN])
    async def test_privileged_user_can_delete_kpi(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/hr/kpis/999999", headers=headers)
        # Права есть: не 403. Записи нет → 404 (либо 200, если создана).
        assert response.status_code != 403
        assert response.status_code in (200, 404)


class TestRoleConfigWrite:
    """Управление ролями доступно OWNER/SUPER_ADMIN."""

    async def test_unauthorized_create_role_config_returns_401(self, client):
        response = await client.post("/api/v3/system/roles", json=_ROLE_CONFIG_CREATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.ADMIN, Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_create_role_config(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.post("/api/v3/system/roles", json=_ROLE_CONFIG_CREATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_update_role_config_returns_401(self, client):
        response = await client.patch("/api/v3/system/roles/guest", json=_ROLE_CONFIG_UPDATE_PAYLOAD)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.ADMIN, Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_update_role_config(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.patch("/api/v3/system/roles/guest", json=_ROLE_CONFIG_UPDATE_PAYLOAD, headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_delete_role_config_returns_401(self, client):
        response = await client.delete("/api/v3/system/roles/guest")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.ADMIN, Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.MANAGER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_delete_role_config(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.delete("/api/v3/system/roles/guest", headers=headers)
        assert response.status_code == 403


class TestReportsRead:
    """Отчёты доступны OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    _REPORT_TYPES = [
        "manager", "sales", "teachers", "students_payments",
        "students_subscriptions", "contracts", "accounts",
        "pnl", "payroll", "expenses", "debtors",
    ]

    async def test_unauthorized_get_reports_types_returns_401(self, client):
        response = await client.get("/api/v3/reports/types")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_get_reports_types(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/reports/types", headers=headers)
        assert response.status_code == 403

    @pytest.mark.parametrize("report_type", _REPORT_TYPES)
    async def test_unauthorized_get_report_returns_401(self, client, report_type):
        response = await client.get(f"/api/v3/reports/{report_type}")
        assert response.status_code == 401

    @pytest.mark.parametrize("report_type", _REPORT_TYPES)
    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_get_report(self, client, auth_headers_factory, report_type, role):
        headers = await auth_headers_factory(role)
        response = await client.get(f"/api/v3/reports/{report_type}", headers=headers)
        assert response.status_code == 403

    @pytest.mark.parametrize("report_type", _REPORT_TYPES)
    async def test_unauthorized_export_csv_returns_401(self, client, report_type):
        response = await client.get(f"/api/v3/reports/{report_type}/export.csv")
        assert response.status_code == 401

    @pytest.mark.parametrize("report_type", _REPORT_TYPES)
    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_export_csv(self, client, auth_headers_factory, report_type, role):
        headers = await auth_headers_factory(role)
        response = await client.get(f"/api/v3/reports/{report_type}/export.csv", headers=headers)
        assert response.status_code == 403

    @pytest.mark.parametrize("report_type", _REPORT_TYPES)
    async def test_unauthorized_export_pdf_returns_401(self, client, report_type):
        response = await client.get(f"/api/v3/reports/{report_type}/export.pdf")
        assert response.status_code == 401

    @pytest.mark.parametrize("report_type", _REPORT_TYPES)
    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_export_pdf(self, client, auth_headers_factory, report_type, role):
        headers = await auth_headers_factory(role)
        response = await client.get(f"/api/v3/reports/{report_type}/export.pdf", headers=headers)
        assert response.status_code == 403


class TestUsersHrEndpoints:
    """Кадровые endpoint'ы пользователей доступны OWNER/SUPER_ADMIN/ADMIN/MANAGER/METHODIST."""

    async def test_unauthorized_get_user_documents_returns_401(self, client):
        response = await client.get("/api/v3/users/1/documents")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_get_user_documents(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/users/1/documents", headers=headers)
        assert response.status_code == 403

    async def test_unauthorized_get_user_payroll_returns_401(self, client):
        response = await client.get("/api/v3/users/1/payroll?from_date=2026-06-01&to_date=2026-06-30")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_get_user_payroll(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/users/1/payroll?from_date=2026-06-01&to_date=2026-06-30", headers=headers)
        assert response.status_code == 403


class TestSystemPermissionsRead:
    """Просмотр системных разрешений доступен OWNER/SUPER_ADMIN/ADMIN/MANAGER."""

    async def test_unauthorized_get_system_permissions_returns_401(self, client):
        response = await client.get("/api/v3/system/permissions")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "role",
        [Role.STUDENT, Role.TEACHER, Role.METHODIST, Role.PARENT, Role.GUEST],
    )
    async def test_low_privilege_user_cannot_get_system_permissions(self, client, auth_headers_factory, role):
        headers = await auth_headers_factory(role)
        response = await client.get("/api/v3/system/permissions", headers=headers)
        assert response.status_code == 403
