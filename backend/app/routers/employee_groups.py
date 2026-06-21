from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.core.dependencies import require_active_user, require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.models.employee_group import EmployeeGroup
from app.models.user import User
from app.schemas.employee_group import (
    EmployeeGroupCreate,
    EmployeeGroupUpdate,
    EmployeeGroupResponse,
    EmployeeGroupListResponse,
    EmployeeGroupMemberRequest,
    EmployeeGroupEnrollRequest,
)
from app.services.employee_group_service import EmployeeGroupService
from app.services.enrollment_service import EnrollmentService
from app.services.unit_of_work import UnitOfWork, get_uow


router = APIRouter(prefix="/employee-groups", tags=["employee-groups"])


@router.get("")
async def list_employee_groups(
    group_type: Optional[str] = None,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EmployeeGroupService(uow)
    groups = await service.list_groups(group_type=group_type)

    data = []
    for group in groups:
        member_count = await service.get_member_count(group.id)
        data.append(
            EmployeeGroupListResponse(
                id=group.id,
                name=group.name,
                description=group.description,
                group_type=group.group_type,
                member_count=member_count,
                created_at=group.created_at,
                updated_at=group.updated_at,
            ).model_dump()
        )

    return success_response(data=data, message="Список групп сотрудников")


@router.post("")
async def create_employee_group(
    data: EmployeeGroupCreate,
    current_user: User = Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EmployeeGroupService(uow)
    try:
        group = await service.create_group(
            name=data.name,
            description=data.description,
            group_type=data.group_type,
            member_ids=data.member_ids or [],
        )
    except ValueError as e:
        return error_response(str(e), status_code=400)

    await uow.commit()
    await uow.session.refresh(group)
    loaded = await service.get_by_id(group.id)
    return success_response(
        data=EmployeeGroupResponse.model_validate(loaded).model_dump(),
        message="Группа сотрудников создана",
        status_code=201,
    )


@router.get("/{group_id}")
async def get_employee_group(
    group_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EmployeeGroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)
    return success_response(
        data=EmployeeGroupResponse.model_validate(group).model_dump(),
        message="Группа сотрудников",
    )


@router.patch("/{group_id}")
async def update_employee_group(
    group_id: int,
    data: EmployeeGroupUpdate,
    current_user: User = Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EmployeeGroupService(uow)
    group = await service.update_group(
        group_id,
        name=data.name,
        description=data.description,
        group_type=data.group_type,
    )
    if not group:
        return error_response("Группа не найдена", status_code=404)
    await uow.commit()
    await uow.session.refresh(group)
    loaded = await service.get_by_id(group.id)
    return success_response(
        data=EmployeeGroupResponse.model_validate(loaded).model_dump(),
        message="Группа обновлена",
    )


@router.delete("/{group_id}")
async def delete_employee_group(
    group_id: int,
    current_user: User = Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EmployeeGroupService(uow)
    deleted = await service.delete_group(group_id)
    if not deleted:
        return error_response("Группа не найдена", status_code=404)
    await uow.commit()
    return success_response(message="Группа удалена")


@router.post("/{group_id}/members")
async def add_member(
    group_id: int,
    data: EmployeeGroupMemberRequest,
    current_user: User = Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EmployeeGroupService(uow)
    try:
        group = await service.add_members(group_id, [data.user_id])
    except ValueError as e:
        return error_response(str(e), status_code=400)
    await uow.commit()
    await uow.session.refresh(group)
    loaded = await service.get_by_id(group.id)
    return success_response(
        data=EmployeeGroupResponse.model_validate(loaded).model_dump(),
        message="Участник добавлен",
    )


@router.post("/{group_id}/enroll")
async def enroll_group_to_course(
    group_id: int,
    data: EmployeeGroupEnrollRequest,
    current_user: User = Depends(require_permission(Permission.ENROLLMENT_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EmployeeGroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)

    enrollment_service = EnrollmentService(uow)
    try:
        enrollments = await enrollment_service.enroll_employee_group(
            group=group,
            course_id=data.course_id,
            current_user=current_user,
        )
    except ValueError as e:
        return error_response(str(e), status_code=400)

    await uow.commit()
    return success_response(
        data={"enrolled_count": len(enrollments)},
        message=f"Зачислено {len(enrollments)} участников на курс",
    )


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = EmployeeGroupService(uow)
    try:
        group = await service.remove_member(group_id, user_id)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    await uow.commit()
    await uow.session.refresh(group)
    loaded = await service.get_by_id(group.id)
    return success_response(
        data=EmployeeGroupResponse.model_validate(loaded).model_dump(),
        message="Участник удалён",
    )
