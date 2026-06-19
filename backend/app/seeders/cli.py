import asyncio
from app.database import async_session_maker
from app.seeders import seed_all, clear_all


async def main():
    async with async_session_maker() as db:
        print("🌱 Начинаем сидирование FOXINBURG EBOS...")
        await seed_all(db)
        print("✅ База данных заполнена тестовыми данными!")


async def clear():
    async with async_session_maker() as db:
        print("🧹 Очистка базы данных...")
        await clear_all(db)
        print("✅ База данных очищена!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "clear":
        asyncio.run(clear())
    else:
        asyncio.run(main())
