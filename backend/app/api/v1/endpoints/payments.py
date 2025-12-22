"""
Payment webhooks
POST /payments/webhook/tribute
"""
from fastapi import APIRouter

router = APIRouter(prefix="/payments", tags=["payments"])

# TODO: Реализовать webhook endpoint согласно API_SPECIFICATION.md

