"""Интеграционные тесты ролевого доступа к ключевым endpoint'ам."""

import pytest
from app.core.permissions import Role


class TestBranches:
    """Ролевые сценарии для /api/v3/branches."""

    async def test_unauthorized_get_branches_returns_401(self, client):
        response = await client.get("/api/v3/branches")
        assert response.status_code == 401

    async def test_owner_can_list_branches(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.OWNER)
        response = await client.get("/api/v3/branches", headers=headers)
        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_admin_can_list_branches(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.ADMIN)
        response = await client.get("/api/v3/branches", headers=headers)
        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_teacher_cannot_list_branches(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.TEACHER)
        response = await client.get("/api/v3/branches", headers=headers)
        assert response.status_code == 403

    async def test_manager_cannot_create_branch(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.MANAGER)
        payload = {
            "name": "Test Branch",
            "address": "Test address",
            "organization_id": 1,
        }
        response = await client.post("/api/v3/branches", json=payload, headers=headers)
        assert response.status_code == 403


class TestGroups:
    """Ролевые сценарии для /api/v3/groups."""

    async def test_unauthorized_get_group_returns_401(self, client):
        response = await client.get("/api/v3/groups/1")
        assert response.status_code == 401

    async def test_teacher_can_read_group(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.TEACHER)
        response = await client.get("/api/v3/groups/1", headers=headers)
        # группы может не существовать, но доступ разрешён
        assert response.status_code in (200, 404)

    async def test_student_cannot_manage_group(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        payload = {
            "name": "New Group",
            "course_id": 1,
            "teacher_id": 1,
        }
        response = await client.post("/api/v3/groups", json=payload, headers=headers)
        assert response.status_code == 403

    async def test_methodist_cannot_delete_group(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.METHODIST)
        response = await client.delete("/api/v3/groups/1", headers=headers)
        assert response.status_code == 403


class TestCoursesModules:
    """Ролевые сценарии для /api/v3/courses/{id}/modules."""

    async def test_unauthorized_get_course_modules_returns_401(self, client):
        response = await client.get("/api/v3/courses/1/modules")
        assert response.status_code == 401

    async def test_student_can_read_course_modules(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        response = await client.get("/api/v3/courses/1/modules", headers=headers)
        assert response.status_code in (200, 404)

    async def test_guest_can_read_course_modules(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.GUEST)
        response = await client.get("/api/v3/courses/1/modules", headers=headers)
        assert response.status_code in (200, 404)

    async def test_student_cannot_create_module(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        payload = {
            "course_id": 1,
            "title": "New Module",
            "order_index": 1,
        }
        response = await client.post("/api/v3/modules", json=payload, headers=headers)
        assert response.status_code == 403

    async def test_methodist_can_create_module(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.METHODIST)
        payload = {
            "course_id": 1,
            "title": "New Module",
            "order_index": 1,
        }
        response = await client.post("/api/v3/modules", json=payload, headers=headers)
        # курса может не существовать, но доступ разрешён
        assert response.status_code in (201, 404)
