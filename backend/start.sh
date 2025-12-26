#!/bin/sh
# Скрипт запуска для Railway
# Правильно обрабатывает переменную PORT

PORT=${PORT:-8000}
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"

