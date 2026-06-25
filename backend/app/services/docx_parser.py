import json
import re
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO
from typing import List, Optional


NAMESPACES = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
}


def extract_docx_paragraphs(file_bytes: bytes) -> List[str]:
    """Извлекает список параграфов из docx-файла без внешних зависимостей."""
    try:
        with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
            xml = zf.read("word/document.xml")
    except (zipfile.BadZipFile, KeyError):
        return []

    root = ET.fromstring(xml)
    paragraphs = []
    for p in root.iter(f"{{{NAMESPACES['w']}}}p"):
        text = "".join(
            t.text or "" for t in p.iter(f"{{{NAMESPACES['w']}}}t")
        )
        text = text.replace("\r", " ").replace("\n", " ").strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def _is_section_header(text: str) -> bool:
    """Определяет служебные строки, которые сами по себе не являются вопросами."""
    lowered = text.lower()
    if re.match(r"^задание\s*\d*\.?$", lowered):
        return True
    if re.match(r"^тест\.?$", lowered):
        return True
    service_phrases = (
        "выберите один вариант ответа",
        "выберите правильный вариант",
        "выберите наиболее подходящий",
        "выберите наиболее подходящий вариант",
        "прочитайте вопрос",
        "прочитайте вопросы",
        "дайте краткий ответ",
        "напишите краткий ответ",
        "ответы:",
        "правильные ответы",
    )
    return any(phrase in lowered for phrase in service_phrases)


def _is_option(text: str) -> Optional[str]:
    """Возвращает текст варианта ответа, если строка похожа на а)/б)/в)/г)/д)."""
    match = re.match(r"^([а-яa-z])\)\s*(.*)", text.strip())
    if match:
        return match.group(2).strip()
    return None


def _is_question_start(text: str) -> Optional[tuple[int, str]]:
    """Возвращает (номер, текст), если строка начинает новый вопрос."""
    match = re.match(r"^(\d+)\.\s*(.*)", text.strip())
    if match:
        number = int(match.group(1))
        body = match.group(2).strip()
        return number, body
    return None


def parse_test_docx(file_bytes: bytes, title: str = "Тест") -> Optional[dict]:
    """Парсит docx с тестом в структуру для модели Test.

    Поддерживает:
    - вопросы с одним вариантом ответа (а, б, в, г);
    - открытые текстовые вопросы.

    Правильные ответы не извлекаются (их нет в файлах), поэтому
    correct_answers остаётся пустым — методист может дозаполнить позже.
    """
    paragraphs = extract_docx_paragraphs(file_bytes)
    if not paragraphs:
        return None

    questions = _parse_numbered_questions(paragraphs)

    # Fallback: если автор не нумеровал вопросы, считаем каждый
    # самостоятельный абзац текстовым вопросом.
    if not questions:
        questions = _parse_plain_text_questions(paragraphs)

    if not questions:
        return None

    return {
        "title": title,
        "description": None,
        "passing_score": 0,
        "time_limit_minutes": None,
        "max_attempts": 3,
        "is_active": True,
        "questions": questions,
    }


def _parse_numbered_questions(paragraphs: List[str]) -> List[dict]:
    """Парсит нумерованные вопросы вида '1. ...' с вариантами а)/б)."""
    questions: List[dict] = []
    i = 0
    n = len(paragraphs)

    while i < n:
        text = paragraphs[i]
        if _is_section_header(text):
            i += 1
            continue

        q = _is_question_start(text)
        if not q:
            i += 1
            continue

        _, question_text = q
        options: List[str] = []
        i += 1

        while i < n:
            next_text = paragraphs[i]
            if _is_section_header(next_text):
                i += 1
                continue
            if _is_question_start(next_text):
                break
            opt = _is_option(next_text)
            if opt is not None:
                options.append(opt)
                i += 1
            else:
                # Если после вопроса идёт не вариант и не новый вопрос,
                # считаем это продолжением формулировки вопроса.
                question_text += " " + next_text
                i += 1

        question_type = "single" if options else "text"
        questions.append(
            {
                "question_text": question_text,
                "question_type": question_type,
                "options": json.dumps(options, ensure_ascii=False) if options else None,
                "correct_answers": json.dumps([], ensure_ascii=False),
                "points": 1,
                "order_index": len(questions) + 1,
            }
        )

    return questions


def _parse_plain_text_questions(paragraphs: List[str]) -> List[dict]:
    """Парсит простой список вопросов без нумерации."""
    questions: List[dict] = []
    for text in paragraphs:
        if _is_section_header(text) or _is_option(text) is not None:
            continue
        stripped = text.strip()
        if not stripped:
            continue
        questions.append(
            {
                "question_text": stripped,
                "question_type": "text",
                "options": None,
                "correct_answers": json.dumps([], ensure_ascii=False),
                "points": 1,
                "order_index": len(questions) + 1,
            }
        )
    return questions


def parse_homework_docx(file_bytes: bytes) -> dict:
    """Парсит docx с домашним заданием: возвращает заголовок и описание."""
    paragraphs = extract_docx_paragraphs(file_bytes)
    if not paragraphs:
        return {"title": None, "description": None}

    title = paragraphs[0]
    if len(title) > 120:
        title = title[:117] + "..."
    description = "\n\n".join(paragraphs)
    return {"title": title, "description": description}
