"""Тесты уведомлений."""

import pytest
from app.core.permissions import Role


class TestNotifications:
    async def test_unauthorized_list_notifications(self, client):
        response = await client.get("/api/v3/notifications")
        assert response.status_code == 401

    async def test_user_can_list_own_notifications(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        response = await client.get("/api/v3/notifications", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    async def test_unread_count(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        response = await client.get("/api/v3/notifications/unread-count", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "count" in data["data"]

    async def test_admin_can_send_bulk_notification(self, client, auth_headers_factory, user_factory):
        admin_headers = await auth_headers_factory(Role.ADMIN)
        student = await user_factory(Role.STUDENT, "bulk_notify_student@test.local")

        payload = {
            "user_ids": [student.id],
            "title": "Тест",
            "message": "Тестовое уведомление",
            "type": "system",
        }
        response = await client.post("/api/v3/notifications", json=payload, headers=admin_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1

    async def test_student_cannot_send_notification(self, client, auth_headers_factory, user_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        other = await user_factory(Role.STUDENT, "other_notify@test.local")
        payload = {
            "user_ids": [other.id],
            "title": "Hack",
            "message": "...",
        }
        response = await client.post("/api/v3/notifications", json=payload, headers=headers)
        assert response.status_code == 403
