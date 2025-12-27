"""
Скрипт для локального запуска backend на порту 8001
Использует SQLite и не требует Redis
"""
import sys
import os

# Установка кодировки для Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Устанавливаем переменные окружения для локальной разработки
os.environ.setdefault('DATABASE_URL', 'sqlite:///./iqstocker_local.db')
os.environ.setdefault('USE_SQLITE', 'True')
os.environ.setdefault('REDIS_URL', '')
os.environ.setdefault('ENVIRONMENT', 'development')
os.environ.setdefault('DEBUG', 'True')
os.environ.setdefault('SECRET_KEY', 'local-dev-secret-key-change-in-production')
os.environ.setdefault('CORS_ORIGINS', '["http://localhost:3000", "http://127.0.0.1:3000"]')

def check_dependencies():
    """Проверка установленных зависимостей"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'pydantic',
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"❌ Отсутствуют зависимости: {', '.join(missing)}")
        print("Установите их командой: poetry install")
        return False
    
    print("✅ Все зависимости установлены")
    return True

def check_imports():
    """Проверка импортов приложения"""
    try:
        sys.path.append(os.getcwd())
        from app.main import app
        print("✅ Импорт приложения успешен")
        return True
    except Exception as e:
        print(f"❌ Ошибка импорта: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("="*60)
    print("🚀 ЛОКАЛЬНЫЙ ЗАПУСК BACKEND")
    print("="*60)
    print("\n📋 Конфигурация:")
    print(f"   Порт: 8001 (чтобы не конфликтовать с production)")
    print(f"   БД: SQLite (iqstocker_local.db)")
    print(f"   Redis: отключен")
    print(f"   Режим: development")
    print("\n" + "="*60 + "\n")
    
    print("🔍 Проверка зависимостей...")
    if not check_dependencies():
        sys.exit(1)
    
    print("\n🔍 Проверка импортов...")
    if not check_imports():
        sys.exit(1)
    
    print("\n✅ Все проверки пройдены!")
    print("\n" + "="*60)
    print("🌐 Запуск сервера на http://127.0.0.1:8001")
    print("📚 API документация: http://127.0.0.1:8001/docs")
    print("="*60 + "\n")
    
    # Запуск сервера
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    )

