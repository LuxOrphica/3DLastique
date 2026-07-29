"""Generate grid thumbnails for the node catalog.

The catalog grid draws ~110px tiles but the source images average 128 KB at full
resolution, so one category (up to ~700 nodes) pulled tens of megabytes just to paint
thumbnails. This writes a 300px-wide copy of each image to public/nodes/thumbs/, which
the grid uses; the detail view still loads the original.

Idempotent: existing thumbnails newer than their source are skipped, so re-running
after adding images only processes the new ones.

    python tools/nodes/make_thumbs.py [--force]
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = ROOT / "public" / "nodes"
OUT_DIR = SRC_DIR / "thumbs"
WIDTH = 300
QUALITY = 78


def main(force=False):
    if not SRC_DIR.is_dir():
        print(f"Нет папки с исходниками: {SRC_DIR}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    sources = sorted(SRC_DIR.glob("*.jpg"))
    made = skipped = failed = 0
    for i, src in enumerate(sources, 1):
        dst = OUT_DIR / src.name
        if not force and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            skipped += 1
            continue
        try:
            with Image.open(src) as im:
                im = im.convert("RGB")
                if im.width > WIDTH:
                    height = max(1, round(im.height * WIDTH / im.width))
                    im = im.resize((WIDTH, height), Image.LANCZOS)
                im.save(dst, "JPEG", quality=QUALITY, optimize=True)
            made += 1
        except Exception as exc:  # a corrupt source must not abort the whole run
            print(f"  ! {src.name}: {exc}")
            failed += 1
        if i % 500 == 0:
            print(f"  …{i}/{len(sources)}")

    src_mb = sum(p.stat().st_size for p in sources) / 1048576
    out_mb = sum(p.stat().st_size for p in OUT_DIR.glob('*.jpg')) / 1048576
    print(f"готово: создано {made}, пропущено {skipped}, ошибок {failed}")
    print(f"исходники {src_mb:.0f} MB -> превью {out_mb:.0f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main(force="--force" in sys.argv))
