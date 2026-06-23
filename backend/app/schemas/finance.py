from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class PaymentBase(BaseModel):
    student_id: int
    amount: int
    type: Optional[str] = "income"
    method: Optional[str] = "cash"
    status: Optional[str] = "completed"
    invoice_id: Optional[int] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    description: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    student_id: Optional[int] = None
    amount: Optional[int] = None
    type: Optional[str] = None
    method: Optional[str] = None
    status: Optional[str] = None
    invoice_id: Optional[int] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
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


class InvoiceBase(BaseModel):
    student_id: int
    group_id: Optional[int] = None
    membership_id: Optional[int] = None
    amount: int
    status: Optional[str] = "draft"
    due_date: Optional[date] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    description: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):
    student_id: Optional[int] = None
    group_id: Optional[int] = None
    membership_id: Optional[int] = None
    amount: Optional[int] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    description: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class InvoiceGenerateRequest(BaseModel):
    group_id: int
    period_start: date
    period_end: date
    due_date: Optional[date] = None


class InvoicePayRequest(BaseModel):
    amount: int
    method: Optional[str] = "cash"
    description: Optional[str] = None


class DebtorItem(BaseModel):
    student_id: int
    student_name: str
    total_debt_kopecks: int
    invoices: List[InvoiceResponse]


class ExpenseBase(BaseModel):
    branch_id: Optional[int] = None
    category: str
    amount: int
    expense_date: date
    description: Optional[str] = None
    status: Optional[str] = "approved"


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    branch_id: Optional[int] = None
    category: Optional[str] = None
    amount: Optional[int] = None
    expense_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class PayrollRequest(BaseModel):
    teacher_id: Optional[int] = None
    from_date: date
    to_date: date


class PayrollLessonItem(BaseModel):
    schedule_id: int
    title: str
    group_name: Optional[str]
    start_time: datetime
    end_time: datetime
    academic_hours: float
    amount_kopecks: int


class PayrollResponse(BaseModel):
    teacher_id: int
    teacher_name: str
    period_start: date
    period_end: date
    rate_kopecks: int
    total_academic_hours: float
    total_amount_kopecks: int
    lessons: List[PayrollLessonItem]


class PnLResponse(BaseModel):
    period_start: date
    period_end: date
    income_kopecks: int
    refund_kopecks: int
    expense_kopecks: int
    net_kopecks: int
