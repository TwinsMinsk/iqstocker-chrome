"""
Скрипт для сброса пароля пользователя
Использование: python reset_password.py <email> <new_password>
"""
import sys
import os

# Добавляем путь к проекту
sys.path.insert(0, os.path.dirname(__file__))

# Установка кодировки для Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings

def reset_password(email: str, new_password: str):
    """Сбросить пароль пользователя"""
    
    print(f"🔐 Сброс пароля для пользователя: {email}\n")
    
    # Проверка длины пароля
    if len(new_password) < 8:
        print("❌ Ошибка: Пароль должен быть минимум 8 символов")
        return False
    
    password_bytes = new_password.encode('utf-8')
    if len(password_bytes) > 72:
        print("❌ Ошибка: Пароль не может быть длиннее 72 байт")
        return False
    
    db = SessionLocal()
    try:
        # Находим пользователя
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ Пользователь с email {email} не найден")
            return False
        
        # Хешируем новый пароль
        user.password_hash = get_password_hash(new_password)
        db.commit()
        
        print("="*60)
        print("✅ ПАРОЛЬ УСПЕШНО ИЗМЕНЕН")
        print("="*60)
        print(f"Email:    {user.email}")
        print(f"User ID:  {user.id}")
        print(f"Password: {new_password}")
        print("="*60)
        print("\n💡 Теперь пользователь может войти с новым паролем")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка при сбросе пароля: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Использование: python reset_password.py <email> <new_password>")
        print("\nПример:")
        print("  python reset_password.py iqstocker@gmail.com MyNewPassword123")
        sys.exit(1)
    
    email = sys.argv[1]
    new_password = sys.argv[2]
    
    success = reset_password(email, new_password)
    sys.exit(0 if success else 1)

