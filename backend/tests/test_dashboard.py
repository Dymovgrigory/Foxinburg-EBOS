"""Тесты ролевых дашбордов."""

import pytest
from app.core.permissions import Role


class TestDashboardSummary:
    async def test_unauthorized(self, client):
        response = await client.get("/api/v3/dashboard/summary")
        assert response.status_code == 401

    async def test_admin_summary(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.ADMIN)
        response = await client.get("/api/v3/dashboard/summary", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["role"] == "admin"
        assert "users_by_role" in data
        assert "finance" in data
        assert "leads_by_status" in data
        assert "deals_by_status" in data

    async def test_manager_summary(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.MANAGER)
        response = await client.get("/api/v3/dashboard/summary", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["role"] == "manager"
        assert "leads_by_status" in data
        assert "deals_by_status" in data
        assert "tasks_count" in data

    async def test_teacher_summary(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.TEACHER)
        response = await client.get("/api/v3/dashboard/summary", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["role"] == "teacher"
        assert "upcoming_lessons" in data
        assert "students_count" in data

    async def test_student_summary(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        response = await client.get("/api/v3/dashboard/summary", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["role"] == "student"
        assert "upcoming_lessons" in data
        assert "pending_homeworks_count" in data

    async def test_methodist_summary(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.METHODIST)
        response = await client.get("/api/v3/dashboard/summary", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["role"] == "methodist"
        assert "courses_count" in data
        assert "groups_count" in data
        assert "students_count" in data
