#!/usr/bin/env python3
"""
Скрипт запуска для Railway
Правильно обрабатывает переменную PORT из окружения
"""
import os
import sys

def main():
    # Получаем PORT из переменных окружения, по умолчанию 8000
    port = int(os.environ.get('PORT', 8000))
    host = os.environ.get('HOST', '0.0.0.0')
    
    print(f"Starting server on {host}:{port}")
    print(f"PORT from environment: {os.environ.get('PORT', 'not set (using default 8000)')}")
    
    # Импортируем и запускаем uvicorn
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    main()

