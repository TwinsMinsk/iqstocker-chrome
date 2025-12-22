"""
Тестовый скрипт для проверки запуска сервера
"""
import sys
import traceback

print("=" * 50)
print("Тестирование импортов...")
print("=" * 50)

try:
    print("1. Импорт settings...")
    from app.core.config import settings
    print(f"   [OK] Settings loaded: ENVIRONMENT={settings.ENVIRONMENT}")
except Exception as e:
    print(f"   [ERROR] Error: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    print("2. Импорт app...")
    from app.main import app
    print("   [OK] App imported successfully")
except Exception as e:
    print(f"   [ERROR] Error: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    print("3. Проверка routes...")
    routes = [route.path for route in app.routes]
    print(f"   [OK] Found {len(routes)} routes:")
    for route in routes[:5]:  # Показываем первые 5
        print(f"      - {route}")
    if len(routes) > 5:
        print(f"      ... и ещё {len(routes) - 5}")
except Exception as e:
    print(f"   [ERROR] Error: {e}")
    traceback.print_exc()

print("=" * 50)
print("[OK] Все проверки пройдены!")
print("=" * 50)
print("\nДля запуска сервера используйте:")
print("  python run_server.py")
print("или")
print("  python -m uvicorn app.main:app --reload")
print("\nСервер будет доступен на: http://127.0.0.1:8000")
print("API docs: http://127.0.0.1:8000/api/docs")

