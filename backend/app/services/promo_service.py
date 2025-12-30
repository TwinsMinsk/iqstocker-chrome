"""
PromoService - Управление промокодами
"""
from sqlalchemy.orm import Session
from sqlalchemy import update, func
from typing import Optional, Tuple
from datetime import datetime, timezone
import logging

from app.models.promo_code import PromoCode
from app.models.credit_transaction import CreditTransaction, CreditTransactionType
from app.services.credit_service import credit_service

logger = logging.getLogger(__name__)


class PromoService:
    """Сервис для работы с промокодами"""
    
    @staticmethod
    def create_promo(
        db: Session,
        code: str,
        credit_amount: int,
        max_uses: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        description: Optional[str] = None
    ) -> Tuple[Optional[PromoCode], Optional[str]]:
        """Создать новый промокод (только админ)"""
        # Нормализуем код (uppercase)
        code = code.upper().strip()
        
        # Проверяем уникальность
        existing = db.query(PromoCode).filter(PromoCode.code == code).first()
        if existing:
            return None, f"Promo code '{code}' already exists"
        
        promo = PromoCode(
            code=code,
            credit_amount=credit_amount,
            max_uses=max_uses,
            expires_at=expires_at,
            description=description,
            is_active=True
        )
        
        db.add(promo)
        db.commit()
        db.refresh(promo)
        
        logger.info(f"Created promo code: {code}, amount={credit_amount}")
        return promo, None
    
    @staticmethod
    def redeem_promo(
        db: Session,
        user_id: str,
        code: str
    ) -> Tuple[Optional[int], Optional[str]]:
        """
        Активировать промокод для пользователя.
        
        Returns:
            Tuple[credits_added, error_message]
        """
        code = code.upper().strip()
        
        # 1. Быстрая проверка, не использовал ли пользователь этот код ранее
        # ВАЖНО: это не защита от гонок (race), это "fast path".
        already_used = db.query(CreditTransaction).filter(
            CreditTransaction.user_id == user_id,
            CreditTransaction.type == CreditTransactionType.PROMO_CODE.value,
            CreditTransaction.related_entity_id == code
        ).first()
        
        if already_used:
            return None, "Вы уже использовали этот промокод"
        
        # 2. АТОМАРНО: проверяем активность/срок/лимит и увеличиваем счётчик.
        # Это защищает от гонок по max_uses и от активации истёкшего/деактивированного кода.
        # Примечание: expires_at может быть timezone-aware, поэтому сравниваем с func.now() на стороне БД.
        stmt = (
            update(PromoCode)
            .where(
                PromoCode.code == code,
                PromoCode.is_active.is_(True),
                (PromoCode.expires_at.is_(None)) | (PromoCode.expires_at > func.now()),
                (PromoCode.max_uses.is_(None)) | (PromoCode.current_uses < PromoCode.max_uses),
            )
            .values(current_uses=PromoCode.current_uses + 1)
            .returning(PromoCode.current_uses, PromoCode.credit_amount)
        )
        result = db.execute(stmt)
        row = result.first()
        
        if row is None:
            # Чтобы дать понятное сообщение, подчитываем актуальное состояние (не атомарно, но для UX ок).
            promo = db.query(PromoCode).filter(PromoCode.code == code).first()
            if not promo:
                return None, "Промокод не найден"
            if not promo.is_active:
                return None, "Промокод деактивирован"
            if promo.expires_at:
                # Нормализуем на UTC для безопасного сравнения в Python
                now_utc = datetime.now(timezone.utc)
                expires_at = promo.expires_at
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if now_utc > expires_at:
                    return None, "Срок действия промокода истёк"
            if promo.max_uses and promo.current_uses >= promo.max_uses:
                return None, "Промокод исчерпан"
            return None, "Промокод недействителен"

        # row = (current_uses, credit_amount)
        promo_credit_amount = int(row[1])
        
        # 3. Начисляем кредиты (в той же транзакции).
        # Если здесь случится ошибка/unique violation — credit_service сделает rollback,
        # и инкремент current_uses тоже откатится.
        _, error = credit_service.add_credits(
            db=db,
            user_id=user_id,
            amount=promo_credit_amount,
            transaction_type=CreditTransactionType.PROMO_CODE.value,
            related_entity_id=code,
            description=f"Promo code: {code}",
            commit=False
        )
        
        if error:
            # Если сработал idempotency на уровне БД — трактуем как "уже использовали".
            if error == "duplicate_transaction":
                db.rollback()
                return None, "Вы уже использовали этот промокод"
            db.rollback()
            return None, error
        
        db.commit()
        
        logger.info(f"Promo redeemed: user={user_id}, code={code}, credits={promo_credit_amount}")
        return promo_credit_amount, None
    
    @staticmethod
    def list_promos(db: Session, include_inactive: bool = False) -> list:
        """Получить список промокодов для админки"""
        query = db.query(PromoCode)
        if not include_inactive:
            query = query.filter(PromoCode.is_active == True)
        return query.order_by(PromoCode.created_at.desc()).all()
    
    @staticmethod
    def deactivate_promo(db: Session, code: str) -> bool:
        """Деактивировать промокод"""
        code = code.upper().strip()
        result = db.query(PromoCode).filter(PromoCode.code == code).update(
            {"is_active": False}
        )
        db.commit()
        return result > 0


promo_service = PromoService()

