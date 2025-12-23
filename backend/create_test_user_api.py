"""
Скрипт для создания тестового пользователя через API
Использование: python create_test_user_api.py
"""
import sys
import os
import requests
import json

# Установка кодировки для Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Конфигурация
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@test.com"  # Валидный email (не используем .local)
TEST_PASSWORD = "Test1234"  # Минимум 8 символов

def create_test_user():
    """Создать тестового пользователя через API"""
    
    print("🚀 Создание тестового пользователя через API...\n")
    
    # 1. Регистрация пользователя
    print("📝 Регистрация пользователя...")
    try:
        register_response = requests.post(
            f"{API_BASE_URL}/auth/register",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            },
            timeout=10
        )
        
        if register_response.status_code == 201:
            tokens = register_response.json()
            access_token = tokens.get("access_token")
            print("✅ Пользователь успешно зарегистрирован!")
        elif register_response.status_code == 400:
            error_detail = register_response.json().get("detail", "Unknown error")
            if "already exists" in str(error_detail).lower():
                print("⚠️  Пользователь уже существует, выполняю вход...")
                # Пробуем войти
                login_response = requests.post(
                    f"{API_BASE_URL}/auth/login",
                    json={
                        "email": TEST_EMAIL,
                        "password": TEST_PASSWORD
                    },
                    timeout=10
                )
                if login_response.status_code == 200:
                    tokens = login_response.json()
                    access_token = tokens.get("access_token")
                    print("✅ Успешный вход!")
                else:
                    print(f"❌ Ошибка входа: {login_response.text}")
                    return
            else:
                print(f"❌ Ошибка регистрации: {error_detail}")
                return
        else:
            print(f"❌ Ошибка регистрации: {register_response.status_code} - {register_response.text}")
            return
            
    except requests.exceptions.ConnectionError:
        print("❌ Ошибка: Не удалось подключиться к API.")
        print("   Убедитесь, что backend сервер запущен на http://localhost:8000")
        return
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return
    
    if not access_token:
        print("❌ Не удалось получить access token")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 2. Получаем профиль пользователя
    print("\n📊 Получение профиля пользователя...")
    try:
        profile_response = requests.get(
            f"{API_BASE_URL}/users/me",
            headers=headers,
            timeout=10
        )
        
        if profile_response.status_code == 200:
            profile = profile_response.json()
            user_id = profile.get("id")
            license_key = profile.get("license_key", {}).get("key", "Не найден")
            current_balance = profile.get("balance", {}).get("credits", 0)
            
            print(f"✅ Профиль получен!")
            print(f"   User ID: {user_id}")
            print(f"   Текущий баланс: {current_balance} кредитов")
            print(f"   License Key: {license_key}")
            
            # 3. Обновляем баланс до 100 кредитов (через админ API или напрямую)
            if current_balance < 100:
                print(f"\n💰 Обновление баланса до 100 кредитов...")
                print("   (Требуется админ доступ или прямое обновление БД)")
                print("   Используйте скрипт create_test_user.py для прямого обновления БД")
            
            print("\n" + "="*60)
            print("📋 ДАННЫЕ ДЛЯ ВХОДА:")
            print("="*60)
            print(f"Email:    {TEST_EMAIL}")
            print(f"Password: {TEST_PASSWORD}")
            print(f"Balance:  {current_balance} кредитов")
            print(f"License:  {license_key}")
            print("="*60)
            print("\n🌐 Ссылки:")
            print(f"   Frontend: http://localhost:3000/login")
            print(f"   Backend API: http://localhost:8000/docs")
            print("\n✅ Готово! Теперь вы можете войти в личный кабинет.")
            
        else:
            print(f"❌ Ошибка получения профиля: {profile_response.status_code} - {profile_response.text}")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    create_test_user()

