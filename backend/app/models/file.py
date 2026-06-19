import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    original_name = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)  # путь в Яндекс Диске / хранилище
    public_url = Column(String, nullable=True)

    file_type = Column(String, nullable=True)  # image, video, document, audio
    mime_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)

    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    entity_type = Column(String, nullable=True)  # lesson, homework, user_avatar
    entity_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])

    def __repr__(self):
        return f"<File {self.original_name}>"
