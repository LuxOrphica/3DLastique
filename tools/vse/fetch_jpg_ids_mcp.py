"""
Build code->jpgId map by reading pre-fetched jpg_map.json and patching node-library.json.
jpg_map.json format: {"CH00001": "1abc...", ...}
"""
import json, os

HERE         = os.path.dirname(os.path.abspath(__file__))
LIBRARY_FILE = os.path.join(HERE, "..", "..", "src", "tools", "pom", "node-library.json")
MAP_FILE     = os.path.join(HERE, "jpg_map.json")

with open(MAP_FILE, encoding="utf-8") as f:
    code_to_jpg = json.load(f)

print(f"JPG map: {len(code_to_jpg)} entries")

with open(LIBRARY_FILE, encoding="utf-8-sig") as f:
    library = json.load(f)

updated = skipped = 0
for node in library:
    code = node.get("code", "")
    if code in code_to_jpg:
        if not node.get("jpgId"):
            node["jpgId"] = code_to_jpg[code]
            updated += 1
        else:
            skipped += 1

with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
    json.dump(library, f, ensure_ascii=False, indent=2)

missing = sum(1 for n in library if not n.get("jpgId"))
print(f"Updated: {updated}, skipped (already had): {skipped}, still missing: {missing}")
