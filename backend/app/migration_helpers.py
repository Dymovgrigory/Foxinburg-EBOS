"""Вспомогательные функции для идемпотентных миграций."""
from typing import Set
from alembic import op
from sqlalchemy.engine.reflection import Inspector


def get_inspector() -> Inspector:
    conn = op.get_bind()
    return Inspector.from_engine(conn)


def table_exists(table_name: str) -> bool:
    try:
        return table_name in get_inspector().get_table_names()
    except Exception:
        return False


def column_exists(table_name: str, column_name: str) -> bool:
    try:
        inspector = get_inspector()
        if table_name not in inspector.get_table_names():
            return False
        return column_name in {col['name'] for col in inspector.get_columns(table_name)}
    except Exception:
        return False


def index_exists(table_name: str, index_name: str) -> bool:
    try:
        inspector = get_inspector()
        if table_name not in inspector.get_table_names():
            return False
        return any(idx['name'] == index_name for idx in inspector.get_indexes(table_name))
    except Exception:
        return False


def get_foreign_key_names(table_name: str) -> Set[str]:
    try:
        inspector = get_inspector()
        if table_name not in inspector.get_table_names():
            return set()
        return {fk['name'] for fk in inspector.get_foreign_keys(table_name) if fk['name']}
    except Exception:
        return set()


def foreign_key_exists(table_name: str, constrained_columns: list[str], referred_table: str) -> bool:
    try:
        inspector = get_inspector()
        if table_name not in inspector.get_table_names():
            return False
        for fk in inspector.get_foreign_keys(table_name):
            if (
                fk.get('referred_table') == referred_table
                and set(fk.get('constrained_columns', [])) == set(constrained_columns)
            ):
                return True
        return False
    except Exception:
        return False
