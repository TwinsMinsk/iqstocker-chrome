#!/bin/bash
# Скрипт для восстановления PostgreSQL базы данных из бэкапа

set -e

if [ -z "$1" ]; then
    echo "❌ Использование: ./restore_db.sh <backup_file.sql.gz>"
    echo ""
    echo "📁 Доступные бэкапы:"
    ls -lh ./backup/*.sql.gz 2>/dev/null || echo "  Нет бэкапов"
    exit 1
fi

BACKUP_FILE=$1

# Проверяем существование файла
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл не найден: $BACKUP_FILE"
    exit 1
fi

# Загружаем переменные окружения
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔄 Starting database restore..."
echo "📁 Backup file: ${BACKUP_FILE}"

# Извлекаем параметры подключения
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Подтверждение от пользователя
read -p "⚠️ Это удалит текущую базу данных! Продолжить? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Восстановление отменено"
    exit 1
fi

# Распаковываем и восстанавливаем
echo "📦 Extracting backup..."
gunzip -c ${BACKUP_FILE} | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

echo "✅ Database restored successfully!"

