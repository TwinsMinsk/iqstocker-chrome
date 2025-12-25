#!/bin/bash
# Скрипт для автоматического бэкапа через cron
# Добавьте в crontab: 0 2 * * * /path/to/auto_backup_cron.sh

set -e

# Переходим в директорию проекта
cd "$(dirname "$0")/.."

# Запускаем бэкап
./scripts/backup_db.sh

# Логируем результат
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed" >> logs/backup.log

