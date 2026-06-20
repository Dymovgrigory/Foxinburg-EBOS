from typing import List, Optional
from sqlalchemy import select

from app.models.group import Group
from app.models.user import User
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.services.chat_service import ChatService


class GroupService(BaseService[Group]):
    model = Group

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, group_id: int) -> Optional[Group]:
        result = await self.uow.session.execute(select(Group).where(Group.id == group_id))
        return result.scalar_one_or_none()

    async def list_groups(self, *, limit: int = 100, offset: int = 0) -> List[Group]:
        result = await self.uow.session.execute(select(Group).limit(limit).offset(offset))
        return list(result.scalars().all())

    async def create_group(
        self,
        *,
        name: str,
        description: Optional[str] = None,
        branch_id: Optional[int] = None,
        teacher_id: Optional[int] = None,
        course_id: Optional[int] = None,
        max_students: int = 12,
        schedule: Optional[str] = None,
    ) -> Group:
        group = Group(
            name=name,
            description=description,
            branch_id=branch_id,
            teacher_id=teacher_id,
            course_id=course_id,
            max_students=max_students,
            schedule=schedule,
        )
        await self.add(group)
        await self.uow.session.flush()
        await self.uow.session.refresh(group)

        # Автоматически создаём чат группы
        chat_service = ChatService(self.uow)
        participant_ids = []
        if teacher_id:
            participant_ids.append(teacher_id)
        # Добавляем студентов, уже привязанных к группе
        students_result = await self.uow.session.execute(
            select(User.id).where(User.group_id == group.id)
        )
        participant_ids.extend([r[0] for r in students_result.all()])

        await chat_service.create_room(
            name=f"Чат: {name}",
            created_by_id=teacher_id or 0,  # если teacher_id нет, creator будет system/owner
            group_id=group.id,
            participant_ids=participant_ids,
        )
        return group

    async def update_group(
        self,
        group_id: int,
        *,
        teacher_id: Optional[int] = None,
        **kwargs,
    ) -> Optional[Group]:
        group = await self.get_by_id(group_id)
        if not group:
            return None

        old_teacher_id = group.teacher_id
        for field, value in kwargs.items():
            setattr(group, field, value)
        if teacher_id is not None:
            group.teacher_id = teacher_id

        await self.uow.session.flush()
        await self.uow.session.refresh(group)

        # Синхронизируем преподавателя в чате группы
        if teacher_id is not None and teacher_id != old_teacher_id:
            await self._sync_teacher_in_chat(group, old_teacher_id, teacher_id)

        return group

    async def _sync_teacher_in_chat(
        self,
        group: Group,
        old_teacher_id: Optional[int],
        new_teacher_id: Optional[int],
    ) -> None:
        if not group.chat_room:
            return
        chat_service = ChatService(self.uow)
        if old_teacher_id:
            await chat_service.remove_participant(group.chat_room.id, old_teacher_id)
        if new_teacher_id:
            await chat_service.add_participant(group.chat_room.id, new_teacher_id, role="admin")

    async def sync_student_in_chat(self, group_id: int, student_id: int, add: bool = True) -> None:
        """Добавить или удалить студента в чате группы."""
        group = await self.get_by_id(group_id)
        if not group or not group.chat_room:
            return
        chat_service = ChatService(self.uow)
        if add:
            await chat_service.add_participant(group.chat_room.id, student_id, role="member")
        else:
            await chat_service.remove_participant(group.chat_room.id, student_id)
