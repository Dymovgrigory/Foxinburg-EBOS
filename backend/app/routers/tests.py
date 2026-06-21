from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test import Test, TestQuestion, TestAttempt
from app.schemas.test import (
    TestCreate,
    TestUpdate,
    TestResponse,
    TestQuestionCreate,
    TestQuestionUpdate,
    TestQuestionResponse,
    TestAttemptCreate,
    TestAttemptUpdate,
    TestAttemptResponse,
)
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.test_service import TestService

router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("")
async def list_tests(
    lesson_id: Optional[int] = None,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Test)
    if lesson_id:
        query = query.where(Test.lesson_id == lesson_id)
    result = await db.execute(query.order_by(Test.created_at.desc()))
    tests = result.scalars().all()
    return success_response(
        data=[TestResponse.model_validate(t).model_dump() for t in tests],
        message="Список тестов",
    )


@router.post("")
async def create_test(
    data: TestCreate,
    current_user=Depends(require_permission(Permission.LESSON_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    test = Test(**data.model_dump())
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return success_response(
        data=TestResponse.model_validate(test).model_dump(),
        message="Тест создан",
        status_code=201,
    )


@router.get("/{test_id}")
async def get_test(
    test_id: int,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    test = await db.get(Test, test_id)
    if not test:
        return error_response("Тест не найден", status_code=404)
    data = TestResponse.model_validate(test).model_dump()
    data["questions"] = [TestQuestionResponse.model_validate(q).model_dump() for q in test.questions]
    return success_response(data=data)


@router.patch("/{test_id}")
async def update_test(
    test_id: int,
    data: TestUpdate,
    current_user=Depends(require_permission(Permission.LESSON_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    test = await db.get(Test, test_id)
    if not test:
        return error_response("Тест не найден", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(test, field, value)
    await db.commit()
    await db.refresh(test)
    return success_response(data=TestResponse.model_validate(test).model_dump(), message="Тест обновлён")


@router.delete("/{test_id}")
async def delete_test(
    test_id: int,
    current_user=Depends(require_permission(Permission.LESSON_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    test = await db.get(Test, test_id)
    if not test:
        return error_response("Тест не найден", status_code=404)
    await db.delete(test)
    await db.commit()
    return success_response(message="Тест удалён")


@router.get("/{test_id}/questions")
async def list_questions(
    test_id: int,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TestQuestion).where(TestQuestion.test_id == test_id).order_by(TestQuestion.order_index)
    )
    questions = result.scalars().all()
    return success_response(
        data=[TestQuestionResponse.model_validate(q).model_dump() for q in questions],
        message="Список вопросов",
    )


@router.post("/{test_id}/questions")
async def create_question(
    test_id: int,
    data: TestQuestionCreate,
    current_user=Depends(require_permission(Permission.LESSON_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    question = TestQuestion(test_id=test_id, **data.model_dump(exclude={"test_id"}))
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return success_response(
        data=TestQuestionResponse.model_validate(question).model_dump(),
        message="Вопрос добавлен",
        status_code=201,
    )


@router.patch("/{test_id}/questions/{question_id}")
async def update_question(
    test_id: int,
    question_id: int,
    data: TestQuestionUpdate,
    current_user=Depends(require_permission(Permission.LESSON_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TestQuestion).where(TestQuestion.id == question_id, TestQuestion.test_id == test_id))
    question = result.scalar_one_or_none()
    if not question:
        return error_response("Вопрос не найден", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(question, field, value)
    await db.commit()
    await db.refresh(question)
    return success_response(data=TestQuestionResponse.model_validate(question).model_dump(), message="Вопрос обновлён")


@router.delete("/{test_id}/questions/{question_id}")
async def delete_question(
    test_id: int,
    question_id: int,
    current_user=Depends(require_permission(Permission.LESSON_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TestQuestion).where(TestQuestion.id == question_id, TestQuestion.test_id == test_id))
    question = result.scalar_one_or_none()
    if not question:
        return error_response("Вопрос не найден", status_code=404)
    await db.delete(question)
    await db.commit()
    return success_response(message="Вопрос удалён")


@router.get("/{test_id}/attempts")
async def list_attempts(
    test_id: int,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TestAttempt).where(TestAttempt.test_id == test_id).order_by(TestAttempt.started_at.desc())
    )
    attempts = result.scalars().all()
    return success_response(
        data=[TestAttemptResponse.model_validate(a).model_dump() for a in attempts],
        message="Список попыток",
    )


@router.post("/{test_id}/attempts")
async def create_attempt(
    test_id: int,
    data: TestAttemptCreate,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    attempt = TestAttempt(test_id=test_id, student_id=current_user.id, **data.model_dump())
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return success_response(
        data=TestAttemptResponse.model_validate(attempt).model_dump(),
        message="Попытка начата",
        status_code=201,
    )


@router.patch("/{test_id}/attempts/{attempt_id}")
async def update_attempt(
    test_id: int,
    attempt_id: int,
    data: TestAttemptUpdate,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TestAttempt).where(TestAttempt.id == attempt_id, TestAttempt.test_id == test_id)
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        return error_response("Попытка не найдена", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(attempt, field, value)
    await db.commit()
    await db.refresh(attempt)
    return success_response(data=TestAttemptResponse.model_validate(attempt).model_dump(), message="Попытка обновлена")


@router.post("/{test_id}/attempts/{attempt_id}/submit")
async def submit_attempt(
    test_id: int,
    attempt_id: int,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Завершает попытку теста: автоматически считает баллы и, при прохождении, завершает урок."""
    service = TestService(uow)
    attempt = await service.get_attempt_by_id(attempt_id)
    if not attempt or attempt.test_id != test_id:
        return error_response("Попытка не найдена", status_code=404)
    if attempt.student_id != current_user.id:
        return error_response("Можно отправлять только свои попытки", status_code=403)

    try:
        scored = await service.score_attempt(attempt_id)
    except ValueError as e:
        return error_response(str(e), status_code=400)

    message = "Тест пройден" if scored.is_passed else "Тест не пройден"
    return success_response(
        data=TestAttemptResponse.model_validate(scored).model_dump(),
        message=message,
    )
