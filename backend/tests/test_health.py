"""Тесты endpoint'ов проверки работоспособности."""

import pytest


class TestHealth:
    async def test_health_returns_ok(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "foxinburg-api"

    async def test_api_v3_health_returns_ok_with_checks(self, client):
        response = await client.get("/api/v3/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "foxinburg-api"
        assert "checks" in data
        assert data["checks"]["database"]["status"] == "ok"
        assert data["checks"]["redis"]["status"] == "ok"
