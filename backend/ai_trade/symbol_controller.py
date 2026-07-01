"""
Symbol search controller.

Responsibilities
----------------
- Receive validated query params from symbol_routes.py
- Delegate to market_symbol_service
- Return shaped response

No business logic here.
"""

from ai_trade.services import market_symbol_service


async def search_assets(q: str, limit: int) -> dict:
    results = market_symbol_service.search(q, limit)
    return {
        "results": [r.model_dump() for r in results],
        "count":   len(results),
        "query":   q,
    }


async def cache_status() -> dict:
    return market_symbol_service.get_cache_status()
