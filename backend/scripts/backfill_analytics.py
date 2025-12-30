#!/usr/bin/env python3
"""
Backfill DailyAnalytics за последние N дней.

Пример:
  poetry run python scripts/backfill_analytics.py 30
"""

import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, BACKEND_ROOT)

from app.db.session import SessionLocal  # noqa: E402
from app.services.analytics_service import analytics_service  # noqa: E402


def main() -> int:
    days = 30
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except ValueError:
            print("Usage: backfill_analytics.py <days:int>")
            return 2

    db = SessionLocal()
    try:
        analytics_service.backfill(db, days=days)
        print(f"✅ Backfill completed: {days} days")
        return 0
    except Exception as e:
        print(f"❌ Backfill failed: {e}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())


