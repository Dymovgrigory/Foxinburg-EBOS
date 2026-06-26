from typing import Optional
from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse, ModuleResponse
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.course_service import CourseService
from app.services.module_service import ModuleService

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
async def list_courses(
    status: Optional[str] = None,
    current_user=Depends(require_permission(Permission.COURSE_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = CourseService(uow)
    courses = await service.list_courses(status=status)
    return success_response(
        data=[CourseResponse.model_validate(c).model_dump() for c in courses],
        message="Список курсов",
        meta={"total": len(courses)},
    )


@router.get("/{course_id}")
async def get_course(
    course_id: int,
    current_user=Depends(require_permission(Permission.COURSE_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = CourseService(uow)
    course = await service.get_by_id(course_id)
    if not course:
        return error_response("Курс не найден", status_code=404)
    return success_response(
        data=CourseResponse.model_validate(course).model_dump(),
        message="Курс",
    )


@router.get("/{course_id}/modules")
async def list_course_modules(
    course_id: int,
    current_user=Depends(require_permission(Permission.COURSE_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    course_service = CourseService(uow)
    course = await course_service.get_by_id(course_id)
    if not course:
        return error_response("Курс не найден", status_code=404)

    module_service = ModuleService(uow)
    modules = await module_service.list_by_course(course_id)
    return success_response(
        data=[ModuleResponse.model_validate(m).model_dump() for m in modules],
        message="Модули курса",
        meta={"total": len(modules)},
    )


@router.post("")
async def create_course(
    data: CourseCreate,
    current_user=Depends(require_permission(Permission.COURSE_CREATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = CourseService(uow)
    course = await service.create_course(
        title=data.title,
        description=data.description,
        short_description=data.short_description,
        type_=data.type,
        passing_score=data.passing_score,
        is_sequential=data.is_sequential,
        certificate_enabled=data.certificate_enabled,
        author=current_user,
    )
    return success_response(
        data=CourseResponse.model_validate(course).model_dump(),
        message="Курс создан",
        status_code=201,
    )


@router.patch("/{course_id}")
async def update_course(
    course_id: int,
    data: CourseUpdate,
    current_user=Depends(require_permission(Permission.COURSE_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = CourseService(uow)
    course = await service.get_by_id(course_id)
    if not course:
        return error_response("Курс не найден", status_code=404)

    updated = await service.update_course(
        course,
        title=data.title,
        description=data.description,
        short_description=data.short_description,
        status=data.status,
        passing_score=data.passing_score,
        is_sequential=data.is_sequential,
        certificate_enabled=data.certificate_enabled,
    )
    return success_response(
        data=CourseResponse.model_validate(updated).model_dump(),
        message="Курс обновлён",
    )


@router.delete("/{course_id}")
async def delete_course(
    course_id: int,
    current_user=Depends(require_permission(Permission.COURSE_DELETE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = CourseService(uow)
    course = await service.get_by_id(course_id)
    if not course:
        return error_response("Курс не найден", status_code=404)

    await service.delete_course(course)
    return success_response(message="Курс удалён")
