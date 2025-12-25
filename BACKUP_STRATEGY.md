# 💾 Стратегия резервного копирования БД

## Автоматический бэкап

### 1. Через Docker (рекомендуется для production)

```bash
# Создать бэкап
docker exec iqstocker-postgres pg_dump -U postgres iqstocker_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Восстановить бэкап
gunzip -c backup_20251225_120000.sql.gz | docker exec -i iqstocker-postgres psql -U postgres iqstocker_db
```

### 2. Через скрипты

```bash
# Бэкап
cd backend
./scripts/backup_db.sh

# Восстановление
./scripts/restore_db.sh ./backup/iqstocker_20251225_120000.sql.gz
```

## Автоматизация через Cron

### Настройка автоматического бэкапа (каждый день в 2:00 AM)

```bash
# Открыть crontab
crontab -e

# Добавить строку
0 2 * * * /path/to/backend/scripts/auto_backup_cron.sh
```

## Стратегия хранения

### Политика ретеншна (сохранения)
- **Ежедневные**: хранить 7 дней
- **Еженедельные**: хранить 4 недели
- **Ежемесячные**: хранить 6 месяцев

### Автоматическая очистка старых бэкапов

Скрипт `backup_db.sh` автоматически удаляет бэкапы старше 7 дней.

Для более гибкой настройки создайте скрипт:

```bash
# Удалить бэкапы старше 7 дней
find ./backup -name "*.sql.gz" -mtime +7 -delete

# Удалить все кроме последних 10 бэкапов
ls -t ./backup/*.sql.gz | tail -n +11 | xargs rm -f
```

## Облачное хранение

### AWS S3

```bash
# Установить AWS CLI
pip install awscli

# Настроить
aws configure

# Загрузить бэкап в S3
aws s3 cp backup_20251225.sql.gz s3://your-bucket/backups/

# Автоматическая синхронизация
aws s3 sync ./backup s3://your-bucket/backups/ --exclude "*" --include "*.sql.gz"
```

### Google Cloud Storage

```bash
# Установить gcloud CLI
# Настроить аутентификацию

# Загрузить бэкап
gsutil cp backup_20251225.sql.gz gs://your-bucket/backups/
```

## Docker Volume Backup

### Бэкап volumes PostgreSQL

```bash
# Создать бэкап volume
docker run --rm \
  -v iqstocker_postgres_data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/postgres_volume_$(date +%Y%m%d).tar.gz -C /data .

# Восстановить volume
docker run --rm \
  -v iqstocker_postgres_data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/postgres_volume_20251225.tar.gz -C /data
```

## Проверка бэкапов

### Тестирование восстановления

Регулярно проверяйте, что бэкапы можно восстановить:

```bash
# 1. Создать тестовую базу
docker exec iqstocker-postgres psql -U postgres -c "CREATE DATABASE test_restore"

# 2. Восстановить бэкап в тестовую БД
gunzip -c backup_latest.sql.gz | docker exec -i iqstocker-postgres psql -U postgres test_restore

# 3. Проверить данные
docker exec iqstocker-postgres psql -U postgres test_restore -c "SELECT COUNT(*) FROM users"

# 4. Удалить тестовую БД
docker exec iqstocker-postgres psql -U postgres -c "DROP DATABASE test_restore"
```

## Мониторинг бэкапов

### Проверка наличия свежих бэкапов

```bash
# Найти последний бэкап
ls -lht ./backup/*.sql.gz | head -1

# Проверить, что бэкап был сделан в последние 24 часа
find ./backup -name "*.sql.gz" -mtime -1
```

### Алерты

Настройте оповещения, если:
- Бэкап не был создан в течение 24 часов
- Размер бэкапа значительно отличается от предыдущих
- Ошибка при создании бэкапа

## Чек-лист для production

- [ ] Настроен автоматический ежедневный бэкап
- [ ] Бэкапы хранятся в 2+ местах (локально + облако)
- [ ] Протестировано восстановление из бэкапа
- [ ] Настроена автоматическая очистка старых бэкапов
- [ ] Настроены алерты при сбоях бэкапа
- [ ] Документирована процедура восстановления
- [ ] Бэкапы зашифрованы (для чувствительных данных)

## Шифрование бэкапов (опционально)

### С помощью GPG

```bash
# Создать зашифрованный бэкап
./scripts/backup_db.sh
gpg --symmetric --cipher-algo AES256 backup_latest.sql.gz

# Расшифровать
gpg --decrypt backup_latest.sql.gz.gpg > backup_latest.sql.gz
```

## Контакты для экстренного восстановления

**Ответственный за бэкапы**: _______________  
**Телефон**: _______________  
**Email**: _______________

---

**Последнее обновление**: 25.12.2025  
**Версия**: 1.0.0

