"""
Billing endpoints
GET /subscriptions/plans, POST /subscriptions/purchase-plan, etc.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/subscriptions", tags=["billing"])

# TODO: Реализовать endpoints согласно API_SPECIFICATION.md

