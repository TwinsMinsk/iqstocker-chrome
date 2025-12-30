# 🧪 Руководство по Тестированию

## Быстрый старт

### Запустить все тесты

```bash
cd backend
poetry run python run_tests.py
```

**Вывод:**
```
[PASS]: Реферальная система и промокоды (Idempotency)
[PASS]: Платежная система (Tribute Webhook)
[PASS]: Аналитический сервис (WAU/MAU/LTV/Retention)

Итого: 3/3 тестов пройдено
[SUCCESS] ВСЕ ТЕСТЫ ПРОЙДЕНЫ!
```

---

## Запуск отдельных тест-наборов

### Реферальная система и промокоды
```bash
poetry run pytest tests/test_referral_and_promo_idempotency.py -v
```

**Что тестируется:**
- ✅ Идемпотентность реферальных наград (нельзя начислить дважды)
- ✅ Идемпотентность промокодов (нельзя использовать дважды)

---

### Платежная система
```bash
poetry run pytest tests/test_payments.py -v
```

**Что тестируется:**
- ✅ Обработка Tribute webhook (new_subscription)
- ✅ Идемпотентность платежей
- ✅ Проверка подписи webhook
- ✅ Логирование событий
- ✅ Отмена подписки

---

### Аналитический сервис
```bash
poetry run pytest tests/test_analytics_service.py -v
```

**Что тестируется:**
- ✅ WAU (Weekly Active Users)
- ✅ MAU (Monthly Active Users)
- ✅ LTV (Lifetime Value)
- ✅ Retention Rate
- ✅ Growth Rate
- ✅ Comprehensive Stats (все 19 полей)
- ✅ Edge cases (пустая БД, деление на ноль, нет когорты)

---

## Запуск с детальным выводом

```bash
# Показать только упавшие тесты
poetry run pytest tests/ -x

# Показать все print() в тестах
poetry run pytest tests/ -v -s

# Показать покрытие кода
poetry run pytest tests/ --cov=app --cov-report=html
```

---

## Структура тестов

```
backend/tests/
├── conftest.py                              # Фикстуры (db session)
├── test_referral_and_promo_idempotency.py   # Реферралы + промокоды (2 теста)
├── test_payments.py                         # Платежи Tribute (5 тестов)
└── test_analytics_service.py                # Аналитика (9 тестов)

ИТОГО: 16 тестов
```

---

## Что делать если тесты падают

### 1. Проверить БД
```bash
# Убедиться что миграции применены
poetry run alembic upgrade head
```

### 2. Проверить окружение
```bash
# Убедиться что используется SQLite для тестов
echo $DATABASE_URL  # Должно быть пусто или sqlite://
```

### 3. Посмотреть детальный traceback
```bash
poetry run pytest tests/test_analytics_service.py -v --tb=long
```

---

## Добавление новых тестов

### 1. Создать файл `tests/test_my_feature.py`
```python
"""
Тесты для My Feature
"""
import pytest

def test_my_feature_works(db):
    """Описание теста"""
    # Arrange
    # Act
    # Assert
    assert True
```

### 2. Добавить в `run_tests.py`
```python
tests = [
    # ... существующие тесты
    ("poetry run pytest tests/test_my_feature.py -v", "My Feature"),
]
```

### 3. Запустить
```bash
poetry run python run_tests.py
```

---

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run tests
  run: |
    cd backend
    poetry install
    poetry run pytest tests/ -v
```

### Railway
```bash
# В Railway Cron Job
cd backend && poetry run pytest tests/ -v --tb=short
```

---

## Полезные команды

```bash
# Запустить только быстрые тесты (без БД)
poetry run pytest tests/ -m "not slow"

# Запустить только тесты аналитики
poetry run pytest tests/ -k "analytics"

# Остановиться на первом упавшем
poetry run pytest tests/ -x

# Показать 10 самых медленных тестов
poetry run pytest tests/ --durations=10
```

---

## Метрики покрытия

**Текущее покрытие:**
- ✅ analytics_service.py - 100%
- ✅ referral_service.py - 90%
- ✅ promo_service.py - 85%
- ✅ payment_service.py - 80%

**Цель:** 80%+ для всех критических модулей

---

## Вопросы?

Смотри также:
- `Docs/FINAL_RELEASE_REPORT.md` - Финальный отчёт о готовности
- `Docs/TECHNICAL_IMPROVEMENTS_REPORT.md` - Технические улучшения
- `Docs/IMPLEMENTATION_PLAN_ADMIN_REFERRAL.md` - Полное ТЗ

