"""Тесты чатов."""

import pytest
from app.core.permissions import Role


class TestChats:
    async def test_unauthorized_list_chats(self, client):
        response = await client.get("/api/v3/chats")
        assert response.status_code == 401

    async def test_user_can_list_own_chats(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        response = await client.get("/api/v3/chats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    async def test_create_chat_and_send_message(self, client, auth_headers_factory, user_factory):
        headers = await auth_headers_factory(Role.ADMIN)
        user = await user_factory(Role.TEACHER, "chat_teacher@test.local")

        payload = {
            "name": "Test Chat",
            "participant_ids": [user.id],
        }
        response = await client.post("/api/v3/chats", json=payload, headers=headers)
        assert response.status_code == 201
        room = response.json()["data"]
        room_id = room["id"]

        msg_response = await client.post(
            f"/api/v3/chats/{room_id}/messages",
            json={"content": "Hello"},
            headers=headers,
        )
        assert msg_response.status_code == 201
        data = msg_response.json()
        assert data["success"] is True
        assert data["data"]["content"] == "Hello"

    async def test_non_participant_cannot_read_messages(self, client, auth_headers_factory, user_factory):
        admin_headers = await auth_headers_factory(Role.ADMIN)
        room_response = await client.post(
            "/api/v3/chats",
            json={"name": "Private Chat"},
            headers=admin_headers,
        )
        room_id = room_response.json()["data"]["id"]

        other_headers = await auth_headers_factory(Role.STUDENT)
        response = await client.get(f"/api/v3/chats/{room_id}/messages", headers=other_headers)
        assert response.status_code == 403

    async def test_student_cannot_create_chat(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        response = await client.post("/api/v3/chats", json={"name": "Hack"}, headers=headers)
        assert response.status_code == 403
