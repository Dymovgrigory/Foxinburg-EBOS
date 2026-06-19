import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    source = Column(String, nullable=True)  # источник заявки
    status = Column(String, default="new")  # new, contacted, trial, waiting_payment, converted, rejected

    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    comment = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    manager = relationship("User", back_populates="leads")
    deals = relationship("Deal", back_populates="lead")

    def __repr__(self):
        return f"<Lead {self.name} ({self.status})>"


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    title = Column(String, nullable=False)

    amount = Column(Integer, default=0)  # в копейках
    status = Column(String, default="in_progress")  # in_progress, won, lost

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    lead = relationship("Lead", back_populates="deals")

    def __repr__(self):
        return f"<Deal {self.title}>"
