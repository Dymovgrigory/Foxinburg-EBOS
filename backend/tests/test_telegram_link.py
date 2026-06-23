"""Тесты привязки Telegram через Login Widget."""

import hashlib
import hmac

from app.core.permissions import Role
from app.core.security import create_access_token
from app.config import settings


def _widget_hash(data: dict, bot_token: str) -> str:
    data = {k: v for k, v in data.items() if v is not None}
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret = hashlib.sha256(bot_token.encode()).digest()
    return hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()


def _auth_headers(user):
    token = create_access_token({"user_id": user.id, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


class TestTelegramLink:
    async def test_get_telegram_info(self, client, auth_headers_factory):
        original_username = settings.TELEGRAM_BOT_USERNAME
        settings.TELEGRAM_BOT_USERNAME = "TestBot"
        try:
            headers = await auth_headers_factory(Role.STUDENT)
            response = await client.get("/api/v3/users/me/telegram-info", headers=headers)
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["bot_username"] == "TestBot"
            assert data["bot_link"] == "https://t.me/TestBot"
        finally:
            settings.TELEGRAM_BOT_USERNAME = original_username

    async def test_get_telegram_info_not_configured(self, client, auth_headers_factory):
        original_username = settings.TELEGRAM_BOT_USERNAME
        settings.TELEGRAM_BOT_USERNAME = ""
        try:
            headers = await auth_headers_factory(Role.STUDENT)
            response = await client.get("/api/v3/users/me/telegram-info", headers=headers)
            assert response.status_code == 404
        finally:
            settings.TELEGRAM_BOT_USERNAME = original_username

    async def test_link_telegram_with_widget(self, client, user_factory):
        original_token = settings.TELEGRAM_BOT_TOKEN
        settings.TELEGRAM_BOT_TOKEN = "test-bot-token"
        try:
            user = await user_factory(Role.STUDENT, "telegram-student@example.com")
            headers = _auth_headers(user)

            payload = {
                "id": 123456789,
                "first_name": "Ivan",
                "username": "ivan_test",
                "auth_date": 1710000000,
            }
            payload["hash"] = _widget_hash(payload, settings.TELEGRAM_BOT_TOKEN)

            response = await client.patch("/api/v3/users/me/telegram", json=payload, headers=headers)
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["telegram_chat_id"] == "123456789"
        finally:
            settings.TELEGRAM_BOT_TOKEN = original_token

    async def test_link_telegram_with_invalid_hash(self, client, user_factory):
        original_token = settings.TELEGRAM_BOT_TOKEN
        settings.TELEGRAM_BOT_TOKEN = "test-bot-token"
        try:
            user = await user_factory(Role.STUDENT, "telegram-student2@example.com")
            headers = _auth_headers(user)
            payload = {
                "id": 123456789,
                "auth_date": 1710000000,
                "hash": "invalid_hash",
            }
            response = await client.patch("/api/v3/users/me/telegram", json=payload, headers=headers)
            assert response.status_code == 400
        finally:
            settings.TELEGRAM_BOT_TOKEN = original_token

    async def test_unlink_telegram(self, client, user_factory):
        user = await user_factory(Role.STUDENT, "telegram-student3@example.com")
        headers = _auth_headers(user)
        response = await client.patch(
            "/api/v3/users/me/telegram",
            json={"telegram_chat_id": ""},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["telegram_chat_id"] is None
