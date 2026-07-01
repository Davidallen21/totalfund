"""
Symbol search routes.

Endpoints
---------
GET /api/ai-trade/assets/search?q=btc&limit=20
GET /api/ai-trade/assets/cache-status   (debug)
"""

from fastapi import APIRouter, Query
from ai_trade import symbol_controller

router = APIRouter(prefix="/api/ai-trade", tags=["AI Trade - Symbols"])


@router.get("/assets/search")
async def search_assets(
    q:     str = Query(default="",  max_length=30, description="Search query (base asset name)"),
    limit: int = Query(default=20,  ge=1, le=100,  description="Max results"),
):
    return await symbol_controller.search_assets(q, limit)


@router.get("/assets/cache-status")
async def cache_status():
    return await symbol_controller.cache_status()
