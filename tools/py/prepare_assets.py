"""Copy and normalise photos into public/assets/<slug>/ for a post.

Usage:
  python tools/py/prepare_assets.py <slug> --src <dir> [--src <dir> ...] --pick <file> [<file> ...] [--max-side 2160] [--quality 88]

Each picked filename is searched in the given source directories. The image is EXIF-rotated,
converted to RGB, resized so its longest side is <= --max-side, and saved as JPEG without EXIF
(no GPS or camera metadata leaks into published assets). A manifest.json with the output
dimensions is written next to the images so a spec author can see what is available.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps


def find(name: str, roots: list[Path]) -> Path | None:
    for r in roots:
        p = r / name
        if p.is_file():
            return p
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--src", action="append", required=True, help="source directory (repeatable)")
    ap.add_argument("--pick", nargs="+", required=True, help="filenames to include, in order")
    ap.add_argument("--out-root", default="public/assets")
    ap.add_argument("--max-side", type=int, default=2160)
    ap.add_argument("--quality", type=int, default=88)
    ap.add_argument("--start", type=int, default=1, help="first output index (to append to an existing set)")
    ap.add_argument("--crop-bottom", type=float, default=0.0, help="fraction of height to drop from the bottom (e.g. 0.24 removes a baked-in logo band)")
    ap.add_argument("--people", choices=["none", "chef", "guests-consented"], default="none",
                    help="who is recognisable in these photos; 'guests-consented' asserts written consent is on file")
    a = ap.parse_args()

    roots = [Path(s).expanduser() for s in a.src]
    out = Path(a.out_root) / a.slug
    out.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []
    missing: list[str] = []
    for i, name in enumerate(a.pick, start=a.start):
        src = find(name, roots)
        if src is None:
            missing.append(name)
            continue
        im = Image.open(src)
        im = ImageOps.exif_transpose(im).convert("RGB")
        if a.crop_bottom > 0:
            im = im.crop((0, 0, im.width, round(im.height * (1 - a.crop_bottom))))
        w, h = im.size
        scale = min(1.0, a.max_side / max(w, h))
        if scale < 1.0:
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        dst = out / f"{i:02d}-{Path(name).stem}.jpg"
        im.save(dst, "JPEG", quality=a.quality, optimize=True, progressive=True)
        manifest.append({"file": dst.name, "source": name, "width": im.width, "height": im.height,
                         "orientation": "portrait" if im.height > im.width else "landscape", "people": a.people})
        print(f"{dst.name}  {im.width}x{im.height}  <- {name}")
    mpath = out / "manifest.json"
    existing = json.loads(mpath.read_text()) if mpath.exists() else []
    new_names = {m["file"] for m in manifest}
    merged = [m for m in existing if m.get("file") not in new_names] + manifest
    mpath.write_text(json.dumps(merged, indent=2) + "\n")
    if missing:
        print("missing: " + ", ".join(missing), file=sys.stderr)
        return 1
    print(f"wrote {len(manifest)} assets to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
