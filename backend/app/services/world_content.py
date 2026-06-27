"""Контент Foxinburg World: определения 6 миров (A1→C2) и идемпотентная
инициализация курсов-миров и ачивок. Используется как dev-сидером, так и
админ-эндпоинтом провижининга на проде (создаёт недостающее, не дублирует).
"""
from typing import List

from sqlalchemy import select

from app.models.course import Course, Module, Lesson
from app.models.achievement import Achievement
from app.models.organization import Organization
from app.models.user import User

# (cefr, название, тема-эмодзи, краткое описание)
WORLD_DEFINITIONS = [
    ("A1", "Лес Знакомств", "🌲", "Первые слова, приветствия и простые фразы. Старт пути."),
    ("A2", "Город Общения", "🏙️", "Повседневное общение: покупки, маршруты, рассказы о себе."),
    ("B1", "Королевство Уверенности", "🏰", "Свободные диалоги, мнения и истории в прошлом и будущем."),
    ("B2", "Академия Мастеров", "🎓", "Сложные тексты, аргументация и беглая речь."),
    ("C1", "Империя Свободного Английского", "👑", "Тонкости языка, идиомы и профессиональная лексика."),
    ("C2", "Лига Экспертов", "🏆", "Уровень носителя: нюансы, стиль и совершенство."),
]

# Уроки в каждом мире (тип урока определяет механику прохождения)
_LESSON_BLUEPRINT = [
    ("Знакомство с миром", "text"),
    ("Видео-урок", "video"),
    ("Практика и задания", "text"),
    ("Проверочный тест", "test"),
    ("Домашнее задание", "homework"),
]

WORLD_ACHIEVEMENTS = [
    ("Первый шаг", "Заверши первый урок", "lessons_completed", 1, 10, 5),
    ("Набираю обороты", "Заверши 5 уроков", "lessons_completed", 5, 50, 25),
    ("Знаток", "Заверши 20 уроков", "lessons_completed", 20, 150, 75),
    ("Тестировщик", "Пройди первый тест", "tests_passed", 1, 20, 10),
    ("Экзаменатор", "Пройди 10 тестов", "tests_passed", 10, 120, 60),
    ("Серия 3 дня", "Занимайся 3 дня подряд", "streak", 3, 30, 15),
    ("Серия 7 дней", "Занимайся неделю подряд", "streak", 7, 80, 40),
    ("Восходящая звезда", "Достигни 5 уровня", "level", 5, 100, 50),
]


async def ensure_world_courses(session) -> List[Course]:
    """Создаёт недостающие курсы-миры с модулями и уроками. Идемпотентно."""
    org_result = await session.execute(select(Organization).order_by(Organization.id))
    org = org_result.scalars().first()
    author_result = await session.execute(
        select(User).where(User.role.in_(["owner", "super_admin", "admin"])).order_by(User.id)
    )
    author = author_result.scalars().first()

    created: List[Course] = []
    for order, (cefr, title, theme, desc) in enumerate(WORLD_DEFINITIONS):
        existing = await session.execute(
            select(Course).where(Course.type == "student_world", Course.cefr_level == cefr)
        )
        if existing.scalars().first():
            continue

        course = Course(
            title=f"{theme} {title} ({cefr})",
            description=desc,
            short_description=desc,
            type="student_world",
            status="published",
            cefr_level=cefr,
            world_order=order,
            world_theme=theme,
            is_sequential=True,
            organization_id=org.id if org else None,
            author_id=author.id if author else None,
        )
        session.add(course)
        await session.flush()

        for module_idx in range(1, 3):
            module = Module(
                title=f"Глава {module_idx}",
                course_id=course.id,
                order_index=module_idx,
            )
            session.add(module)
            await session.flush()
            for lesson_idx, (lesson_title, lesson_type) in enumerate(_LESSON_BLUEPRINT, start=1):
                lesson = Lesson(
                    title=f"{lesson_title}",
                    description=f"{title}: {lesson_title}",
                    module_id=module.id,
                    order_index=lesson_idx,
                    lesson_type=lesson_type,
                )
                if lesson_type == "homework":
                    lesson.homework_title = lesson_title
                    lesson.homework_description = "Выполни задание и отправь на проверку."
                session.add(lesson)
        created.append(course)

    await session.flush()
    return created


async def ensure_world_achievements(session) -> int:
    """Создаёт недостающие ачивки (по совпадению title). Идемпотентно."""
    existing_result = await session.execute(select(Achievement.title))
    existing_titles = set(existing_result.scalars().all())

    created = 0
    for title, desc, ctype, cvalue, xp, coins in WORLD_ACHIEVEMENTS:
        if title in existing_titles:
            continue
        session.add(Achievement(
            title=title,
            description=desc,
            condition_type=ctype,
            condition_value=cvalue,
            xp_reward=xp,
            coins_reward=coins,
        ))
        created += 1
    await session.flush()
    return created
