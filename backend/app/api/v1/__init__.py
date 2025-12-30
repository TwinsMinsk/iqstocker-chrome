"""
API v1 Router
Объединяет все endpoints версии 1
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, extensions, billing, payments, admin, promo

router = APIRouter()

# Подключаем все endpoints
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(extensions.router)
router.include_router(billing.router)
router.include_router(payments.router)
router.include_router(admin.router)
router.include_router(promo.router)
