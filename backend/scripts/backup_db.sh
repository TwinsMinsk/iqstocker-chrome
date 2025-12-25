#!/bin/bash
# Скрипт для бэкапа PostgreSQL базы данных

set -e

# Конфигурация
BACKUP_DIR="./backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/iqstocker_${TIMESTAMP}.sql"

# Загружаем переменные окружения
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Создаем директорию для бэкапов
mkdir -p ${BACKUP_DIR}

echo "🔄 Starting database backup..."
echo "📁 Backup file: ${BACKUP_FILE}"

# Извлекаем параметры подключения из DATABASE_URL
# Формат: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Выполняем бэкап
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p -f ${BACKUP_FILE}

# Сжимаем бэкап
gzip ${BACKUP_FILE}

echo "✅ Backup completed: ${BACKUP_FILE}.gz"

# Удаляем старые бэкапы (старше 7 дней)
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete
echo "🧹 Old backups (>7 days) cleaned up"

