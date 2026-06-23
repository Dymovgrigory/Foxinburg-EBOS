from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.survey import Survey, SurveyQuestion, SurveyResponse, SurveyAnswer
from app.models.user import User
from app.schemas.survey import (
    SurveyCreate,
    SurveyUpdate,
    SurveyResponse as SurveyResponseSchema,
    SurveyListResponse,
    SurveySubmit,
)
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission

router = APIRouter(prefix="/surveys", tags=["surveys"])


def _serialize_questions(questions):
    return [
        {
            "id": q.id,
            "text": q.text,
            "type": q.type,
            "options": q.options or [],
            "order": q.order,
        }
        for q in sorted(questions, key=lambda x: x.order)
    ]


@router.get("")
async def list_surveys(
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Survey, func.count(SurveyResponse.id).label("responses_count"))
        .outerjoin(SurveyResponse, SurveyResponse.survey_id == Survey.id)
        .group_by(Survey.id)
        .order_by(Survey.created_at.desc())
    )
    rows = result.all()
    data = []
    for survey, count in rows:
        item = SurveyListResponse.model_validate(survey).model_dump()
        item["responses_count"] = count
        data.append(item)
    return success_response(data=data, message="Список опросов")


@router.get("/{survey_id}")
async def get_survey(
    survey_id: int,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Survey)
        .where(Survey.id == survey_id)
        .options(selectinload(Survey.questions))
    )
    survey = result.scalar_one_or_none()
    if not survey:
        return error_response("Опрос не найден", status_code=404)
    data = SurveyResponseSchema.model_validate(survey).model_dump()
    data["questions"] = _serialize_questions(survey.questions)
    return success_response(data=data)


@router.post("")
async def create_survey(
    data: SurveyCreate,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    survey = Survey(
        title=data.title,
        description=data.description,
        is_active=data.is_active,
        target_roles=data.target_roles,
        anonymous=data.anonymous,
        created_by_id=current_user.id,
    )
    db.add(survey)
    await db.flush()
    for q in data.questions:
        db.add(SurveyQuestion(survey_id=survey.id, **q.model_dump()))
    await db.commit()
    await db.refresh(survey)
    result = await db.execute(
        select(Survey).where(Survey.id == survey.id).options(selectinload(Survey.questions))
    )
    survey = result.scalar_one()
    data = SurveyResponseSchema.model_validate(survey).model_dump()
    data["questions"] = _serialize_questions(survey.questions)
    return success_response(data=data, message="Опрос создан", status_code=201)


@router.patch("/{survey_id}")
async def update_survey(
    survey_id: int,
    data: SurveyUpdate,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id).options(selectinload(Survey.questions))
    )
    survey = result.scalar_one_or_none()
    if not survey:
        return error_response("Опрос не найден", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(survey, field, value)
    await db.commit()
    await db.refresh(survey)
    resp = SurveyResponseSchema.model_validate(survey).model_dump()
    resp["questions"] = _serialize_questions(survey.questions)
    return success_response(data=resp, message="Опрос обновлен")


@router.delete("/{survey_id}")
async def delete_survey(
    survey_id: int,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Survey).where(Survey.id == survey_id))
    survey = result.scalar_one_or_none()
    if not survey:
        return error_response("Опрос не найден", status_code=404)
    await db.delete(survey)
    await db.commit()
    return success_response(message="Опрос удален")


@router.post("/{survey_id}/responses")
async def submit_response(
    survey_id: int,
    data: SurveySubmit,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id).options(selectinload(Survey.questions))
    )
    survey = result.scalar_one_or_none()
    if not survey or not survey.is_active:
        return error_response("Опрос не найден или неактивен", status_code=404)

    response = SurveyResponse(
        survey_id=survey_id,
        respondent_id=None if survey.anonymous else current_user.id,
    )
    db.add(response)
    await db.flush()
    for answer in data.answers:
        db.add(
            SurveyAnswer(
                response_id=response.id,
                question_id=answer.question_id,
                value=answer.value,
            )
        )
    await db.commit()
    return success_response(message="Ответ сохранен", status_code=201)


@router.get("/{survey_id}/results")
async def survey_results(
    survey_id: int,
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Survey)
        .where(Survey.id == survey_id)
        .options(selectinload(Survey.questions), selectinload(Survey.responses).selectinload(SurveyResponse.answers))
    )
    survey = result.scalar_one_or_none()
    if not survey:
        return error_response("Опрос не найден", status_code=404)

    questions = {q.id: q for q in survey.questions}
    stats = []
    for q in sorted(survey.questions, key=lambda x: x.order):
        counts = {}
        for resp in survey.responses:
            for ans in resp.answers:
                if ans.question_id == q.id:
                    counts[ans.value] = counts.get(ans.value, 0) + 1
        stats.append({"question": q.text, "type": q.type, "counts": counts})

    return success_response(
        data={
            "survey": {"id": survey.id, "title": survey.title},
            "total_responses": len(survey.responses),
            "statistics": stats,
        },
        message="Результаты опроса",
    )
