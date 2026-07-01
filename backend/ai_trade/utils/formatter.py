"""
Number / string formatting helpers shared across AI Trade services.
"""


def fmt_price(price: float) -> str:
    if price >= 10_000:
        return f"{price:,.0f}"
    if price >= 100:
        return f"{price:.1f}"
    if price >= 1:
        return f"{price:.2f}"
    return f"{price:.4f}"


def fmt_rr(rr: float) -> str:
    return f"1 : {rr}"


def fmt_pct(value: float, decimals: int = 1) -> str:
    return f"{value:.{decimals}f}%"
