import sys
import os

sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User

# 👇 ВПИШИТЕ СЮДА ВАШ EMAIL
TARGET_EMAIL = "twins@gmail.com" 

def make_user_admin():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == TARGET_EMAIL).first()
        if not user:
            print(f"❌ Пользователь {TARGET_EMAIL} не найден!")
            return

        # Назначаем администратором
        user.is_admin = True
        db.commit()
        print(f"✅ Успешно! Пользователь {TARGET_EMAIL} теперь администратор.")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    make_user_admin()