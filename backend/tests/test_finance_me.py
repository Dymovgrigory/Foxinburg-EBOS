"""Тесты личных финансовых endpoint'ов для учеников/родителей."""

import pytest
from app.core.permissions import Role


class TestFinanceMe:
    async def test_my_payments_unauthorized_returns_401(self, client):
        response = await client.get("/api/v3/finance/payments/me")
        assert response.status_code == 401

    async def test_my_transactions_unauthorized_returns_401(self, client):
        response = await client.get("/api/v3/finance/transactions/me")
        assert response.status_code == 401

    async def test_student_gets_empty_payments_list(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        response = await client.get("/api/v3/finance/payments/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"] == []

    async def test_student_gets_empty_transactions_list(self, client, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        response = await client.get("/api/v3/finance/transactions/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"] == []
