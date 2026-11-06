import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent


class PrepareAssetsTests(unittest.TestCase):
    def test_resize_crop_and_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "src"
            src.mkdir()
            Image.new("RGB", (3000, 3000), (200, 30, 30)).save(src / "A.JPG", quality=90)
            out_root = Path(tmp) / "assets"
            cmd = [sys.executable, "-I", str(HERE / "prepare_assets.py"), "demo", "--src", str(src), "--pick", "A.JPG",
                   "--out-root", str(out_root), "--max-side", "1500", "--crop-bottom", "0.2", "--people", "none"]
            res = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, res.stderr)
            manifest = json.loads((out_root / "demo" / "manifest.json").read_text())
            self.assertEqual(manifest[0]["file"], "01-A.jpg")
            self.assertEqual((manifest[0]["width"], manifest[0]["height"]), (1500, 1200))
            self.assertEqual(manifest[0]["people"], "none")
            im = Image.open(out_root / "demo" / "01-A.jpg")
            self.assertEqual(im.size, (1500, 1200))
            self.assertNotIn("exif", im.info)

    def test_missing_file_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            res = subprocess.run([sys.executable, "-I", str(HERE / "prepare_assets.py"), "demo", "--src", tmp, "--pick", "nope.jpg",
                                  "--out-root", str(Path(tmp) / "assets")], capture_output=True, text=True)
            self.assertEqual(res.returncode, 1)
            self.assertIn("missing", res.stderr)


if __name__ == "__main__":
    unittest.main()
