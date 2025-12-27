"""
Pytest configuration и fixtures
"""
import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# ВАЖНО: Устанавливаем переменные окружения ДО импорта app
# чтобы избежать проблем с middleware и конфигурацией
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "true"
# ВАЖНО: В тестах используем SQLite, иначе модели будут пытаться использовать UUID тип PostgreSQL
# и Base.metadata.create_all упадёт на SQLite.
os.environ["USE_SQLITE"] = "true"

# Очищаем кэш settings, чтобы перезагрузить конфигурацию с новыми переменными окружения
from app.core.config import get_settings
get_settings.cache_clear()

from app.db.base import Base
from app.db.session import get_db
from app.core.config import settings

# ВАЖНО: Импортируем app ПОСЛЕ настройки тестового окружения
# чтобы избежать проблем с middleware при импорте
from app.main import app


# Тестовая база данных (SQLite в памяти)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Создать тестовую БД для каждого теста"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Создать тестовый клиент FastAPI"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    # ВАЖНО: TestClient по умолчанию использует base_url="http://testserver"
    # В main.py уже настроено добавление "testserver" в allowed_hosts для тестового окружения
    # (когда ENVIRONMENT == "test"), поэтому здесь ничего менять не нужно
    
    try:
        # Используем base_url="http://testserver" чтобы соответствовать TrustedHostMiddleware
        with TestClient(app, base_url="http://testserver") as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    """Тестовые данные пользователя"""
    return {
        "email": "test@example.com",
        "password": "TestPassword123"
    }


@pytest.fixture
def test_user(db, test_user_data):
    """Создать тестового пользователя"""
    from app.models.user import User
    from app.core.security import get_password_hash
    
    user = User(
        email=test_user_data["email"],
        password_hash=get_password_hash(test_user_data["password"]),
        email_verified=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def authenticated_client(client, test_user, test_user_data):
    """Клиент с аутентификацией"""
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
    )
    token = login_response.json()["access_token"]
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

