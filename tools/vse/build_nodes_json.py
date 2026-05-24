"""
Scan downloaded AI files and generate nodes.json.

Usage:
    python build_nodes_json.py [samples_dir]

Default samples_dir: C:/temp/samples
Output: tools/vse/nodes.json (merges with existing entries)
"""
import os, re, json, sys

HERE        = os.path.dirname(os.path.abspath(__file__))
SAMPLES_DIR = sys.argv[1] if len(sys.argv) > 1 else "C:/temp/samples"
NODES_FILE  = os.path.join(HERE, "nodes.json")

# Load existing nodes to preserve manual edits (label overrides, enabled flags)
existing = {}
if os.path.exists(NODES_FILE):
    with open(NODES_FILE, encoding="utf-8") as f:
        for n in json.load(f):
            existing[n["id"]] = n

def code_from_filename(name):
    """Extract code like CH00001 or SE00401 from filename."""
    m = re.match(r"([A-Z]{2}\d{4,6})", name)
    return m.group(1) if m else None

def id_from_filename(name):
    """Slugified id from filename without extension."""
    base = os.path.splitext(name)[0]
    return re.sub(r"[^a-zA-Z0-9_]", "_", base).strip("_").lower()

def label_from_path(rel_path):
    """Use parent folder name as label."""
    parts = rel_path.replace("\\", "/").split("/")
    # parts[0] = category, parts[1] = subcategory (if any), parts[-1] = filename
    if len(parts) >= 3:
        return f"{parts[0].lstrip('!')} / {parts[-2]}"
    return parts[0].lstrip("!")

nodes = []
seen_ids = set()

for root, dirs, files in os.walk(SAMPLES_DIR):
    dirs.sort()
    for fname in sorted(files):
        if not fname.lower().endswith(".ai"):
            continue
        full_path = os.path.join(root, fname)
        rel_path  = os.path.relpath(full_path, SAMPLES_DIR).replace("\\", "/")
        node_id   = id_from_filename(fname)
        code      = code_from_filename(fname) or node_id.upper()[:8]

        # Avoid duplicate ids
        if node_id in seen_ids:
            node_id = id_from_filename(fname) + "_" + str(sum(1 for n in nodes if n["id"].startswith(node_id)))
        seen_ids.add(node_id)

        if node_id in existing:
            # Preserve existing entry, just update file path
            entry = dict(existing[node_id])
            entry["file"] = rel_path
        else:
            entry = {
                "id":      node_id,
                "label":   label_from_path(rel_path),
                "code":    code,
                "file":    rel_path,
                "enabled": True,
            }
        nodes.append(entry)

with open(NODES_FILE, "w", encoding="utf-8") as f:
    json.dump(nodes, f, ensure_ascii=False, indent=2)

print(f"Generated {len(nodes)} nodes -> {NODES_FILE}")
cats = {}
for n in nodes:
    cat = n["file"].split("/")[0]
    cats[cat] = cats.get(cat, 0) + 1
for cat, cnt in sorted(cats.items()):
    print(f"  {cat:40} {cnt:4}x")
