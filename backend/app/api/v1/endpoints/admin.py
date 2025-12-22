"""
Admin endpoints
GET /admin/users, PATCH /admin/users/{id}, etc.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])

# TODO: Реализовать endpoints согласно API_SPECIFICATION.md

