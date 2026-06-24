import pytest
from sqlalchemy import text
from app.core.permissions import Role


@pytest.fixture(autouse=True)
async def clean_store_tables(db_session, user_factory):
    yield
    await db_session.execute(text("DELETE FROM order_items WHERE id > 0"))
    await db_session.execute(text("DELETE FROM orders WHERE id > 0"))
    await db_session.execute(text("DELETE FROM cart_items WHERE id > 0"))
    await db_session.execute(text("DELETE FROM products WHERE id > 0"))
    await db_session.commit()


@pytest.fixture
def product_payload():
    return {
        "title": "Пробный урок английского",
        "description": "Индивидуальное занятие 60 минут",
        "price": 150000,
        "currency": "RUB",
        "product_type": "service",
        "lessons_count": 1,
        "is_active": True,
        "sort_order": 10,
    }


async def test_create_product_by_manager(client, auth_headers_factory, product_payload):
    headers = await auth_headers_factory(Role.MANAGER)
    resp = await client.post("/api/v3/store/products", json=product_payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["title"] == product_payload["title"]


async def test_create_product_by_student_is_forbidden(client, auth_headers_factory, product_payload):
    headers = await auth_headers_factory(Role.STUDENT)
    resp = await client.post("/api/v3/store/products", json=product_payload, headers=headers)
    assert resp.status_code == 403


async def test_update_and_delete_product(client, auth_headers_factory, product_payload):
    headers = await auth_headers_factory(Role.ADMIN)
    create_resp = await client.post("/api/v3/store/products", json=product_payload, headers=headers)
    product_id = create_resp.json()["data"]["id"]

    patch_resp = await client.patch(
        f"/api/v3/store/products/{product_id}",
        json={"price": 200000, "title": "Обновлённый урок"},
        headers=headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["data"]["price"] == 200000

    del_resp = await client.delete(f"/api/v3/store/products/{product_id}", headers=headers)
    assert del_resp.status_code == 200

    get_resp = await client.get(f"/api/v3/store/products/{product_id}", headers=headers)
    assert get_resp.status_code == 404


async def test_product_list_visible_to_authenticated_users(client, auth_headers_factory, product_payload):
    admin_headers = await auth_headers_factory(Role.ADMIN)
    await client.post("/api/v3/store/products", json=product_payload, headers=admin_headers)

    student_headers = await auth_headers_factory(Role.STUDENT)
    resp = await client.get("/api/v3/store/products", headers=student_headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1


async def test_cart_and_checkout(client, auth_headers_factory, product_payload):
    admin_headers = await auth_headers_factory(Role.ADMIN)
    product_resp = await client.post("/api/v3/store/products", json=product_payload, headers=admin_headers)
    product_id = product_resp.json()["data"]["id"]

    student_headers = await auth_headers_factory(Role.STUDENT)
    add_resp = await client.post(
        "/api/v3/store/cart",
        json={"product_id": product_id, "quantity": 2},
        headers=student_headers,
    )
    assert add_resp.status_code == 200

    cart_resp = await client.get("/api/v3/store/cart", headers=student_headers)
    assert cart_resp.status_code == 200
    cart = cart_resp.json()["data"]
    assert len(cart["items"]) == 1
    assert cart["total_amount"] == product_payload["price"] * 2

    item_id = cart["items"][0]["id"]
    patch_resp = await client.patch(
        f"/api/v3/store/cart/{item_id}",
        json={"quantity": 1},
        headers=student_headers,
    )
    assert patch_resp.status_code == 200

    checkout_resp = await client.post("/api/v3/store/checkout", headers=student_headers)
    assert checkout_resp.status_code == 201
    order = checkout_resp.json()["data"]
    assert order["status"] == "pending"
    assert order["total_amount"] == product_payload["price"]
    assert len(order["items"]) == 1

    cart_resp_after = await client.get("/api/v3/store/cart", headers=student_headers)
    assert cart_resp_after.json()["data"]["items"] == []

    orders_resp = await client.get("/api/v3/store/orders", headers=student_headers)
    assert orders_resp.status_code == 200
    assert len(orders_resp.json()["data"]) == 1
