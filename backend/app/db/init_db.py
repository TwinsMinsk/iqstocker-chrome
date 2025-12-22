"""
Инициализация базы данных
Создание таблиц при первом запуске
"""
from app.db.base import Base
from app.db.session import engine
from app.core.config import settings


def init_db() -> None:
    """Создать все таблицы в базе данных"""
    # Импортируем все models чтобы они зарегистрировались в Base
    from app.models import user, subscription, license_key, transaction, extension_log  # noqa
    
    if settings.DEBUG:
        print("Creating database tables...")
    
    Base.metadata.create_all(bind=engine)
    
    if settings.DEBUG:
        print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()

