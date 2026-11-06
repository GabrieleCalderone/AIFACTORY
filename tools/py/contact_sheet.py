"""Build labelled contact sheets from a folder of images.

Usage: python tools/py/contact_sheet.py <src_dir> <out_dir> [--cols 8] [--thumb 220] [--per-sheet 48] [--prefix name]
Each thumbnail is labelled with its index and filename so a reviewer can pick assets by number.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

EXTS = {".jpg", ".jpeg", ".png", ".heic", ".webp"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--cols", type=int, default=8)
    ap.add_argument("--thumb", type=int, default=220)
    ap.add_argument("--per-sheet", type=int, default=48)
    ap.add_argument("--prefix", default="sheet")
    ap.add_argument("--skip-dupes", action="store_true", help="skip files ending in -2/-3 (export duplicates)")
    a = ap.parse_args()

    src = Path(a.src)
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in EXTS and not p.name.startswith("."))
    if a.skip_dupes:
        files = [p for p in files if not (p.stem.endswith("-2") or p.stem.endswith("-3"))]
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    index_lines = []
    label_h = 26
    for sheet_no, start in enumerate(range(0, len(files), a.per_sheet)):
        chunk = files[start : start + a.per_sheet]
        rows = (len(chunk) + a.cols - 1) // a.cols
        W = a.cols * a.thumb
        H = rows * (a.thumb + label_h)
        sheet = Image.new("RGB", (W, H), (24, 24, 24))
        draw = ImageDraw.Draw(sheet)
        for i, p in enumerate(chunk):
            idx = start + i
            try:
                im = Image.open(p)
                im = ImageOps.exif_transpose(im).convert("RGB")
                im = ImageOps.fit(im, (a.thumb, a.thumb))
            except Exception as e:  # noqa: BLE001
                im = Image.new("RGB", (a.thumb, a.thumb), (120, 0, 0))
                print(f"warn: {p.name}: {e}", file=sys.stderr)
            x = (i % a.cols) * a.thumb
            y = (i // a.cols) * (a.thumb + label_h)
            sheet.paste(im, (x, y))
            draw.rectangle([x, y + a.thumb, x + a.thumb, y + a.thumb + label_h], fill=(0, 0, 0))
            draw.text((x + 4, y + a.thumb + 5), f"{idx:03d} {p.name[:22]}", fill=(255, 255, 255))
            index_lines.append(f"{idx:03d}\t{p.name}")
        path = out / f"{a.prefix}-{sheet_no:02d}.jpg"
        sheet.save(path, quality=85)
        print(f"wrote {path} ({len(chunk)} images)")
    (out / f"{a.prefix}-index.tsv").write_text("\n".join(index_lines) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
