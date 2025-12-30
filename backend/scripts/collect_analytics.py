#!/usr/bin/env python3
"""
Скрипт для сбора ежедневной аналитики (DailyAnalytics).

Запускать через Railway Cron:
- Schedule: 5 0 * * *   (00:05 UTC ежедневно)
- Command:  poetry run python scripts/collect_analytics.py
"""

import os
import sys

# Добавляем backend/ в sys.path для запуска из директории backend/
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, BACKEND_ROOT)

from app.db.session import SessionLocal  # noqa: E402
from app.services.analytics_service import analytics_service  # noqa: E402


def main() -> int:
    db = SessionLocal()
    try:
        analytics_service.collect_daily_stats(db)
        print("✅ Analytics collected successfully")
        return 0
    except Exception as e:
        print(f"❌ Analytics collection failed: {e}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())


