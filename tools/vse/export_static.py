"""
Export static assets for the React VSE review page.
Output: F:/Projects/lekala-site/public/vse/
  - manifest.json          list of nodes with metadata
  - {id}_orig.svg          annotated original SVG (data-sk on each path)
  - {id}_std.svg           standardized SVG
  - style_registry.json    unique styles with key_str for UI matching
  - callout_graph.json     callout → target mappings
"""
import os, re, json, fitz
from engine import standardize, _normalize_color, _path_style_key, items_to_svg_d, _build_registry_lookup, classify_with_registry, apply_node_role_override, normalize_fragmented_stitches, sanitize_color_role_conflicts
from bbox import get_content_bbox
from callout_graph import analyze
from roles import near_any_text

HERE    = os.path.dirname(os.path.abspath(__file__))
ROOT    = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "vse").replace("\\", "/")
os.makedirs(OUT_DIR, exist_ok=True)

# Source AI files root — override with env var VSE_SAMPLES_DIR
SAMPLES_DIR = os.environ.get("VSE_SAMPLES_DIR", "C:/temp").replace("\\", "/")
NODE_DIR_FILTER = os.environ.get("VSE_NODE_DIR_FILTER", "").replace("\\", "/").strip("/")
CODE_PREFIX_FILTER = os.environ.get("VSE_CODE_PREFIX_FILTER", "").strip().upper()
NODE_ID_FILTER = os.environ.get("VSE_NODE_ID_FILTER", "").strip()

with open(os.path.join(HERE, "nodes.json"), encoding="utf-8") as _f:
    _nodes = json.load(_f)

FILE_TO_NODE_ID = {
    os.path.basename(n["file"]).lower(): n["id"]
    for n in _nodes
    if n.get("file")
}

_enabled_nodes = [n for n in _nodes if n.get("enabled", True)]
if NODE_DIR_FILTER:
    _prefix = NODE_DIR_FILTER.lower().rstrip("/") + "/"
    _enabled_nodes = [
        n for n in _enabled_nodes
        if (n.get("file") or "").replace("\\", "/").lower().startswith(_prefix)
    ]
if CODE_PREFIX_FILTER:
    _enabled_nodes = [
        n for n in _enabled_nodes
        if (n.get("code") or "").upper().startswith(CODE_PREFIX_FILTER)
    ]

if NODE_ID_FILTER:
    _enabled_nodes = [n for n in _enabled_nodes if n.get("id") == NODE_ID_FILTER]

SAMPLES = [
    (f"{SAMPLES_DIR}/{n['file']}", n["id"], n["label"], n["code"])
    for n in _enabled_nodes
]

# Skip-approved support: read approved_nodes.json
_SKIP_APPROVED = os.environ.get("VSE_SKIP_APPROVED", "").lower() in ("1", "true", "yes")
_APPROVED_PATH = os.path.join(HERE, "approved_nodes.json")
_approved_ids = set()
if _SKIP_APPROVED and os.path.exists(_APPROVED_PATH):
    try:
        _ap = json.load(open(_APPROVED_PATH, encoding="utf-8"))
        _approved_ids = set(_ap.get("approved", []))
        print(f"[skip-approved] Skipping {len(_approved_ids)} approved nodes")
    except Exception:
        pass

def key_to_str(key):
    return "|".join(str(v) for v in key)

def display_key_str(key):
    """Key matching VseReview.jsx groupNodeStyles: stroke|fill|width|dashed[|D]."""
    color, fill, w, dash, is_line, is_filled, is_tiny, is_closed, near_text, orient, sz = key
    orient_sfx = "|D" if orient == "D" else ""
    return f"{color}|{fill}|{w}|{str(dash).lower()}{orient_sfx}"

def _rgb_to_hex(c):
    if not c: return "none"
    return "#{:02x}{:02x}{:02x}".format(int(c[0]*255), int(c[1]*255), int(c[2]*255))

def _orig_path_style(p):
    """CSS style string preserving original appearance."""
    color = _rgb_to_hex(p.get("color")) or "none"
    fill  = _rgb_to_hex(p.get("fill"))  or "none"
    w     = p.get("width") or 1
    dashes = p.get("dashes", "[] 0")
    dash_str = ""
    if dashes and dashes != "[] 0":
        # format: "[ d1 d2 ... ] offset" — take only numbers inside brackets
        m = re.search(r"\[([^\]]*)\]", dashes)
        if m:
            nums = m.group(1).split()
            if nums:
                dash_str = f"stroke-dasharray:{' '.join(nums)};"
    lc = p.get("lineCap",  1)
    lj = p.get("lineJoin", 0)
    cap_map  = {0: "butt", 1: "round", 2: "square"}
    join_map = {0: "miter", 1: "round", 2: "bevel"}
    cap  = cap_map.get(lc,  "butt")
    join = join_map.get(lj, "miter")
    return (f"stroke:{color};stroke-width:{w:.2f};fill:{fill};"
            f"stroke-linecap:{cap};stroke-linejoin:{join};{dash_str}")

def build_annotated_orig_svg(ai_path, text_words, bb):
    """Generate original SVG with data-role and data-sk on every path."""
    doc  = fitz.open(ai_path)
    page = doc[0]
    paths = page.get_drawings()
    registry_lookup = _build_registry_lookup()

    W  = bb.width
    H  = bb.height
    vb = f"{bb.x0:.2f} {bb.y0:.2f} {W:.2f} {H:.2f}"

    lines = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">']

    classified = []
    for p in paths:
        key = _path_style_key(p, text_words)
        role = classify_with_registry(p, text_words, registry_lookup)
        role = apply_node_role_override(ai_path, p, role)
        classified.append((role, p, key))

    pairs = [(role, p) for role, p, _ in classified]
    pairs = sanitize_color_role_conflicts(pairs)   # fix red paths wrongly classified as boundary
    pairs = normalize_fragmented_stitches(pairs)   # merge small stitch fragments
    classified = [(role, p, classified[i][2]) for i, (role, p) in enumerate(pairs)]

    for role, p, key in classified:
        items = p.get("items", [])
        close = p.get("closePath", False) or (p.get("fill") is not None)
        d = items_to_svg_d(items, close)
        if not d:
            continue
        style = _orig_path_style(p)
        dsk = display_key_str(key)
        lines.append(f'  <path d="{d}" style="{style}" data-role="{role}" data-sk="{dsk}"/>')

    # Text — split stitch glyphs from regular labels
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            for s in spans:
                txt = s["text"].strip()
                if not txt:
                    continue
                x0, y0, x1, y1 = s["bbox"]
                size = s.get("size", 8)
                safe = txt.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
                if len(set(txt.lower())) == 1 and size <= 5:
                    c = s.get("color", 0)
                    r = ((c >> 16) & 0xFF) / 255
                    g = ((c >> 8)  & 0xFF) / 255
                    b = (c         & 0xFF) / 255
                    hex_c = "#{:02x}{:02x}{:02x}".format(int(r*255), int(g*255), int(b*255))
                    lines.append(f'  <text x="{x0:.1f}" y="{y1:.1f}" font-family="Arial,sans-serif" '
                                 f'font-size="{size:.1f}" fill="{hex_c}" data-role="stitch_symbol">{safe}</text>')
                else:
                    lines.append(f'  <text x="{x0:.1f}" y="{y1:.1f}" font-family="Arial,sans-serif" '
                                 f'font-size="{size:.1f}" fill="#222">{safe}</text>')

    lines.append('</svg>')
    return "\n".join(lines)

def clean_svg(svg_str):
    svg_str = re.sub(r'(<svg[^>]*)\s+width="[\d.]+"', r'\1', svg_str)
    svg_str = re.sub(r'(<svg[^>]*)\s+height="[\d.]+"', r'\1', svg_str)
    return svg_str

manifest = []
callout_all = {}

for path, node_id, label, code in SAMPLES:
    if not os.path.exists(path):
        print(f"SKIP: {path}")
        continue
    if _SKIP_APPROVED and node_id in _approved_ids:
        print(f"APPROVED (skip): {label} {code}")
        continue
    print(f"Exporting: {label} {code}")

    doc  = fitz.open(path)
    page = doc[0]
    bb   = get_content_bbox(page)
    text_words = page.get_text("words")

    # Annotated original SVG
    orig_svg = build_annotated_orig_svg(path, text_words, bb)
    with open(f"{OUT_DIR}/{node_id}_orig.svg", "w", encoding="utf-8") as f:
        f.write(orig_svg)

    # Standardized SVG
    std_path = f"{OUT_DIR}/{node_id}_std.svg"
    standardize(path, std_path)
    with open(std_path, encoding="utf-8") as f:
        std = f.read()
    std = clean_svg(std)
    with open(std_path, "w", encoding="utf-8") as f:
        f.write(std)

    # Callout graph
    items = analyze(path)
    callout_all[node_id] = [i for i in items if not i["label"].startswith("vvvv")]

    manifest.append({
        "id":      node_id,
        "label":   label,
        "code":    code,
        "sourceFile": os.path.basename(path),
        "origSvg": f"/vse/{node_id}_orig.svg",
        "stdSvg":  f"/vse/{node_id}_std.svg",
        "width":   round(bb.width),
        "height":  round(bb.height),
    })

# Style registry — add key_str to each entry
with open(os.path.join(HERE, "style_registry.json"), encoding="utf-8") as f:
    registry = json.load(f)

for e in registry:
    key = (
        e.get("stroke",    "none"),
        e.get("fill",      "none"),
        round(float(e.get("width", 0)), 2),
        bool(e.get("dashed",    False)),
        bool(e.get("is_line",   False)),
        bool(e.get("is_filled", False)),
        bool(e.get("is_tiny",   False)),
        bool(e.get("is_closed", False)),
        bool(e.get("near_text", False)),
        e.get("orient", "-"),
        e.get("sz", "M"),
    )
    e["key_str"] = display_key_str(key)
    node_ids = []
    for fname in e.get("files", []) or []:
        node_id = FILE_TO_NODE_ID.get(os.path.basename(fname).lower())
        if node_id and node_id not in node_ids:
            node_ids.append(node_id)
    e["nodeIds"] = node_ids

if NODE_DIR_FILTER or CODE_PREFIX_FILTER:
    manifest_path = f"{OUT_DIR}/manifest.json"
    existing_manifest = []
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as f:
            existing_manifest = json.load(f)
    exported_ids = {item["id"] for item in manifest}
    merged_manifest = [item for item in existing_manifest if item.get("id") not in exported_ids]
    merged_manifest.extend(manifest)
    merged_manifest.sort(key=lambda item: item.get("id", ""))
    manifest = merged_manifest

if manifest:  # never overwrite manifest with empty list
    with open(f"{OUT_DIR}/manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
else:
    print("WARNING: 0 nodes exported — manifest.json preserved")

with open(f"{OUT_DIR}/style_registry.json", "w", encoding="utf-8") as f:
    json.dump(registry, f, ensure_ascii=False, indent=2)

if NODE_DIR_FILTER or CODE_PREFIX_FILTER:
    callout_path = f"{OUT_DIR}/callout_graph.json"
    existing_callouts = {}
    if os.path.exists(callout_path):
        with open(callout_path, encoding="utf-8") as f:
            existing_callouts = json.load(f)
    existing_callouts.update(callout_all)
    callout_all = existing_callouts

with open(f"{OUT_DIR}/callout_graph.json", "w", encoding="utf-8") as f:
    json.dump(callout_all, f, ensure_ascii=False, indent=2)

print(f"\nExported {len(manifest)} nodes to {OUT_DIR}")
