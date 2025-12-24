# Руководство по работе с промптами

## Проблема с пропуском промптов

### Причина
Ранее при вводе промптов автоматически удалялись **пустые строки**, которые служат разделителями между промптами. Это приводило к тому, что:
- Промпты склеивались в один
- Парсер не мог правильно определить границы промптов
- Некоторые промпты пропускались

### Решение
Теперь **пустые строки сохраняются** и используются как разделители. Добавлена кнопка **"✨ Форматировать"** для автоматической обработки промптов.

---

## Как использовать кнопку "Форматировать"

### Шаг 1: Вставьте промпты
Скопируйте ваши промпты в текстовое поле. Они могут быть в любом формате:

```
1. /imagine prompt: Stock style, hyper realistic...
 
 
2. /imagine prompt: Stock style, hyper realistic...
 
 
3. /imagine prompt: Stock style, hyper realistic...
```

### Шаг 2: Нажмите "✨ Форматировать"
Кнопка автоматически:
1. **Распарсит** промпты (разделит по пустым строкам и номерам)
2. **Очистит** от лишних пробелов и переносов
3. **Пронумерует** каждый промпт
4. **Отформатирует** с правильными разделителями
5. **Подсчитает** количество валидных промптов

### Результат
```
1. /imagine prompt: Stock style, hyper realistic, high quality photo of a vibrant cocktail glass filled with a refreshing red drink, featuring ice cubes and orange slices, elegantly positioned on a pastel pink table. The backdrop is a smooth purple wall with a soft light casting an intriguing shadow. The glass has a clear straw for sipping. The image is framed to emphasize the cocktail and surrounding colors, captured using a Canon EOS R5 camera, with natural lighting enhancing the rich hues. Color correction adds warmth and saturation, creating a lively, inviting style --ar 16:9

2. /imagine prompt: Stock style, hyper realistic, high quality photo of a vintage brass service bell resting on a polished wooden counter, showcasing the intricate details of the bell's design and the warm tones of the wood; the background features a softly blurred reception area of a cozy hotel with warm ambient lighting illuminating the scene, captured with a Canon EOS R5 camera; color correction emphasizes warm golden hues while maintaining clarity and depth in focus --ar 16:9

3. /imagine prompt: Stock style, hyper realistic, high quality photo of wooden blocks arranged to form a checkmark symbol with a square outline, showcasing fine grain texture and warm tones, set on a rustic wooden table, blurred chess pieces in the background creating depth, shot with a Canon EOS 5D Mark IV, soft natural lighting enhancing the wood's color, balanced color correction for realism, modern minimalist style --ar 16:9

4. /imagine prompt: Stock style, hyper realistic, high quality photo of a shimmering golden arrow pointing upwards, symbolizing growth and success. The arrow is surrounded by a cascade of golden confetti that sparkles against a dark background, enhancing its visual impact. The scene is framed in a close-up perspective, with a soft bokeh effect in the background, creating depth. Captured with a Canon EOS R5, the lighting is dramatic, highlighting the textures and reflections on the arrow's surface. Color correction emphasizes warm gold tones against the cool black backdrop, contributing to an elegant and motivational style --ar 16:9
```

---

## Что делает форматирование

### 1. Парсинг
- Разделяет текст по **пустым строкам**
- Распознаёт начало нового промпта по:
  - Номеру (например, `1.`, `2.`)
  - Префиксу `/imagine`

### 2. Очистка
- Удаляет **лишние пробелы** внутри промпта
- Удаляет **лишние переносы строк**
- Сохраняет **параметры** (например, `--ar 16:9`)

### 3. Форматирование
- Нумерует каждый промпт: `1.`, `2.`, `3.`...
- Добавляет **пустую строку** между промптами
- Убирает дублирующие пробелы

### 4. Подсчёт
- Показывает **реальное количество** промптов
- Учитывает только **валидные** промпты (с `/imagine`)

---

## Примеры форматирования

### До форматирования
```
1. /imagine prompt: Stock style, hyper realistic, high quality photo of a vibrant cocktail glass filled with a refreshing red drink, featuring ice cubes and orange slices, elegantly positioned on a pastel pink table. The backdrop is a smooth purple wall with a soft light casting an intriguing shadow. The glass has a clear straw for sipping. The image is framed to emphasize the cocktail and surrounding colors, captured using a Canon EOS R5 camera, with natural lighting enhancing the rich hues. Color correction adds warmth and saturation, creating a lively, inviting style --ar 16:9
 
 
2. /imagine prompt: Stock style, hyper realistic, high quality photo of a vintage brass service bell resting on a polished wooden counter
```

### После форматирования
```
1. /imagine prompt: Stock style, hyper realistic, high quality photo of a vibrant cocktail glass filled with a refreshing red drink, featuring ice cubes and orange slices, elegantly positioned on a pastel pink table. The backdrop is a smooth purple wall with a soft light casting an intriguing shadow. The glass has a clear straw for sipping. The image is framed to emphasize the cocktail and surrounding colors, captured using a Canon EOS R5 camera, with natural lighting enhancing the rich hues. Color correction adds warmth and saturation, creating a lively, inviting style --ar 16:9

2. /imagine prompt: Stock style, hyper realistic, high quality photo of a vintage brass service bell resting on a polished wooden counter
```

---

## Счётчик промптов

В правом нижнем углу текстового поля отображается:
- **"X промптов"** — количество **валидных** промптов после парсинга и очистки

Это число обновляется:
- При вводе текста
- После нажатия "Форматировать"
- При загрузке сохранённых промптов

---

## Рекомендации

### ✅ Правильно
- Разделяйте промпты **пустыми строками** (одной или несколькими)
- Используйте **номера** для удобства: `1.`, `2.`, `3.`...
- Нажимайте **"Форматировать"** перед запуском очереди

### ❌ Неправильно
- Не разделяйте промпты (они склеятся в один)
- Не используйте слишком много пробелов внутри промпта
- Не забывайте префикс `/imagine prompt:`

---

## Устранение проблем

### Промпты пропускаются
**Причина**: Промпты не разделены пустыми строками или склеились.

**Решение**:
1. Вставьте промпты в текстовое поле
2. Нажмите **"✨ Форматировать"**
3. Проверьте счётчик промптов
4. Запустите очередь

### Неправильный подсчёт
**Причина**: Промпт не содержит `/imagine` или имеет неправильный формат.

**Решение**:
1. Убедитесь, что каждый промпт начинается с `/imagine prompt:`
2. Нажмите **"✨ Форматировать"**
3. Проверьте результат

### Промпты склеиваются
**Причина**: Отсутствуют разделители (пустые строки).

**Решение**:
1. Добавьте **пустую строку** между промптами
2. Или используйте **"✨ Форматировать"** — он автоматически добавит разделители

---

## Технические детали

### Алгоритм парсинга
1. Разделить текст по `\n` (переносам строк)
2. Найти начало промпта:
   - Строка начинается с номера (`1.`, `2.`)
   - Строка начинается с `/imagine`
   - Пустая строка после накопленного текста
3. Накопить строки до следующего разделителя
4. Сохранить промпт

### Алгоритм очистки
1. Удалить номер в начале: `1. ` → ``
2. Удалить лишние пробелы: `  ` → ` `
3. Убедиться, что есть `/imagine prompt:`
4. Сохранить параметры (например, `--ar 16:9`)

---

## Примеры использования

### Пример 1: Простые промпты
```
/imagine prompt: A cat sitting on a table --ar 16:9
/imagine prompt: A dog running in the park --ar 16:9
```

После форматирования:
```
1. /imagine prompt: A cat sitting on a table --ar 16:9

2. /imagine prompt: A dog running in the park --ar 16:9
```

### Пример 2: Промпты с номерами
```
1. /imagine prompt: A cat
2. /imagine prompt: A dog
```

После форматирования:
```
1. /imagine prompt: A cat

2. /imagine prompt: A dog
```

### Пример 3: Многострочные промпты
```
1. /imagine prompt: Stock style, hyper realistic, 
high quality photo of a vibrant cocktail glass
filled with a refreshing red drink --ar 16:9

2. /imagine prompt: Stock style, hyper realistic
```

После форматирования:
```
1. /imagine prompt: Stock style, hyper realistic, high quality photo of a vibrant cocktail glass filled with a refreshing red drink --ar 16:9

2. /imagine prompt: Stock style, hyper realistic
```

---

## Заключение

Кнопка **"✨ Форматировать"** решает проблему с пропуском промптов и обеспечивает:
- ✅ Правильный парсинг
- ✅ Корректный подсчёт
- ✅ Удобное форматирование
- ✅ Гарантированную отправку всех промптов

**Рекомендуется использовать перед каждым запуском очереди!**

