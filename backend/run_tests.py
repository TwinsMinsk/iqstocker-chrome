#!/usr/bin/env python3
"""
Скрипт для запуска всех тестов проекта
"""
import sys
import subprocess


def run_command(cmd, description):
    """Запустить команду и вывести результат"""
    print(f"\n{'='*60}")
    print(f"[TEST] {description}")
    print('='*60)
    
    result = subprocess.run(cmd, shell=True, capture_output=False)
    
    if result.returncode != 0:
        print(f"\n[FAIL] {description} FAILED")
        return False
    
    print(f"\n[PASS] {description} PASSED")
    return True


def main():
    """Запустить все тесты"""
    print("\n" + "="*60)
    print("ЗАПУСК ВСЕХ ТЕСТОВ")
    print("="*60)
    
    tests = [
        ("poetry run pytest tests/test_referral_and_promo_idempotency.py -v", 
         "Реферальная система и промокоды (Idempotency)"),
        
        ("poetry run pytest tests/test_payments.py -v", 
         "Платежная система (Tribute Webhook)"),
        
        ("poetry run pytest tests/test_analytics_service.py -v", 
         "Аналитический сервис (WAU/MAU/LTV/Retention)"),
    ]
    
    results = []
    for cmd, description in tests:
        success = run_command(cmd, description)
        results.append((description, success))
    
    # Итоговый отчёт
    print("\n" + "="*60)
    print("ИТОГОВЫЙ ОТЧЁТ")
    print("="*60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for description, success in results:
        status = "[PASS]" if success else "[FAIL]"
        print(f"{status}: {description}")
    
    print("\n" + "="*60)
    print(f"Итого: {passed}/{total} тестов пройдено")
    print("="*60)
    
    if passed == total:
        print("\n[SUCCESS] ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        return 0
    else:
        print(f"\n[WARNING] {total - passed} тестов провалились")
        return 1


if __name__ == "__main__":
    sys.exit(main())

