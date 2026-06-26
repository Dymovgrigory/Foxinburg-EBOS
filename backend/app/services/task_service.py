from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.models.task import Task
from app.models.user import User
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService


class TaskService(BaseService[Task]):
    model = Task

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, task_id: int) -> Optional[Task]:
        result = await self.uow.session.execute(
            select(Task)
            .where(Task.id == task_id)
            .options(
                selectinload(Task.assignee),
                selectinload(Task.creator),
                selectinload(Task.contact),
            )
        )
        return result.scalar_one_or_none()

    async def list_tasks(
        self,
        *,
        user_id: int,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        assignee_id: Optional[int] = None,
        creator_id: Optional[int] = None,
        due_from: Optional[datetime] = None,
        due_to: Optional[datetime] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Task]:
        query = (
            select(Task)
            .options(
                selectinload(Task.assignee),
                selectinload(Task.creator),
                selectinload(Task.contact),
            )
            .where(
                or_(
                    Task.assignee_id == user_id,
                    Task.creator_id == user_id,
                )
            )
        )
        filters = []
        if status:
            filters.append(Task.status == status)
        if task_type:
            filters.append(Task.type == task_type)
        if assignee_id is not None:
            filters.append(Task.assignee_id == assignee_id)
        if creator_id is not None:
            filters.append(Task.creator_id == creator_id)
        if due_from:
            filters.append(Task.due_date >= due_from)
        if due_to:
            filters.append(Task.due_date <= due_to)
        if search:
            filters.append(
                or_(
                    Task.title.ilike(f"%{search}%"),
                    Task.description.ilike(f"%{search}%"),
                )
            )
        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).limit(limit).offset(offset)
        result = await self.uow.session.execute(query)
        return list(result.scalars().all())

    async def create_task(
        self,
        *,
        title: str,
        description: Optional[str] = None,
        assignee_id: Optional[int] = None,
        creator_id: Optional[int] = None,
        contact_id: Optional[int] = None,
        status: Optional[str] = "planned",
        task_type: Optional[str] = None,
        due_date: Optional[datetime] = None,
    ) -> Task:
        task = Task(
            title=title,
            description=description,
            assignee_id=assignee_id,
            creator_id=creator_id,
            contact_id=contact_id,
            status=status,
            type=task_type,
            due_date=due_date,
        )
        self.uow.session.add(task)
        await self.uow.commit()
        return await self.get_by_id(task.id)

    async def update_task(
        self,
        task_id: int,
        **kwargs,
    ) -> Optional[Task]:
        task = await self.get_by_id(task_id)
        if not task:
            return None
        for field, value in kwargs.items():
            setattr(task, field, value)
        await self.uow.commit()
        await self.uow.session.refresh(task, ["assignee", "creator", "contact"])
        return task

    async def delete_task(self, task_id: int) -> bool:
        task = await self.get_by_id(task_id)
        if not task:
            return False
        await self.uow.session.delete(task)
        await self.uow.commit()
        return True
