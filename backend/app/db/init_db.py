"""
Инициализация базы данных
Создание таблиц при первом запуске
"""
from app.db.base import Base
from app.db.session import engine
from app.core.config import settings


def init_db() -> None:
    """Создать все таблицы в базе данных"""
    # Импортируем ВСЕ модели, чтобы они зарегистрировались в Base.
    # ВАЖНО: на SQLite (dev/test) мы создаём таблицы через create_all.
    # На PostgreSQL (production) мы должны использовать Alembic миграции и не вызывать create_all,
    # чтобы избежать расхождения схемы (constraints/indexes/uuid defaults/extensions).
    from app import models  # noqa: F401
    
    if settings.DEBUG:
        print("Creating database tables...")
    
    if settings.USE_SQLITE or settings.ENVIRONMENT == "test":
        Base.metadata.create_all(bind=engine)
    
    if settings.DEBUG:
        print("Database tables created successfully!")
    
    # Применяем миграции для добавления недостающих колонок
    if settings.USE_SQLITE:
        from app.db.migrate_add_telegram_user_id import migrate_add_telegram_user_id
        migrate_add_telegram_user_id()


if __name__ == "__main__":
    init_db()

