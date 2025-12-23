"""
Скрипт для проверки и запуска сервера
Проверяет зависимости и запускает сервер
"""
import sys
import os

# Установка кодировки для Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_dependencies():
    """Проверка установленных зависимостей"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'pydantic',
        'email_validator',
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"FAILED: Отсутствуют зависимости: {', '.join(missing)}")
        print("Установите их командой: pip install -r requirements.txt")
        return False
    
    print("OK: Все зависимости установлены")
    return True

def check_imports():
    """Проверка импортов приложения"""
    try:
        # Добавляем текущую директорию в sys.path
        sys.path.append(os.getcwd())
        from app.main import app
        print("OK: Импорт приложения успешен")
        return True
    except Exception as e:
        print(f"FAILED: Ошибка импорта: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("CHECK: Проверка зависимостей...")
    if not check_dependencies():
        sys.exit(1)
    
    print("\nCHECK: Проверка импортов...")
    if not check_imports():
        sys.exit(1)
    
    print("\nSUCCESS: Все проверки пройдены!")
    print("START: Запуск сервера...\n")
    
    # Запуск сервера
    import uvicorn
    from app.core.config import settings
    
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )
