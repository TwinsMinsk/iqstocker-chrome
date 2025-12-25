"""
Alembic Environment Configuration
"""
from logging.config import fileConfig
from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool
from sqlalchemy.engine.url import make_url
from alembic import context
import os
import sys
from urllib.parse import quote_plus, urlparse, urlunparse, unquote

# Добавляем корневую папку в path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Импортируем Base и models
from app.db.base import Base
from app.models import User, Subscription, LicenseKey, Transaction, ExtensionLog  # noqa
from app.core.config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Функция для безопасной обработки DATABASE_URL с правильной кодировкой
def normalize_database_url(url: str | bytes) -> str:
    """
    Нормализует строку подключения к БД, обрабатывая проблемы с кодировкой.
    Исправляет проблемы с UnicodeDecodeError при работе с переменными окружения Railway.
    """
    try:
        # Если это байты, пробуем разные кодировки
        if isinstance(url, bytes):
            # Сначала пробуем UTF-8
            try:
                url = url.decode('utf-8')
            except UnicodeDecodeError:
                # Если UTF-8 не работает, пробуем latin-1 (который может декодировать любой байт)
                try:
                    url = url.decode('latin-1')
                except:
                    # В крайнем случае используем replace
                    url = url.decode('utf-8', errors='replace')
        
        # Убеждаемся, что это строка и она в правильной кодировке
        url_str = str(url).encode('utf-8', errors='replace').decode('utf-8')
        
        # Парсим URL для проверки корректности
        parsed = urlparse(url_str)
        
        # Декодируем и перекодируем пароль и имя пользователя для безопасности
        if parsed.password:
            try:
                from urllib.parse import unquote
                # Декодируем, если уже закодирован
                password = unquote(parsed.password)
            except:
                password = parsed.password
            
            # Убеждаемся, что пароль в UTF-8
            if isinstance(password, bytes):
                password = password.decode('utf-8', errors='replace')
            
            # Кодируем пароль правильно для URL
            encoded_password = quote_plus(str(password), safe='')
        else:
            encoded_password = ''
        
        if parsed.username:
            try:
                from urllib.parse import unquote
                username = unquote(parsed.username)
            except:
                username = parsed.username
            
            if isinstance(username, bytes):
                username = username.decode('utf-8', errors='replace')
            
            encoded_username = quote_plus(str(username), safe='')
        else:
            encoded_username = ''
        
        # Собираем URL обратно, убеждаясь что все части в UTF-8
        hostname = parsed.hostname or ''
        port = f":{parsed.port}" if parsed.port else ""
        path = parsed.path or '/'
        
        # Убеждаемся что path тоже в UTF-8
        if isinstance(path, bytes):
            path = path.decode('utf-8', errors='replace')
        
        netloc = f"{encoded_username}:{encoded_password}@{hostname}{port}"
        
        normalized = urlunparse((
            parsed.scheme,
            netloc,
            path,
            parsed.query,
            parsed.fragment
        ))
        
        # Финальная проверка - убеждаемся что результат валидная UTF-8 строка
        normalized_bytes = normalized.encode('utf-8')
        normalized = normalized_bytes.decode('utf-8')
        
        return normalized
    except Exception:
        # В случае ошибки возвращаем оригинальный URL как строку с обработкой ошибок
        if isinstance(url, bytes):
            try:
                return url.decode('utf-8', errors='replace')
            except:
                return url.decode('latin-1', errors='replace')
        return str(url).encode('utf-8', errors='replace').decode('utf-8')

# Функция для безопасного получения переменной окружения
def safe_get_env(key: str, default: str = "") -> str:
    """Безопасно получает переменную окружения, обрабатывая проблемы с кодировкой"""
    try:
        value = os.environ.get(key, default)
        
        # Если это байты, декодируем
        if isinstance(value, bytes):
            # Пробуем разные кодировки в порядке приоритета
            for encoding in ['utf-8', 'latin-1', 'cp1251', 'windows-1251', 'utf-8-sig']:
                try:
                    decoded = value.decode(encoding)
                    # Конвертируем в UTF-8 для единообразия
                    return decoded.encode('utf-8', errors='replace').decode('utf-8')
                except (UnicodeDecodeError, LookupError):
                    continue
            # Если ничего не сработало, используем replace
            return value.decode('utf-8', errors='replace')
        
        # Если это строка, проверяем что она валидная UTF-8
        str_value = str(value)
        try:
            # Пробуем закодировать и декодировать для проверки
            str_value.encode('utf-8', errors='strict').decode('utf-8', errors='strict')
            return str_value
        except UnicodeError:
            # Если строка содержит невалидные символы, конвертируем через latin-1
            try:
                return str_value.encode('latin-1', errors='replace').decode('utf-8', errors='replace')
            except:
                return str_value.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
    except Exception:
        return default

# Получаем DATABASE_URL из переменных окружения или settings
# Приоритет: DATABASE_PUBLIC_URL (для локальных подключений) > DATABASE_URL > settings
# DATABASE_PUBLIC_URL нужен для локальных миграций, так как DATABASE_URL содержит внутренний адрес Railway
raw_database_url = safe_get_env("DATABASE_PUBLIC_URL") or safe_get_env("DATABASE_URL") or settings.DATABASE_URL

# Устанавливаем DATABASE_URL из settings с нормализацией
# Обрабатываем возможные проблемы с кодировкой из переменных окружения Railway
database_url = normalize_database_url(raw_database_url)
config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Получаем нормализованный URL напрямую из переменных окружения или settings
    # Используем DATABASE_PUBLIC_URL для локальных подключений (работает с вашей машины)
    # DATABASE_URL содержит внутренний адрес Railway, который не работает локально
    raw_database_url = safe_get_env("DATABASE_PUBLIC_URL") or safe_get_env("DATABASE_URL") or settings.DATABASE_URL
    database_url = normalize_database_url(raw_database_url)
    
    try:
        # Парсим URL для получения чистых компонентов
        from sqlalchemy.engine.url import make_url
        url_obj = make_url(database_url)
        
        # Функция-создатель соединения. Передача параметров напрямую в psycopg2.connect
        # — это самый надежный способ избежать UnicodeDecodeError на Windows,
        # так как это полностью обходит внутреннее построение DSN-строки.
        def get_conn():
            import psycopg2
            
            def clean_param(val):
                """Очищает параметр от битых UTF-8 символов"""
                if not val:
                    return ""
                s = str(val)
                try:
                    s.encode('utf-8')
                    return s
                except UnicodeEncodeError:
                    # Если есть битые символы, пробуем "прогнать" через latin-1/utf-8
                    return s.encode('latin-1', errors='replace').decode('utf-8', errors='replace')

            return psycopg2.connect(
                user=clean_param(unquote(url_obj.username or "")),
                password=clean_param(unquote(url_obj.password or "")),
                host=clean_param(url_obj.host),
                port=url_obj.port or 5432,
                database=clean_param(url_obj.database),
                connect_timeout=10,
                client_encoding="utf8"
            )

        connectable = create_engine(
            "postgresql://",
            creator=get_conn,
            poolclass=pool.NullPool,
        )
    except Exception:
        # Резервный вариант
        connectable = create_engine(
            database_url,
            poolclass=pool.NullPool,
            connect_args={"connect_timeout": 10}
        )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
