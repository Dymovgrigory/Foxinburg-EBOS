from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, UniqueConstraint

from app.database import Base
from app.utils import utc_now


class ScheduleReminderLog(Base):
    """Лог отправленных напоминаний о занятиях, чтобы не дублировать уведомления."""

    __tablename__ = "schedule_reminder_logs"
    __table_args__ = (
        UniqueConstraint(
            "schedule_id",
            "occurrence_date",
            "user_id",
            "reminder_type",
            name="uq_schedule_reminder_log",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False, index=True)
    occurrence_date = Column(Date, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reminder_type = Column(String, nullable=False)  # "24h" / "1h"
    channel = Column(String, nullable=False, default="in_app")  # in_app / email / telegram
    sent_at = Column(DateTime, default=utc_now, nullable=False)
