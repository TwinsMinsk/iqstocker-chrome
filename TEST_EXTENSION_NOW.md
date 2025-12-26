# 🧪 Быстрый тест расширения (v1.0.3)

## Шаг 1: Загрузите расширение в Chrome

```
1. Откройте chrome://extensions
2. Включите "Режим разработчика" (toggle справа вверху)
3. Нажмите "Загрузить распакованное расширение"
4. Выберите папку: C:\Project\Perplexity Cursor\extension\dist
```

## Шаг 2: Проверьте подключение к API

```
1. Кликните на иконку расширения в Chrome
2. Введите ваш лицензионный ключ: sk_live_y8zkwdu8tq042lf
3. Нажмите "✓ Применить"
```

**Ожидаемый результат:**
- ✅ Баланс загрузится (например: "Баланс: 1000 кредитов")
- ✅ Статус: "Ключ валиден"

**Если ошибка "ERR_CONNECTION_REFUSED":**
- ❌ Backend на Railway недоступен
- Проверьте: https://backend-production-40040.up.railway.app/health

## Шаг 3: Проверьте DevTools (опционально)

```
1. Откройте расширение
2. Нажмите F12
3. Перейдите на вкладку "Console"
```

**Должно быть:**
- ✅ `Batch validation...`
- ✅ `https://backend-production-40040.up.railway.app/api/v1/extensions/batch-validate`

**НЕ должно быть:**
- ❌ `localhost:8000`
- ❌ `ERR_CONNECTION_REFUSED`

## Шаг 4: Тест отправки промптов (опционально)

```
1. Откройте Discord: https://discord.com
2. Перейдите в канал с Midjourney
3. В расширении введите тестовый промпт: "a beautiful sunset"
4. Нажмите "▶️ Start"
```

**Ожидаемый результат:**
- ✅ Расширение автоматически найдёт поле ввода
- ✅ Отправит промпт в Discord
- ✅ Баланс уменьшится на 1 кредит

---

## ⚠️ ВАЖНО: Проверьте Railway URL

Production URL: `backend-production-40040.up.railway.app`

Если ваш реальный URL другой, обновите в файлах:
- `extension/src/constants/config.ts`
- `extension/src/manifest.json`

И пересоберите:
```powershell
.\scripts\package-extension.ps1 -Version 1.0.4
```

---

## 📊 Что было исправлено

| Проблема | Решение |
|----------|---------|
| ❌ `localhost:8000` | ✅ `backend-production-40040.up.railway.app` |
| ❌ `ERR_CONNECTION_REFUSED` | ✅ Production API URL |
| ❌ Нет permissions | ✅ Добавлены в manifest.json |
| ❌ Непонятно какой API | ✅ Показано в UI настроек |

## 🚀 Следующий шаг: Деплой

После успешного теста:
```powershell
git add .
git commit -m "Fix extension: configure production API URL v1.0.3"
git push
```

Railway автоматически задеплоит обновлённый `latest.zip` на сайт.

