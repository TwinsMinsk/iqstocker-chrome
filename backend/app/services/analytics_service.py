"""
AnalyticsService - Сборщик ежедневной статистики
Запускается через Cron (Railway Cron Job или Celery Beat)
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, cast, Date
from datetime import date, datetime, timedelta
from decimal import Decimal
import logging

from app.models.daily_analytics import DailyAnalytics
from app.models.user import User
from app.models.transaction import Transaction
from app.models.extension_log import ExtensionLog

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Сервис для сбора и агрегации аналитики"""
    
    @staticmethod
    def collect_daily_stats(db: Session, target_date: date = None) -> DailyAnalytics:
        """
        Собрать статистику за указанный день.
        По умолчанию — за вчера.
        
        Запускать через Cron ежедневно в 00:05 UTC.
        """
        if target_date is None:
            target_date = date.today() - timedelta(days=1)
        
        logger.info(f"Collecting analytics for {target_date}")
        
        # Границы дня
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = datetime.combine(target_date, datetime.max.time())
        
        # 1. Новые пользователи
        new_users = db.query(func.count(User.id)).filter(
            cast(User.created_at, Date) == target_date
        ).scalar() or 0
        
        # 2. DAU (уникальные пользователи с генерациями)
        dau = db.query(func.count(distinct(ExtensionLog.user_id))).filter(
            ExtensionLog.timestamp >= day_start,
            ExtensionLog.timestamp <= day_end,
            ExtensionLog.status.in_(['success', 'completed'])
        ).scalar() or 0
        
        # 3. Revenue (сумма успешных транзакций)
        revenue = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.completed_at >= day_start,
            Transaction.completed_at <= day_end,
            Transaction.status == 'completed'
        ).scalar() or Decimal('0')
        
        # 4. Paying users (уникальные плательщики)
        paying_users = db.query(func.count(distinct(Transaction.user_id))).filter(
            Transaction.completed_at >= day_start,
            Transaction.completed_at <= day_end,
            Transaction.status == 'completed'
        ).scalar() or 0
        
        # 5. Total generations
        total_gens = db.query(func.coalesce(func.sum(ExtensionLog.successful_count), 0)).filter(
            ExtensionLog.timestamp >= day_start,
            ExtensionLog.timestamp <= day_end
        ).scalar() or 0
        
        # 6. Total prompts
        total_prompts = db.query(func.coalesce(func.sum(ExtensionLog.prompts_count), 0)).filter(
            ExtensionLog.timestamp >= day_start,
            ExtensionLog.timestamp <= day_end
        ).scalar() or 0
        
        # 7. New referrals
        new_referrals = db.query(func.count(User.id)).filter(
            cast(User.created_at, Date) == target_date,
            User.referred_by_id.isnot(None)
        ).scalar() or 0
        
        # 8. Referral rewards paid
        from app.models.credit_transaction import CreditTransaction, CreditTransactionType
        rewards_paid = db.query(func.coalesce(func.sum(CreditTransaction.amount), 0)).filter(
            cast(CreditTransaction.created_at, Date) == target_date,
            CreditTransaction.type == CreditTransactionType.REFERRAL_REWARD.value
        ).scalar() or 0
        
        # Upsert в daily_analytics
        existing = db.query(DailyAnalytics).filter(DailyAnalytics.date == target_date).first()
        
        if existing:
            existing.new_users_count = new_users
            existing.active_users_dau = dau
            existing.revenue_eur = revenue
            existing.paying_users_count = paying_users
            existing.total_generations = total_gens
            existing.total_prompts = total_prompts
            existing.new_referrals_count = new_referrals
            existing.referral_rewards_paid = rewards_paid
            analytics = existing
        else:
            analytics = DailyAnalytics(
                date=target_date,
                new_users_count=new_users,
                active_users_dau=dau,
                revenue_eur=revenue,
                paying_users_count=paying_users,
                total_generations=total_gens,
                total_prompts=total_prompts,
                new_referrals_count=new_referrals,
                referral_rewards_paid=rewards_paid
            )
            db.add(analytics)
        
        db.commit()
        db.refresh(analytics)
        
        logger.info(
            f"Analytics collected for {target_date}: "
            f"DAU={dau}, new_users={new_users}, revenue={revenue}"
        )
        
        return analytics
    
    @staticmethod
    def get_wau(db: Session, end_date: date) -> int:
        """
        WAU (Weekly Active Users) - уникальные пользователи с активностью за последние 7 дней.
        Активность = запуск расширения или генерация.
        """
        week_start = end_date - timedelta(days=7)
        week_start_dt = datetime.combine(week_start, datetime.min.time())
        end_date_dt = datetime.combine(end_date, datetime.max.time())
        
        wau = db.query(func.count(distinct(ExtensionLog.user_id))).filter(
            ExtensionLog.timestamp >= week_start_dt,
            ExtensionLog.timestamp <= end_date_dt,
            ExtensionLog.status.in_(['success', 'completed'])
        ).scalar() or 0
        
        return wau
    
    @staticmethod
    def get_mau(db: Session, end_date: date) -> int:
        """
        MAU (Monthly Active Users) - уникальные пользователи с активностью за последние 30 дней.
        Активность = запуск расширения или генерация.
        """
        month_start = end_date - timedelta(days=30)
        month_start_dt = datetime.combine(month_start, datetime.min.time())
        end_date_dt = datetime.combine(end_date, datetime.max.time())
        
        mau = db.query(func.count(distinct(ExtensionLog.user_id))).filter(
            ExtensionLog.timestamp >= month_start_dt,
            ExtensionLog.timestamp <= end_date_dt,
            ExtensionLog.status.in_(['success', 'completed'])
        ).scalar() or 0
        
        return mau
    
    @staticmethod
    def get_ltv(db: Session) -> float:
        """
        LTV (Lifetime Value) - средний доход с платящего пользователя за все время.
        Считается только для пользователей, которые платили хотя бы раз.
        """
        # Для каждого платящего считаем сумму всех его транзакций
        user_revenue_subq = db.query(
            Transaction.user_id,
            func.sum(Transaction.amount).label('total_revenue')
        ).filter(
            Transaction.status == 'completed'
        ).group_by(Transaction.user_id).subquery()
        
        # Средний LTV
        avg_ltv = db.query(func.coalesce(func.avg(user_revenue_subq.c.total_revenue), 0)).scalar() or 0
        
        return float(avg_ltv)
    
    @staticmethod
    def get_retention_rate(db: Session, start_date: date, end_date: date) -> float:
        """
        Retention платящих (30 дней): % тех, кто платил в месяце N-1 и купил снова в месяце N.
        
        Алгоритм:
        1. Находим платящих в месяце N-1 (базовая когорта)
        2. Находим, сколько из них платили снова в месяце N
        3. Retention = (платящие в N из когорты N-1) / (вся когорта N-1) * 100
        """
        # Месяц N-1 (предыдущий месяц)
        prev_month_start = start_date - timedelta(days=30)
        prev_month_end = start_date - timedelta(days=1)
        
        prev_month_start_dt = datetime.combine(prev_month_start, datetime.min.time())
        prev_month_end_dt = datetime.combine(prev_month_end, datetime.max.time())
        
        # Месяц N (текущий период)
        month_start_dt = datetime.combine(start_date, datetime.min.time())
        month_end_dt = datetime.combine(end_date, datetime.max.time())
        
        # Базовая когорта: платящие в месяце N-1
        cohort = db.query(Transaction.user_id.label('user_id')).filter(
            Transaction.completed_at >= prev_month_start_dt,
            Transaction.completed_at <= prev_month_end_dt,
            Transaction.status == 'completed'
        ).distinct().subquery()
        
        cohort_size = db.query(func.count()).select_from(cohort).scalar() or 0
        
        if cohort_size == 0:
            return 0.0
        
        # Платящие из когорты, которые купили снова в месяце N
        retained = db.query(func.count(distinct(Transaction.user_id))).filter(
            Transaction.user_id.in_(db.query(cohort.c.user_id)),
            Transaction.completed_at >= month_start_dt,
            Transaction.completed_at <= month_end_dt,
            Transaction.status == 'completed'
        ).scalar() or 0
        
        retention_rate = (retained / cohort_size) * 100.0 if cohort_size > 0 else 0.0
        
        return round(retention_rate, 2)
    
    @staticmethod
    def get_growth_rate(db: Session, start_date: date, end_date: date) -> float:
        """
        Темп роста пользователей: % изменения новых пользователей к прошлому месяцу.
        """
        # Текущий месяц
        current_month_start = start_date
        current_month_end = end_date
        
        # Предыдущий месяц (такой же период, но месяц назад)
        days_in_period = (end_date - start_date).days + 1
        prev_month_end = start_date - timedelta(days=1)
        prev_month_start = prev_month_end - timedelta(days=days_in_period - 1)
        
        # Новые пользователи в текущем месяце
        current_new = db.query(func.count(User.id)).filter(
            cast(User.created_at, Date) >= current_month_start,
            cast(User.created_at, Date) <= current_month_end
        ).scalar() or 0
        
        # Новые пользователи в предыдущем месяце
        prev_new = db.query(func.count(User.id)).filter(
            cast(User.created_at, Date) >= prev_month_start,
            cast(User.created_at, Date) <= prev_month_end
        ).scalar() or 0
        
        if prev_new == 0:
            return 100.0 if current_new > 0 else 0.0
        
        growth_rate = ((current_new - prev_new) / prev_new) * 100.0
        return round(growth_rate, 2)
    
    @staticmethod
    def get_comprehensive_stats(db: Session, start_date: date, end_date: date) -> dict:
        """
        Получить все метрики для дашборда (гибридный подход).
        
        Returns:
            Dict со всеми метриками для DashboardStatsResponse
        """
        # 1. Быстрые метрики из DailyAnalytics
        stats = db.query(
            func.coalesce(func.sum(DailyAnalytics.new_users_count), 0).label('new_users'),
            func.coalesce(func.sum(DailyAnalytics.revenue_eur), 0).label('revenue'),
            func.coalesce(func.sum(DailyAnalytics.total_generations), 0).label('generations'),
            func.coalesce(func.avg(DailyAnalytics.active_users_dau), 0).label('dau_avg'),
            func.coalesce(func.sum(DailyAnalytics.new_referrals_count), 0).label('referrals'),
        ).filter(
            DailyAnalytics.date >= start_date,
            DailyAnalytics.date <= end_date
        ).first()
        
        # 2. Общее количество пользователей
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        # 3. Новые пользователи за месяц
        new_users_month = int(stats.new_users or 0)
        
        # 4. DAU (среднее за период)
        dau_count = int(stats.dau_avg or 0)
        dau_percentage = (dau_count / total_users * 100.0) if total_users > 0 else 0.0
        
        # 5. WAU (считаем "на лету")
        wau_count = AnalyticsService.get_wau(db, end_date)
        wau_percentage = (wau_count / total_users * 100.0) if total_users > 0 else 0.0
        
        # 6. MAU (считаем "на лету")
        mau_count = AnalyticsService.get_mau(db, end_date)
        mau_percentage = (mau_count / total_users * 100.0) if total_users > 0 else 0.0
        
        # 7. Платящие пользователи за месяц (уникальные)
        month_start_dt = datetime.combine(start_date, datetime.min.time())
        month_end_dt = datetime.combine(end_date, datetime.max.time())
        
        paying_users_month = db.query(func.count(distinct(Transaction.user_id))).filter(
            Transaction.completed_at >= month_start_dt,
            Transaction.completed_at <= month_end_dt,
            Transaction.status == 'completed'
        ).scalar() or 0
        
        paying_users_percentage = (paying_users_month / total_users * 100.0) if total_users > 0 else 0.0
        
        # 8. Revenue
        total_revenue_eur = float(stats.revenue or 0)
        
        # 9. AOV (Average Order Value) - средний чек за месяц
        transaction_count = db.query(func.count(Transaction.id)).filter(
            Transaction.completed_at >= month_start_dt,
            Transaction.completed_at <= month_end_dt,
            Transaction.status == 'completed'
        ).scalar() or 0
        
        average_check = (total_revenue_eur / transaction_count) if transaction_count > 0 else 0.0
        
        # 10. LTV (считаем "на лету")
        ltv = AnalyticsService.get_ltv(db)
        
        # 11. Retention (считаем "на лету")
        retention_rate = AnalyticsService.get_retention_rate(db, start_date, end_date)
        
        # 12. Темп роста
        growth_rate = AnalyticsService.get_growth_rate(db, start_date, end_date)
        
        return {
            "period_start": start_date,
            "period_end": end_date,
            "total_users": total_users,
            "new_users_month": new_users_month,
            "growth_rate": growth_rate,
            "dau_count": dau_count,
            "dau_percentage": round(dau_percentage, 2),
            "wau_count": wau_count,
            "wau_percentage": round(wau_percentage, 2),
            "mau_count": mau_count,
            "mau_percentage": round(mau_percentage, 2),
            "paying_users_month": paying_users_month,
            "paying_users_percentage": round(paying_users_percentage, 2),
            "total_revenue_eur": total_revenue_eur,
            "average_check": round(average_check, 2),
            "ltv": round(ltv, 2),
            "retention_rate": retention_rate,
            "total_generations": int(stats.generations or 0),
            "new_referrals": int(stats.referrals or 0),
        }
    
    @staticmethod
    def backfill(db: Session, days: int = 30):
        """Заполнить статистику за последние N дней"""
        today = date.today()
        for i in range(days, 0, -1):
            target = today - timedelta(days=i)
            AnalyticsService.collect_daily_stats(db, target)
            logger.info(f"Backfilled: {target}")


analytics_service = AnalyticsService()

