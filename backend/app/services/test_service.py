import datetime
import json
from typing import Optional
from sqlalchemy import select

from app.models.test import Test, TestQuestion, TestAttempt
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.utils import utc_now


class TestService(BaseService[Test]):
    model = Test

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_attempt_by_id(self, attempt_id: int) -> Optional[TestAttempt]:
        result = await self.uow.session.execute(
            select(TestAttempt).where(TestAttempt.id == attempt_id)
        )
        return result.scalar_one_or_none()

    async def score_attempt(self, attempt_id: int) -> TestAttempt:
        """Проверяет попытку теста, выставляет score/is_passed и, при успехе, завершает урок."""
        attempt = await self.get_attempt_by_id(attempt_id)
        if not attempt:
            raise ValueError("Попытка не найдена")

        test = await self.uow.session.get(Test, attempt.test_id)
        if not test:
            raise ValueError("Тест не найден")

        questions_result = await self.uow.session.execute(
            select(TestQuestion).where(TestQuestion.test_id == test.id).order_by(TestQuestion.order_index)
        )
        questions = list(questions_result.scalars().all())

        answers = self._load_json(attempt.answers)
        if not isinstance(answers, dict):
            answers = {}

        score = 0
        max_score = 0
        for question in questions:
            max_score += question.points or 1
            if self._is_answer_correct(question, answers.get(str(question.id))):
                score += question.points or 1

        attempt.score = score
        attempt.max_score = max_score
        attempt.finished_at = utc_now()

        passing_score = test.passing_score or 70
        attempt.is_passed = (score / max_score * 100) >= passing_score if max_score > 0 else False

        await self.uow.session.flush()
        await self.uow.session.refresh(attempt)

        if attempt.is_passed:
            from app.services.progress_service import ProgressService
            progress_service = ProgressService(self.uow)
            try:
                await progress_service.complete_lesson(attempt.student_id, test.lesson_id)
            except ValueError:
                # Урок уже завершён или не может быть завершён — не критично
                pass

        return attempt

    def _load_json(self, value: Optional[str]) -> Optional[dict]:
        if not value:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None

    def _is_answer_correct(self, question: TestQuestion, student_answer) -> bool:
        correct = self._load_json(question.correct_answers)
        q_type = question.question_type or "single"

        if q_type == "single":
            correct_val = correct[0] if isinstance(correct, list) and correct else correct
            return str(student_answer).strip().lower() == str(correct_val).strip().lower()

        if q_type == "multiple":
            if not isinstance(student_answer, list) or not isinstance(correct, list):
                return False
            return set(str(a).strip().lower() for a in student_answer) == set(
                str(c).strip().lower() for c in correct
            )

        if q_type == "text":
            correct_val = correct[0] if isinstance(correct, list) and correct else correct
            return str(student_answer).strip().lower() == str(correct_val).strip().lower()

        # match и прочие типы пока не скорятся автоматически
        return False
