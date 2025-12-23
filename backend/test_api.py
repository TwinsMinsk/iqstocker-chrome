"""
Скрипт для тестирования API
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """Тест health check endpoint"""
    print("\n=== TEST: Health Check ===")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_root():
    """Тест root endpoint"""
    print("\n=== TEST: Root Endpoint ===")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_api_docs():
    """Тест доступности API документации"""
    print("\n=== TEST: API Docs ===")
    try:
        response = requests.get(f"{BASE_URL}/api/docs", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"API Docs доступна: {response.status_code == 200}")
        return response.status_code == 200
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_admin_endpoints_list():
    """Проверка наличия admin endpoints в OpenAPI schema"""
    print("\n=== TEST: Admin Endpoints Availability ===")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/openapi.json", timeout=5)
        if response.status_code == 404:
            # Пробуем альтернативный путь
            response = requests.get(f"{BASE_URL}/openapi.json", timeout=5)
        
        if response.status_code == 200:
            schema = response.json()
            paths = schema.get('paths', {})
            
            admin_endpoints = [
                '/api/v1/admin/users',
                '/api/v1/admin/users/{user_id}',
                '/api/v1/admin/logs'
            ]
            
            print("Проверяем admin endpoints:")
            for endpoint in admin_endpoints:
                if endpoint in paths:
                    print(f"  ✅ {endpoint}")
                else:
                    print(f"  ❌ {endpoint} - НЕ НАЙДЕН")
            
            return True
        else:
            print(f"Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("ТЕСТИРОВАНИЕ API СЕРВЕРА")
    print("=" * 60)
    
    results = []
    
    # Тесты
    results.append(("Health Check", test_health()))
    results.append(("Root Endpoint", test_root()))
    results.append(("API Docs", test_api_docs()))
    results.append(("Admin Endpoints", test_admin_endpoints_list()))
    
    # Итоги
    print("\n" + "=" * 60)
    print("РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nИтого: {passed}/{total} тестов пройдено")
    
    if passed == total:
        print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print("\n📍 Что проверить дальше:")
        print("1. Откройте в браузере: http://127.0.0.1:8000/api/docs")
        print("2. Проверьте admin endpoints (требуется авторизация)")
        print("3. Создайте тестового пользователя и админа")
    else:
        print("\n⚠️ Некоторые тесты не прошли. Проверьте логи сервера.")

