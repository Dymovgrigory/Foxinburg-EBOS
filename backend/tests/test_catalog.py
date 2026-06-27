"""Тесты публичного каталога курсов и автозачисления после оплаты."""

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role
from app.services.tinkoff_service import TinkoffService


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_catalog_data(db_session, user_factory):
    yield
    await db_session.execute(text("""
        TRUNCATE TABLE
            order_items,
            orders,
            cart_items,
            products,
            courses,
            modules,
            lessons,
            lesson_progress,
            enrollments,
            payments,
            transactions,
            audit_logs,
            system_events
        CASCADE
    """))
    await db_session.commit()


async def _make_published_course_with_product(client, admin, methodist, *, price=500000):
    course_res = await client.post("/api/v3/courses", json={
        "title": "Английский A1",
        "short_description": "Курс для начинающих",
        "description": "Полный курс английского с нуля",
    }, headers=methodist)
    assert course_res.status_code == 201
    course = course_res.json()["data"]

    module_res = await client.post("/api/v3/modules", json={
        "course_id": course["id"],
        "title": "Модуль 1: Знакомство",
    }, headers=methodist)
    module = module_res.json()["data"]

    await client.post("/api/v3/lessons", json={
        "module_id": module["id"],
        "title": "Урок 1: Приветствие",
        "lesson_type": "text",
        "order_index": 0,
    }, headers=methodist)

    patch_res = await client.patch(f"/api/v3/courses/{course['id']}", json={
        "status": "published",
    }, headers=methodist)
    assert patch_res.status_code == 200

    product_res = await client.post("/api/v3/store/products", json={
        "title": "Курс «Английский A1»",
        "description": "Доступ к курсу + проверка ДЗ",
        "price": price,
        "product_type": "course",
        "target_course_id": course["id"],
    }, headers=admin)
    assert product_res.status_code == 201
    return course, product_res.json()["data"]["id"]


async def test_public_catalog_lists_published_course(client, auth_headers_factory):
    admin = await auth_headers_factory(Role.ADMIN)
    methodist = await auth_headers_factory(Role.METHODIST)
    _, product_id = await _make_published_course_with_product(client, admin, methodist)

    # Без авторизации каталог доступен.
    res = await client.get("/api/v3/catalog")
    assert res.status_code == 200
    data = res.json()["data"]
    assert any(item["product_id"] == product_id for item in data)
    item = next(i for i in data if i["product_id"] == product_id)
    assert item["price"] == 500000
    assert item["course"]["title"] == "Английский A1"
    assert item["course"]["lessons_count"] == 1


async def test_catalog_hides_unpublished_course(client, auth_headers_factory):
    admin = await auth_headers_factory(Role.ADMIN)
    methodist = await auth_headers_factory(Role.METHODIST)

    course_res = await client.post("/api/v3/courses", json={"title": "Черновик"}, headers=methodist)
    course = course_res.json()["data"]
    product_res = await client.post("/api/v3/store/products", json={
        "title": "Черновик-курс",
        "price": 100000,
        "product_type": "course",
        "target_course_id": course["id"],
    }, headers=admin)
    pid = product_res.json()["data"]["id"]

    res = await client.get("/api/v3/catalog")
    assert res.status_code == 200
    assert all(item["product_id"] != pid for item in res.json()["data"])

    # И карточка такого курса недоступна.
    detail = await client.get(f"/api/v3/catalog/{pid}")
    assert detail.status_code == 404


async def test_catalog_detail_includes_program(client, auth_headers_factory):
    admin = await auth_headers_factory(Role.ADMIN)
    methodist = await auth_headers_factory(Role.METHODIST)
    _, product_id = await _make_published_course_with_product(client, admin, methodist)

    res = await client.get(f"/api/v3/catalog/{product_id}")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["course"]["program"][0]["title"] == "Модуль 1: Знакомство"
    assert "Урок 1: Приветствие" in data["course"]["program"][0]["lessons"]


async def test_buy_and_paid_webhook_auto_enrolls(client, auth_headers_factory, monkeypatch):
    admin = await auth_headers_factory(Role.ADMIN)
    methodist = await auth_headers_factory(Role.METHODIST)
    course, product_id = await _make_published_course_with_product(client, admin, methodist)

    # Гость регистрируется (auto-login) и покупает курс.
    reg = await client.post("/api/v3/auth/register", json={
        "email": "buyer@example.com",
        "name": "Buyer",
        "password": "BuyerPass123",
    })
    assert reg.status_code == 201
    token = reg.json()["data"]["access_token"]
    buyer = {"Authorization": f"Bearer {token}"}

    buy = await client.post(f"/api/v3/store/buy/{product_id}", headers=buyer)
    assert buy.status_code == 201
    order = buy.json()["data"]
    assert order["status"] == "pending"

    # Имитируем успешное уведомление от Тинькофф.
    async def fake_notification(payload):
        return {
            "success": True,
            "status": "CONFIRMED",
            "payment_id": "tinkoff-123",
            "order_id": str(order["id"]),
            "amount": order["total_amount"],
        }

    monkeypatch.setattr(TinkoffService, "handle_notification", staticmethod(fake_notification))

    webhook = await client.post("/api/v3/store/tinkoff/webhook", json={"OrderId": str(order["id"])})
    assert webhook.status_code == 200

    # Покупатель зачислен на курс.
    enrollments = await client.get("/api/v3/enrollments", headers=admin)
    assert enrollments.status_code == 200
    rows = enrollments.json()["data"]
    assert any(e["course_id"] == course["id"] for e in rows)
