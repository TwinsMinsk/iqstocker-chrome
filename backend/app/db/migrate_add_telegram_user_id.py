"""
Миграция: добавление колонки telegram_user_id в таблицу users
Выполняется автоматически при старте приложения, если колонка отсутствует
"""
from sqlalchemy import text, inspect
from app.db.session import engine
from app.core.config import settings


def migrate_add_telegram_user_id() -> None:
    """Добавить колонку telegram_user_id в таблицу users, если её нет"""
    if not settings.USE_SQLITE:
        # Для PostgreSQL используем Alembic миграции
        return
    
    inspector = inspect(engine)
    
    # Проверяем, существует ли таблица users
    if 'users' not in inspector.get_table_names():
        return
    
    # Получаем список колонок в таблице users
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    # Если колонка telegram_user_id отсутствует, добавляем её
    if 'telegram_user_id' not in columns:
        print("🔄 Добавление колонки telegram_user_id в таблицу users...")
        with engine.begin() as conn:
            # SQLite не поддерживает ALTER TABLE ADD COLUMN с UNIQUE напрямую
            # Сначала добавляем колонку без UNIQUE
            conn.execute(text("ALTER TABLE users ADD COLUMN telegram_user_id VARCHAR(255)"))
            
            # Создаем уникальный индекс для telegram_user_id (NULL значения разрешены)
            # В SQLite несколько NULL значений разрешены даже с UNIQUE индексом
            try:
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_telegram_user_id ON users(telegram_user_id)"))
            except Exception as e:
                # Если индекс уже существует или возникла ошибка, продолжаем
                print(f"⚠️ Не удалось создать индекс для telegram_user_id: {e}")
        
        print("✅ Колонка telegram_user_id успешно добавлена")


if __name__ == "__main__":
    migrate_add_telegram_user_id()

