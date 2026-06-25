import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)

    price = Column(Integer, nullable=False, default=0)  # в копейках
    currency = Column(String, default="RUB", nullable=False)

    product_type = Column(String, default="service", nullable=False)
    # service, course, subscription, merchandise

    target_course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    target_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    lessons_count = Column(Integer, nullable=True)
    subscription_months = Column(Integer, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    target_course = relationship("Course")
    target_group = relationship("Group")

    def __repr__(self):
        return f"<Product {self.title} {self.price}>"


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User")
    product = relationship("Product")

    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
    )

    def __repr__(self):
        return f"<CartItem user={self.user_id} product={self.product_id}>"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending", nullable=False)
    # pending, paid, cancelled

    total_amount = Column(Integer, nullable=False, default=0)  # в копейках
    currency = Column(String, default="RUB", nullable=False)

    tinkoff_payment_id = Column(String, nullable=True)
    payment_url = Column(String, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<Order {self.id} {self.status} {self.total_amount}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    title_snapshot = Column(String, nullable=False)
    price_snapshot = Column(Integer, nullable=False)  # копейки
    quantity = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

    def __repr__(self):
        return f"<OrderItem {self.title_snapshot}>"
