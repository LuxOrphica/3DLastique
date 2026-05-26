"""
Scan all nodes.json files and collect style keys classified as 'unknown'.
Reports top unknown styles with frequency and example files.
Usage: python scan_unknown_roles.py [samples_dir]
"""
import os, sys, json
import fitz
from engine import _build_registry_lookup, classify_with_registry, _path_style_key, _rgb_to_hex

HERE        = os.path.dirname(os.path.abspath(__file__))
SAMPLES_DIR = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VSE_SAMPLES_DIR", "C:/temp/samples")

with open(os.path.join(HERE, "nodes.json"), encoding="utf-8") as f:
    nodes = json.load(f)

enabled = [n for n in nodes if n.get("enabled", True)]
print(f"Scanning {len(enabled)} files...")

registry = _build_registry_lookup()
unknowns = {}  # key_str -> {count, files, example_key}

processed = errors = 0
for n in enabled:
    ai_path = f"{SAMPLES_DIR}/{n['file']}"
    if not os.path.exists(ai_path):
        continue
    try:
        doc  = fitz.open(ai_path)
        page = doc[0]
        paths = page.get_drawings()
        text_words = page.get_text("words")
        doc.close()
    except Exception as e:
        errors += 1
        continue

    for p in paths:
        role = classify_with_registry(p, text_words, registry)
        if role not in ("unknown", "fill_shape"):
            continue
        key_tuple = _path_style_key(p, text_words)
        key_str   = str(key_tuple)
        if key_str not in unknowns:
            raw_stroke = _rgb_to_hex(p.get("color")) if p.get("color") else "none"
            raw_fill   = _rgb_to_hex(p.get("fill"))  if p.get("fill")  else "none"
            unknowns[key_str] = {"count": 0, "files": [], "tuple": key_tuple,
                                  "raw_stroke": raw_stroke, "raw_fill": raw_fill,
                                  "auto_role": role}
        unknowns[key_str]["count"] += 1
        fname = os.path.basename(ai_path)
        if fname not in unknowns[key_str]["files"]:
            unknowns[key_str]["files"].append(fname)

    processed += 1
    if processed % 200 == 0:
        print(f"  {processed}/{len(enabled)}...")

print(f"\nDone: {processed} files, {errors} errors")
print(f"Unknown styles: {len(unknowns)}\n")

rows = sorted(unknowns.values(), key=lambda x: -x["count"])

OUT = os.path.join(HERE, "unknown_roles_report.json")
report = []
for r in rows:
    t = r["tuple"]
    report.append({
        "count":      r["count"],
        "files":      r["files"][:5],
        "key":        t,
        "key_str":    str(t),
        "raw_stroke": r.get("raw_stroke"),
        "raw_fill":   r.get("raw_fill"),
        "auto_role":  r.get("auto_role", "unknown"),
    })
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print(f"Top 30 unknown styles:")
print(f"{'Count':>6}  {'Key'}")
print("-" * 80)
for r in rows[:30]:
    print(f"{r['count']:>6}  {r['tuple']}")
    print(f"         files: {', '.join(r['files'][:3])}")

print(f"\nFull report saved to: {OUT}")
