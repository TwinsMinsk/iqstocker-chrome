"""
Database session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Определяем DATABASE_URL в зависимости от настроек
database_url = settings.DATABASE_URL

# Если USE_SQLITE=True, используем SQLite (для разработки без Docker)
if settings.USE_SQLITE:
    database_url = "sqlite:///./iqstocker.db"
    # SQLite не поддерживает некоторые функции PostgreSQL
    connect_args = {"check_same_thread": False}
    pool_pre_ping = False
    pool_size = None
    max_overflow = None
else:
    connect_args = {}
    pool_pre_ping = True
    pool_size = 10
    max_overflow = 20

# Создаём engine
engine = create_engine(
    database_url,
    pool_pre_ping=pool_pre_ping,
    pool_size=pool_size,
    max_overflow=max_overflow,
    connect_args=connect_args,
    echo=settings.DEBUG,  # Логировать SQL queries в debug mode
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Dependency для получения database session
    Используется в FastAPI endpoints
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

