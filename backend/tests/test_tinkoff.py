import pytest
from sqlalchemy import select, text

from app.models.store import Product, CartItem, Order, OrderItem
from app.models.user import User
from app.models.finance import Payment
from app.core.security import create_access_token
from app.services.tinkoff_service import TinkoffService
from app.services import max_service


@pytest.fixture(autouse=True)
async def clean_store_and_tinkoff(db_session, user_factory):
    yield
    await db_session.execute(text("DELETE FROM order_items WHERE id > 0"))
    await db_session.execute(text("DELETE FROM orders WHERE id > 0"))
    await db_session.execute(text("DELETE FROM cart_items WHERE id > 0"))
    await db_session.execute(text("DELETE FROM products WHERE id > 0"))
    await db_session.commit()


@pytest.fixture(autouse=True)
def tinkoff_config(monkeypatch):
    from app.config import settings
    from app.routers import store as store_module
    from app.services import tinkoff_service as tinkoff_module

    monkeypatch.setattr(settings, "TINKOFF_TERMINAL_KEY", "TestTerminalKey")
    monkeypatch.setattr(settings, "TINKOFF_TERMINAL_PASSWORD", "TestPassword")
    # Убедимся, что роутер и сервис используют тот же объект настроек
    monkeypatch.setattr(store_module, "settings", settings)
    monkeypatch.setattr(tinkoff_module, "settings", settings)
    yield


def test_sign_payload_consistency():
    payload = {
        "TerminalKey": "TestTerminalKey",
        "Amount": 10000,
        "OrderId": "42",
        "Description": "Test",
    }
    token1 = TinkoffService._sign_payload(payload)
    token2 = TinkoffService._sign_payload(payload)
    assert token1 == token2
    assert len(token1) == 64


def test_validate_notification_rejects_bad_token():
    payload = {
        "TerminalKey": "TestTerminalKey",
        "Amount": 10000,
        "OrderId": "42",
        "Status": "CONFIRMED",
        "Success": True,
        "Token": "wrong",
    }
    assert TinkoffService._validate_notification(payload) is False


def test_validate_notification_accepts_valid_token():
    payload = {
        "TerminalKey": "TestTerminalKey",
        "Amount": 10000,
        "OrderId": "42",
        "Status": "CONFIRMED",
        "Success": True,
    }
    payload["Token"] = TinkoffService._sign_payload(payload)
    assert TinkoffService._validate_notification(payload) is True


async def test_webhook_marks_order_paid(client, db_session, monkeypatch):
    # Отключаем реальную отправку в MAX
    monkeypatch.setattr(max_service.MaxService, "send_message", lambda user_id, text: True)

    user = User(email="tinkoff_test@example.com", name="Tinkoff Test", role="student", password_hash="x")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    product = Product(title="Test product", price=50000, is_active=True)
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)

    order = Order(user_id=user.id, status="pending", total_amount=50000, currency="RUB")
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    db_session.add(OrderItem(order_id=order.id, product_id=product.id, title_snapshot=product.title, price_snapshot=product.price, quantity=1))
    await db_session.commit()

    payload = {
        "TerminalKey": "TestTerminalKey",
        "Amount": 50000,
        "OrderId": str(order.id),
        "Status": "CONFIRMED",
        "PaymentId": "123456789",
        "Success": True,
    }
    payload["Token"] = TinkoffService._sign_payload(payload)

    response = await client.post("/api/v3/store/tinkoff/webhook", json=payload)
    assert response.status_code == 200

    await db_session.commit()

    result = await db_session.execute(select(Order).where(Order.id == order.id))
    updated = result.scalar_one()
    await db_session.refresh(updated)
    assert updated.status == "paid"
    assert updated.tinkoff_payment_id == "123456789"

    result = await db_session.execute(select(Payment).where(Payment.student_id == user.id))
    payment = result.scalar_one_or_none()
    assert payment is not None
    assert payment.amount == 50000
    assert payment.status == "completed"
