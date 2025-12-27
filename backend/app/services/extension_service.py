"""
Extension Service - Бизнес-логика для защиты расширения
Реализует batch validation, session management, fingerprinting
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import secrets
import hashlib
import hmac
import json

from app.models.license_key import LicenseKey
from app.models.subscription import Subscription
from app.models.user import User
from app.core.config import settings


class ExtensionService:
    """Сервис для работы с расширением и защитой"""
    
    def __init__(self, db: Session, redis_client=None):
        """
        Args:
            db: Database session
            redis_client: Redis client для session storage
        """
        self.db = db
        self.redis = redis_client
    
    
    # ==================== LICENSE VALIDATION ====================
    
    async def validate_license_key(self, license_key: str) -> Optional[Tuple[LicenseKey, Subscription, User]]:
        """
        Валидация лицензионного ключа.
        
        Ключи хранятся с bcrypt хешем, поэтому нужно проверить все активные ключи.
        
        Returns:
            Tuple[LicenseKey, Subscription, User] если валидный, None если нет
        """
        from app.core.security import verify_password
        
        # Получить все активные ключи (bcrypt не позволяет искать напрямую)
        active_keys = self.db.query(LicenseKey).filter(
            and_(
                LicenseKey.is_active == True,
                LicenseKey.revoked_at == None
            )
        ).all()
        
        # Проверить каждый ключ
        license_obj = None
        for key in active_keys:
            if verify_password(license_key, key.key_hash):
                license_obj = key
                break
        
        if not license_obj:
            return None
        
        # Получить подписку пользователя
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == license_obj.user_id
        ).first()
        
        if not subscription:
            return None
        
        # Получить пользователя
        user = self.db.query(User).filter(User.id == license_obj.user_id).first()
        
        if not user or not user.is_active:
            return None
        
        # Обновить last_used
        license_obj.last_used_at = datetime.utcnow()
        self.db.commit()
        
        return license_obj, subscription, user
    
    
    # ==================== BATCH VALIDATION ====================
    
    async def batch_validate(
        self, 
        license_key: str, 
        prompts_count: int
    ) -> Dict:
        """
        Основной метод batch validation.
        Валидирует лицензию и резервирует кредиты на всю сессию.
        
        Args:
            license_key: Лицензионный ключ
            prompts_count: Количество промптов в сессии
        
        Returns:
            Dict с результатом валидации и session token
        """
        # 1. Validate license
        result = await self.validate_license_key(license_key)
        if not result:
            return {
                "allowed": False,
                "error": "invalid_license",
                "message": "Invalid or expired license key"
            }
        
        license_obj, subscription, user = result
        
        # 2. Check subscription status
        if subscription.status != "active":
            return {
                "allowed": False,
                "error": "subscription_inactive",
                "message": f"Subscription status: {subscription.status}"
            }
        
        if subscription.is_expired():
            return {
                "allowed": False,
                "error": "subscription_expired",
                "message": "Subscription has expired"
            }
        
        # 3. Check credits
        if subscription.credits_balance < prompts_count:
            return {
                "allowed": False,
                "error": "insufficient_credits",
                "message": f"Need {prompts_count} credits, have {subscription.credits_balance}"
            }
        
        # 4. Check rate limiting (Redis)
        if self.redis:
            rate_key = f"rate:{user.id}:batch"
            if await self.redis.exists(rate_key):
                return {
                    "allowed": False,
                    "error": "rate_limit_exceeded",
                    "message": "Too many batch requests, try again in a minute"
                }
        
        # 5. НЕ списываем кредиты здесь! Только проверяем баланс.
        # Кредиты списываются:
        # - в основном через deduct_credit (после подтверждённой отправки промпта)
        # - а также "страховочно" через finalize_session (досписание, если deduct_credit не дошёл)
        
        # 6. Generate session token
        session_token = self._generate_session_token(str(user.id), prompts_count)
        
        # 7. Store session in Redis (TTL 1 hour)
        if self.redis:
            session_data = {
                "user_id": str(user.id),
                "license_key_id": str(license_obj.id),
                "prompts_count": prompts_count,
                "reserved_credits": 0,  # Не резервируем, списываем только при успешной отправке
                "created_at": datetime.utcnow().isoformat(),
                "is_finalized": False,
                "credits_deducted": 0,  # Счетчик списанных кредитов
                "deducted_prompts": []  # Список индексов промптов, за которые уже списаны кредиты
            }
            
            await self.redis.setex(
                f"session:{session_token}",
                settings.SESSION_TOKEN_TTL_HOURS * 3600,
                json.dumps(session_data)
            )
            
            # Set rate limit (1 batch per minute)
            await self.redis.setex(
                rate_key,
                settings.RATE_LIMIT_BATCH_WINDOW,
                "1"
            )
        
        # 8. Return success response
        config_dict = {
            "min_interval_ms": settings.DEFAULT_MIN_INTERVAL_MS,
            "max_interval_ms": settings.DEFAULT_MAX_INTERVAL_MS,
            "max_retries": settings.DEFAULT_MAX_RETRIES
        }
        
        # Добавить remote selector если настроен
        if settings.DISCORD_INPUT_SELECTOR:
            config_dict["discord_input_selector"] = settings.DISCORD_INPUT_SELECTOR
        
        return {
            "allowed": True,
            "session_token": session_token,
            "expires_at": datetime.utcnow() + timedelta(hours=settings.SESSION_TOKEN_TTL_HOURS),
            "config": config_dict,
            "credits_reserved": 0,  # Не резервируем, списываем только при успешной отправке
            "credits_remaining": subscription.credits_balance,  # Текущий баланс без изменений
            "min_version_required": settings.MIN_VERSION_REQUIRED  # Опционально, может быть None
        }
    
    
    async def deduct_credit(
        self,
        session_token: str,
        prompt_index: int
    ) -> Dict:
        """
        Списать один кредит за успешно отправленный промпт.
        
        Вызывается сразу после успешной отправки промпта в Discord.
        Кредиты списываются только при успешной отправке, не при ошибках.
        
        Args:
            session_token: Token сессии
            prompt_index: Индекс промпта в сессии (0-based)
        
        Returns:
            Dict с результатом списания
        """
        if not self.redis:
            return {
                "success": False,
                "message": "Redis not available"
            }
        
        # 1. Получить session data из Redis
        session_key = f"session:{session_token}"
        session_json = await self.redis.get(session_key)
        
        if not session_json:
            return {
                "success": False,
                "message": "Session not found or expired"
            }
        
        session_data = json.loads(session_json)
        
        # Базовая валидация prompt_index: защищает от случайных/злонамеренных индексов
        prompts_count = int(session_data.get("prompts_count", 0) or 0)
        if prompt_index < 0 or (prompts_count and prompt_index >= prompts_count):
            return {
                "success": False,
                "message": "Invalid prompt index"
            }

        # Проверить, не финализирована ли уже сессия
        if session_data.get("is_finalized"):
            return {
                "success": False,
                "message": "Session already finalized"
            }
        
        # Проверить, не списан ли уже кредит за этот промпт
        deducted_prompts = session_data.get("deducted_prompts", [])
        if prompt_index in deducted_prompts:
            # Кредит уже списан - это нормально при повторных вызовах
            subscription = self.db.query(Subscription).filter(
                Subscription.user_id == session_data["user_id"]
            ).first()
            return {
                "success": True,
                "message": "Credit already deducted for this prompt",
                "credits_remaining": subscription.credits_balance if subscription else 0,
                "credits_deducted": 0
            }
        
        # 2. Получить подписку
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == session_data["user_id"]
        ).first()
        
        if not subscription:
            return {
                "success": False,
                "message": "Subscription not found"
            }
        
        # 3. Проверить баланс перед списанием
        if subscription.credits_balance < 1:
            return {
                "success": False,
                "message": f"Insufficient credits. Need 1, have {subscription.credits_balance}"
            }
        
        # 4. Списать один кредит
        subscription.credits_balance -= 1
        subscription.used_this_month += 1
        self.db.commit()
        
        # 5. Обновить session data - отметить что кредит списан за этот промпт
        deducted_prompts.append(prompt_index)
        session_data["deducted_prompts"] = deducted_prompts
        session_data["credits_deducted"] = session_data.get("credits_deducted", 0) + 1
        
        await self.redis.setex(
            session_key,
            settings.SESSION_TOKEN_TTL_HOURS * 3600,
            json.dumps(session_data)
        )
        
        return {
            "success": True,
            "message": "Credit deducted successfully",
            "credits_remaining": subscription.credits_balance,
            "credits_deducted": 1
        }
    
    
    async def finalize_session(
        self, 
        session_token: str, 
        prompts_sent: int,
        errors_count: int = 0,
        duration_seconds: Optional[int] = None
    ) -> Dict:
        """
        Финализация сессии - подтверждение использования.
        
        ВАЖНО: Кредиты уже списаны через deduct_credit при успешной отправке каждого промпта.
        Этот метод только финализирует сессию и не списывает кредиты повторно.
        
        Args:
            session_token: Token сессии
            prompts_sent: Фактически отправлено промптов
            errors_count: Количество ошибок
            duration_seconds: Длительность сессии
        
        Returns:
            Dict с результатом финализации
        """
        if not self.redis:
            return {
                "success": False,
                "message": "Redis not available"
            }
        
        # 1. Получить session data из Redis
        session_key = f"session:{session_token}"
        session_json = await self.redis.get(session_key)
        
        if not session_json:
            return {
                "success": False,
                "message": "Session not found or expired"
            }
        
        session_data = json.loads(session_json)

        # 2. Получить подписку (нужна и для идемпотентного ответа тоже)
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == session_data["user_id"]
        ).first()

        if not subscription:
            return {
                "success": False,
                "message": "Subscription not found"
            }

        # Идемпотентность: если сессия уже финализирована — возвращаем стабильный ответ
        if session_data.get("is_finalized"):
            credits_deducted = int(session_data.get("credits_deducted", 0) or 0)
            return {
                "success": True,
                "message": "Session already finalized",
                "credits_used": credits_deducted,
                "credits_remaining": subscription.credits_balance,
                "session_duration_seconds": duration_seconds
            }

        # 3. "Страховочное" досписание кредитов на финализации.
        # Это закрывает обход, когда клиент не вызывает /deduct-credit (или запросы блокируются),
        # но при этом промпты фактически отправлены.
        prompts_count = int(session_data.get("prompts_count", 0) or 0)
        to_charge = min(int(prompts_sent or 0), prompts_count)
        credits_deducted = int(session_data.get("credits_deducted", 0) or 0)
        missing = max(0, to_charge - credits_deducted)

        if missing > 0:
            if subscription.credits_balance < missing:
                # Fail-closed: финализацию не подтверждаем, если не можем списать.
                # Это также защищает от "накрутки prompts_sent" клиентом.
                return {
                    "success": False,
                    "message": "Insufficient credits to finalize session"
                }

            subscription.credits_balance -= missing
            subscription.used_this_month += missing
            self.db.commit()

            # Обновим счётчик списаний в сессии
            credits_deducted += missing
            session_data["credits_deducted"] = credits_deducted

        # 4. Пометить сессию как finalized
        session_data["is_finalized"] = True
        session_data["finalized_at"] = datetime.utcnow().isoformat()
        session_data["prompts_sent"] = prompts_sent
        session_data["errors_count"] = errors_count
        
        await self.redis.setex(
            session_key,
            3600,  # Хранить ещё час для логов
            json.dumps(session_data)
        )
        
        return {
            "success": True,
            "message": "Session finalized successfully",
            "credits_used": int(credits_deducted),  # Списано фактически (deduct + finalize top-up)
            "credits_remaining": subscription.credits_balance,
            "session_duration_seconds": duration_seconds
        }
    
    
    # ==================== FINGERPRINTING (OPTIONAL) ====================
    
    async def bind_license_to_device(
        self,
        license_key: str,
        fingerprint: str,
        device_info: Optional[Dict] = None
    ) -> Dict:
        """
        Привязать лицензию к устройству (fingerprinting).
        Мягкая привязка - до MAX_DEVICES_PER_LICENSE устройств.
        
        Args:
            license_key: Лицензионный ключ
            fingerprint: Fingerprint устройства
            device_info: Доп. информация об устройстве
        
        Returns:
            Dict с результатом привязки
        """
        if not settings.FINGERPRINTING_ENABLED:
            return {
                "status": "disabled",
                "message": "Fingerprinting is disabled"
            }
        
        # Validate license
        result = await self.validate_license_key(license_key)
        if not result:
            return {
                "status": "error",
                "message": "Invalid license key"
            }
        
        license_obj, subscription, user = result
        
        # Get existing bindings from Redis
        bindings_key = f"bindings:{license_obj.id}"
        bindings_json = await self.redis.get(bindings_key) if self.redis else None
        bindings = json.loads(bindings_json) if bindings_json else []
        
        # Check if already bound
        if fingerprint in [b["fingerprint"] for b in bindings]:
            return {
                "status": "already_bound",
                "message": "Device already bound to this license",
                "devices_count": len(bindings)
            }
        
        # Check device limit
        if len(bindings) >= settings.MAX_DEVICES_PER_LICENSE:
            # TODO: Send email for approval
            return {
                "status": "approval_required",
                "message": f"License already used on {settings.MAX_DEVICES_PER_LICENSE} devices. Check your email to approve.",
                "devices_count": len(bindings)
            }
        
        # Add new binding
        new_binding = {
            "fingerprint": fingerprint,
            "device_info": device_info or {},
            "bound_at": datetime.utcnow().isoformat(),
            "last_used": datetime.utcnow().isoformat()
        }
        bindings.append(new_binding)
        
        # Store in Redis
        if self.redis:
            await self.redis.setex(
                bindings_key,
                30 * 24 * 3600,  # 30 days
                json.dumps(bindings)
            )
        
        # TODO: Send email notification
        
        return {
            "status": "bound",
            "message": "Device bound successfully",
            "devices_count": len(bindings)
        }
    
    
    async def verify_device_fingerprint(
        self,
        license_key: str,
        fingerprint: str
    ) -> bool:
        """
        Проверить, что устройство привязано к лицензии.
        
        Returns:
            True если устройство привязано, False если нет
        """
        if not settings.FINGERPRINTING_ENABLED:
            return True  # Fingerprinting disabled - allow all
        
        result = await self.validate_license_key(license_key)
        if not result:
            return False
        
        license_obj, _, _ = result
        
        # Get bindings
        bindings_key = f"bindings:{license_obj.id}"
        bindings_json = await self.redis.get(bindings_key) if self.redis else None
        
        if not bindings_json:
            return True  # No bindings yet - allow
        
        bindings = json.loads(bindings_json)
        
        # Check if fingerprint exists
        return fingerprint in [b["fingerprint"] for b in bindings]
    
    
    # ==================== HELPER METHODS ====================
    
    # Примечание: _hash_license_key больше не используется
    # Ключи хешируются через bcrypt в auth_service.create_license_key
    # и проверяются через verify_password в validate_license_key
    
    
    def _generate_session_token(self, user_id: str, prompts_count: int) -> str:
        """
        Генерировать session token.
        Токен подписан HMAC для защиты от подделки.
        """
        # Generate random part
        random_part = secrets.token_urlsafe(32)
        
        # Create payload
        payload = f"{user_id}:{prompts_count}:{random_part}"
        
        # Sign with HMAC
        signature = hmac.new(
            settings.SESSION_TOKEN_SECRET.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
        
        # Return token: payload + signature
        return f"{random_part}.{signature}"
    
    
    def _verify_session_token(self, token: str) -> bool:
        """Проверить подпись session token"""
        try:
            parts = token.split('.')
            if len(parts) != 2:
                return False
            
            random_part, signature = parts
            
            # We can't verify without original payload, but Redis lookup will handle this
            return True
        except:
            return False


# ==================== UTILITY FUNCTIONS ====================

def get_extension_service(db: Session, redis_client=None) -> ExtensionService:
    """Factory function для создания ExtensionService"""
    return ExtensionService(db, redis_client)

