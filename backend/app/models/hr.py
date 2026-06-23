from sqlalchemy import Column, Integer, String, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class StaffLeave(Base):
    __tablename__ = "staff_leaves"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    leave_type = Column(String, nullable=False)  # vacation, sick, day_off, unpaid
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending, approved, rejected
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<StaffLeave {self.user_id} {self.leave_type} {self.start_date}>"


class StaffKpi(Base):
    __tablename__ = "staff_kpis"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    metric = Column(String, nullable=False)  # attendance, conversion, retention, lessons, revenue
    target = Column(Integer, nullable=False)  # целевое значение
    actual = Column(Integer, nullable=False)  # фактическое значение
    unit = Column(String, default="percent", nullable=False)  # percent, count, rubles
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", foreign_keys=[user_id])

    @property
    def completion_percent(self) -> int:
        if self.target == 0:
            return 0
        return min(100, int(self.actual / self.target * 100))

    def __repr__(self):
        return f"<StaffKpi {self.user_id} {self.metric} {self.actual}/{self.target}>"
