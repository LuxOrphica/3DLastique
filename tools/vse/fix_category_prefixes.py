"""
Strip leading ! characters from categoryRU and subcategoryRU in node-library.json.
Merges duplicate categories that differ only by ! prefix.
"""
import json, re, os

LIBRARY_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "src", "tools", "pom", "node-library.json"
)

def clean(s):
    return re.sub(r"^[! ]+", "", s or "").strip()

with open(LIBRARY_FILE, encoding="utf-8-sig") as f:
    library = json.load(f)

for node in library:
    node["categoryRU"]    = clean(node.get("categoryRU", ""))
    node["subcategoryRU"] = clean(node.get("subcategoryRU", ""))
    node["subcategoryEN"] = clean(node.get("subcategoryEN", ""))

with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
    json.dump(library, f, ensure_ascii=False, indent=2)

# Report
cats = sorted(set(n["categoryRU"] for n in library))
print(f"Total nodes: {len(library)}")
print(f"Categories ({len(cats)}):")
for c in cats:
    cnt = sum(1 for n in library if n["categoryRU"] == c)
    print(f"  {c}: {cnt}")
