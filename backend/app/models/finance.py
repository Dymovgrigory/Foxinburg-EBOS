import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    amount = Column(Integer, nullable=False)  # в копейках
    type = Column(String, default="income")  # income, refund
    method = Column(String, default="cash")  # cash, card, transfer
    status = Column(String, default="completed")  # pending, completed, cancelled

    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("User", back_populates="payments")

    def __repr__(self):
        return f"<Payment {self.amount} {self.status}>"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    amount = Column(Integer, nullable=False)  # в копейках
    type = Column(String, nullable=False)  # enrollment, payment, refund, bonus, penalty
    balance_after = Column(Integer, nullable=False)

    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Transaction {self.type} {self.amount}>"
