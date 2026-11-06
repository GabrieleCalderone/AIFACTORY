"""Normalise phone clips into 1080x1920 H.264 scenes for the reel template (FFmpeg).

Usage:
  python tools/py/prepare_clips.py <slug> --src <dir> --pick clip.mp4 [...] [--max-seconds 8] [--trim 0]
                                  [--keep-audio] [--people chef] [--start 1]

Each clip is scaled to cover 9:16, centre-cropped to 1080x1920, resampled to 30 fps, encoded
with libx264 (crf 20, faststart) and muted unless --keep-audio. Entries are appended to the
same manifest.json used for photos (kind="video", durationSec, people) so the quality gate
can read size and consent.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

VF = "scale=w='if(gte(iw/ih,1080/1920),-2,1080)':h='if(gte(iw/ih,1080/1920),1920,-2)',crop=1080:1920,fps=30,format=yuv420p"


def probe(path: Path) -> dict[str, float]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    j = json.loads(out)
    s = j["streams"][0]
    return {"width": int(s["width"]), "height": int(s["height"]), "durationSec": round(float(j["format"]["duration"]), 2)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--src", action="append", required=True)
    ap.add_argument("--pick", nargs="+", required=True)
    ap.add_argument("--out-root", default="public/assets")
    ap.add_argument("--max-seconds", type=float, default=8.0)
    ap.add_argument("--trim", type=float, default=0.0)
    ap.add_argument("--keep-audio", action="store_true")
    ap.add_argument("--people", choices=["none", "chef", "guests-consented"], default="none")
    ap.add_argument("--start", type=int, default=1)
    a = ap.parse_args()
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        print("error: ffmpeg/ffprobe not found on PATH", file=sys.stderr)
        return 2
    roots = [Path(s).expanduser() for s in a.src]
    out = Path(a.out_root) / a.slug
    out.mkdir(parents=True, exist_ok=True)
    mpath = out / "manifest.json"
    manifest = json.loads(mpath.read_text()) if mpath.exists() else []
    missing = []
    for i, name in enumerate(a.pick, start=a.start):
        src = next((r / name for r in roots if (r / name).is_file()), None)
        if src is None:
            missing.append(name)
            continue
        dst = out / f"{i:02d}-{Path(name).stem}.mp4"
        cmd = ["ffmpeg", "-y", "-v", "error", "-ss", str(a.trim), "-t", str(a.max_seconds), "-i", str(src), "-vf", VF,
               "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-movflags", "+faststart", "-map_metadata", "-1"]
        cmd += ["-c:a", "aac", "-b:a", "128k"] if a.keep_audio else ["-an"]
        cmd.append(str(dst))
        subprocess.run(cmd, check=True)
        info = probe(dst)
        src_info = probe(src)
        manifest.append({"file": dst.name, "source": name, "kind": "video", "width": info["width"], "height": info["height"],
                         "durationSec": info["durationSec"], "sourceWidth": src_info["width"], "sourceHeight": src_info["height"],
                         "people": a.people})
        print(f"{dst.name}  {info['width']}x{info['height']}  {info['durationSec']}s  <- {name} ({src_info['width']}x{src_info['height']})")
    mpath.write_text(json.dumps(manifest, indent=2) + "\n")
    if missing:
        print("missing: " + ", ".join(missing), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
