import sys
import os

# Добавляем текущую папку в путь
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.referral_config import ReferralConfig
from app.services.billing_service import PLANS

def init_referral_configs():
    db = SessionLocal()
    try:
        print("--- Инициализация конфигов реферальной системы ---")
        for plan_id, plan_data in PLANS.items():
            # Награда 10% от кредитов тарифа
            reward = int(plan_data["credits"] * 0.10)
            
            existing = db.query(ReferralConfig).filter_by(tariff_plan_id=plan_id).first()
            if not existing:
                config = ReferralConfig(
                    tariff_plan_id=plan_id,
                    reward_credits=reward,
                    is_active=True
                )
                db.add(config)
                print(f"✅ Создан конфиг для {plan_id}: награда {reward}")
            else:
                print(f"ℹ️ Конфиг для {plan_id} уже существует")
        
        db.commit()
        print("--- Готово ---")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_referral_configs()