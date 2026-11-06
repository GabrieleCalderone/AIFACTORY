"""Trim a transparent logo to its content box and emit light/dark variants.

Usage: python tools/py/logo_trim.py <logo.png|logo.pdf> <out_dir> [--pad 40] [--width 1600]

Writes:
  <out_dir>/logo.png        original colours on transparent background (for light backgrounds)
  <out_dir>/logo-white.png  near-black pixels turned white, accent colour kept (for dark backgrounds)
A PDF input is rasterised first with macOS `sips` into a temporary PNG.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


def rasterize_pdf(pdf: Path, width: int) -> Path:
    tmp = Path(tempfile.mkdtemp()) / "logo.png"
    subprocess.run(
        ["sips", "-s", "format", "png", "--resampleWidth", str(width * 2), str(pdf), "--out", str(tmp)],
        check=True,
        capture_output=True,
    )
    return tmp


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--pad", type=int, default=40)
    ap.add_argument("--width", type=int, default=1600)
    ap.add_argument("--dark-threshold", type=int, default=70)
    a = ap.parse_args()

    src = Path(a.src)
    if src.suffix.lower() == ".pdf":
        src = rasterize_pdf(src, a.width)
    im = Image.open(src).convert("RGBA")
    bbox = im.getbbox()
    if bbox is None:
        print("error: image is fully transparent", file=sys.stderr)
        return 1
    l, t, r, b = bbox
    im = im.crop((max(0, l - a.pad), max(0, t - a.pad), min(im.width, r + a.pad), min(im.height, b + a.pad)))
    if im.width > a.width:
        im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    im.save(out / "logo.png", optimize=True)

    white = im.copy()
    px = white.load()
    thr = a.dark_threshold
    for y in range(white.height):
        for x in range(white.width):
            r_, g_, b_, a_ = px[x, y]
            if a_ and r_ < thr and g_ < thr and b_ < thr:
                px[x, y] = (255, 255, 255, a_)
    white.save(out / "logo-white.png", optimize=True)
    print(f"wrote {out/'logo.png'} and {out/'logo-white.png'} ({im.width}x{im.height}, bbox was {bbox})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
