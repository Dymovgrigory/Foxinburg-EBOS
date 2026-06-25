import datetime
import json
from typing import List, Optional

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.course import Course, Module, Lesson, LessonContent
from app.models.enrollment import Enrollment, LessonProgress
from app.models.homework import Homework
from app.models.test import Test, TestQuestion
from app.models.user import User
from app.services.docx_parser import parse_homework_docx, parse_test_docx
from app.services.enrollment_service import EnrollmentService
from app.services.progress_service import ProgressService
from app.services.unit_of_work import UnitOfWork
from app.services.yandex_disk_service import YandexDiskService
from app.core.events import EventBus, SystemEventType
from app.utils import utc_now


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
            files = await self.disk.list_module_files(module_data["path"])
            materials, homeworks, tests = self._classify_files(files)

            lessons = await self._ensure_module_lessons(module, module_data["name"])

            await self._sync_lesson_contents(lessons["mixed"], materials)
            if homeworks:
                await self._sync_lesson_contents(lessons["homework"], homeworks)
                await self._sync_homework_lesson(lessons["homework"], homeworks)
            elif lessons.get("homework"):
                await self._sync_lesson_contents(lessons["homework"], [])
            if tests:
                await self._sync_lesson_contents(lessons["test"], tests)
                await self._sync_test_lesson(lessons["test"], tests)
            elif lessons.get("test"):
                await self._sync_lesson_contents(lessons["test"], [])

        course.last_sync_at = utc_now()
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
            assigned_at=utc_now(),
            enrolled_at=utc_now(),
        )
        await enrollment_service.add(enrollment)
        await self.uow.session.flush()

        progress_service = ProgressService(self.uow)
        await progress_service.create_progress_for_enrollment(enrollment.id)
        await self._ensure_homeworks_for_enrollment(student_id, course.id)

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
            await self._ensure_homeworks_for_enrollment(student_id, course.id)
            progress_service = ProgressService(self.uow)
            await progress_service.ensure_progress_records_for_enrollment(enrollment.id)
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

        if not module.lessons:
            raise ValueError("В модуле отсутствуют уроки")

        enrollment_result = await self.uow.session.execute(
            select(Enrollment)
            .where(Enrollment.student_id == student_id, Enrollment.course_id == module.course.id)
        )
        enrollment = enrollment_result.scalar_one_or_none()
        if not enrollment:
            raise ValueError("Вы не зачислены на курс")

        progress_service = ProgressService(self.uow)
        await progress_service.ensure_progress_records_for_enrollment(enrollment.id)

        lessons = sorted(module.lessons, key=lambda l: l.order_index)
        lesson_ids = [lesson.id for lesson in lessons]
        progress_result = await self.uow.session.execute(
            select(LessonProgress)
            .where(
                LessonProgress.enrollment_id == enrollment.id,
                LessonProgress.lesson_id.in_(lesson_ids),
            )
            .options(selectinload(LessonProgress.lesson))
        )
        progress_by_lesson = {p.lesson_id: p for p in progress_result.scalars().all()}

        last_progress: Optional[LessonProgress] = None
        for lesson in lessons:
            progress = progress_by_lesson.get(lesson.id)
            if not progress:
                raise ValueError(f"Прогресс урока «{lesson.title}» не найден")
            # В Академии завершение модуля разблокирует и отмечает все его уроки,
            # чтобы тесты и домашние задания не останавливали прохождение.
            if progress.status == "locked":
                progress.status = "available"
            if progress.status != "completed":
                progress.status = "completed"
                progress.completed_at = utc_now()
                await self.uow.session.flush()
            last_progress = progress

        if last_progress is None:
            raise ValueError("Прогресс не найден. Обратитесь к методисту.")

        await progress_service._update_enrollment_progress(enrollment.id)

        # Разблокируем следующий урок, если курс последовательный
        if module.course.is_sequential:
            next_lesson = await progress_service._get_next_lesson(last_progress.lesson, module.course)
            if next_lesson:
                await progress_service._unlock_lesson(enrollment.id, next_lesson.id)

        await self.uow.commit()
        await self.uow.session.refresh(last_progress)
        return last_progress

    async def _ensure_homeworks_for_enrollment(self, student_id: int, course_id: int) -> None:
        result = await self.uow.session.execute(
            select(Course)
            .where(Course.id == course_id)
            .options(selectinload(Course.modules).selectinload(Module.lessons))
        )
        course = result.scalar_one_or_none()
        if not course:
            return

        existing_result = await self.uow.session.execute(
            select(Homework).where(Homework.student_id == student_id)
        )
        existing_lesson_ids = {hw.lesson_id for hw in existing_result.scalars().all()}

        for module in course.modules:
            for lesson in module.lessons:
                if lesson.lesson_type != "homework" or lesson.id in existing_lesson_ids:
                    continue
                # Не создаём пустые записи ДЗ для уроков без материалов и описания
                has_content = bool(
                    lesson.homework_title
                    or lesson.homework_description
                    or lesson.contents
                )
                if not has_content:
                    continue
                self.uow.session.add(
                    Homework(
                        lesson_id=lesson.id,
                        student_id=student_id,
                        title=lesson.homework_title or lesson.title,
                        description=lesson.homework_description,
                        status="assigned",
                    )
                )

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

    def _classify_files(self, files: list) -> tuple[list, list, list]:
        """Разделяет файлы модуля на материалы, домашние задания и тесты.

        Учитывает как имя файла, так и название родительской папки, чтобы
        корректно обрабатывать подпапки с тестами и домашними заданиями.
        """
        materials = []
        homeworks = []
        tests = []
        for file in files:
            path_parts = [part.lower() for part in file.path.split("/")]
            name_lower = file.name.lower()

            is_test = (
                any("тестовое задание" in part for part in path_parts)
                or any(part == "тест" or part.startswith("тест ") or "тесты" in part for part in path_parts)
                or "тест" in name_lower
            )
            is_homework = (
                any("домашнее задание" in part for part in path_parts)
                or any(part == "дз" or part.startswith("дз ") for part in path_parts)
                or "домашнее задание" in name_lower
                or name_lower.startswith("дз")
            )

            if is_test:
                tests.append(file)
            elif is_homework:
                homeworks.append(file)
            else:
                materials.append(file)
        return materials, homeworks, tests

    async def _ensure_module_lessons(self, module: Module, module_name: str) -> dict[str, Lesson]:
        """Возвращает или создаёт уроки материалов, домашки и теста для модуля."""
        result = await self.uow.session.execute(
            select(Lesson).where(Lesson.module_id == module.id)
        )
        existing = {lesson.lesson_type: lesson for lesson in result.scalars().all()}
        lessons: dict[str, Lesson] = {}

        type_configs = [
            ("mixed", f"Материалы: {module_name}", 1),
            ("homework", f"Домашнее задание: {module_name}", 2),
            ("test", f"Тест: {module_name}", 3),
        ]

        for lesson_type, title, order_index in type_configs:
            lesson = existing.get(lesson_type)
            if not lesson:
                lesson = Lesson(
                    title=title,
                    module_id=module.id,
                    order_index=order_index,
                    lesson_type=lesson_type,
                    duration_minutes=30,
                    is_active=True,
                )
                self.uow.session.add(lesson)
                await self.uow.session.flush()
            lesson.title = title
            lesson.order_index = order_index
            lessons[lesson_type] = lesson

        return lessons

    async def _download_file_bytes(self, file) -> bytes:
        """Скачивает файл по прямой ссылке Яндекс.Диска."""
        url = file.file_url or file.public_url
        if not url:
            url = await self.disk.get_download_url(file.path)
        if not url:
            return b""
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content

    async def _sync_test_lesson(self, lesson: Lesson, test_files: list) -> None:
        """Создаёт или обновляет интерактивный тест урока на основе docx-файлов."""
        all_questions: List[dict] = []
        for order, file in enumerate(test_files, start=1):
            if not file.name.lower().endswith(".docx"):
                continue
            try:
                content = await self._download_file_bytes(file)
                parsed = parse_test_docx(content, title=file.name.replace(".docx", ""))
                if not parsed:
                    continue
                all_questions.extend(parsed["questions"])
            except Exception:
                # Не ломаем синхронизацию, если один файл не распарсился
                continue

        if not all_questions:
            return

        for idx, q in enumerate(all_questions, start=1):
            q["order_index"] = idx

        result = await self.uow.session.execute(
            select(Test).where(Test.lesson_id == lesson.id)
        )
        test = result.scalar_one_or_none()
        if not test:
            test = Test(
                lesson_id=lesson.id,
                title=lesson.title,
                passing_score=0,
                max_attempts=3,
                is_active=True,
            )
            self.uow.session.add(test)
            await self.uow.session.flush()
        else:
            # Полностью обновляем вопросы при повторной синхронизации
            await self.uow.session.execute(
                delete(TestQuestion).where(TestQuestion.test_id == test.id)
            )
            await self.uow.session.flush()

        for q in all_questions:
            self.uow.session.add(
                TestQuestion(
                    test_id=test.id,
                    question_text=q["question_text"],
                    question_type=q["question_type"],
                    options=q["options"],
                    correct_answers=q["correct_answers"],
                    points=q["points"],
                    order_index=q["order_index"],
                )
            )
        await self.uow.session.flush()

    async def _sync_homework_lesson(self, lesson: Lesson, homework_files: list) -> None:
        """Заполняет шаблон домашнего задания из первого docx-файла."""
        for file in homework_files:
            if not file.name.lower().endswith(".docx"):
                continue
            try:
                content = await self._download_file_bytes(file)
                parsed = parse_homework_docx(content)
                if parsed["description"]:
                    lesson.homework_title = parsed["title"] or file.name.replace(".docx", "")
                    lesson.homework_description = parsed["description"]
                    await self.uow.session.flush()
                break
            except Exception:
                continue

    async def _sync_lesson_contents(self, lesson: Lesson, files: list) -> None:
        existing_result = await self.uow.session.execute(
            select(LessonContent).where(LessonContent.lesson_id == lesson.id)
        )
        existing = list(existing_result.scalars().all())

        # Сначала убираем дубли, которые могли появиться из-за race condition
        # или старой логики синхронизации. Оставляем запись с наименьшим id,
        # предпочитая строки с yandex_disk_path.
        existing_by_path: dict[str, LessonContent] = {}
        existing_by_title: dict[str, LessonContent] = {}
        kept_titles: set[str] = set()
        dedup_delete: list[LessonContent] = []
        for content in sorted(existing, key=lambda c: (c.yandex_disk_path is None, c.id)):
            if content.yandex_disk_path:
                if content.yandex_disk_path in existing_by_path:
                    dedup_delete.append(content)
                    continue
                existing_by_path[content.yandex_disk_path] = content
                if content.title:
                    kept_titles.add(content.title)
            else:
                if content.title in kept_titles or content.title in existing_by_title:
                    dedup_delete.append(content)
                    continue
                existing_by_title[content.title] = content

        for content in dedup_delete:
            await self.uow.session.delete(content)

        new_by_path = {f.path: f for f in files if f.path}
        new_by_title = {f.name: f for f in files}

        # Удаляем материалы, которых больше нет на Яндекс.Диске
        for content in list(existing_by_path.values()) + list(existing_by_title.values()):
            key = content.yandex_disk_path or content.title
            lookup = new_by_path if content.yandex_disk_path else new_by_title
            if key not in lookup:
                await self.uow.session.delete(content)
                if content.yandex_disk_path:
                    existing_by_path.pop(content.yandex_disk_path, None)
                else:
                    existing_by_title.pop(content.title, None)

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
