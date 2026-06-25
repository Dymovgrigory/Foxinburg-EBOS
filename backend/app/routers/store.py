from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select, asc, desc, func
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.dependencies import require_active_user, require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.models.finance import Payment, Transaction
from app.models.store import Product, CartItem, Order, OrderItem
from app.models.user import User
from app.schemas.store import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    CartItemCreate,
    CartItemUpdate,
    CartItemResponse,
    CartResponse,
    OrderResponse,
)
from app.services.max_service import MaxService
from app.services.tinkoff_service import TinkoffService
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/store", tags=["store"])


@router.get("/products")
async def list_products(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    result = await uow.session.execute(
        select(Product)
        .where(Product.is_active == True)
        .order_by(asc(Product.sort_order), asc(Product.title))
    )
    products = result.scalars().all()
    return success_response(
        data=[ProductResponse.model_validate(p).model_dump() for p in products],
        message="Каталог товаров",
        meta={"total": len(products)},
    )


@router.get("/products/{product_id}")
async def get_product(
    product_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    product = await uow.session.get(Product, product_id)
    if not product:
        return error_response("Товар не найден", status_code=404)
    return success_response(
        data=ProductResponse.model_validate(product).model_dump(),
        message="Карточка товара",
    )


@router.post("/products")
async def create_product(
    data: ProductCreate,
    current_user: User = Depends(require_permission(Permission.STORE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    product = Product(**data.model_dump(exclude_unset=True))
    uow.session.add(product)
    await uow.commit()
    await uow.session.refresh(product)
    return success_response(
        data=ProductResponse.model_validate(product).model_dump(),
        message="Товар создан",
        status_code=201,
    )


@router.patch("/products/{product_id}")
async def update_product(
    product_id: int,
    data: ProductUpdate,
    current_user: User = Depends(require_permission(Permission.STORE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    product = await uow.session.get(Product, product_id)
    if not product:
        return error_response("Товар не найден", status_code=404)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    await uow.commit()
    await uow.session.refresh(product)
    return success_response(
        data=ProductResponse.model_validate(product).model_dump(),
        message="Товар обновлён",
    )


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    current_user: User = Depends(require_permission(Permission.STORE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    product = await uow.session.get(Product, product_id)
    if not product:
        return error_response("Товар не найден", status_code=404)
    await uow.session.delete(product)
    await uow.commit()
    return success_response(message="Товар удалён")


async def _get_cart_items(session, user_id: int):
    result = await session.execute(
        select(CartItem)
        .where(CartItem.user_id == user_id)
        .options(selectinload(CartItem.product))
        .order_by(asc(CartItem.created_at))
    )
    return result.scalars().all()


async def _load_cart_item(session, item_id: int) -> CartItem | None:
    result = await session.execute(
        select(CartItem)
        .where(CartItem.id == item_id)
        .options(selectinload(CartItem.product))
    )
    return result.scalar_one_or_none()


@router.get("/cart")
async def get_cart(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    items = await _get_cart_items(uow.session, current_user.id)
    total = sum((item.product.price if item.product else 0) * item.quantity for item in items)
    return success_response(
        data=CartResponse(
            items=[CartItemResponse.model_validate(item) for item in items],
            total_amount=total,
            currency="RUB",
        ).model_dump(),
        message="Корзина",
    )


@router.post("/cart")
async def add_to_cart(
    data: CartItemCreate,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    product = await uow.session.get(Product, data.product_id)
    if not product or not product.is_active:
        return error_response("Товар не найден или недоступен", status_code=400)

    result = await uow.session.execute(
        select(CartItem).where(
            CartItem.user_id == current_user.id,
            CartItem.product_id == data.product_id,
        )
    )
    cart_item = result.scalar_one_or_none()

    if data.quantity <= 0:
        if cart_item:
            await uow.session.delete(cart_item)
            await uow.commit()
        return success_response(message="Товар удалён из корзины")

    if cart_item:
        cart_item.quantity = data.quantity
    else:
        cart_item = CartItem(
            user_id=current_user.id,
            product_id=data.product_id,
            quantity=data.quantity,
        )
        uow.session.add(cart_item)

    await uow.commit()
    cart_item = await _load_cart_item(uow.session, cart_item.id)
    return success_response(
        data=CartItemResponse.model_validate(cart_item).model_dump(),
        message="Корзина обновлена",
    )


@router.patch("/cart/{item_id}")
async def update_cart_item(
    item_id: int,
    data: CartItemUpdate,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    cart_item = await uow.session.get(CartItem, item_id)
    if not cart_item or cart_item.user_id != current_user.id:
        return error_response("Позиция не найдена", status_code=404)

    if data.quantity <= 0:
        await uow.session.delete(cart_item)
        await uow.commit()
        return success_response(message="Товар удалён из корзины")

    cart_item.quantity = data.quantity
    await uow.commit()
    cart_item = await _load_cart_item(uow.session, cart_item.id)
    return success_response(
        data=CartItemResponse.model_validate(cart_item).model_dump(),
        message="Количество обновлено",
    )


@router.delete("/cart/{item_id}")
async def remove_cart_item(
    item_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    cart_item = await uow.session.get(CartItem, item_id)
    if not cart_item or cart_item.user_id != current_user.id:
        return error_response("Позиция не найдена", status_code=404)
    await uow.session.delete(cart_item)
    await uow.commit()
    return success_response(message="Товар удалён из корзины")


async def _init_tinkoff_payment(order: Order, user: User, items_data: list[dict]) -> None:
    receipt_items = [
        {
            "title": line["title_snapshot"],
            "price": line["price_snapshot"],
            "quantity": line["quantity"],
        }
        for line in items_data
    ]
    result = await TinkoffService.init_payment(
        order_id=order.id,
        amount=order.total_amount,
        description=f"Заказ #{order.id} в FOXINBURG",
        email=user.email,
        phone=user.phone,
        items=receipt_items,
    )
    order.tinkoff_payment_id = result["payment_id"]
    order.payment_url = result["payment_url"]


@router.post("/checkout")
async def checkout(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    items = await _get_cart_items(uow.session, current_user.id)
    if not items:
        return error_response("Корзина пуста", status_code=400)

    total = 0
    order_items_data = []
    for item in items:
        if not item.product or not item.product.is_active:
            return error_response(
                f"Товар «{item.product.title if item.product else 'неизвестен'}» недоступен",
                status_code=400,
            )
        line_total = item.product.price * item.quantity
        total += line_total
        order_items_data.append({
            "product_id": item.product.id,
            "title_snapshot": item.product.title,
            "price_snapshot": item.product.price,
            "quantity": item.quantity,
        })

    order = Order(
        user_id=current_user.id,
        status="pending",
        total_amount=total,
        currency="RUB",
    )
    uow.session.add(order)
    await uow.session.flush()

    for line in order_items_data:
        uow.session.add(OrderItem(order_id=order.id, **line))

    for item in items:
        await uow.session.delete(item)

    if settings.TINKOFF_TERMINAL_KEY and settings.TINKOFF_TERMINAL_PASSWORD:
        try:
            await _init_tinkoff_payment(order, current_user, order_items_data)
        except Exception as exc:
            logger = __import__("logging").getLogger(__name__)
            logger.exception("Tinkoff init failed")
            await uow.rollback()
            return error_response(f"Ошибка инициализации оплаты: {exc}", status_code=502)

    await uow.commit()
    await uow.session.refresh(order)
    return success_response(
        data=OrderResponse.model_validate(order).model_dump(),
        message="Заказ создан",
        status_code=201,
    )


@router.post("/orders/{order_id}/pay")
async def pay_order(
    order_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    result = await uow.session.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        return error_response("Заказ не найден", status_code=404)
    if order.status != "pending":
        return error_response("Заказ уже оплачен или отменён", status_code=400)

    if not (settings.TINKOFF_TERMINAL_KEY and settings.TINKOFF_TERMINAL_PASSWORD):
        return error_response("Оплата временно недоступна", status_code=503)

    items_data = [
        {
            "title_snapshot": item.title_snapshot,
            "price_snapshot": item.price_snapshot,
            "quantity": item.quantity,
        }
        for item in order.items
    ]
    try:
        await _init_tinkoff_payment(order, current_user, items_data)
    except Exception as exc:
        logger = __import__("logging").getLogger(__name__)
        logger.exception("Tinkoff init failed")
        await uow.rollback()
        return error_response(f"Ошибка инициализации оплаты: {exc}", status_code=502)

    await uow.commit()
    await uow.session.refresh(order)
    return success_response(
        data=OrderResponse.model_validate(order).model_dump(),
        message="Ссылка на оплату обновлена",
    )


@router.post("/tinkoff/webhook")
async def tinkoff_webhook(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
):
    payload = await request.json()
    notification = await TinkoffService.handle_notification(payload)
    if not notification:
        return error_response("Invalid notification", status_code=400)

    order_id_raw = notification.get("order_id")
    try:
        order_id = int(order_id_raw) if order_id_raw else None
    except (ValueError, TypeError):
        order_id = None

    if not order_id:
        return error_response("Order ID missing", status_code=400)

    result = await uow.session.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        return error_response("Order not found", status_code=404)

    if notification["success"] and order.status != "paid":
        order.status = "paid"
        order.paid_at = func.now()
        order.tinkoff_payment_id = notification.get("payment_id") or order.tinkoff_payment_id

        # Финансовая запись
        payment = Payment(
            student_id=order.user_id,
            amount=order.total_amount,
            type="income",
            method="card",
            status="completed",
            description=f"Оплата заказа #{order.id} через Тинькофф",
        )
        uow.session.add(payment)

        user = await uow.session.get(User, order.user_id)
        if user:
            transaction = Transaction(
                user_id=user.id,
                amount=order.total_amount,
                type="payment",
                balance_after=user.balance or 0,
                description=f"Оплата заказа #{order.id}",
            )
            uow.session.add(transaction)

            if user.max_user_id:
                try:
                    await MaxService.send_message(
                        user.max_user_id,
                        f"✅ Заказ #{order.id} оплачен. Спасибо!\nСумма: {order.total_amount / 100:.2f} ₽",
                    )
                except Exception:
                    logger = __import__("logging").getLogger(__name__)
                    logger.exception("Failed to send MAX payment notification")

    await uow.commit()
    return success_response(message="OK")


@router.get("/orders")
async def list_orders(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    result = await uow.session.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(desc(Order.created_at))
        .options(selectinload(Order.items))
    )
    orders = result.scalars().all()
    return success_response(
        data=[OrderResponse.model_validate(o).model_dump() for o in orders],
        message="История заказов",
        meta={"total": len(orders)},
    )


@router.get("/orders/{order_id}")
async def get_order(
    order_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    result = await uow.session.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        return error_response("Заказ не найден", status_code=404)
    return success_response(
        data=OrderResponse.model_validate(order).model_dump(),
        message="Заказ",
    )
