"""
Скрипт для создания тестового пользователя с балансом
Использование: python create_test_user.py
"""
import sys
import os

# Установка кодировки для Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Добавляем путь к проекту
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.subscription import Subscription
from app.models.license_key import LicenseKey
from app.core.security import get_password_hash, generate_license_key
from app.services.auth_service import AuthService

def create_test_user():
    """Создать тестового пользователя с балансом 100 кредитов"""
    db: Session = SessionLocal()
    
    try:
        # Данные тестового пользователя
        test_email = "test@test.com"  # Валидный email (не используем .local)
        test_password = "Test1234"  # Минимум 8 символов
        
        # Проверяем, существует ли уже такой пользователь
        existing_user = db.query(User).filter(User.email == test_email).first()
        
        if existing_user:
            print(f"⚠️  Пользователь {test_email} уже существует!")
            print(f"   ID: {existing_user.id}")
            
            # Обновляем баланс до 100 кредитов
            subscription = db.query(Subscription).filter(
                Subscription.user_id == existing_user.id
            ).order_by(Subscription.created_at.desc()).first()
            
            if subscription:
                subscription.credits_balance = 100
                db.commit()
                print(f"✅ Баланс обновлен до 100 кредитов")
            else:
                # Создаем подписку если её нет
                from app.models.subscription import Subscription
                subscription = Subscription(
                    user_id=existing_user.id,
                    plan_id="free",
                    status="active",
                    credits_balance=100
                )
                db.add(subscription)
                db.commit()
                print(f"✅ Создана подписка с балансом 100 кредитов")
            
            # Проверяем лицензионный ключ
            license_key = db.query(LicenseKey).filter(
                LicenseKey.user_id == existing_user.id,
                LicenseKey.is_active == True
            ).order_by(LicenseKey.created_at.desc()).first()
            
            if license_key:
                print(f"✅ Лицензионный ключ уже существует")
                license_display = license_key.key_display
            else:
                # Создаем лицензионный ключ
                key_display = generate_license_key()
                license_key = LicenseKey(
                    user_id=existing_user.id,
                    key_hash=get_password_hash(key_display),
                    key_display=key_display,
                    is_active=True
                )
                db.add(license_key)
                db.commit()
                license_display = key_display
                print(f"✅ Создан новый лицензионный ключ")
            
            print("\n" + "="*60)
            print("📋 ДАННЫЕ ДЛЯ ВХОДА (существующий пользователь):")
            print("="*60)
            print(f"Email:    {test_email}")
            print(f"Password: {test_password}")
            print(f"Balance:  100 кредитов")
            print(f"License:  {license_display}")
            print("="*60)
            
        else:
            # Создаем нового пользователя
            print(f"🔨 Создание нового тестового пользователя...")
            
            user, error = AuthService.create_user(
                db=db,
                email=test_email,
                password=test_password,
                email_verified=True  # Сразу верифицируем email
            )
            
            if error:
                print(f"❌ Ошибка создания пользователя: {error}")
                return
            
            print(f"✅ Пользователь создан: {user.id}")
            
            # Обновляем баланс до 100 кредитов
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user.id
            ).order_by(Subscription.created_at.desc()).first()
            
            if subscription:
                subscription.credits_balance = 100
                db.commit()
                print(f"✅ Баланс установлен: 100 кредитов")
            
            # Получаем лицензионный ключ
            license_key = db.query(LicenseKey).filter(
                LicenseKey.user_id == user.id,
                LicenseKey.is_active == True
            ).order_by(LicenseKey.created_at.desc()).first()
            
            license_display = license_key.key_display if license_key else "НЕ СОЗДАН"
            
            print("\n" + "="*60)
            print("📋 ДАННЫЕ ДЛЯ ВХОДА:")
            print("="*60)
            print(f"Email:    {test_email}")
            print(f"Password: {test_password}")
            print(f"Balance:  100 кредитов")
            print(f"License:  {license_display}")
            print("="*60)
            print("\n🌐 Ссылки:")
            print(f"   Frontend: http://localhost:3000/login")
            print(f"   Backend API: http://localhost:8000/docs")
            print("\n✅ Готово! Теперь вы можете войти в личный кабинет.")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Создание тестового пользователя...\n")
    create_test_user()

