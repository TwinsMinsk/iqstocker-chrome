# 🧪 СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ - ИНСТРУКЦИЯ

## Способ 1: Через Frontend (РЕКОМЕНДУЕТСЯ)

1. **Откройте:** http://localhost:3000/register
2. **Зарегистрируйтесь:**
   - Email: `test@test.com` (валидный email)
   - Password: `Test1234` (минимум 8 символов, максимум 72 байта)
3. **После регистрации запустите скрипт для обновления баланса:**
   ```powershell
   cd backend
   python create_test_user_simple.py
   ```

## Способ 2: Через API (если frontend не работает)

1. **Убедитесь, что backend запущен** на http://localhost:8000

2. **Зарегистрируйтесь через API:**
   ```powershell
   # Используйте PowerShell или curl
   $body = @{
       email = "test@iqstocker.local"
       password = "Test123"
   } | ConvertTo-Json

   Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/register" `
       -Method Post `
       -Body $body `
       -ContentType "application/json"
   ```

3. **Обновите баланс:**
   ```powershell
   cd backend
   python create_test_user_simple.py
   ```

## Способ 3: Через скрипт create_test_user_api.py

```powershell
cd backend
python create_test_user_api.py
```

Этот скрипт автоматически:
- Зарегистрирует пользователя через API
- Получит лицензионный ключ
- Покажет данные для входа

**Примечание:** Баланс будет 50 кредитов (стандартный при регистрации). 
Для обновления до 100 кредитов используйте `create_test_user_simple.py`

---

## 📋 Данные для входа (после создания):

- **Email:** `test@iqstocker.local`
- **Password:** `Test123`
- **Balance:** 100 кредитов (после запуска скрипта)
- **License Key:** (будет показан в консоли)

---

## 🧪 Тестирование расширения:

1. **Установите расширение:**
   - Откройте Chrome: `chrome://extensions/`
   - Включите "Режим разработчика"
   - Нажмите "Загрузить распакованное расширение"
   - Выберите папку: `extension/dist/`

2. **Авторизуйтесь в расширении:**
   - Откройте расширение (иконка в панели Chrome)
   - Вставьте **License Key** (из вывода скрипта или из личного кабинета)
   - Нажмите "Авторизоваться"

3. **Протестируйте:**
   - Откройте Discord в браузере
   - Перейдите в канал Midjourney
   - Используйте расширение для отправки промптов

