"""
Минимальная криптография для шифрования секретов в БД.

Реализация:
- Fernet (AES-128 + HMAC) из библиотеки cryptography
- ключ деривится из settings.SECRET_KEY (SHA256 -> base64 urlsafe)

Важно:
- Это "encryption at rest" в БД. При компрометации приложения (SECRET_KEY) секреты тоже утекут.
- Но это значительно лучше, чем хранить webhook secret в plaintext в базе.
"""

from __future__ import annotations

import base64
import hashlib
from typing import Optional

from app.core.config import settings


def _fernet_key_from_secret_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_secret(plaintext: str) -> str:
    # Ленивая import, чтобы не ломать импорт граф в окружениях без cryptography
    from cryptography.fernet import Fernet

    key = _fernet_key_from_secret_key(settings.SECRET_KEY)
    f = Fernet(key)
    token = f.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    from cryptography.fernet import Fernet

    key = _fernet_key_from_secret_key(settings.SECRET_KEY)
    f = Fernet(key)
    plaintext = f.decrypt(ciphertext.encode("utf-8"))
    return plaintext.decode("utf-8")


