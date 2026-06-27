"""Платформенные подписки Foxinburg World.

Бесплатный триал (7 дней, демо-мир A1) + платная подписка 500 ₽/мес с
автопродлением через рекуррентные платежи Tinkoff. Если у эквайринга
автосписание не включено (нет RebillId), подписка деградирует в «продление по
напоминанию»: помечается past_due и пользователь оплачивает повторно в один клик.
"""
import logging
from datetime import timedelta
from typing import List, Optional

from sqlalchemy import select, asc

from app.config import settings
from app.models.course import Course
from app.models.store import Product, Order, OrderItem
from app.models.user import User
from app.models.user_subscription import UserSubscription
from app.services.unit_of_work import UnitOfWork
from app.services.enrollment_service import EnrollmentService
from app.utils import utc_now

logger = logging.getLogger(__name__)

WORLD_PLAN = "world_monthly"
TRIAL_DAYS = 7
MONTHLY_PRICE = 50000  # 500 ₽ в копейках
PERIOD_DAYS = 30
SUBSCRIPTION_PRODUCT_TITLE = "Подписка Foxinburg World"

ACCESS_FULL = "full"
ACCESS_TRIAL = "trial"
ACCESS_NONE = "none"


class SubscriptionService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    # ---------- запросы ----------

    async def get_active_subscription(self, user_id: int) -> Optional[UserSubscription]:
        result = await self.uow.session.execute(
            select(UserSubscription)
            .where(UserSubscription.user_id == user_id)
            .order_by(UserSubscription.created_at.desc())
        )
        return result.scalars().first()

    def access_level(self, sub: Optional[UserSubscription]) -> str:
        if not sub:
            return ACCESS_NONE
        now = utc_now()
        if sub.status == "active" and (sub.current_period_end is None or sub.current_period_end >= now):
            return ACCESS_FULL
        if sub.status == "trialing" and sub.trial_ends_at and sub.trial_ends_at >= now:
            return ACCESS_TRIAL
        return ACCESS_NONE

    async def world_courses(self) -> List[Course]:
        result = await self.uow.session.execute(
            select(Course)
            .where(Course.type == "student_world", Course.status == "published")
            .order_by(asc(Course.world_order), asc(Course.id))
        )
        return list(result.scalars().all())

    async def demo_world(self) -> Optional[Course]:
        worlds = await self.world_courses()
        return worlds[0] if worlds else None

    # ---------- зачисление в миры ----------

    async def _enroll_worlds(self, user_id: int, courses: List[Course]) -> None:
        enrollment_service = EnrollmentService(self.uow)
        for course in courses:
            try:
                await enrollment_service.enroll_student(
                    student_id=user_id, course_id=course.id, group_id=None
                )
            except ValueError:
                continue

    # ---------- триал ----------

    async def start_trial(self, user: User) -> UserSubscription:
        existing = await self.get_active_subscription(user.id)
        if existing and existing.status in ("trialing", "active"):
            return existing

        now = utc_now()
        trial_end = now + timedelta(days=TRIAL_DAYS)
        sub = UserSubscription(
            user_id=user.id,
            plan=WORLD_PLAN,
            status="trialing",
            price=MONTHLY_PRICE,
            trial_ends_at=trial_end,
            current_period_end=trial_end,
            auto_renew=True,
        )
        self.uow.session.add(sub)
        await self.uow.session.flush()

        demo = await self.demo_world()
        if demo:
            await self._enroll_worlds(user.id, [demo])
        return sub

    # ---------- платная подписка ----------

    async def ensure_subscription_product(self) -> Product:
        result = await self.uow.session.execute(
            select(Product).where(Product.product_type == "subscription").order_by(asc(Product.id))
        )
        product = result.scalars().first()
        if product:
            return product
        product = Product(
            title=SUBSCRIPTION_PRODUCT_TITLE,
            description="Полный доступ ко всем мирам Foxinburg World (A1–C2). Автопродление 500 ₽/мес.",
            price=MONTHLY_PRICE,
            currency="RUB",
            product_type="subscription",
            subscription_months=1,
            is_active=True,
            sort_order=0,
        )
        self.uow.session.add(product)
        await self.uow.session.flush()
        return product

    async def create_monthly_order(self, user: User) -> Order:
        """Создаёт заказ на подписку и инициирует рекуррентный платёж Tinkoff."""
        product = await self.ensure_subscription_product()

        # Гарантируем наличие записи подписки (trialing/expired допустимы).
        sub = await self.get_active_subscription(user.id)
        if not sub:
            sub = UserSubscription(
                user_id=user.id, plan=WORLD_PLAN, status="trialing",
                price=MONTHLY_PRICE, auto_renew=True,
            )
            self.uow.session.add(sub)
            await self.uow.session.flush()

        order = Order(
            user_id=user.id,
            status="pending",
            total_amount=product.price,
            currency=product.currency,
        )
        self.uow.session.add(order)
        await self.uow.session.flush()
        self.uow.session.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            title_snapshot=product.title,
            price_snapshot=product.price,
            quantity=1,
        ))

        if settings.TINKOFF_TERMINAL_KEY and settings.TINKOFF_TERMINAL_PASSWORD:
            from app.services.tinkoff_service import TinkoffService
            result = await TinkoffService.init_payment(
                order_id=order.id,
                amount=order.total_amount,
                description=f"Подписка Foxinburg World, заказ #{order.id}",
                email=user.email,
                phone=user.phone,
                items=[{"title": product.title, "price": product.price, "quantity": 1}],
                customer_key=f"user_{user.id}",
                recurrent=True,
            )
            order.tinkoff_payment_id = result["payment_id"]
            order.payment_url = result["payment_url"]
            sub.tinkoff_customer_key = f"user_{user.id}"
            sub.last_order_id = order.id

        await self.uow.session.flush()
        return order

    async def activate_from_order(self, order: Order, rebill_id: Optional[str]) -> bool:
        """Если заказ содержит товар-подписку — активирует/продлевает подписку.

        Возвращает True, если подписка была обработана.
        """
        product_ids = [item.product_id for item in order.items]
        if not product_ids:
            return False
        result = await self.uow.session.execute(
            select(Product).where(Product.id.in_(product_ids))
        )
        products = result.scalars().all()
        sub_product = next((p for p in products if p.product_type == "subscription"), None)
        if not sub_product:
            return False

        sub = await self.get_active_subscription(order.user_id)
        now = utc_now()
        if not sub:
            sub = UserSubscription(user_id=order.user_id, plan=WORLD_PLAN, price=MONTHLY_PRICE)
            self.uow.session.add(sub)

        months = sub_product.subscription_months or 1
        base = sub.current_period_end if (sub.current_period_end and sub.current_period_end > now) else now
        sub.status = "active"
        sub.current_period_end = base + timedelta(days=PERIOD_DAYS * months)
        sub.cancelled_at = None
        if rebill_id:
            sub.tinkoff_rebill_id = rebill_id
        if not sub.tinkoff_customer_key:
            sub.tinkoff_customer_key = f"user_{order.user_id}"
        sub.last_order_id = order.id
        await self.uow.session.flush()

        worlds = await self.world_courses()
        await self._enroll_worlds(order.user_id, worlds)
        return True

    async def cancel(self, user: User) -> Optional[UserSubscription]:
        sub = await self.get_active_subscription(user.id)
        if not sub:
            return None
        sub.auto_renew = False
        sub.cancelled_at = utc_now()
        await self.uow.session.flush()
        return sub

    # ---------- автопродление (scheduler) ----------

    async def charge_due_renewals(self) -> dict:
        """Списывает оплату по подпискам, у которых истекает период.

        Запускается планировщиком. Требует включённых рекуррентных платежей
        (наличие rebill_id). Подписки без rebill_id помечаются past_due.
        """
        now = utc_now()
        soon = now + timedelta(days=1)
        result = await self.uow.session.execute(
            select(UserSubscription).where(
                UserSubscription.status == "active",
                UserSubscription.auto_renew == True,  # noqa: E712
                UserSubscription.current_period_end != None,  # noqa: E711
                UserSubscription.current_period_end <= soon,
            )
        )
        subs = list(result.scalars().all())
        counters = {"charged": 0, "past_due": 0, "errors": 0}
        if not subs:
            return counters

        product = await self.ensure_subscription_product()
        tinkoff_ready = bool(settings.TINKOFF_TERMINAL_KEY and settings.TINKOFF_TERMINAL_PASSWORD)

        for sub in subs:
            if not (tinkoff_ready and sub.tinkoff_rebill_id and sub.tinkoff_customer_key):
                sub.status = "past_due"
                counters["past_due"] += 1
                continue
            user = await self.uow.session.get(User, sub.user_id)
            if not user:
                continue
            order = Order(
                user_id=sub.user_id, status="pending",
                total_amount=product.price, currency=product.currency,
            )
            self.uow.session.add(order)
            await self.uow.session.flush()
            self.uow.session.add(OrderItem(
                order_id=order.id, product_id=product.id,
                title_snapshot=product.title, price_snapshot=product.price, quantity=1,
            ))
            try:
                from app.services.tinkoff_service import TinkoffService
                await TinkoffService.charge_recurrent(
                    order_id=order.id,
                    amount=product.price,
                    description=f"Автопродление Foxinburg World, заказ #{order.id}",
                    customer_key=sub.tinkoff_customer_key,
                    rebill_id=sub.tinkoff_rebill_id,
                    email=user.email,
                    phone=user.phone,
                    items=[{"title": product.title, "price": product.price, "quantity": 1}],
                )
                # Дальнейшая активация произойдёт через webhook (как у обычной оплаты).
                counters["charged"] += 1
            except Exception:
                logger.exception("Recurrent charge failed for subscription %s", sub.id)
                counters["errors"] += 1
        await self.uow.session.flush()
        return counters
