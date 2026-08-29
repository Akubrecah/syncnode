from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP


def to_decimal(val) -> Decimal:
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val) if val is not None else "0")


def format_decimal(val, decimals: int = 8) -> str:
    d = to_decimal(val)
    # Quantize to exact decimals with ROUND_DOWN
    pattern = "0." + "0" * decimals if decimals > 0 else "0"
    return str(d.quantize(Decimal(pattern), rounding=ROUND_DOWN))


def add_decimals(a, b, decimals: int = 8) -> str:
    return format_decimal(to_decimal(a) + to_decimal(b), decimals)


def sub_decimals(a, b, decimals: int = 8) -> str:
    return format_decimal(to_decimal(a) - to_decimal(b), decimals)


def mul_decimals(a, b, decimals: int = 8) -> str:
    return format_decimal(to_decimal(a) * to_decimal(b), decimals)


def div_decimals(a, b, decimals: int = 8) -> str:
    d_b = to_decimal(b)
    if d_b == Decimal("0"):
        raise ValueError("Division by zero")
    return format_decimal(to_decimal(a) / d_b, decimals)


def gt_decimal(a, b) -> bool:
    return to_decimal(a) > to_decimal(b)


def gte_decimal(a, b) -> bool:
    return to_decimal(a) >= to_decimal(b)


def lt_decimal(a, b) -> bool:
    return to_decimal(a) < to_decimal(b)


def lte_decimal(a, b) -> bool:
    return to_decimal(a) <= to_decimal(b)


def eq_decimal(a, b) -> bool:
    return to_decimal(a) == to_decimal(b)
