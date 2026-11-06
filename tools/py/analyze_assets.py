"""Deterministic technical analysis of photos: hashes, exposure, sharpness, noise, composition.

Usage: python tools/py/analyze_assets.py <dir> [--out data/asset-technical.json] [--ext jpg,jpeg,png]

Per file: sha256, dhash64 (perceptual), width/height, brightness (mean, p5, p95, clipped %),
contrast (std), sharpness (Laplacian variance on a 1024px copy), noise (residual after 3x3 median),
text_space_bottom (how plain the bottom third is: higher = room for captions), center_weight
(edge energy in the central area vs borders), portrait flag, and near-duplicate groups
(hamming distance <= 8 on dhash). Normalised 0-100 sub-scores are computed in src/lib/visual-score.ts;
this file stays raw and reproducible.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps


def dhash(im: Image.Image, size: int = 8) -> int:
    g = ImageOps.exif_transpose(im).convert("L").resize((size + 1, size), Image.LANCZOS)
    a = np.asarray(g, dtype=np.int16)
    bits = (a[:, 1:] > a[:, :-1]).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def laplacian_var(gray: np.ndarray) -> float:
    k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    g = gray.astype(np.float32)
    out = np.zeros_like(g)
    for dy in range(3):
        for dx in range(3):
            out += k[dy, dx] * np.roll(np.roll(g, dy - 1, axis=0), dx - 1, axis=1)
    return float(out[1:-1, 1:-1].var())


def analyze(path: Path) -> dict:
    raw = path.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    w, h = im.size
    scale = min(1.0, 1024 / max(w, h))
    small = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS) if scale < 1 else im
    gray = np.asarray(small.convert("L"), dtype=np.float32)
    mean = float(gray.mean())
    p5, p95 = (float(x) for x in np.percentile(gray, [5, 95]))
    clipped_dark = float((gray < 8).mean())
    clipped_bright = float((gray > 247).mean())
    contrast = float(gray.std())
    sharp = laplacian_var(gray)
    med = np.asarray(small.convert("L").filter(ImageFilter.MedianFilter(3)), dtype=np.float32)
    noise = float(np.abs(gray - med).mean())
    hh = gray.shape[0]
    bottom = gray[int(hh * 2 / 3):, :]
    text_space = float(1.0 / (1.0 + bottom.std() / 32.0))  # 1 = flat, 0 = busy
    edges = np.asarray(small.convert("L").filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    ch, cw = edges.shape[0] // 4, edges.shape[1] // 4
    center = edges[ch:3 * ch, cw:3 * cw].mean()
    whole = edges.mean() + 1e-6
    sat = float(np.asarray(small.convert("HSV"), dtype=np.float32)[:, :, 1].mean())
    return {
        "file": path.name, "sha256": sha, "dhash": f"{dhash(im):016x}", "width": w, "height": h,
        "portrait": h > w, "brightness_mean": round(mean, 1), "brightness_p5": round(p5, 1), "brightness_p95": round(p95, 1),
        "clipped_dark": round(clipped_dark, 4), "clipped_bright": round(clipped_bright, 4), "contrast": round(contrast, 1),
        "sharpness": round(sharp, 1), "noise": round(noise, 2), "saturation": round(sat, 1),
        "text_space_bottom": round(text_space, 3), "center_weight": round(float(center / whole), 3),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default="data/asset-technical.json")
    ap.add_argument("--ext", default="jpg,jpeg,png,webp")
    a = ap.parse_args()
    exts = {"." + e.strip().lower() for e in a.ext.split(",")}
    files = sorted(p for p in Path(a.src).iterdir() if p.suffix.lower() in exts and not p.name.startswith("."))
    out_path = Path(a.out)
    existing = json.loads(out_path.read_text()) if out_path.exists() else {}
    rows: dict[str, dict] = {}
    for p in files:
        prev = existing.get(p.name)
        sha = hashlib.sha256(p.read_bytes()).hexdigest()
        rows[p.name] = prev if prev and prev.get("sha256") == sha else analyze(p)
    names = list(rows)
    hashes = {n: int(rows[n]["dhash"], 16) for n in names}
    group_of: dict[str, int] = {}
    gid = 0
    for i, n in enumerate(names):
        if n in group_of:
            continue
        gid += 1
        group_of[n] = gid
        for m in names[i + 1:]:
            if m not in group_of and hamming(hashes[n], hashes[m]) <= 8:
                group_of[m] = gid
    for n in names:
        rows[n]["dup_group"] = group_of[n]
        rows[n]["dup_count"] = sum(1 for g in group_of.values() if g == group_of[n])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(rows, indent=1) + "\n")
    groups = sum(1 for n in names if rows[n]["dup_count"] > 1)
    print(f"analyzed {len(names)} files -> {out_path} ({groups} in near-duplicate groups)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
