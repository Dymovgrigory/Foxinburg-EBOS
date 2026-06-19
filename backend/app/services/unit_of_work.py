from typing import AsyncGenerator, Callable, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal


PostCommitHook = Callable[[], None]


class UnitOfWork:
    """Асинхронный Unit of Work поверх SQLAlchemy AsyncSession.

    Отвечает за:
    - открытие/закрытие сессии БД;
    - коммит или откат транзакции при выходе из контекста;
    - запуск post-commit хуков (например, обработчиков событий).
    """

    def __init__(self, session_factory=AsyncSessionLocal):
        self.session_factory = session_factory
        self.session: AsyncSession | None = None
        self._post_commit_hooks: List[PostCommitHook] = []
        self._committed = False

    async def __aenter__(self):
        self.session = self.session_factory()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self.session is None:
            return
        try:
            if exc_type:
                await self.session.rollback()
            elif not self._committed:
                await self.commit()
        finally:
            await self.session.close()

    def add_post_commit_hook(self, hook: PostCommitHook) -> None:
        """Регистрирует callback, который будет вызван после успешного commit."""
        self._post_commit_hooks.append(hook)

    async def commit(self) -> None:
        if self.session is None:
            raise RuntimeError("UnitOfWork session is not initialized")
        await self.session.commit()
        self._committed = True
        await self._run_post_commit_hooks()

    async def rollback(self) -> None:
        if self.session is not None:
            await self.session.rollback()
        self._post_commit_hooks.clear()

    async def _run_post_commit_hooks(self) -> None:
        import logging
        logger = logging.getLogger(__name__)
        hooks = self._post_commit_hooks
        self._post_commit_hooks = []
        for hook in hooks:
            try:
                await hook()
            except Exception:
                logger.exception("Post-commit hook failed")


async def get_uow() -> AsyncGenerator[UnitOfWork, None]:
    """FastAPI-dependency для получения UoW в endpoint."""
    async with UnitOfWork() as uow:
        yield uow
