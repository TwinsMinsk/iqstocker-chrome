"""
Database session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine.url import make_url
from urllib.parse import unquote
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
    # Для PostgreSQL на Windows используем кастомный creator, чтобы избежать UnicodeDecodeError
    try:
        url_obj = make_url(database_url)
        
        def get_conn():
            import psycopg2
            return psycopg2.connect(
                user=unquote(url_obj.username or ""),
                password=unquote(url_obj.password or ""),
                host=url_obj.host,
                port=url_obj.port or 5432,
                database=url_obj.database,
                client_encoding="utf8"
            )
            
        engine_kwargs["creator"] = get_conn
        # Для PostgreSQL используем пустой URL, так как параметры в creator
        database_url = "postgresql://"
    except Exception:
        pass
    
    pool_pre_ping = True
    pool_size = 10
    max_overflow = 20

# Создаём engine
engine_kwargs = {
    "pool_pre_ping": pool_pre_ping,
    "echo": settings.DEBUG,
}

if pool_size is not None:
    engine_kwargs["pool_size"] = pool_size
if max_overflow is not None:
    engine_kwargs["max_overflow"] = max_overflow

engine = create_engine(
    database_url,
    connect_args=connect_args,
    **engine_kwargs
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

