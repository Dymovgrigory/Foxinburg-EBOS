from fastapi import APIRouter, Depends
from sqlalchemy import select, desc

from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission, has_permission
from app.core.responses import success_response, error_response
from app.models.course import Lesson
from app.models.enrollment import Enrollment, LessonProgress
from app.models.homework import Homework
from app.models.test import TestAttempt
from app.schemas.course import (
    LessonCreate,
    LessonUpdate,
    LessonResponse,
    LessonContentResponse,
    LessonPlayerResponse,
    LessonPlayerLessonResponse,
    LessonTestPlayerResponse,
    TestQuestionPlayerResponse,
    LessonReorderRequest,
)
from app.schemas.homework import HomeworkResponse
from app.schemas.progress import LessonProgressResponse
from app.schemas.test import TestQuestionResponse, TestAttemptResponse
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.lesson_service import LessonService
from app.services.module_service import ModuleService
from app.services.progress_service import ProgressService
from app.utils import utc_now

router = APIRouter(prefix="/lessons", tags=["lessons"])


def _lesson_detail_dict(lesson: Lesson) -> dict:
    """Сериализует урок вместе с вложенным тестом и вопросами."""
    data = LessonResponse.model_validate(lesson).model_dump()
    data["contents"] = [LessonContentResponse.model_validate(c).model_dump() for c in lesson.contents]
    test = lesson.tests[0] if lesson.tests else None
    if test:
        data["test"] = {
            "id": test.id,
            "title": test.title,
            "description": test.description,
            "passing_score": test.passing_score,
            "time_limit_minutes": test.time_limit_minutes,
            "max_attempts": test.max_attempts,
            "is_active": test.is_active,
            "questions": [TestQuestionResponse.model_validate(q).model_dump() for q in test.questions],
        }
    else:
        data["test"] = None
    return data


_PREVIEW_ROLES = {"owner", "super_admin", "admin", "methodist", "teacher"}


def _lesson_player_dict(
    lesson: Lesson,
    progress: LessonProgress | None,
    homework: Homework | None,
    latest_attempt: TestAttempt | None,
    is_locked: bool,
    can_complete: bool,
) -> dict:
    """Сериализует урок для плеера: без correct_answers, с прогрессом, ДЗ и попыткой."""
    test = lesson.tests[0] if lesson.tests else None
    test_data = None
    if test:
        test_data = {
            "id": test.id,
            "title": test.title,
            "description": test.description,
            "passing_score": test.passing_score,
            "time_limit_minutes": test.time_limit_minutes,
            "max_attempts": test.max_attempts,
            "is_active": test.is_active,
            "questions": [
                {
                    "id": q.id,
                    "test_id": q.test_id,
                    "question_text": q.question_text,
                    "question_type": q.question_type,
                    "options": q.options,
                    "points": q.points,
                    "order_index": q.order_index,
                }
                for q in test.questions
            ],
        }

    lesson_data = {
        "id": lesson.id,
        "title": lesson.title,
        "description": lesson.description,
        "lesson_type": lesson.lesson_type,
        "order_index": lesson.order_index,
        "duration_minutes": lesson.duration_minutes,
        "is_active": lesson.is_active,
        "module_id": lesson.module_id,
        "homework_title": lesson.homework_title,
        "homework_description": lesson.homework_description,
        "created_at": lesson.created_at,
        "updated_at": lesson.updated_at,
        "contents": [LessonContentResponse.model_validate(c).model_dump() for c in lesson.contents],
        "test": test_data,
    }

    return {
        "lesson": lesson_data,
        "progress": LessonProgressResponse.model_validate(progress).model_dump() if progress else None,
        "homework": HomeworkResponse.model_validate(homework).model_dump() if homework else None,
        "latest_test_attempt": TestAttemptResponse.model_validate(latest_attempt).model_dump() if latest_attempt else None,
        "is_locked": is_locked,
        "can_complete": can_complete,
    }


@router.get("/{lesson_id}")
async def get_lesson(
    lesson_id: int,
    current_user=Depends(require_permission(Permission.COURSE_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = LessonService(uow)
    lesson = await service.get_by_id(lesson_id)
    if not lesson:
        return error_response("Урок не найден", status_code=404)
    return success_response(
        data=_lesson_detail_dict(lesson),
        message="Урок",
    )


@router.get("/{lesson_id}/player")
async def get_lesson_player(
    lesson_id: int,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    lesson_service = LessonService(uow)
    lesson = await lesson_service.get_by_id(lesson_id)
    if not lesson:
        return error_response("Урок не найден", status_code=404)

    is_preview = current_user.role in _PREVIEW_ROLES
    course_id = lesson.module.course_id

    enrollment = None
    if current_user.role == "student":
        result = await uow.session.execute(
            select(Enrollment).where(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id,
                Enrollment.status.in_(["active", "completed", "paused"]),
            )
        )
        enrollment = result.scalar_one_or_none()
        if not enrollment:
            return error_response("Вы не зачислены на этот курс", status_code=403)
    elif not is_preview:
        return error_response("Недостаточно прав доступа", status_code=403)

    progress_service = ProgressService(uow)
    progress = None
    is_locked = False
    can_complete = False

    if current_user.role == "student" and enrollment is not None:
        progress = await progress_service.get_lesson_progress(current_user.id, lesson_id)
        if not progress:
            progress_rows = await progress_service.ensure_progress_records_for_enrollment(enrollment.id)
            progress = next((p for p in progress_rows if p.lesson_id == lesson_id), None)

        if progress:
            is_locked = progress.status == "locked"
            can_complete = progress.status in ("available", "in_progress")
            if progress.status == "available":
                progress.status = "in_progress"
                await uow.session.flush()
        else:
            is_locked = True
    elif is_preview:
        progress = await progress_service.get_lesson_progress(current_user.id, lesson_id)
        can_complete = True

    if is_locked:
        return error_response("Урок заблокирован. Завершите предыдущие уроки.", status_code=403)

    # Домашнее задание студента (или любое для преподавателя/методиста)
    homework = None
    if current_user.role == "student":
        result = await uow.session.execute(
            select(Homework)
            .where(
                Homework.student_id == current_user.id,
                Homework.lesson_id == lesson_id,
            )
            .order_by(desc(Homework.created_at))
        )
        homework = result.scalar_one_or_none()
    else:
        result = await uow.session.execute(
            select(Homework)
            .where(Homework.lesson_id == lesson_id)
            .order_by(desc(Homework.created_at))
        )
        homework = result.scalar_one_or_none()

    # Последняя попытка теста студента
    latest_attempt = None
    if current_user.role == "student" and lesson.tests:
        result = await uow.session.execute(
            select(TestAttempt)
            .where(
                TestAttempt.student_id == current_user.id,
                TestAttempt.test_id == lesson.tests[0].id,
            )
            .order_by(desc(TestAttempt.started_at))
        )
        latest_attempt = result.scalar_one_or_none()

    data = _lesson_player_dict(lesson, progress, homework, latest_attempt, is_locked, can_complete)
    return success_response(data=data, message="Урок для прохождения")


@router.post("")
async def create_lesson(
    data: LessonCreate,
    current_user=Depends(require_permission(Permission.LESSON_CREATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    module_service = ModuleService(uow)
    module = await module_service.get_by_id(data.module_id)
    if not module:
        return error_response("Модуль не найден", status_code=404)

    service = LessonService(uow)
    lesson = await service.create_lesson(
        module_id=data.module_id,
        title=data.title,
        description=data.description,
        lesson_type=data.lesson_type,
        order_index=data.order_index,
        duration_minutes=data.duration_minutes,
        homework_title=data.homework_title,
        homework_description=data.homework_description,
        test=data.test.model_dump() if data.test else None,
        homework=data.homework.model_dump() if data.homework else None,
    )
    lesson = await service.get_by_id(lesson.id)
    return success_response(
        data=_lesson_detail_dict(lesson),
        message="Урок создан",
        status_code=201,
    )


@router.post("/reorder")
async def reorder_lessons(
    data: LessonReorderRequest,
    current_user=Depends(require_permission(Permission.LESSON_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = LessonService(uow)
    try:
        lessons = await service.reorder_lessons(data.module_id, data.lesson_ids)
    except ValueError as e:
        return error_response(str(e), status_code=400)

    return success_response(
        data=[LessonResponse.model_validate(l).model_dump() for l in lessons],
        message="Порядок уроков обновлён",
    )


@router.patch("/{lesson_id}")
async def update_lesson(
    lesson_id: int,
    data: LessonUpdate,
    current_user=Depends(require_permission(Permission.LESSON_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = LessonService(uow)
    lesson = await service.get_by_id(lesson_id)
    if not lesson:
        return error_response("Урок не найден", status_code=404)

    await service.update_lesson(
        lesson,
        title=data.title,
        description=data.description,
        lesson_type=data.lesson_type,
        order_index=data.order_index,
        duration_minutes=data.duration_minutes,
        is_active=data.is_active,
        homework_title=data.homework_title,
        homework_description=data.homework_description,
        test=data.test.model_dump() if data.test else None,
        homework=data.homework.model_dump() if data.homework else None,
    )
    lesson = await service.get_by_id(lesson_id)
    return success_response(
        data=_lesson_detail_dict(lesson),
        message="Урок обновлён",
    )


@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: int,
    current_user=Depends(require_permission(Permission.LESSON_DELETE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = LessonService(uow)
    lesson = await service.get_by_id(lesson_id)
    if not lesson:
        return error_response("Урок не найден", status_code=404)

    await service.delete_lesson(lesson)
    return success_response(message="Урок удалён")


@router.post("/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: int,
    current_user=Depends(require_permission(Permission.LESSON_COMPLETE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ProgressService(uow)
    try:
        progress = await service.complete_lesson(current_user.id, lesson_id)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    return success_response(
        data=LessonProgressResponse.model_validate(progress).model_dump(),
        message="Урок завершён",
    )
