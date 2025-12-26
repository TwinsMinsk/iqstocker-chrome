FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Копируем скрипты запуска
COPY start.sh /app/start.sh
COPY start.py /app/start.py
RUN chmod +x /app/start.sh /app/start.py

# Expose port (Railway использует переменную PORT)
EXPOSE 8000

# Run application через Python скрипт, который правильно обрабатывает PORT
# Используем Python скрипт как более надежный вариант
CMD ["python", "/app/start.py"]

