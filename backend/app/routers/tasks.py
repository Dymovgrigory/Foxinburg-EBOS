from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query

from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_to_dict(task) -> dict:
    data = TaskResponse.model_validate(task).model_dump()
    data["assignee_name"] = task.assignee.name if task.assignee else None
    data["creator_name"] = task.creator.name if task.creator else None
    data["contact_name"] = task.contact.name if task.contact else None
    return data


@router.get("")
async def list_tasks(
    status: Optional[str] = None,
    task_type: Optional[str] = Query(None, alias="type"),
    assignee_id: Optional[int] = None,
    creator_id: Optional[int] = None,
    due_from: Optional[datetime] = None,
    due_to: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TaskService(uow)
    tasks = await service.list_tasks(
        user_id=current_user.id,
        status=status,
        task_type=task_type,
        assignee_id=assignee_id,
        creator_id=creator_id,
        due_from=due_from,
        due_to=due_to,
        search=search,
    )
    return success_response(
        data=[_task_to_dict(t) for t in tasks],
        message="Список задач",
        meta={"total": len(tasks)},
    )


@router.post("")
async def create_task(
    data: TaskCreate,
    current_user=Depends(require_permission(Permission.TASK_CREATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TaskService(uow)
    task = await service.create_task(
        title=data.title,
        description=data.description,
        assignee_id=data.assignee_id,
        creator_id=current_user.id,
        contact_id=data.contact_id,
        status=data.status or "planned",
        task_type=data.type,
        due_date=data.due_date,
    )
    return success_response(
        data=_task_to_dict(task),
        message="Задача создана",
        status_code=201,
    )


@router.get("/{task_id}")
async def get_task(
    task_id: int,
    current_user=Depends(require_permission(Permission.TASK_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TaskService(uow)
    task = await service.get_by_id(task_id)
    if not task:
        return error_response("Задача не найдена", status_code=404)
    return success_response(data=_task_to_dict(task), message="Задача")


@router.patch("/{task_id}")
async def update_task(
    task_id: int,
    data: TaskUpdate,
    current_user=Depends(require_permission(Permission.TASK_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TaskService(uow)
    task = await service.update_task(task_id, **data.model_dump(exclude_unset=True))
    if not task:
        return error_response("Задача не найдена", status_code=404)
    return success_response(data=_task_to_dict(task), message="Задача обновлена")


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user=Depends(require_permission(Permission.TASK_DELETE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TaskService(uow)
    deleted = await service.delete_task(task_id)
    if not deleted:
        return error_response("Задача не найдена", status_code=404)
    return success_response(data=None, message="Задача удалена")
