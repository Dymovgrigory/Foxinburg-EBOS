from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from sqlalchemy.orm import selectinload

from app.models import (
    User, Organization, Branch, Course, Module, Lesson, LessonContent,
    Group, Enrollment, LessonProgress, Achievement, UserAchievement,
    SystemEvent, AuditLog, Notification, Lead, Deal, Payment, Transaction,
    Homework, HomeworkReview, Test, TestQuestion, TestAttempt, File,
)
from app.core.security import get_password_hash


async def clear_all(db: AsyncSession):
    """Очистка всех таблиц (осторожно!)."""
    for model in [
        # Прогресс и зависимые от уроков/зачислений
        LessonProgress,
        HomeworkReview, Homework,
        TestAttempt, TestQuestion, Test,
        LessonContent,
        # CRM и финансы
        Transaction, Payment, Deal, Lead,
        # Зачисления и группы
        Enrollment,
        UserAchievement,
        Notification, AuditLog, SystemEvent, File,
    ]:
        await db.execute(delete(model))

    # Обнуляем group_id перед удалением групп, чтобы не ловить FK-циклы users <-> groups
    await db.execute(text("UPDATE users SET group_id = NULL"))

    for model in [Group, Lesson, Module, Course, User, Branch, Organization]:
        await db.execute(delete(model))

    await db.commit()


async def seed_all(db: AsyncSession):
    """Заполнение тестовыми данными."""
    await seed_organizations(db)
    await seed_users(db)
    await seed_courses(db)
    await seed_groups(db)
    await seed_enrollments(db)
    await seed_achievements(db)
    await seed_crm(db)
    await seed_finance(db)
    await db.commit()


async def seed_organizations(db: AsyncSession):
    org = Organization(
        name="Языковая школа Фоксинбург",
        description="Образовательная экосистема для изучения английского языка",
        timezone="Europe/Moscow",
        currency="RUB",
    )
    db.add(org)
    await db.flush()

    branch = Branch(
        name="Главный филиал",
        address="г. Санкт-Петербург",
        organization_id=org.id,
    )
    db.add(branch)
    await db.flush()
    return org, branch


async def seed_users(db: AsyncSession):
    default_password = get_password_hash("password123")

    users_data = [
        # Роль, email, имя
        ("owner", "owner@foxinburg.ru", "Григорий Дымов"),
        ("super_admin", "super@foxinburg.ru", "Алексей Смирнов"),
        ("admin", "admin@foxinburg.ru", "Мария Иванова"),
        ("methodist", "methodist@foxinburg.ru", "Елена Петрова"),
        ("teacher", "teacher@foxinburg.ru", "Анна Соколова"),
        ("teacher", "teacher2@foxinburg.ru", "Иван Кузнецов"),
        ("manager", "manager@foxinburg.ru", "Ольга Волкова"),
        ("student", "student@foxinburg.ru", "Алексей Попов"),
        ("student", "student2@foxinburg.ru", "Марина Васильева"),
        ("parent", "parent@foxinburg.ru", "Дмитрий Попов"),
        ("guest", "guest@foxinburg.ru", "Гость"),
    ]

    org_result = await db.execute(select(Organization))
    org = org_result.scalar_one()
    branch_result = await db.execute(select(Branch))
    branch = branch_result.scalar_one()

    for role, email, name in users_data:
        user = User(
            email=email,
            name=name,
            password_hash=default_password,
            role=role,
            is_active=True,
            organization_id=org.id,
            branch_id=branch.id,
        )
        db.add(user)

    await db.flush()


async def seed_courses(db: AsyncSession):
    org_result = await db.execute(select(Organization))
    org = org_result.scalar_one()

    owner_result = await db.execute(select(User).where(User.role == "owner"))
    owner = owner_result.scalar_one()

    course1 = Course(
        title="Academy для педагогов",
        description="Курс обучения педагогов методике Фоксинбург",
        type="academy",
        status="published",
        organization_id=org.id,
        author_id=owner.id,
    )
    course2 = Course(
        title="Academy для администраторов",
        description="Курс обучения администраторов работе в системе",
        type="academy",
        status="published",
        organization_id=org.id,
        author_id=owner.id,
    )
    db.add_all([course1, course2])
    await db.flush()

    # Модули и уроки для курса 1
    for module_idx in range(1, 4):
        module = Module(
            title=f"Модуль {module_idx}: Основы",
            course_id=course1.id,
            order_index=module_idx,
        )
        db.add(module)
        await db.flush()

        for lesson_idx in range(1, 4):
            lesson = Lesson(
                title=f"Урок {module_idx}.{lesson_idx}",
                description=f"Содержание урока {module_idx}.{lesson_idx}",
                module_id=module.id,
                order_index=lesson_idx,
                lesson_type="text" if lesson_idx == 1 else ("video" if lesson_idx == 2 else "test"),
            )
            db.add(lesson)

    await db.flush()


async def seed_groups(db: AsyncSession):
    teacher_result = await db.execute(select(User).where(User.role == "teacher"))
    teacher = teacher_result.scalars().first()

    course_result = await db.execute(select(Course))
    course = course_result.scalars().first()

    branch_result = await db.execute(select(Branch))
    branch = branch_result.scalar_one()

    group = Group(
        name="Группа A1",
        teacher_id=teacher.id,
        course_id=course.id,
        branch_id=branch.id,
        max_students=12,
    )
    db.add(group)
    await db.flush()


async def seed_enrollments(db: AsyncSession):
    from sqlalchemy import select
    student_result = await db.execute(select(User).where(User.role == "student"))
    students = student_result.scalars().all()

    course_result = await db.execute(select(Course))
    course = course_result.scalars().first()

    group_result = await db.execute(select(Group))
    group = group_result.scalars().first()

    # Загружаем курс с модулями и уроками один раз
    course_result = await db.execute(
        select(Course)
        .where(Course.id == course.id)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    course_obj = course_result.scalar_one()
    all_lessons = []
    for module in sorted(course_obj.modules, key=lambda m: m.order_index):
        for lesson in sorted(module.lessons, key=lambda l: l.order_index):
            all_lessons.append(lesson)

    for student in students:
        enrollment = Enrollment(
            student_id=student.id,
            course_id=course.id,
            group_id=group.id,
            status="active",
        )
        db.add(enrollment)
        await db.flush()

        # Привязываем студента к группе
        student.group_id = group.id

        # Создаём прогресс по урокам
        for idx, lesson in enumerate(all_lessons):
            status = "available" if idx == 0 or not course_obj.is_sequential else "locked"
            db.add(
                LessonProgress(
                    student_id=student.id,
                    lesson_id=lesson.id,
                    enrollment_id=enrollment.id,
                    status=status,
                )
            )

    await db.flush()


async def seed_achievements(db: AsyncSession):
    achievements = [
        Achievement(
            title="Первый шаг",
            description="Завершить первый урок",
            condition_type="lessons_completed",
            condition_value=1,
            xp_reward=10,
            coins_reward=5,
        ),
        Achievement(
            title="Марафонец",
            description="Завершить 5 уроков подряд",
            condition_type="lessons_completed",
            condition_value=5,
            xp_reward=50,
            coins_reward=25,
        ),
    ]
    db.add_all(achievements)
    await db.flush()


async def seed_crm(db: AsyncSession):
    manager_result = await db.execute(select(User).where(User.role == "manager"))
    manager = manager_result.scalars().first()

    leads = [
        Lead(name="Иван Иванов", email="ivan@example.com", phone="+79990001122", source="сайт", manager_id=manager.id, status="new"),
        Lead(name="Светлана Светлова", email="svetlana@example.com", phone="+79990003344", source="звонок", manager_id=manager.id, status="contacted"),
    ]
    db.add_all(leads)
    await db.flush()


async def seed_finance(db: AsyncSession):
    student_result = await db.execute(select(User).where(User.role == "student"))
    student = student_result.scalars().first()

    payment = Payment(
        student_id=student.id,
        amount=1250000,  # 12 500 руб
        type="income",
        method="card",
        status="completed",
        description="Оплата абонемента",
    )
    db.add(payment)
    await db.flush()
