"""
Тесты для AnalyticsService
"""
import pytest
from datetime import date, timedelta
from app.services.analytics_service import analytics_service


def test_get_wau_returns_int(db):
    """WAU должен возвращать целое число"""
    end_date = date.today()
    wau = analytics_service.get_wau(db, end_date)
    assert isinstance(wau, int)
    assert wau >= 0


def test_get_mau_returns_int(db):
    """MAU должен возвращать целое число"""
    end_date = date.today()
    mau = analytics_service.get_mau(db, end_date)
    assert isinstance(mau, int)
    assert mau >= 0


def test_get_ltv_returns_float(db):
    """LTV должен возвращать float"""
    ltv = analytics_service.get_ltv(db)
    assert isinstance(ltv, float)
    assert ltv >= 0.0


def test_get_retention_rate_returns_float(db):
    """Retention rate должен возвращать float от 0 до 100"""
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    retention = analytics_service.get_retention_rate(db, start_date, end_date)
    assert isinstance(retention, float)
    assert 0.0 <= retention <= 100.0


def test_get_growth_rate_returns_float(db):
    """Growth rate должен возвращать float"""
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    growth = analytics_service.get_growth_rate(db, start_date, end_date)
    assert isinstance(growth, float)


def test_get_comprehensive_stats_returns_all_fields(db):
    """Comprehensive stats должен возвращать все необходимые поля"""
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    stats = analytics_service.get_comprehensive_stats(db, start_date, end_date)
    
    # Проверяем наличие всех ключевых полей
    required_fields = [
        'period_start', 'period_end', 'total_users', 'new_users_month', 'growth_rate',
        'dau_count', 'dau_percentage', 'wau_count', 'wau_percentage', 'mau_count', 'mau_percentage',
        'paying_users_month', 'paying_users_percentage', 'total_revenue_eur', 'average_check',
        'ltv', 'retention_rate', 'total_generations', 'new_referrals'
    ]
    
    for field in required_fields:
        assert field in stats, f"Missing field: {field}"
    
    # Проверяем типы ключевых метрик
    assert isinstance(stats['total_users'], int)
    assert isinstance(stats['growth_rate'], float)
    assert isinstance(stats['ltv'], float)
    assert isinstance(stats['retention_rate'], float)
    assert 0.0 <= stats['retention_rate'] <= 100.0


def test_ltv_handles_no_paying_users(db):
    """LTV должен возвращать 0 если нет платящих пользователей"""
    # В пустой БД нет платящих
    ltv = analytics_service.get_ltv(db)
    assert ltv == 0.0


def test_retention_handles_no_cohort(db):
    """Retention должен возвращать 0 если нет когорты"""
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    # В пустой БД нет платящих
    retention = analytics_service.get_retention_rate(db, start_date, end_date)
    assert retention == 0.0


def test_growth_rate_handles_no_previous_users(db):
    """Growth rate должен корректно обрабатывать отсутствие пользователей в прошлом"""
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    # В пустой БД нет пользователей
    growth = analytics_service.get_growth_rate(db, start_date, end_date)
    assert isinstance(growth, float)
    assert growth >= 0.0  # Должен быть 0 или 100 (если в текущем периоде есть юзеры)

