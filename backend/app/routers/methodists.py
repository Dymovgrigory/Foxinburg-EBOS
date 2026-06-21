from fastapi import APIRouter, Depends
from sqlalchemy import select, func

from app.core.dependencies import require_active_user, require_permission
from app.core.permissions import Permission
from app.core.responses import success_response
from app.models.course import Course
from app.models.group import Group
from app.models.homework import Homework
from app.models.user import User
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/methodists", tags=["methodists"])


@router.get("/dashboard")
async def methodist_dashboard(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Сводка для личного кабинета методиста."""
    branch_id = current_user.branch_id

    courses_result = await uow.session.execute(select(func.count(Course.id)))
    courses_count = courses_result.scalar() or 0

    groups_query = select(func.count(Group.id))
    if branch_id:
        groups_query = groups_query.where(Group.branch_id == branch_id)
    groups_result = await uow.session.execute(groups_query)
    groups_count = groups_result.scalar() or 0

    students_query = select(func.count(User.id)).where(User.role == "student", User.is_active == True)
    if branch_id:
        students_query = students_query.where(User.branch_id == branch_id)
    students_result = await uow.session.execute(students_query)
    students_count = students_result.scalar() or 0

    pending_homeworks_result = await uow.session.execute(
        select(func.count(Homework.id)).where(Homework.status == "submitted")
    )
    pending_homeworks_count = pending_homeworks_result.scalar() or 0

    return success_response(
        data={
            "courses_count": courses_count,
            "groups_count": groups_count,
            "students_count": students_count,
            "pending_homeworks_count": pending_homeworks_count,
        },
        message="Сводка методиста",
    )
