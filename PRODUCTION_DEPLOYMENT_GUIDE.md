# 🚀 PRODUCTION DEPLOYMENT GUIDE

> **Версия**: 1.0.0  
> **Дата**: 25.12.2025  
> **Статус**: Ready for Production

---

## 📋 СОДЕРЖАНИЕ

1. [Предварительные требования](#предварительные-требования)
2. [Подготовка окружения](#подготовка-окружения)
3. [Конфигурация](#конфигурация)
4. [Деплой](#деплой)
5. [Проверка работоспособности](#проверка-работоспособности)
6. [Мониторинг](#мониторинг)
7. [Резервное копирование](#резервное-копирование)
8. [Обслуживание](#обслуживание)
9. [Troubleshooting](#troubleshooting)

---

## 📦 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

### Системные требования

**Сервер**:
- OS: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- CPU: 2+ cores
- RAM: 4GB+ (рекомендуется 8GB)
- Disk: 50GB+ SSD
- Docker: 20.10+
- Docker Compose: 2.0+

**Локальная разработка (Windows)**:
- Windows 10/11
- Docker Desktop
- PowerShell 5.1+
- Git

### Доменное имя и SSL

- [ ] Зарегистрирован домен (например, yourdomain.com)
- [ ] DNS настроен (A-записи указывают на IP сервера)
- [ ] SSL сертификат (Let's Encrypt или коммерческий)

### Внешние сервисы

- [ ] **PostgreSQL** (можно использовать встроенный Docker контейнер)
- [ ] **Redis** (опционально, можно использовать встроенный)
- [ ] **SendGrid** аккаунт для email (опционально)
- [ ] **Sentry** проект для мониторинга ошибок (опционально)
- [ ] **Telegram Tribute** API для платежей

---

## 🔧 ПОДГОТОВКА ОКРУЖЕНИЯ

### 1. Установка Docker и Docker Compose

#### Ubuntu/Debian

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установить Docker Compose
sudo apt install docker-compose-plugin

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Перезайти или перезагрузиться
```

#### Windows

1. Скачать и установить [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Включить WSL 2 backend
3. Перезагрузить систему

### 2. Клонирование репозитория

```bash
# На сервере
git clone https://your-repo-url/iqstocker-chrome.git
cd iqstocker-chrome
```

### 3. Создание директорий

```bash
# Создать необходимые директории
mkdir -p backend/logs
mkdir -p backend/backup
mkdir -p nginx/logs
mkdir -p nginx/ssl
```

---

## ⚙️ КОНФИГУРАЦИЯ

### 1. Backend конфигурация

```bash
# Копировать example файл
cp backend/env.example backend/.env

# Редактировать .env
nano backend/.env
```

**Критичные настройки для production**:

```env
# Database
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@postgres:5432/iqstocker_db
USE_SQLITE=false

# Redis
REDIS_URL=redis://:STRONG_PASSWORD@redis:6379/0

# Security (ОБЯЗАТЕЛЬНО СГЕНЕРИРОВАТЬ НОВЫЕ!)
SECRET_KEY=your-generated-secret-key-here
SESSION_TOKEN_SECRET=your-generated-session-token-here

# Environment
ENVIRONMENT=production
DEBUG=false

# CORS (ваш реальный домен)
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]
ALLOWED_HOSTS=["yourdomain.com","www.yourdomain.com"]

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Telegram Tribute
TRIBUTE_API_KEY=your-tribute-api-key
TRIBUTE_WEBHOOK_SECRET=your-tribute-webhook-secret
```

**Генерация секретных ключей**:

```bash
# Для SECRET_KEY и SESSION_TOKEN_SECRET
openssl rand -hex 32

# Или через Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Frontend конфигурация

```bash
# Копировать example файл
cp frontend/env.example frontend/.env

# Редактировать
nano frontend/.env
```

```env
# API URL (ваш реальный домен)
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1

# NextAuth
NEXTAUTH_SECRET=your-generated-nextauth-secret
NEXTAUTH_URL=https://yourdomain.com

# Environment
NODE_ENV=production
```

### 3. Docker Compose конфигурация

```bash
# Копировать example
cp env.prod.example .env

# Редактировать
nano .env
```

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
POSTGRES_DB=iqstocker_db
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=STRONG_PASSWORD_HERE
REDIS_PORT=6379

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

# API URL
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
```

### 4. SSL сертификаты

#### Через Let's Encrypt (бесплатно, рекомендуется)

```bash
# Установить certbot
sudo apt install certbot

# Получить сертификат (остановите nginx если запущен)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Копировать сертификаты
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

#### Автообновление сертификатов

```bash
# Добавить в crontab
sudo crontab -e

# Добавить строку (обновление каждые 12 часов)
0 */12 * * * certbot renew --quiet --deploy-hook "docker-compose -f /path/to/docker-compose.prod.yml restart nginx"
```

### 5. Nginx конфигурация

Отредактируйте `nginx/nginx.conf`:

```nginx
# Замените yourdomain.com на ваш реальный домен
server_name yourdomain.com www.yourdomain.com;

# Проверьте пути к SSL сертификатам
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

---

## 🚀 ДЕПЛОЙ

### Автоматический деплой (рекомендуется)

#### Windows (PowerShell)

```powershell
# Перейти в директорию проекта
cd C:\Project\Perplexity Cursor

# Запустить скрипт деплоя
.\scripts\deploy.ps1
```

#### Linux/Mac

```bash
# Перейти в директорию проекта
cd /path/to/iqstocker-chrome

# Сделать скрипт исполняемым
chmod +x scripts/deploy.sh

# Запустить деплой
./scripts/deploy.sh
```

### Ручной деплой

```bash
# 1. Остановить старые контейнеры
docker-compose -f docker-compose.prod.yml down

# 2. Создать backup (если есть данные)
docker exec iqstocker-postgres pg_dump -U postgres iqstocker_db > backup_$(date +%Y%m%d).sql

# 3. Собрать образы
docker-compose -f docker-compose.prod.yml build --no-cache

# 4. Запустить контейнеры
docker-compose -f docker-compose.prod.yml up -d

# 5. Подождать запуска БД
sleep 10

# 6. Запустить миграции
docker exec iqstocker-backend poetry run alembic upgrade head

# 7. Проверить статус
docker-compose -f docker-compose.prod.yml ps
```

---

## ✅ ПРОВЕРКА РАБОТОСПОСОБНОСТИ

### 1. Health Checks

```bash
# Backend health
curl http://localhost:8000/health
# Ожидается: {"status":"healthy",...}

# Frontend health
curl http://localhost:3000/api/health
# Ожидается: {"status":"healthy",...}
```

### 2. Проверка сервисов

```bash
# Статус всех контейнеров
docker-compose -f docker-compose.prod.yml ps

# Логи backend
docker logs iqstocker-backend --tail 100

# Логи frontend
docker logs iqstocker-frontend --tail 100

# Логи PostgreSQL
docker logs iqstocker-postgres --tail 50
```

### 3. Проверка доступности

- **Frontend**: https://yourdomain.com
- **Backend API**: https://yourdomain.com/api/v1
- **API Docs**: https://yourdomain.com/api/docs
- **Health**: https://yourdomain.com/health

### 4. Функциональное тестирование

1. **Регистрация**: Создать нового пользователя
2. **Логин**: Войти в систему
3. **Dashboard**: Проверить загрузку дашборда
4. **API**: Проверить генерацию license key

```bash
# Тест API через curl
curl -X POST https://yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234"}'
```

---

## 📊 МОНИТОРИНГ

### 1. Запуск мониторинга (опционально)

```bash
# Запустить Prometheus + Grafana
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

**Доступ**:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin / admin)

### 2. Логи

```bash
# Просмотр логов в реальном времени
docker-compose -f docker-compose.prod.yml logs -f

# Логи конкретного сервиса
docker-compose -f docker-compose.prod.yml logs -f backend

# Сохранить логи в файл
docker-compose -f docker-compose.prod.yml logs > logs_$(date +%Y%m%d).txt
```

### 3. Метрики

```bash
# Использование ресурсов
docker stats

# Дисковое пространство
df -h

# Размер Docker volumes
docker system df -v
```

---

## 💾 РЕЗЕРВНОЕ КОПИРОВАНИЕ

### Автоматический бэкап

```bash
# Настроить cron для автоматического бэкапа (каждый день в 2:00)
crontab -e

# Добавить:
0 2 * * * /path/to/backend/scripts/auto_backup_cron.sh
```

### Ручной бэкап

```bash
# Создать бэкап
cd backend
./scripts/backup_db.sh

# Восстановить бэкап
./scripts/restore_db.sh ./backup/iqstocker_20251225_120000.sql.gz
```

Подробнее: см. [BACKUP_STRATEGY.md](BACKUP_STRATEGY.md)

---

## 🔧 ОБСЛУЖИВАНИЕ

### Обновление приложения

```bash
# 1. Pull новый код
git pull origin main

# 2. Создать бэкап
docker exec iqstocker-postgres pg_dump -U postgres iqstocker_db > backup_before_update.sql

# 3. Пересобрать и перезапустить
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 4. Запустить миграции
docker exec iqstocker-backend poetry run alembic upgrade head
```

### Очистка

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Удалить неиспользуемые volumes
docker volume prune

# Полная очистка Docker
docker system prune -a --volumes
```

### Масштабирование

```bash
# Увеличить количество backend воркеров
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

---

## 🔥 TROUBLESHOOTING

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker logs iqstocker-backend --tail 100

# Проверить конфигурацию
docker-compose -f docker-compose.prod.yml config

# Пересоздать контейнер
docker-compose -f docker-compose.prod.yml up -d --force-recreate backend
```

### Проблема: База данных недоступна

```bash
# Проверить статус PostgreSQL
docker exec iqstocker-postgres pg_isready

# Перезапустить PostgreSQL
docker-compose -f docker-compose.prod.yml restart postgres

# Проверить логи PostgreSQL
docker logs iqstocker-postgres
```

### Проблема: Миграции не применяются

```bash
# Проверить текущую версию миграции
docker exec iqstocker-backend poetry run alembic current

# История миграций
docker exec iqstocker-backend poetry run alembic history

# Откатить последнюю миграцию
docker exec iqstocker-backend poetry run alembic downgrade -1

# Применить заново
docker exec iqstocker-backend poetry run alembic upgrade head
```

### Проблема: Frontend не подключается к Backend

1. Проверить `NEXT_PUBLIC_API_URL` в `frontend/.env`
2. Проверить CORS настройки в `backend/.env`
3. Проверить Nginx конфигурацию
4. Проверить health endpoint: `curl http://localhost:8000/health`

### Проблема: SSL сертификаты не работают

```bash
# Проверить сертификаты
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Проверить права доступа
ls -la nginx/ssl/

# Перезапустить Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 📞 ПОДДЕРЖКА

### Чек-лист перед запуском в production

- [ ] Все `.env` файлы настроены
- [ ] Секретные ключи сгенерированы (не используются дефолтные)
- [ ] SSL сертификаты установлены и валидны
- [ ] База данных подключена и миграции применены
- [ ] Backup стратегия настроена
- [ ] Health checks проходят успешно
- [ ] Мониторинг настроен (опционально)
- [ ] DNS настроен корректно
- [ ] Firewall настроен (открыты порты 80, 443)
- [ ] Протестирована регистрация и логин
- [ ] Протестирована интеграция с Telegram Tribute
- [ ] Email рассылка работает (если настроена)

### Контакты

**Разработчик**: _______________  
**Email**: _______________  
**Telegram**: _______________

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- [API Documentation](Docs/API_SPECIFICATION.md)
- [Database Schema](Docs/DATABASE_SCHEMA.md)
- [Backup Strategy](BACKUP_STRATEGY.md)
- [Extension Build Guide](Docs/EXTENSION_BUILD_GUIDE.md)

---

**Последнее обновление**: 25.12.2025  
**Версия**: 1.0.0  
**Статус**: ✅ Ready for Production

