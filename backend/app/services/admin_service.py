"""
Сервис для работы админа с пользователями и логами
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from typing import Optional, Tuple, List
from datetime import datetime
import logging

from app.models.user import User
from app.models.subscription import Subscription
from app.models.extension_log import ExtensionLog
from app.models.credit_transaction import CreditTransactionType
from app.services.credit_service import credit_service
from app.schemas.admin import (
    AdminUserItem,
    AdminUserListResponse,
    AdminUserUpdateResponse,
    AdminLogItem,
    AdminLogListResponse,
)

logger = logging.getLogger(__name__)


class AdminService:
    """Сервис для админ-операций"""
    
    @staticmethod
    def list_users(
        db: Session,
        page: int = 1,
        limit: int = 50,
        search: Optional[str] = None,
        sort: str = "created_at"
    ) -> AdminUserListResponse:
        """
        Получить список всех пользователей с пагинацией
        
        Args:
            db: Database session
            page: Номер страницы (начиная с 1)
            limit: Количество элементов на странице
            search: Поиск по email
            sort: Поле для сортировки (created_at, balance)
        
        Returns:
            AdminUserListResponse
        """
        query = db.query(User)
        
        # Поиск по email
        if search:
            query = query.filter(User.email.ilike(f"%{search}%"))
        
        # Сортировка
        if sort == "balance":
            # Сортировка по балансу через подписку
            # Используем distinct() чтобы избежать дубликатов при outerjoin
            query = query.outerjoin(Subscription).order_by(
                desc(Subscription.credits_balance)
            )
        else:
            query = query.order_by(desc(User.created_at))
        
        # Подсчет общего количества ДО пагинации
        # Для корректного подсчета при outerjoin используем distinct
        if sort == "balance":
            total = query.distinct().count()
        else:
            total = query.count()
        
        # Пагинация
        offset = (page - 1) * limit
        if sort == "balance":
            users = query.distinct().offset(offset).limit(limit).all()
        else:
            users = query.offset(offset).limit(limit).all()
        
        # Формируем ответ
        user_items = []
        for user in users:
            # Получаем текущую подписку
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user.id
            ).order_by(Subscription.created_at.desc()).first()
            
            # Получаем последнюю активность из логов
            last_log = db.query(ExtensionLog).filter(
                ExtensionLog.user_id == user.id
            ).order_by(desc(ExtensionLog.timestamp)).first()
            
            balance = subscription.credits_balance if subscription else 0
            subscription_tier = subscription.plan_id if subscription else "free"
            last_active = last_log.timestamp if last_log else None
            is_blocked = not user.is_active
            
            user_items.append(AdminUserItem(
                id=str(user.id),
                email=user.email,
                balance=balance,
                subscription_tier=subscription_tier,
                created_at=user.created_at,
                last_active=last_active,
                is_blocked=is_blocked,
                is_admin=user.is_admin,
                email_verified=user.email_verified
            ))
        
        total_pages = (total + limit - 1) // limit
        
        return AdminUserListResponse(
            total=total,
            users=user_items,
            pagination={
                "page": page,
                "limit": limit,
                "total_pages": total_pages
            }
        )
    
    @staticmethod
    def update_user(
        db: Session,
        user_id: str,
        balance: Optional[int] = None,
        is_blocked: Optional[bool] = None,
        is_admin: Optional[bool] = None,
        admin_actor_id: Optional[str] = None
    ) -> Tuple[Optional[AdminUserUpdateResponse], Optional[str]]:
        """
        Обновить данные пользователя (админ)
        
        Args:
            db: Database session
            user_id: ID пользователя
            balance: Новый баланс кредитов
            is_blocked: Заблокировать/разблокировать
            is_admin: Назначить/снять админа
        
        Returns:
            Tuple[AdminUserUpdateResponse, error_message]
        """
        # Преобразуем user_id в правильный тип
        from app.core.config import settings
        user_id_typed = user_id
        if not settings.USE_SQLITE:
            from uuid import UUID as UUIDType
            try:
                user_id_typed = UUIDType(user_id)
            except ValueError:
                return None, "Invalid user ID format"
        
        user = db.query(User).filter(User.id == user_id_typed).first()
        if not user:
            return None, "User not found"
        
        try:
            # Обновление баланса
            if balance is not None:
                subscription = db.query(Subscription).filter(
                    Subscription.user_id == user.id
                ).order_by(Subscription.created_at.desc()).first()
                
                if not subscription:
                    # Создаем подписку если её нет
                    subscription = Subscription(
                        user_id=user.id,
                        plan_id="free",
                        credits_balance=0,
                        status="active"
                    )
                    db.add(subscription)
                    db.flush()

                current_balance = int(subscription.credits_balance or 0)
                target_balance = int(balance)

                # ВАЖНО: пишем аудит через credit_transactions.
                # Админ в UI задаёт "абсолютный" баланс, а в журнале храним delta.
                delta = target_balance - current_balance
                if delta != 0:
                    actor = admin_actor_id or "unknown_admin"
                    _, err = credit_service.add_credits(
                        db=db,
                        user_id=str(user.id),
                        amount=delta,
                        transaction_type=CreditTransactionType.MANUAL_ADJUSTMENT.value,
                        related_entity_id=f"admin:{actor}",
                        description=f"Admin manual adjustment to {target_balance} (delta {delta:+d})",
                        commit=False,
                    )
                    if err:
                        db.rollback()
                        return None, f"Failed to adjust balance: {err}"
            
            # Обновление статуса блокировки
            if is_blocked is not None:
                user.is_active = not is_blocked
            
            # Обновление админ-статуса
            if is_admin is not None:
                user.is_admin = is_admin
            
            db.commit()
            db.refresh(user)
            
            # Получаем обновленный баланс
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user.id
            ).order_by(Subscription.created_at.desc()).first()
            
            current_balance = subscription.credits_balance if subscription else 0
            
            logger.info(f"Admin updated user: {user_id}, balance={balance}, is_blocked={is_blocked}, is_admin={is_admin}")
            
            return AdminUserUpdateResponse(
                id=str(user.id),
                email=user.email,
                balance=current_balance,
                is_blocked=not user.is_active,
                is_admin=user.is_admin,
                updated_at=datetime.utcnow()
            ), None
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating user: {e}")
            return None, f"Failed to update user: {str(e)}"
    
    @staticmethod
    def list_logs(
        db: Session,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        error_type: Optional[str] = None,
        limit: int = 100
    ) -> AdminLogListResponse:
        """
        Получить список логов расширения
        
        Args:
            db: Database session
            user_id: Фильтр по пользователю
            status: Фильтр по статусу (success, error, paused, completed)
            error_type: Фильтр по типу ошибки
            limit: Максимальное количество записей
        
        Returns:
            AdminLogListResponse
        """
        # Базовый запрос с join для получения email пользователя
        query = db.query(ExtensionLog).join(User)
        
        # Фильтры
        if user_id:
            # Преобразуем user_id в правильный тип (UUID или String)
            from app.core.config import settings
            if settings.USE_SQLITE:
                query = query.filter(ExtensionLog.user_id == user_id)
            else:
                from uuid import UUID as UUIDType
                try:
                    user_uuid = UUIDType(user_id)
                    query = query.filter(ExtensionLog.user_id == user_uuid)
                except ValueError:
                    # Если невалидный UUID, возвращаем пустой результат
                    return AdminLogListResponse(total=0, logs=[])
        
        if status:
            query = query.filter(ExtensionLog.status == status)
        
        if error_type:
            query = query.filter(ExtensionLog.error_type == error_type)
        
        # Подсчет общего количества ДО применения лимита
        total = query.count()
        
        # Сортировка по дате (новые сначала)
        query = query.order_by(desc(ExtensionLog.timestamp))
        
        # Лимит
        logs = query.limit(limit).all()
        
        # Формируем ответ
        log_items = []
        for log in logs:
            log_items.append(AdminLogItem(
                id=str(log.id),
                user_id=str(log.user_id),
                user_email=log.user.email,
                session_id=log.session_id,
                status=log.status,
                error_type=log.error_type,
                error_message=log.error_message,
                prompts_count=log.prompts_count,
                successful_count=log.successful_count,
                failed_count=log.failed_count,
                duration_seconds=log.duration_seconds,
                timestamp=log.timestamp
            ))
        
        return AdminLogListResponse(
            total=total,
            logs=log_items
        )


# Глобальный экземпляр
admin_service = AdminService()

