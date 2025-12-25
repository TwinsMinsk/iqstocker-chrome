# 🚀 НАЧНИТЕ ОТСЮДА: ДЕПЛОЙ НА RAILWAY

> **Ваш первый деплой за 15 минут**

---

## ✅ ЧТО УЖЕ ГОТОВО

Все файлы подготовлены:
- ✅ Dockerfile для Backend (обновлен для Railway)
- ✅ Dockerfile для Frontend
- ✅ Конфигурация для Railway
- ✅ Пошаговые инструкции

---

## 🎯 С ЧЕГО НАЧАТЬ

### Шаг 1: Откройте инструкцию

👉 **[RAILWAY_STEP_BY_STEP.md](RAILWAY_STEP_BY_STEP.md)** - **НАЧНИТЕ ОТСЮДА!**

Это пошаговая инструкция с детальными объяснениями каждого шага.

### Шаг 2: Следуйте инструкции

Инструкция проведет вас через:
1. ✅ Создание Railway проекта
2. ✅ Настройку PostgreSQL
3. ✅ Деплой Backend
4. ✅ Деплой Frontend
5. ✅ Настройку переменных окружения
6. ✅ Применение миграций
7. ✅ Тестирование

**Время**: ~15 минут

---

## 📋 БЫСТРЫЙ ЧЕК-ЛИСТ

Перед началом убедитесь:

- [ ] Код закоммичен и запушен в Git
- [ ] У вас есть GitHub аккаунт
- [ ] Вы готовы создать Railway аккаунт (бесплатно)

---

## 🔑 ВАЖНЫЕ МОМЕНТЫ

### 1. Секретные ключи

Перед началом сгенерируйте 3 ключа:

```bash
# Выполните 3 раза
openssl rand -hex 32
```

Сохраните их - понадобятся для переменных окружения.

### 2. Root Directory

**КРИТИЧНО!** При создании сервисов в Railway:

- **Backend**: Root Directory = `backend`
- **Frontend**: Root Directory = `frontend`

### 3. Порядок деплоя

1. Сначала PostgreSQL
2. Потом Backend
3. Потом Frontend
4. В конце обновите CORS

---

## 📚 ДОКУМЕНТАЦИЯ

| Документ | Когда использовать |
|----------|-------------------|
| **[RAILWAY_STEP_BY_STEP.md](RAILWAY_STEP_BY_STEP.md)** | 🎯 **Начните отсюда!** Пошаговая инструкция |
| [RAILWAY_QUICK_START.md](RAILWAY_QUICK_START.md) | Если уже знаете Railway |
| [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md) | Полное справочное руководство |

---

## 🆘 НУЖНА ПОМОЩЬ?

### Если что-то не работает:

1. Проверьте логи в Railway Dashboard
2. Убедитесь, что все переменные окружения добавлены
3. Проверьте, что Root Directory указан правильно
4. См. раздел Troubleshooting в [RAILWAY_STEP_BY_STEP.md](RAILWAY_STEP_BY_STEP.md)

---

## 🎉 ПОСЛЕ ДЕПЛОЯ

После успешного деплоя у вас будет:

- ✅ Frontend URL: `https://your-frontend.railway.app`
- ✅ Backend API: `https://your-backend.railway.app`
- ✅ API Docs: `https://your-backend.railway.app/api/docs`

### Следующие шаги:

1. Протестируйте регистрацию и логин
2. Обновите расширение с новым API URL
3. Начните тестирование в облаке!

---

## 🚀 НАЧНИТЕ СЕЙЧАС!

👉 **Откройте [RAILWAY_STEP_BY_STEP.md](RAILWAY_STEP_BY_STEP.md) и следуйте инструкциям!**

**Успешного деплоя! 🎉**

