import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    short_description = Column(String, nullable=True)
    cover_url = Column(String, nullable=True)

    # Тип курса
    type = Column(String, default="academy")  # academy, corporate, student_world
    status = Column(String, default="draft")  # draft, published, archived

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Прогресс и настройки
    passing_score = Column(Integer, default=70)  # процент для прохождения теста
    is_sequential = Column(Boolean, default=True)  # обязательное последовательное прохождение
    certificate_enabled = Column(Boolean, default=True)

    yandex_disk_public_key = Column(String, nullable=True)
    last_sync_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="courses")
    author = relationship("User", foreign_keys=[author_id])
    modules = relationship(
        "Module", back_populates="course", order_by="Module.order_index",
        cascade="all, delete-orphan",
    )
    enrollments = relationship(
        "Enrollment", back_populates="course",
        cascade="all, delete-orphan",
    )
    schedules = relationship(
        "Schedule", back_populates="course", passive_deletes=True,
    )

    def __repr__(self):
        return f"<Course {self.title}>"


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)

    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship("Course", back_populates="modules")
    lessons = relationship(
        "Lesson", back_populates="module", order_by="Lesson.order_index",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Module {self.title}>"


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)

    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)

    # Тип урока: text, video, test, homework, mixed
    lesson_type = Column(String, default="text", nullable=False)
    duration_minutes = Column(Integer, default=15)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    module = relationship("Module", back_populates="lessons")
    contents = relationship(
        "LessonContent", back_populates="lesson",
        cascade="all, delete-orphan",
    )
    tests = relationship(
        "Test", back_populates="lesson",
        cascade="all, delete-orphan",
    )
    homeworks = relationship(
        "Homework", back_populates="lesson",
        cascade="all, delete-orphan",
    )
    lesson_progress = relationship(
        "LessonProgress", back_populates="lesson",
        cascade="all, delete-orphan",
    )
    schedules = relationship(
        "Schedule", back_populates="lesson", passive_deletes=True,
    )

    def __repr__(self):
        return f"<Lesson {self.title}>"


class LessonContent(Base):
    __tablename__ = "lesson_contents"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)

    content_type = Column(String, nullable=False)  # text, video, pdf, file, embed
    title = Column(String, nullable=True)
    body = Column(Text, nullable=True)  # для текста или md5
    file_url = Column(String, nullable=True)  # устаревшее; оставлено для совместимости
    external_url = Column(String, nullable=True)  # для embed / preview
    order_index = Column(Integer, default=0)

    # Yandex Disk integration
    yandex_disk_path = Column(String, nullable=True, index=True)
    yandex_disk_md5 = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)

    lesson = relationship("Lesson", back_populates="contents")

    def __repr__(self):
        return f"<LessonContent {self.content_type}>"
