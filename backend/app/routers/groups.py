from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.group import (
    GroupCreate,
    GroupUpdate,
    GroupResponse,
    GroupDetailResponse,
    GroupMembershipCreate,
    GroupMembershipUpdate,
    GroupMembershipResponse,
    StudentInfo,
)
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.group_service import GroupService

router = APIRouter(prefix="/groups", tags=["groups"])


def _enrich_group(item: dict, group) -> dict:
    item["students_count"] = len(group.students)
    item["course_title"] = group.course.title if group.course else None
    item["teacher_name"] = group.teacher.name if group.teacher else None
    item["branch_name"] = group.branch.name if group.branch else None
    return item


@router.get("")
async def list_groups(
    status: Optional[str] = None,
    branch_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    study_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    groups = await service.list_groups(
        status=status,
        branch_id=branch_id,
        teacher_id=teacher_id,
        study_type=study_type,
        search=search,
    )
    data = []
    for g in groups:
        item = GroupResponse.model_validate(g).model_dump()
        data.append(_enrich_group(item, g))
    return success_response(
        data=data,
        message="Список групп",
        meta={"total": len(data)},
    )


@router.get("/my")
async def list_my_groups(
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Группы текущего пользователя (teacher — где преподаватель, student — своя группа)."""
    service = GroupService(uow)
    if current_user.role == "student" and current_user.group_id:
        group = await service.get_by_id(current_user.group_id)
        groups = [group] if group else []
    else:
        groups = await service.list_groups_by_teacher(current_user.id)
    data = []
    for g in groups:
        item = GroupResponse.model_validate(g).model_dump()
        item["students_count"] = len(g.students) if g.students else 0
        item["course_title"] = g.course.title if g.course else None
        item["teacher_name"] = g.teacher.name if g.teacher else None
        item["branch_name"] = g.branch.name if g.branch else None
        data.append(item)
    return success_response(
        data=data,
        message="Мои группы",
        meta={"total": len(data)},
    )


@router.post("")
async def create_group(
    data: GroupCreate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.create_group(created_by_id=current_user.id, **data.model_dump())
    await uow.commit()
    group = await service.get_by_id(group.id)
    item = GroupResponse.model_validate(group).model_dump()
    return success_response(
        data=_enrich_group(item, group),
        message="Группа создана",
        status_code=201,
    )


@router.get("/{group_id}")
async def get_group(
    group_id: int,
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)

    item = GroupResponse.model_validate(group).model_dump()
    _enrich_group(item, group)
    item["students"] = [
        StudentInfo.model_validate(s).model_dump() for s in group.students
    ]
    item["memberships"] = [
        GroupMembershipResponse.model_validate(m).model_dump() for m in group.memberships
    ]
    return success_response(data=item, message="Группа")


@router.patch("/{group_id}")
async def update_group(
    group_id: int,
    data: GroupUpdate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.update_group(group_id, **data.model_dump(exclude_unset=True))
    if not group:
        return error_response("Группа не найдена", status_code=404)
    await uow.commit()
    group = await service.get_by_id(group.id)
    item = GroupResponse.model_validate(group).model_dump()
    return success_response(
        data=_enrich_group(item, group),
        message="Группа обновлена",
    )


@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)
    await uow.session.delete(group)
    await uow.commit()
    return success_response(data=None, message="Группа удалена")


# --- Ученики группы ---


@router.get("/{group_id}/students")
async def list_group_students(
    group_id: int,
    status: Optional[str] = None,
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)
    memberships = await service.list_memberships(group_id, status=status)
    data = [GroupMembershipResponse.model_validate(m).model_dump() for m in memberships]
    return success_response(
        data=data,
        message="Ученики группы",
        meta={"total": len(data)},
    )


@router.post("/{group_id}/students")
async def add_group_student(
    group_id: int,
    data: GroupMembershipCreate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)

    try:
        membership = await service.add_student_to_group(
            group_id,
            student_id=data.student_id,
            joined_at=data.joined_at,
            status=data.status,
            individual_hourly_rate=data.individual_hourly_rate,
            individual_lesson_count=data.individual_lesson_count,
            discount_percent=data.discount_percent,
            individual_monthly_fee=data.individual_monthly_fee,
            auto_invoices_enabled=data.auto_invoices_enabled,
            new_student_name=data.new_student_name,
            new_student_email=data.new_student_email,
            new_student_password=data.new_student_password,
            new_student_phone=data.new_student_phone,
        )
    except ValueError as exc:
        return error_response(str(exc), status_code=400)

    await uow.commit()
    await uow.session.refresh(membership)
    return success_response(
        data=GroupMembershipResponse.model_validate(membership).model_dump(),
        message="Ученик добавлен в группу",
        status_code=201,
    )


@router.patch("/{group_id}/students/{student_id}")
async def update_group_student(
    group_id: int,
    student_id: int,
    data: GroupMembershipUpdate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    membership = await service.update_membership(
        group_id, student_id, **data.model_dump(exclude_unset=True)
    )
    if not membership:
        return error_response("Ученик не найден в группе", status_code=404)
    await uow.commit()
    await uow.session.refresh(membership)
    return success_response(
        data=GroupMembershipResponse.model_validate(membership).model_dump(),
        message="Настройки ученика обновлены",
    )


@router.delete("/{group_id}/students/{student_id}")
async def remove_group_student(
    group_id: int,
    student_id: int,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    membership = await service.remove_student_from_group(group_id, student_id)
    if not membership:
        return error_response("Ученик не найден в группе", status_code=404)
    await uow.commit()
    await uow.session.refresh(membership)
    return success_response(
        data=GroupMembershipResponse.model_validate(membership).model_dump(),
        message="Ученик удалён из группы",
    )


@router.post("/{group_id}/students/{student_id}/transfer")
async def transfer_group_student(
    group_id: int,
    student_id: int,
    to_group_id: int,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    target = await service.get_by_id(to_group_id)
    if not target:
        return error_response("Целевая группа не найдена", status_code=404)
    try:
        membership = await service.transfer_student(group_id, student_id, to_group_id)
    except ValueError as exc:
        return error_response(str(exc), status_code=400)
    await uow.commit()
    await uow.session.refresh(membership)
    return success_response(
        data=GroupMembershipResponse.model_validate(membership).model_dump(),
        message="Ученик переведён в другую группу",
    )
