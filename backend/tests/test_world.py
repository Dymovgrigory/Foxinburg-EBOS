"""Тесты Foxinburg World: карта миров, доступ по подписке (триал/платно),
автопродление и родительский кабинет."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role
from app.services.tinkoff_service import TinkoffService


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_world_data(db_session, user_factory):
    # Зависимость от user_factory гарантирует, что очистка миров (courses)
    # выполнится ДО удаления пользователей-авторов в teardown user_factory.
    yield
    await db_session.execute(text("""
        TRUNCATE TABLE
            user_subscriptions,
            order_items, orders, cart_items, products,
            lesson_progress, enrollments,
            lessons, modules, courses,
            user_achievements, achievements,
            payments, transactions, audit_logs, system_events
        CASCADE
    """))
    await db_session.commit()


async def _provision(client, owner):
    res = await client.post("/api/v3/world/admin/provision", headers=owner)
    assert res.status_code == 200, res.text
    return res.json()["data"]


async def _register_student(client, email="worldstudent@example.com"):
    reg = await client.post("/api/v3/auth/register", json={
        "email": email, "name": "World Student", "password": "StudentPass123",
    })
    assert reg.status_code == 201, reg.text
    token = reg.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_provision_creates_six_worlds(client, auth_headers_factory):
    owner = await auth_headers_factory(Role.OWNER)
    data = await _provision(client, owner)
    assert sorted(data["created_worlds"]) == ["A1", "A2", "B1", "B2", "C1", "C2"]

    # Повторный вызов идемпотентен — ничего не создаёт заново.
    again = await client.post("/api/v3/world/admin/provision", headers=owner)
    assert again.json()["data"]["created_worlds"] == []


async def test_map_without_subscription_locks_all(client, auth_headers_factory):
    owner = await auth_headers_factory(Role.OWNER)
    await _provision(client, owner)
    student = await _register_student(client)

    res = await client.get("/api/v3/world/map", headers=student)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["access_level"] == "none"
    assert len(data["worlds"]) == 6
    assert all(not w["unlocked"] for w in data["worlds"])


async def test_trial_unlocks_only_demo_world(client, auth_headers_factory):
    owner = await auth_headers_factory(Role.OWNER)
    await _provision(client, owner)
    student = await _register_student(client, "trialstudent@example.com")

    trial = await client.post("/api/v3/world/trial", headers=student)
    assert trial.status_code == 201
    assert trial.json()["data"]["access_level"] == "trial"

    res = await client.get("/api/v3/world/map", headers=student)
    worlds = res.json()["data"]["worlds"]
    assert worlds[0]["unlocked"] is True
    assert worlds[0]["is_demo"] is True
    assert all(not w["unlocked"] for w in worlds[1:])

    # Демо-мир доступен, следующий — 403.
    demo_id = worlds[0]["id"]
    locked_id = worlds[1]["id"]
    assert (await client.get(f"/api/v3/world/{demo_id}", headers=student)).status_code == 200
    assert (await client.get(f"/api/v3/world/{locked_id}", headers=student)).status_code == 403

    # Повторный триал запрещён.
    assert (await client.post("/api/v3/world/trial", headers=student)).status_code == 400


async def test_subscribe_webhook_activates_full_access(client, auth_headers_factory, monkeypatch):
    owner = await auth_headers_factory(Role.OWNER)
    await _provision(client, owner)
    student = await _register_student(client, "paidstudent@example.com")

    sub = await client.post("/api/v3/world/subscribe", headers=student)
    assert sub.status_code == 201, sub.text
    order_id = sub.json()["data"]["order_id"]

    async def fake_notification(payload):
        return {
            "success": True, "status": "CONFIRMED",
            "payment_id": "tinkoff-sub-1", "order_id": str(order_id),
            "amount": 50000, "rebill_id": "rebill-xyz",
        }

    monkeypatch.setattr(TinkoffService, "handle_notification", staticmethod(fake_notification))
    webhook = await client.post("/api/v3/store/tinkoff/webhook", json={"OrderId": str(order_id)})
    assert webhook.status_code == 200

    res = await client.get("/api/v3/world/subscription", headers=student)
    data = res.json()["data"]
    assert data["access_level"] == "full"
    assert data["subscription"]["status"] == "active"

    # Все миры разблокированы.
    mp = await client.get("/api/v3/world/map", headers=student)
    assert all(w["unlocked"] for w in mp.json()["data"]["worlds"])


async def test_cancel_keeps_access_until_period_end(client, auth_headers_factory, monkeypatch):
    owner = await auth_headers_factory(Role.OWNER)
    await _provision(client, owner)
    student = await _register_student(client, "cancelstudent@example.com")

    sub = await client.post("/api/v3/world/subscribe", headers=student)
    order_id = sub.json()["data"]["order_id"]

    async def fake_notification(payload):
        return {"success": True, "status": "CONFIRMED", "payment_id": "p",
                "order_id": str(order_id), "amount": 50000, "rebill_id": "r1"}
    monkeypatch.setattr(TinkoffService, "handle_notification", staticmethod(fake_notification))
    await client.post("/api/v3/store/tinkoff/webhook", json={"OrderId": str(order_id)})

    cancel = await client.post("/api/v3/world/cancel", headers=student)
    assert cancel.status_code == 200
    body = cancel.json()["data"]["subscription"]
    assert body["auto_renew"] is False
    assert body["cancelled_at"] is not None

    # Доступ ещё активен (период не истёк).
    res = await client.get("/api/v3/world/subscription", headers=student)
    assert res.json()["data"]["access_level"] == "full"


async def test_parent_dashboard_access_control(client, auth_headers_factory, user_factory, db_session):
    # Родитель и ребёнок.
    parent = await user_factory(Role.PARENT, "parent_w@test.local")
    child = await user_factory(Role.STUDENT, "child_w@test.local")
    other = await user_factory(Role.STUDENT, "other_w@test.local")
    child.parent_id = parent.id
    await db_session.commit()

    from app.core.security import create_access_token
    parent_headers = {"Authorization": f"Bearer {create_access_token({'user_id': parent.id, 'role': 'parent'})}"}

    # Список детей.
    children = await client.get("/api/v3/parent/children", headers=parent_headers)
    assert children.status_code == 200
    ids = [c["id"] for c in children.json()["data"]]
    assert child.id in ids and other.id not in ids

    # Дашборд своего ребёнка доступен.
    dash = await client.get(f"/api/v3/parent/children/{child.id}/dashboard", headers=parent_headers)
    assert dash.status_code == 200
    assert dash.json()["data"]["child"]["id"] == child.id

    # Чужой ребёнок — 404.
    forbidden = await client.get(f"/api/v3/parent/children/{other.id}/dashboard", headers=parent_headers)
    assert forbidden.status_code == 404

    # Снимаем связь, чтобы корректно отработал teardown user_factory.
    child.parent_id = None
    await db_session.commit()
