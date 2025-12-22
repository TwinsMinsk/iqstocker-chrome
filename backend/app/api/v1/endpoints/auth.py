"""
Authentication endpoints
POST /auth/register, /auth/login, /auth/refresh, etc.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])

# TODO: Реализовать endpoints согласно API_SPECIFICATION.md
# @router.post("/register")
# @router.post("/login")
# @router.post("/refresh")
# @router.post("/logout")

