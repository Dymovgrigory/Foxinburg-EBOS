from datetime import date
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.group import Group, GroupMembership
from app.models.user import User
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.services.chat_service import ChatService


class GroupService(BaseService[Group]):
    model = Group

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, group_id: int) -> Optional[Group]:
        result = await self.uow.session.execute(
            select(Group)
            .where(Group.id == group_id)
            .options(
                selectinload(Group.students),
                selectinload(Group.memberships).selectinload(GroupMembership.student),
                selectinload(Group.course),
                selectinload(Group.teacher),
                selectinload(Group.branch),
            )
        )
        return result.scalar_one_or_none()

    async def list_groups(
        self,
        *,
        status: Optional[str] = None,
        branch_id: Optional[int] = None,
        teacher_id: Optional[int] = None,
        study_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Group]:
        stmt = select(Group).options(
            selectinload(Group.teacher),
            selectinload(Group.branch),
            selectinload(Group.course),
            selectinload(Group.students),
        )
        if status:
            stmt = stmt.where(Group.status == status)
        if branch_id:
            stmt = stmt.where(Group.branch_id == branch_id)
        if teacher_id:
            stmt = stmt.where(Group.teacher_id == teacher_id)
        if study_type:
            stmt = stmt.where(Group.study_type == study_type)
        if search:
            stmt = stmt.where(Group.name.ilike(f"%{search}%"))
        stmt = stmt.order_by(Group.created_at.desc()).limit(limit).offset(offset)
        result = await self.uow.session.execute(stmt)
        return list(result.scalars().all())

    async def list_groups_by_teacher(self, teacher_id: int) -> List[Group]:
        result = await self.uow.session.execute(
            select(Group)
            .where(Group.teacher_id == teacher_id)
            .options(
                selectinload(Group.students),
                selectinload(Group.memberships),
                selectinload(Group.course),
                selectinload(Group.teacher),
                selectinload(Group.branch),
            )
        )
        return list(result.scalars().all())

    async def create_group(self, *, created_by_id: int, **kwargs) -> Group:
        group = Group(**kwargs)
        await self.add(group)
        await self.uow.session.flush()
        await self.uow.session.refresh(group)

        # Автоматически создаём чат группы
        chat_service = ChatService(self.uow)
        participant_ids = []
        teacher_id = kwargs.get("teacher_id")
        if teacher_id:
            participant_ids.append(teacher_id)
        # Добавляем студентов, уже привязанных к группе
        students_result = await self.uow.session.execute(
            select(User.id).where(User.group_id == group.id)
        )
        participant_ids.extend([r[0] for r in students_result.all()])

        await chat_service.create_room(
            name=f"Чат: {group.name}",
            created_by_id=teacher_id or created_by_id,
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

    # --- Group memberships ---

    async def get_membership(self, group_id: int, student_id: int) -> Optional[GroupMembership]:
        result = await self.uow.session.execute(
            select(GroupMembership)
            .where(GroupMembership.group_id == group_id)
            .where(GroupMembership.student_id == student_id)
            .options(selectinload(GroupMembership.student))
        )
        return result.scalar_one_or_none()

    async def list_memberships(
        self,
        group_id: int,
        status: Optional[str] = None,
    ) -> List[GroupMembership]:
        stmt = (
            select(GroupMembership)
            .where(GroupMembership.group_id == group_id)
            .options(selectinload(GroupMembership.student))
        )
        if status:
            stmt = stmt.where(GroupMembership.status == status)
        stmt = stmt.order_by(GroupMembership.joined_at.desc())
        result = await self.uow.session.execute(stmt)
        return list(result.scalars().all())

    async def add_student_to_group(
        self,
        group_id: int,
        *,
        student_id: Optional[int] = None,
        joined_at: date = None,
        status: str = "active",
        individual_hourly_rate: Optional[int] = None,
        individual_lesson_count: Optional[int] = None,
        discount_percent: int = 0,
        individual_monthly_fee: Optional[int] = None,
        auto_invoices_enabled: bool = True,
        new_student_name: Optional[str] = None,
        new_student_email: Optional[str] = None,
        new_student_password: Optional[str] = None,
        new_student_phone: Optional[str] = None,
    ) -> GroupMembership:
        if joined_at is None:
            joined_at = date.today()

        if student_id:
            user = await self.uow.session.get(User, student_id)
            if not user:
                raise ValueError("Ученик не найден")
            # Обновляем активную группу ученика
            user.group_id = group_id
        elif new_student_name and new_student_email and new_student_password:
            from app.services.user_service import UserService

            user_service = UserService(self.uow)
            user = await user_service.create_user(
                email=new_student_email,
                name=new_student_name,
                password=new_student_password,
                role="student",
                group_id=group_id,
            )
            if new_student_phone:
                user.phone = new_student_phone
            student_id = user.id
        else:
            raise ValueError("Необходимо указать student_id или данные нового ученика")

        await self.uow.session.flush()

        membership = GroupMembership(
            group_id=group_id,
            student_id=student_id,
            joined_at=joined_at,
            status=status,
            individual_hourly_rate=individual_hourly_rate,
            individual_lesson_count=individual_lesson_count,
            discount_percent=discount_percent,
            individual_monthly_fee=individual_monthly_fee,
            auto_invoices_enabled=auto_invoices_enabled,
        )
        self.uow.session.add(membership)
        await self.uow.session.flush()
        await self.uow.session.refresh(membership)

        await self.sync_student_in_chat(group_id, student_id, add=True)
        return membership

    async def update_membership(
        self,
        group_id: int,
        student_id: int,
        **kwargs,
    ) -> Optional[GroupMembership]:
        membership = await self.get_membership(group_id, student_id)
        if not membership:
            return None
        for field, value in kwargs.items():
            setattr(membership, field, value)
        await self.uow.session.flush()
        await self.uow.session.refresh(membership)
        return membership

    async def remove_student_from_group(
        self,
        group_id: int,
        student_id: int,
        left_at: Optional[date] = None,
    ) -> Optional[GroupMembership]:
        membership = await self.get_membership(group_id, student_id)
        if not membership:
            return None
        if left_at is None:
            left_at = date.today()
        membership.left_at = left_at
        membership.status = "left"

        user = await self.uow.session.get(User, student_id)
        if user and user.group_id == group_id:
            user.group_id = None
        await self.uow.session.flush()

        await self.sync_student_in_chat(group_id, student_id, add=False)
        return membership

    async def transfer_student(
        self,
        from_group_id: int,
        student_id: int,
        to_group_id: int,
        joined_at: Optional[date] = None,
    ) -> GroupMembership:
        await self.remove_student_from_group(from_group_id, student_id)
        return await self.add_student_to_group(
            to_group_id,
            student_id=student_id,
            joined_at=joined_at or date.today(),
        )
