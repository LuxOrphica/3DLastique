"""
Build callout graph: text label → nearest line → line style
For each text word, find the closest path endpoint, then follow
the callout line to the target path.
"""
import json, fitz
from roles import classify_color

def rgb_to_hex(c):
    if not c: return "none"
    return "#{:02x}{:02x}{:02x}".format(int(c[0]*255), int(c[1]*255), int(c[2]*255))

def pt_dist(ax, ay, bx, by):
    return ((ax-bx)**2 + (ay-by)**2) ** 0.5

def path_endpoints(p):
    """Return list of (x,y) endpoint candidates from path items."""
    pts = []
    for item in p.get("items", []):
        t = item[0]
        if t == 'l':
            pts.append((item[1].x, item[1].y))
            pts.append((item[2].x, item[2].y))
        elif t == 'c':
            pts.append((item[1].x, item[1].y))
            pts.append((item[4].x, item[4].y))
    return pts

def path_center(p):
    r = p.get("rect")
    if r:
        return (r.x0 + r.width/2, r.y0 + r.height/2)
    return None

def analyze(ai_path):
    doc = fitz.open(ai_path)
    page = doc[0]
    paths = page.get_drawings()

    # Get full text lines with positions
    text_items = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0: continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans: continue
            text = " ".join(s["text"] for s in spans).strip()
            if not text: continue
            bb = line["bbox"]
            # Text anchor: left edge, vertical center
            tx = bb[0]
            ty = (bb[1] + bb[3]) / 2
            text_items.append({"text": text, "x": tx, "y": ty, "bbox": bb})

    # For each text, find nearest path endpoint (= callout start)
    results = []
    for ti in text_items:
        tx, ty = ti["x"], ti["y"]

        best_dist = 9999
        best_path = None
        best_pt   = None

        for p in paths:
            for px, py in path_endpoints(p):
                d = pt_dist(tx, ty, px, py)
                if d < best_dist:
                    best_dist = d
                    best_path = p
                    best_pt   = (px, py)

        if best_path is None:
            continue

        # Callout path style
        callout_color = classify_color(best_path.get("color"))
        callout_hex   = rgb_to_hex(best_path.get("color"))
        callout_w     = best_path.get("width") or 0

        # Now find the TARGET path — the one at the OTHER end of the callout
        # Look for paths whose endpoint is near the far end of the callout
        r = best_path.get("rect")
        if r:
            # Far end = endpoint farthest from text
            eps = path_endpoints(best_path)
            far_pt = max(eps, key=lambda p: pt_dist(tx, ty, p[0], p[1])) if eps else None
        else:
            far_pt = None

        target_path = None
        target_dist = 9999
        if far_pt:
            fx, fy = far_pt
            for p in paths:
                if p is best_path: continue
                for px, py in path_endpoints(p):
                    d = pt_dist(fx, fy, px, py)
                    if d < target_dist:
                        target_dist = d
                        target_path = p

        if target_path:
            tgt_color = classify_color(target_path.get("color"))
            tgt_hex   = rgb_to_hex(target_path.get("color"))
            tgt_w     = target_path.get("width") or 0
            tgt_fill  = rgb_to_hex(target_path.get("fill"))
            tgt_r     = target_path.get("rect")
            tgt_size  = f"{tgt_r.width:.0f}x{tgt_r.height:.0f}" if tgt_r else "?"
        else:
            tgt_color = tgt_hex = tgt_fill = tgt_size = "?"
            tgt_w = 0

        results.append({
            "label":         ti["text"],
            "callout_dist":  round(best_dist, 1),
            "callout_color": callout_hex,
            "callout_w":     round(callout_w, 2),
            "target_color":  tgt_hex,
            "target_fill":   tgt_fill,
            "target_w":      round(tgt_w, 2),
            "target_size":   tgt_size,
            "target_color_name": tgt_color,
        })

    return results

# Run on all samples
SAMPLES = [
    ("C:/temp/sample_node.ai",                  "Воротник CH00001"),
    ("C:/temp/samples/front_placket_FP00129.ai","Планка FP00129"),
    ("C:/temp/samples/seams_SE00401.ai",        "Швы SE00401"),
    ("C:/temp/samples/waistband_BE00001.ai",    "Пояс BE00001"),
]

all_results = {}
for path, label in SAMPLES:
    r = analyze(path)
    all_results[label] = r
    print(f"\n=== {label} ===")
    for item in r:
        print(f"  [{item['label']:15}] callout={item['callout_color']} w={item['callout_w']}"
              f"  -> target={item['target_color']} w={item['target_w']} size={item['target_size']}")

# Build HTML report
rows = ""
for label, items in all_results.items():
    for item in items:
        def sw(h, w=16):
            if h in ("none","?"): return f'<span style="display:inline-block;width:{w}px;height:{w}px;border:1px dashed #ccc"></span>'
            return f'<span style="display:inline-block;width:{w}px;height:{w}px;background:{h};border:1px solid #666;border-radius:2px"></span>'
        def line_prev(hex, width):
            if hex in ("none","?"): return "—"
            w = max(float(width), 0.5)
            return f'<svg width="50" height="12"><line x1="2" y1="6" x2="48" y2="6" stroke="{hex}" stroke-width="{w}"/></svg>'

        rows += f"""<tr>
          <td style="color:#888;font-size:11px">{label}</td>
          <td><strong>{item['label']}</strong></td>
          <td>{line_prev(item['callout_color'], item['callout_w'])} <code>{item['callout_color']}</code></td>
          <td>{sw(item['target_color'])} {line_prev(item['target_color'], item['target_w'])}
              <code>{item['target_color']}</code> w={item['target_w']}</td>
          <td style="color:#888;font-size:11px">{item['target_size']}</td>
          <td><input style="width:200px;font-size:12px;padding:3px 6px;border:1px solid #C8A84B;border-radius:3px"
               placeholder="что это обозначает?" /></td>
        </tr>"""

html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>VSE — Callout Graph</title>
<style>
* {{ box-sizing:border-box; margin:0; padding:0; }}
body {{ font-family:Arial,sans-serif; font-size:13px; background:#f5f2ee; }}
header {{ padding:16px 32px; background:#1a1a1a; color:#C8A84B; font-size:16px; font-weight:700; }}
table {{ width:100%; border-collapse:collapse; background:#fff; margin:24px 0; }}
th {{ background:#1a1a1a; color:#C8A84B; padding:8px 12px; font-size:11px; letter-spacing:.08em; text-align:left; }}
td {{ padding:7px 12px; border-bottom:1px solid #eee; vertical-align:middle; }}
tr:hover td {{ background:#faf8f5; }}
code {{ font-size:10px; color:#666; }}
</style>
</head>
<body>
<header>VSE — Callout Graph &nbsp;|&nbsp; Текст → выноска → целевая линия</header>
<table>
<thead><tr>
  <th>Файл</th><th>Подпись</th><th>Линия выноски</th><th>Целевая линия</th><th>Размер</th><th>Значение (вручную)</th>
</tr></thead>
<tbody>{rows}</tbody>
</table>
</body></html>"""

with open("C:/temp/vse_callout_graph.html", "w", encoding="utf-8") as f:
    f.write(html)
print("\nSaved: C:/temp/vse_callout_graph.html")
