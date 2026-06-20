from datetime import datetime
from typing import Optional, List
from sqlalchemy import select, and_

from app.services.unit_of_work import UnitOfWork
from app.models.chat import ChatRoom, ChatParticipant, ChatMessage
from app.models.user import User


class ChatService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_room(
        self,
        *,
        name: str,
        created_by_id: int,
        group_id: Optional[int] = None,
        participant_ids: Optional[List[int]] = None,
    ) -> ChatRoom:
        room = ChatRoom(
            name=name,
            type="group",
            group_id=group_id,
            created_by_id=created_by_id,
        )
        self.uow.session.add(room)
        await self.uow.session.flush()
        await self.uow.session.refresh(room)

        # Creator is admin
        await self.add_participant(room.id, created_by_id, role="admin")

        for user_id in set(participant_ids or []):
            if user_id != created_by_id:
                await self.add_participant(room.id, user_id, role="member")

        await self.uow.session.flush()
        await self.uow.session.refresh(room, ["participants"])
        return room

    async def get_room(self, room_id: int) -> Optional[ChatRoom]:
        result = await self.uow.session.execute(select(ChatRoom).where(ChatRoom.id == room_id))
        return result.scalar_one_or_none()

    async def get_user_rooms(self, user_id: int) -> List[ChatRoom]:
        result = await self.uow.session.execute(
            select(ChatRoom)
            .join(ChatParticipant, ChatParticipant.room_id == ChatRoom.id)
            .where(ChatParticipant.user_id == user_id)
            .order_by(ChatRoom.created_at.desc())
        )
        return list(result.scalars().all())

    async def is_participant(self, room_id: int, user_id: int) -> bool:
        result = await self.uow.session.execute(
            select(ChatParticipant).where(
                and_(ChatParticipant.room_id == room_id, ChatParticipant.user_id == user_id)
            )
        )
        return result.scalar_one_or_none() is not None

    async def add_participant(self, room_id: int, user_id: int, role: str = "member") -> ChatParticipant:
        existing = await self.uow.session.execute(
            select(ChatParticipant).where(
                and_(ChatParticipant.room_id == room_id, ChatParticipant.user_id == user_id)
            )
        )
        if existing.scalar_one_or_none():
            return existing.scalar_one_or_none()

        participant = ChatParticipant(room_id=room_id, user_id=user_id, role=role)
        self.uow.session.add(participant)
        await self.uow.session.flush()
        await self.uow.session.refresh(participant)
        return participant

    async def remove_participant(self, room_id: int, user_id: int) -> bool:
        result = await self.uow.session.execute(
            select(ChatParticipant).where(
                and_(ChatParticipant.room_id == room_id, ChatParticipant.user_id == user_id)
            )
        )
        participant = result.scalar_one_or_none()
        if not participant:
            return False
        await self.uow.session.delete(participant)
        await self.uow.session.flush()
        return True

    async def get_messages(
        self,
        room_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ChatMessage]:
        result = await self.uow.session.execute(
            select(ChatMessage)
            .where(ChatMessage.room_id == room_id, ChatMessage.is_deleted == False)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def send_message(self, room_id: int, sender_id: int, content: str) -> ChatMessage:
        message = ChatMessage(
            room_id=room_id,
            sender_id=sender_id,
            content=content,
            created_at=datetime.utcnow(),
        )
        self.uow.session.add(message)
        await self.uow.session.flush()
        await self.uow.session.refresh(message)
        return message

    async def get_message(self, message_id: int) -> Optional[ChatMessage]:
        result = await self.uow.session.execute(select(ChatMessage).where(ChatMessage.id == message_id))
        return result.scalar_one_or_none()

    async def edit_message(self, message_id: int, sender_id: int, content: str) -> Optional[ChatMessage]:
        message = await self.get_message(message_id)
        if not message or message.sender_id != sender_id or message.is_deleted:
            return None
        message.content = content
        message.updated_at = datetime.utcnow()
        await self.uow.session.flush()
        await self.uow.session.refresh(message)
        return message

    async def soft_delete_message(self, message_id: int, sender_id: int) -> Optional[ChatMessage]:
        message = await self.get_message(message_id)
        if not message or message.sender_id != sender_id or message.is_deleted:
            return None
        message.is_deleted = True
        message.content = ""
        await self.uow.session.flush()
        await self.uow.session.refresh(message)
        return message

    async def get_participants(self, room_id: int) -> List[ChatParticipant]:
        result = await self.uow.session.execute(
            select(ChatParticipant).where(ChatParticipant.room_id == room_id)
        )
        return list(result.scalars().all())

    async def get_room_with_participants(self, room_id: int) -> Optional[ChatRoom]:
        room = await self.get_room(room_id)
        if room:
            # preload participants
            await self.uow.session.refresh(room, ["participants"])
        return room
