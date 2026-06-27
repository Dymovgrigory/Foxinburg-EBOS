from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class UserSubscription(Base):
    """Платформенная подписка пользователя (например, доступ к Foxinburg World).

    В отличие от `finance.Subscription` (абонемент на занятия в группе), эта
    модель описывает SaaS-подписку B2C: триал, ежемесячная оплата, автопродление
    через рекуррентные платежи Tinkoff (RebillId).
    """

    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    plan = Column(String, default="world_monthly", nullable=False)
    # trialing, active, past_due, cancelled, expired
    status = Column(String, default="trialing", nullable=False)

    price = Column(Integer, default=50000, nullable=False)  # копейки (500 ₽)
    currency = Column(String, default="RUB", nullable=False)

    trial_ends_at = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    auto_renew = Column(Boolean, default=True, nullable=False)
    cancelled_at = Column(DateTime, nullable=True)

    # Рекуррентные платежи Tinkoff
    tinkoff_customer_key = Column(String, nullable=True)
    tinkoff_rebill_id = Column(String, nullable=True)
    last_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="world_subscriptions", foreign_keys=[user_id])

    def __repr__(self):
        return f"<UserSubscription user={self.user_id} {self.plan} {self.status}>"
