"""
Add missing AI-file nodes to node-library.json.
Reads existing node-library.json, finds AI files not in it, appends them.

Usage: python patch_node_library.py
"""
import os, re, json

SAMPLES_DIR  = "C:/temp/samples"
LIBRARY_FILE = "F:/Projects/lekala-site/src/tools/pom/node-library.json"

with open(LIBRARY_FILE, encoding="utf-8-sig") as f:
    library = json.load(f)

lib_codes = set(x["code"] for x in library if x.get("code"))

new_entries = []
for root, dirs, files in os.walk(SAMPLES_DIR):
    dirs.sort()
    for fname in sorted(files):
        if not fname.lower().endswith(".ai"):
            continue
        m = re.match(r"([A-Z]{2}\d{4,6})", fname)
        if not m:
            continue
        code = m.group(1)
        if code in lib_codes:
            continue

        # Derive category from folder path
        rel   = os.path.relpath(root, SAMPLES_DIR).replace("\\", "/")
        parts = rel.split("/")
        cat_ru = parts[0].lstrip("!").strip() if parts else ""
        sub_ru = parts[1] if len(parts) > 1 else ""
        name_ru = os.path.splitext(fname)[0]
        # strip code prefix from name
        name_ru = re.sub(r"^[A-Z]{2}\d{4,6}[_\-\s]*", "", name_ru).strip()

        entry = {
            "code":        code,
            "categoryRU":  cat_ru,
            "categoryEN":  "",
            "subcategoryEN": sub_ru,
            "subcategoryRU": sub_ru,
            "nameEN":      "",
            "nameRU":      name_ru or code,
            "jpgId":       "",
        }
        new_entries.append(entry)
        lib_codes.add(code)

print(f"Adding {len(new_entries)} new entries to node-library.json")

library.extend(new_entries)

# Write back with UTF-8 (no BOM — React doesn't need it)
with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
    json.dump(library, f, ensure_ascii=False, indent=2)

print(f"Total: {len(library)} nodes")

# Show breakdown of new prefixes
from collections import Counter
prefixes = Counter(e["code"][:2] for e in new_entries)
for p, cnt in sorted(prefixes.items(), key=lambda x: -x[1]):
    print(f"  {p}: {cnt}x")
