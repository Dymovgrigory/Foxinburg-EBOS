import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Date, Boolean
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    amount = Column(Integer, nullable=False)  # в копейках
    type = Column(String, default="income")  # income, refund
    method = Column(String, default="cash")  # cash, card, transfer
    status = Column(String, default="completed")  # pending, completed, cancelled

    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)

    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    student = relationship("User", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")

    def __repr__(self):
        return f"<Payment {self.amount} {self.status}>"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    amount = Column(Integer, nullable=False)  # в копейках
    type = Column(String, nullable=False)  # enrollment, payment, refund, bonus, penalty, lesson_charge
    balance_after = Column(Integer, nullable=False)

    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Transaction {self.type} {self.amount}>"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    membership_id = Column(Integer, ForeignKey("group_memberships.id"), nullable=True)

    amount = Column(Integer, nullable=False)  # в копейках
    status = Column(String, default="draft", nullable=False)  # draft, sent, paid, cancelled, overdue
    due_date = Column(Date, nullable=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    description = Column(Text, nullable=True)

    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    student = relationship("User", foreign_keys=[student_id])
    group = relationship("Group")
    membership = relationship("GroupMembership")
    payments = relationship("Payment", back_populates="invoice")

    def __repr__(self):
        return f"<Invoice {self.amount} {self.status}>"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    category = Column(String, nullable=False)  # salary, rent, marketing, materials, other
    amount = Column(Integer, nullable=False)  # в копейках
    expense_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="approved", nullable=False)  # approved, cancelled

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    branch = relationship("Branch")
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<Expense {self.category} {self.amount}>"
