"""
Extension endpoints
POST /extensions/validate-key, GET /extensions/balance, etc.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/extensions", tags=["extensions"])

# TODO: Реализовать endpoints согласно API_SPECIFICATION.md

