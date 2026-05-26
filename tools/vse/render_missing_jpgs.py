"""
Render JPGs from .ai files for nodes that have no local JPG in public/nodes/.
Usage: python render_missing_jpgs.py [samples_dir]
"""
import os, re, sys
import fitz

HERE        = os.path.dirname(os.path.abspath(__file__))
ROOT        = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_DIR     = os.path.join(ROOT, "public", "nodes")
SAMPLES_DIR = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VSE_SAMPLES_DIR", "C:/temp/samples")
SCALE       = 2.0  # 2x for decent resolution

os.makedirs(OUT_DIR, exist_ok=True)

existing = set(
    os.path.splitext(f)[0]
    for f in os.listdir(OUT_DIR)
    if f.lower().endswith(".jpg")
)

rendered = skipped = errors = 0

for root, dirs, files in os.walk(SAMPLES_DIR):
    dirs.sort()
    for fname in sorted(files):
        if not fname.lower().endswith(".ai"):
            continue
        m = re.match(r"([A-Z]{2}\d{4,6})", fname)
        if not m:
            continue
        code = m.group(1)
        if code in existing:
            skipped += 1
            continue
        ai_path = os.path.join(root, fname)
        out_path = os.path.join(OUT_DIR, f"{code}.jpg")
        try:
            doc  = fitz.open(ai_path)
            page = doc[0]
            mat  = fitz.Matrix(SCALE, SCALE)
            pix  = page.get_pixmap(matrix=mat, alpha=False)
            pix.save(out_path)
            doc.close()
            existing.add(code)
            rendered += 1
            if rendered % 50 == 0:
                print(f"  rendered {rendered}...")
        except Exception as e:
            print(f"  ERROR {code}: {e}")
            errors += 1

print(f"Done: rendered={rendered}, skipped={skipped}, errors={errors}")
