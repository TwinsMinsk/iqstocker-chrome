#!/usr/bin/env python3
"""
Скрипт для назначения реферальных кодов существующим пользователям
Запускать один раз после деплоя для миграции старых пользователей
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.services.referral_service import referral_service

def main():
    """Назначить referral_code всем пользователям у которых его нет"""
    db = SessionLocal()
    try:
        # Находим всех пользователей без referral_code
        users_without_code = db.query(User).filter(
            User.referral_code.is_(None)
        ).all()
        
        if not users_without_code:
            print("✅ Все пользователи уже имеют referral_code")
            return
        
        print(f"📋 Найдено {len(users_without_code)} пользователей без referral_code")
        
        assigned = 0
        for user in users_without_code:
            try:
                referral_service.assign_referral_code(db, user)
                assigned += 1
                if assigned % 10 == 0:
                    print(f"  ✅ Обработано {assigned}/{len(users_without_code)}...")
            except Exception as e:
                print(f"  ⚠️  Ошибка для пользователя {user.id}: {e}")
                db.rollback()
                continue
        
        db.commit()
        print(f"\n✅ Успешно назначено referral_code для {assigned} пользователей")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()

