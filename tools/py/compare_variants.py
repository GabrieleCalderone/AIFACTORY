"""Compare variants of one experiment with small-sample honesty.

Usage: python tools/py/compare_variants.py data/experiments.csv EXP-001 [--metric saves --base reach]

For each variant the script prints the rate metric/base with a 95% Wilson interval and says
whether the intervals overlap. With the audience sizes RistHome has (hundreds to a few
thousand plays) most differences are not distinguishable from noise; the script says so
instead of declaring a winner. Rows with an empty metric or base are reported as "no data".
"""
from __future__ import annotations

import argparse
import csv
import math
import sys
from pathlib import Path


def wilson(successes: int, n: int, z: float = 1.96) -> tuple[float, float, float]:
    """Return (rate, low, high) for a binomial proportion with the Wilson score interval."""
    if n <= 0:
        raise ValueError("n must be positive")
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return p, max(0.0, centre - half), min(1.0, centre + half)


def to_int(value: str) -> int | None:
    value = (value or "").strip()
    if value == "":
        return None
    return int(float(value))


def compare(rows: list[dict[str, str]], metric: str, base: str) -> list[dict[str, object]]:
    out: list[dict[str, object]] = []
    for row in rows:
        m, n = to_int(row.get(metric, "")), to_int(row.get(base, ""))
        if m is None or n is None or n <= 0:
            out.append({"variant": row["variant_id"], "slug": row["post_slug"], "status": "no data"})
            continue
        rate, lo, hi = wilson(m, n)
        out.append({"variant": row["variant_id"], "slug": row["post_slug"], "status": "ok", "metric": m, "base": n, "rate": rate, "low": lo, "high": hi})
    return out


def verdict(results: list[dict[str, object]]) -> str:
    measured = [r for r in results if r["status"] == "ok"]
    if len(measured) < 2:
        return "nothing to compare yet: fewer than two variants have data"
    best = max(measured, key=lambda r: float(r["rate"]))  # type: ignore[arg-type]
    others = [r for r in measured if r is not best]
    overlap = any(float(best["low"]) <= float(o["high"]) for o in others)  # type: ignore[arg-type]
    if overlap:
        return f"variant {best['variant']} has the highest rate but its interval overlaps the others: not distinguishable with this sample"
    return f"variant {best['variant']} is ahead and its 95% interval does not overlap the others (still re-check after the next post)"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("experiment")
    ap.add_argument("--metric", default="saves")
    ap.add_argument("--base", default="reach")
    a = ap.parse_args()
    with Path(a.csv).open(newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r.get("experiment_id") == a.experiment]
    if not rows:
        print(f"no rows for {a.experiment}", file=sys.stderr)
        return 1
    results = compare(rows, a.metric, a.base)
    for r in results:
        if r["status"] == "ok":
            print(f"{r['variant']:>3} {r['slug']:<28} {a.metric}/{a.base} = {r['metric']}/{r['base']} = {float(r['rate']):.3%}  95% CI [{float(r['low']):.2%}, {float(r['high']):.2%}]")
        else:
            print(f"{r['variant']:>3} {r['slug']:<28} no data for {a.metric}/{a.base}")
    print("verdict:", verdict(results))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
