import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, default="group")  # group (direct out of scope)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True, unique=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    group = relationship("Group", back_populates="chat_room")
    participants = relationship("ChatParticipant", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ChatRoom {self.name}>"


class ChatParticipant(Base):
    __tablename__ = "chat_participants"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_chat_participant"),)

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="member")  # admin, member
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    room = relationship("ChatRoom", back_populates="participants")
    user = relationship("User", back_populates="participations")

    def __repr__(self):
        return f"<ChatParticipant room={self.room_id} user={self.user_id}>"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)

    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage {self.id}>"
