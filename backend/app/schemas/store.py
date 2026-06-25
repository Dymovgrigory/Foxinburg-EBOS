from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: int = 0
    currency: str = "RUB"
    product_type: str = "service"
    target_course_id: Optional[int] = None
    target_group_id: Optional[int] = None
    lessons_count: Optional[int] = None
    subscription_months: Optional[int] = None
    is_active: bool = True
    sort_order: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[int] = None
    currency: Optional[str] = None
    product_type: Optional[str] = None
    target_course_id: Optional[int] = None
    target_group_id: Optional[int] = None
    lessons_count: Optional[int] = None
    subscription_months: Optional[int] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: int
    currency: str
    product_type: str
    target_course_id: Optional[int] = None
    target_group_id: Optional[int] = None
    lessons_count: Optional[int] = None
    subscription_months: Optional[int] = None
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    product_id: int
    quantity: int
    product: ProductResponse


class CartResponse(BaseModel):
    items: List[CartItemResponse] = []
    total_amount: int = 0
    currency: str = "RUB"


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    title_snapshot: str
    price_snapshot: int
    quantity: int


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: str
    total_amount: int
    currency: str
    tinkoff_payment_id: Optional[str] = None
    payment_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime
