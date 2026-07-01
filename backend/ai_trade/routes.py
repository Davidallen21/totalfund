"""
AI Trade FastAPI router.

Responsibility: register endpoints and validate request shapes only.
All logic is in controller.py.
"""

from fastapi import APIRouter
from ai_trade.types.ai_trade_types import AnalyzeRequest
from ai_trade import controller

router = APIRouter(prefix="/api/ai-trade", tags=["AI Trade"])


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    return await controller.analyze(req)


@router.get("/symbols")
async def symbols():
    return await controller.get_symbols()


@router.get("/health")
async def health():
    return await controller.health()
