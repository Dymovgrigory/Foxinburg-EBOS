import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.course import Course, Module, Lesson, LessonContent
from app.models.enrollment import Enrollment, LessonProgress
from app.models.homework import Homework
from app.models.test import Test, TestAttempt
from app.models.user import User
from app.services.enrollment_service import EnrollmentService
from app.services.progress_service import ProgressService
from app.services.unit_of_work import UnitOfWork
from app.services.yandex_disk_service import YandexDiskService
from app.core.events import EventBus, SystemEventType


ACADEMY_COURSE_TITLE = "Академия педагогов"
ACADEMY_COURSE_TYPE = "teacher_academy"


class TeacherAcademyService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.disk = YandexDiskService()

    async def sync_from_yandex_disk(self) -> Course:
        if not settings.YANDEX_DISK_PUBLIC_FOLDER:
            raise ValueError("YANDEX_DISK_PUBLIC_FOLDER должна быть задана")

        course = await self._get_or_create_course()
        modules_data = await self.disk.list_modules()

        for order, module_data in enumerate(modules_data, start=1):
            module = await self._get_or_create_module(course, module_data["name"], order)
            lesson = await self._get_or_create_lesson(module, f"Материалы: {module_data['name']}")
            files = await self.disk.list_module_files(module_data["path"])
            await self._sync_lesson_contents(lesson, files)

        course.last_sync_at = datetime.datetime.utcnow()
        await self.uow.commit()
        return await self._load_course_with_contents(course.id)

    async def _load_course_with_contents(self, course_id: int) -> Optional[Course]:
        result = await self.uow.session.execute(
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.modules)
                .selectinload(Module.lessons)
                .selectinload(Lesson.contents)
            )
        )
        return result.scalar_one_or_none()

    async def get_academy_course(self) -> Optional[Course]:
        result = await self.uow.session.execute(
            select(Course)
            .where(Course.type == ACADEMY_COURSE_TYPE)
            .options(
                selectinload(Course.modules)
                .selectinload(Module.lessons)
                .selectinload(Lesson.contents)
            )
        )
        return result.scalar_one_or_none()

    async def enroll_teacher(self, student_id: int, assigned_by_id: int) -> Enrollment:
        course = await self.get_academy_course()
        if not course:
            raise ValueError("Курс Академии педагогов не найден. Сначала выполните синхронизацию.")

        enrollment_service = EnrollmentService(self.uow)
        existing = await enrollment_service.get_by_student_and_course(student_id, course.id)
        if existing and existing.status == "active":
            raise ValueError("Педагог уже зачислен на Академию")

        enrollment = Enrollment(
            student_id=student_id,
            course_id=course.id,
            status="active",
            progress_percent=0,
            assigned_by_id=assigned_by_id,
            assigned_at=datetime.datetime.utcnow(),
            enrolled_at=datetime.datetime.utcnow(),
        )
        await enrollment_service.add(enrollment)
        await self.uow.session.flush()

        progress_service = ProgressService(self.uow)
        await progress_service.create_progress_for_enrollment(enrollment.id)

        await EventBus.publish(
            self.uow,
            SystemEventType.COURSE_ENROLLED,
            {
                "enrollment_id": enrollment.id,
                "student_id": student_id,
                "course_id": course.id,
            },
            user_id=assigned_by_id,
        )

        await self.uow.commit()
        await self.uow.session.refresh(enrollment)
        return enrollment

    async def get_teacher_progress(self, student_id: int) -> Optional[Enrollment]:
        course = await self.get_academy_course()
        if not course:
            return None
        result = await self.uow.session.execute(
            select(Enrollment)
            .where(Enrollment.student_id == student_id, Enrollment.course_id == course.id)
            .options(
                selectinload(Enrollment.course)
                .selectinload(Course.modules)
                .selectinload(Module.lessons)
                .selectinload(Lesson.contents),
                selectinload(Enrollment.student),
            )
            .order_by(Enrollment.enrolled_at.desc())
        )
        return result.scalar_one_or_none()

    async def ensure_teacher_enrolled(self, student_id: int, assigned_by_id: int) -> Enrollment:
        course = await self.get_academy_course()
        if not course:
            raise ValueError("Курс Академии педагогов не найден. Сначала выполните синхронизацию.")
        enrollment = await self.get_teacher_progress(student_id)
        if enrollment:
            return enrollment
        return await self.enroll_teacher(student_id, assigned_by_id)

    async def complete_module(self, student_id: int, module_id: int) -> LessonProgress:
        result = await self.uow.session.execute(
            select(Module)
            .where(Module.id == module_id)
            .options(selectinload(Module.course), selectinload(Module.lessons))
        )
        module = result.scalar_one_or_none()
        if not module:
            raise ValueError("Модуль не найден")

        if module.course.type != ACADEMY_COURSE_TYPE:
            raise ValueError("Модуль не относится к Академии педагогов")

        lesson = module.lessons[0] if module.lessons else None
        if not lesson:
            raise ValueError("В модуле отсутствуют уроки")

        progress_result = await self.uow.session.execute(
            select(LessonProgress)
            .where(LessonProgress.student_id == student_id, LessonProgress.lesson_id == lesson.id)
            .options(selectinload(LessonProgress.lesson))
        )
        progress = progress_result.scalar_one_or_none()
        if not progress:
            raise ValueError("Прогресс не найден. Обратитесь к методисту.")
        if progress.status == "locked":
            raise ValueError("Модуль заблокирован. Пройдите предыдущие модули.")
        if progress.status == "completed":
            return progress

        await self._ensure_tests_passed(student_id, lesson.id)
        await self._ensure_homeworks_approved(student_id, lesson.id)

        progress_service = ProgressService(self.uow)
        await progress_service.complete_lesson(student_id, lesson.id)
        await self.uow.commit()
        await self.uow.session.refresh(progress)
        return progress

    async def _ensure_tests_passed(self, student_id: int, lesson_id: int) -> None:
        result = await self.uow.session.execute(
            select(Test).where(Test.lesson_id == lesson_id, Test.is_active == True)
        )
        tests = result.scalars().all()
        if not tests:
            return
        for test in tests:
            attempts_result = await self.uow.session.execute(
                select(TestAttempt)
                .where(TestAttempt.test_id == test.id, TestAttempt.student_id == student_id)
                .order_by(TestAttempt.started_at.desc())
            )
            latest = attempts_result.scalars().first()
            if not latest or not latest.is_passed:
                raise ValueError(f"Необходимо пройти тест «{test.title}»")

    async def _ensure_homeworks_approved(self, student_id: int, lesson_id: int) -> None:
        result = await self.uow.session.execute(
            select(Homework).where(Homework.lesson_id == lesson_id, Homework.student_id == student_id)
        )
        homeworks = result.scalars().all()
        if not homeworks:
            return
        for hw in homeworks:
            if hw.status != "reviewed":
                raise ValueError("Домашнее задание ещё не проверено методистом")
            latest_review = await self.uow.session.execute(
                select(HomeworkReview)
                .where(HomeworkReview.homework_id == hw.id)
                .order_by(HomeworkReview.created_at.desc())
            )
            review = latest_review.scalars().first()
            if not review or review.status != "approved":
                raise ValueError("Домашнее задание требует доработки или не принято")

    async def _get_or_create_course(self) -> Course:
        result = await self.uow.session.execute(
            select(Course).where(Course.type == ACADEMY_COURSE_TYPE)
        )
        course = result.scalar_one_or_none()
        if not course:
            course = Course(
                title=ACADEMY_COURSE_TITLE,
                description="Курс обучения педагогов FOXINBURG",
                type=ACADEMY_COURSE_TYPE,
                status="published",
                is_sequential=True,
                certificate_enabled=True,
                yandex_disk_public_key=settings.YANDEX_DISK_PUBLIC_FOLDER,
            )
            self.uow.session.add(course)
            await self.uow.session.flush()
        course.yandex_disk_public_key = settings.YANDEX_DISK_PUBLIC_FOLDER
        return course

    async def _get_or_create_module(self, course: Course, title: str, order_index: int) -> Module:
        result = await self.uow.session.execute(
            select(Module).where(Module.course_id == course.id, Module.title == title)
        )
        module = result.scalar_one_or_none()
        if not module:
            module = Module(
                title=title,
                course_id=course.id,
                order_index=order_index,
                is_active=True,
            )
            self.uow.session.add(module)
            await self.uow.session.flush()
        module.order_index = order_index
        return module

    async def _get_or_create_lesson(self, module: Module, title: str) -> Lesson:
        result = await self.uow.session.execute(
            select(Lesson).where(Lesson.module_id == module.id).order_by(Lesson.order_index)
        )
        lesson = result.scalars().first()
        if not lesson:
            lesson = Lesson(
                title=title,
                module_id=module.id,
                order_index=1,
                lesson_type="mixed",
                duration_minutes=30,
                is_active=True,
            )
            self.uow.session.add(lesson)
            await self.uow.session.flush()
        return lesson

    async def _sync_lesson_contents(self, lesson: Lesson, files: list) -> None:
        existing_result = await self.uow.session.execute(
            select(LessonContent).where(LessonContent.lesson_id == lesson.id)
        )
        existing = list(existing_result.scalars().all())

        new_by_path = {f.path: f for f in files if f.path}
        new_by_title = {f.name: f for f in files}
        existing_by_path = {c.yandex_disk_path: c for c in existing if c.yandex_disk_path}
        # Материалы, созданные до появления yandex_disk_path, сопоставляем по названию
        existing_by_title = {c.title: c for c in existing if not c.yandex_disk_path}

        # Удаляем материалы, которых больше нет на Яндекс.Диске
        for content in existing:
            key = content.yandex_disk_path or content.title
            lookup = new_by_path if content.yandex_disk_path else new_by_title
            if key not in lookup:
                await self.uow.session.delete(content)

        for order, file in enumerate(files, start=1):
            content = existing_by_path.get(file.path) or existing_by_title.get(file.name)
            if not content:
                content = LessonContent(lesson_id=lesson.id)
                self.uow.session.add(content)

            content.content_type = self.disk.detect_content_type(file.mime_type, file.name)
            content.title = file.name
            content.file_url = file.file_url or file.public_url
            content.external_url = file.preview
            content.body = file.md5
            content.order_index = order
            content.yandex_disk_path = file.path
            content.yandex_disk_md5 = file.md5
            content.file_size = file.size
