"""
Простой скрипт для создания тестового пользователя
Использование: python create_test_user_simple.py
"""
import sys
import os
import sqlite3
from datetime import datetime

# Установка кодировки для Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Конфигурация
DB_PATH = os.path.join(os.path.dirname(__file__), "iqstocker.db")
TEST_EMAIL = "test@test.com"  # Валидный email (не используем .local)
TEST_PASSWORD = "Test1234"  # Минимум 8 символов

def create_test_user_simple():
    """Создать тестового пользователя напрямую через SQLite"""
    
    print("🚀 Создание тестового пользователя...\n")
    
    if not os.path.exists(DB_PATH):
        print(f"❌ База данных не найдена: {DB_PATH}")
        print("   Сначала запустите backend сервер для создания БД")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Проверяем существующего пользователя
        cursor.execute("SELECT id, email FROM users WHERE email = ?", (TEST_EMAIL,))
        user = cursor.fetchone()
        
        if user:
            user_id = user[0]
            print(f"⚠️  Пользователь {TEST_EMAIL} уже существует!")
            print(f"   User ID: {user_id}")
        else:
            # Создаем нового пользователя (простой хеш для теста)
            # В реальности используйте API для регистрации
            print("❌ Пользователь не найден.")
            print("   Сначала зарегистрируйтесь через API или frontend:")
            print(f"   http://localhost:3000/register")
            print(f"   Email: {TEST_EMAIL}")
            print(f"   Password: {TEST_PASSWORD}")
            print("\n   После регистрации запустите этот скрипт снова для обновления баланса.")
            return
        
        # Обновляем баланс до 100 кредитов
        cursor.execute("""
            UPDATE subscriptions 
            SET credits_balance = 100 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        """, (user_id,))
        
        if cursor.rowcount > 0:
            conn.commit()
            print(f"✅ Баланс обновлен до 100 кредитов")
        else:
            # Создаем подписку если её нет
            cursor.execute("""
                INSERT INTO subscriptions (id, user_id, plan_id, status, credits_balance, used_this_month, created_at, updated_at)
                VALUES (?, ?, 'free', 'active', 100, 0, ?, ?)
            """, (str(os.urandom(16).hex()), user_id, datetime.utcnow(), datetime.utcnow()))
            conn.commit()
            print(f"✅ Создана подписка с балансом 100 кредитов")
        
        # Получаем лицензионный ключ
        cursor.execute("""
            SELECT key_display FROM license_keys 
            WHERE user_id = ? AND is_active = 1 
            ORDER BY created_at DESC 
            LIMIT 1
        """, (user_id,))
        license_key_row = cursor.fetchone()
        license_key = license_key_row[0] if license_key_row else "Не найден"
        
        print("\n" + "="*60)
        print("📋 ДАННЫЕ ДЛЯ ВХОДА:")
        print("="*60)
        print(f"Email:    {TEST_EMAIL}")
        print(f"Password: {TEST_PASSWORD}")
        print(f"Balance:  100 кредитов")
        print(f"License:  {license_key}")
        print("="*60)
        print("\n🌐 Ссылки:")
        print(f"   Frontend: http://localhost:3000/login")
        print(f"   Backend API: http://localhost:8000/docs")
        print("\n✅ Готово! Теперь вы можете войти в личный кабинет.")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_test_user_simple()

