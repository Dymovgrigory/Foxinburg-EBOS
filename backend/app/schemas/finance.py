from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PaymentBase(BaseModel):
    student_id: int
    amount: int
    type: Optional[str] = "income"
    method: Optional[str] = "cash"
    status: Optional[str] = "completed"
    description: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    student_id: Optional[int] = None
    amount: Optional[int] = None
    type: Optional[str] = None
    method: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class PaymentResponse(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class TransactionBase(BaseModel):
    user_id: int
    amount: int
    type: str
    balance_after: int
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
