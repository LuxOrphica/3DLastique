"""
Collect all unique visual styles across sample AI files.
Output: style_registry.json + style_registry.html for manual verification.
"""
import json, fitz, math
from roles import classify_color, classify_path, near_any_text

SAMPLES = [
    ("C:/temp/sample_node.ai",                    "vorotnik"),
    ("C:/temp/samples/neckline_FN00001.ai",        "gorlovyna"),
    ("C:/temp/samples/waistband_BE00001.ai",       "poyas"),
    ("C:/temp/samples/seams_SE00401.ai",           "shvy"),
    ("C:/temp/samples/front_placket_FP00129.ai",   "planka"),
    ("C:/temp/samples/sleeve_vent_SC00001.ai",     "razrez"),
]

def line_orient(items):
    pts = []
    for item in items:
        t = item[0]
        if t == 'l':
            pts += [item[1], item[2]]
        elif t == 'c':
            pts += [item[1], item[4]]
    if len(pts) < 2:
        return "-"
    dx = pts[-1].x - pts[0].x
    dy = pts[-1].y - pts[0].y
    if abs(dx) < 1 and abs(dy) < 1:
        return "-"
    angle = abs(math.degrees(math.atan2(abs(dy), abs(dx))))
    return "H" if angle < 20 else ("V" if angle > 70 else "D")

def rgb_to_hex(c):
    if not c: return "none"
    return "#{:02x}{:02x}{:02x}".format(int(c[0]*255), int(c[1]*255), int(c[2]*255))

def normalize_color(c):
    """Bucket near-identical colors to canonical values."""
    if not c:
        return "none"
    r, g, b = c[0], c[1], c[2]
    if r > 0.75 and g < 0.35 and b < 0.35:
        return "#e02020"   # RED
    if g > 0.55 and r < 0.35 and b < 0.55:
        return "#29b473"   # GREEN
    if b > 0.45 and r < 0.65 and g > 0.45:
        return "#27a6de"   # CYAN
    if b > 0.45 and r < 0.35 and g < 0.45:
        return "#1b4fa8"   # BLUE
    if r < 0.20 and g < 0.20 and b < 0.20:
        return "#1a1a1a"   # BLACK
    if r > 0.85 and g > 0.85 and b > 0.85:
        return "#ffffff"   # WHITE
    return rgb_to_hex(c)   # keep exact for unusual colors

def style_key(p, text_words=None):
    w     = round(p.get("width") or 0, 2)
    color = normalize_color(p.get("color"))
    fill_raw = p.get("fill")
    fill  = normalize_color(fill_raw) if fill_raw else "none"
    dash  = bool(p.get("dashes") and p["dashes"] != "[] 0")
    rect  = p.get("rect")
    rw    = round(rect.width,  1) if rect else 0
    rh    = round(rect.height, 1) if rect else 0
    items = p.get("items", [])
    is_filled = fill not in ("none", "#ffffff", "#ffffffff")
    is_closed = bool(p.get("closePath", False)) or is_filled
    # thin bbox OR simple open stroke with ≤2 segments (catches diagonal callout lines)
    _simple_stroke = (len(items) <= 2
                      and all(it[0] in ('l', 'c') for it in items)
                      and not is_closed)
    is_line   = (min(rw, rh) < 3) or _simple_stroke
    is_tiny   = rw < 18 and rh < 18
    near_text = bool(text_words and near_any_text(p.get("rect"), text_words))
    if is_line and not is_tiny:
        orient = line_orient(items)
        if orient == "-":
            orient = "H" if rw > rh * 1.5 else ("V" if rh > rw * 1.5 else "D")
    else:
        orient = "-"
    area = rw * rh
    if area < 600:
        sz = "XS"
    elif area < 12000:
        sz = "S"
    elif area < 80000:
        sz = "M"
    else:
        sz = "L"
    return (color, fill, w, dash, is_line, is_filled, is_tiny, is_closed, near_text, orient, sz)

# Registry: key → {count, files, example_rect, current_role}
registry = {}

for path, label in SAMPLES:
    try:
        doc = fitz.open(path)
    except Exception as e:
        print(f"SKIP {label}: {e}")
        continue
    page = doc[0]
    paths = page.get_drawings()
    text_words = page.get_text("words")
    for p in paths:
        k = style_key(p, text_words)
        auto_role = classify_path(p, text_words)
        if k not in registry:
            registry[k] = {"count": 0, "files": [], "role": auto_role}
        registry[k]["count"] += 1
        if label not in registry[k]["files"]:
            registry[k]["files"].append(label)

# Sort by count desc
rows = sorted(registry.items(), key=lambda x: -x[1]["count"])

# Save JSON
out_json = []
for k, v in rows:
    color, fill, w, dash, is_line, is_filled, is_tiny, is_closed, near_text, orient, sz = k
    out_json.append({
        "stroke":    color,
        "fill":      fill,
        "width":     w,
        "dashed":    dash,
        "is_line":   is_line,
        "is_filled": is_filled,
        "is_tiny":   is_tiny,
        "is_closed": is_closed,
        "near_text": near_text,
        "orient":    orient,
        "sz":        sz,
        "count":     v["count"],
        "files":     v["files"],
        "role":      v["role"],
        "key_str":   f"{color}|{fill}|{w}|{str(dash).lower()}" + ("|D" if orient == "D" else "")
    })

with open("C:/temp/vse/style_registry.json", "w", encoding="utf-8") as f:
    json.dump(out_json, f, ensure_ascii=False, indent=2)

# Build HTML table for manual verification
def swatch(hex_color, size=18):
    if hex_color == "none":
        return f'<span style="display:inline-block;width:{size}px;height:{size}px;border:1px dashed #ccc;"></span>'
    return f'<span style="display:inline-block;width:{size}px;height:{size}px;background:{hex_color};border:1px solid #999;border-radius:2px"></span>'

def dash_preview(color, w, dashed):
    stroke = color if color != "none" else "#999"
    dash = "stroke-dasharray='4 2'" if dashed else ""
    sw = max(w, 0.5)
    return f'<svg width="60" height="14" style="vertical-align:middle"><line x1="2" y1="7" x2="58" y2="7" stroke="{stroke}" stroke-width="{sw}" {dash}/></svg>'

ROLE_OPTIONS = [
    "base_outer_contour", "structure_line", "stitch_line",
    "zone_frame", "secondary_structure", "heavy_seam",
    "callout_line", "arrow", "filled_shape",
    "hardware_symbol", "measurement_line", "unknown"
]

rows_html = ""
for i, entry in enumerate(out_json):
    opts = "".join(
        f'<option value="{r}"{"selected" if r == entry["role"] else ""}>{r}</option>'
        for r in ROLE_OPTIONS
    )
    files_str = ", ".join(entry["files"])
    rows_html += f"""
<tr id="row{i}">
  <td class="tc">{entry['count']}</td>
  <td class="tc">{swatch(entry['stroke'])}<br><code>{entry['stroke']}</code></td>
  <td class="tc">{swatch(entry['fill'])}<br><code>{entry['fill']}</code></td>
  <td class="tc">{entry['width']}</td>
  <td class="tc">{dash_preview(entry['stroke'], entry['width'], entry['dashed'])}</td>
  <td class="tc">{'line' if entry['is_line'] else 'path'}{'·filled' if entry['is_filled'] else ''}{'·tiny' if entry['is_tiny'] else ''}</td>
  <td><select class="role-sel" data-idx="{i}" onchange="mark(this)">{opts}</select></td>
  <td style="font-size:11px;color:#888">{files_str}</td>
</tr>"""

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VSE — Style Registry</title>
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: Arial, sans-serif; font-size: 13px; background: #f5f2ee; }}
header {{ padding: 16px 32px; background: #1a1a1a; color: #C8A84B; font-size: 16px; font-weight: 700; }}
.sub {{ font-size: 11px; color: #888; margin-top: 4px; }}
table {{ width: 100%; border-collapse: collapse; background: #fff; margin: 24px 0; }}
th {{ background: #1a1a1a; color: #C8A84B; padding: 8px 12px; font-size: 11px; letter-spacing: 0.08em; text-align: left; }}
td {{ padding: 7px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }}
.tc {{ text-align: center; }}
tr:hover td {{ background: #faf8f5; }}
tr.assigned td {{ background: #f0faf0; }}
code {{ font-size: 10px; color: #666; }}
select.role-sel {{ font-size: 12px; padding: 3px 6px; border: 1px solid #C8A84B; border-radius: 3px; background: #fff; min-width: 160px; }}
.save-btn {{ margin: 0 32px 32px; padding: 10px 24px; background: #C8A84B; color: #fff; border: none; border-radius: 4px; font-size: 14px; font-weight: 700; cursor: pointer; }}
.save-btn:hover {{ opacity: 0.85; }}
#status {{ margin: 0 32px; font-size: 12px; color: #888; }}
</style>
</head>
<body>
<header>
  VSE — Style Registry
  <div class="sub">Назначь роль каждому визуальному стилю → Save JSON</div>
</header>
<table>
<thead>
<tr>
  <th>Count</th>
  <th>Stroke</th>
  <th>Fill</th>
  <th>Width</th>
  <th>Preview</th>
  <th>Geometry</th>
  <th>Role</th>
  <th>Files</th>
</tr>
</thead>
<tbody>{rows_html}</tbody>
</table>
<button class="save-btn" onclick="saveJSON()">Сохранить назначения</button>
<div id="status"></div>
<script>
const data = {json.dumps(out_json, ensure_ascii=False)};

function mark(sel) {{
  const row = sel.closest('tr');
  row.classList.toggle('assigned', sel.value !== '?');
  data[sel.dataset.idx].role = sel.value;
}}

function saveJSON() {{
  document.querySelectorAll('.role-sel').forEach(s => {{
    data[s.dataset.idx].role = s.value;
  }});
  const blob = new Blob([JSON.stringify(data, null, 2)], {{type: 'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'style_registry.json';
  a.click();
  document.getElementById('status').textContent = 'Saved: style_registry.json — replace C:/temp/vse/style_registry.json with this file';
}}

// Mark already-assigned rows
document.querySelectorAll('.role-sel').forEach(s => {{
  if (s.value !== '?') s.closest('tr').classList.add('assigned');
}});
</script>
</body>
</html>"""

with open("C:/temp/vse_registry.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"Registry: {len(out_json)} unique styles across {len(SAMPLES)} files")
print("-> C:/temp/vse_registry.html")
print("-> C:/temp/vse/style_registry.json")
