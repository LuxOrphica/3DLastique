"""
VSE — Visual Standardization Engine
Usage: python engine.py input.ai output.svg
"""

import sys, json, os, math
import fitz
from roles import classify_path, near_any_text
from visual_standard import style_attr, get_style, ROLE_STYLES
from bbox import get_content_bbox

REGISTRY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "style_registry.json")

def _rgb_to_hex(c):
    if not c:
        return "none"
    return "#{:02x}{:02x}{:02x}".format(int(c[0]*255), int(c[1]*255), int(c[2]*255))

def _normalize_color(c):
    if not c:
        return "none"
    r, g, b = c[0], c[1], c[2]
    if r > 0.75 and g < 0.35 and b < 0.35:
        return "#e02020"
    if g > 0.55 and r < 0.35 and b < 0.55:
        return "#29b473"
    if b > 0.45 and r < 0.65 and g > 0.45:
        return "#27a6de"
    if b > 0.45 and r < 0.35 and g < 0.45:
        return "#1b4fa8"
    if r < 0.20 and g < 0.20 and b < 0.20:
        return "#1a1a1a"
    if r > 0.85 and g > 0.85 and b > 0.85:
        return "#ffffff"
    return _rgb_to_hex(c)

def _line_orient(items):
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

def _build_registry_lookup():
    """Load style_registry.json and return a dict: style_key_tuple → role."""
    if not os.path.exists(REGISTRY_PATH):
        return {}
    try:
        with open(REGISTRY_PATH, encoding="utf-8") as f:
            entries = json.load(f)
    except Exception:
        return {}
    lookup = {}
    for e in entries:
        role = e.get("role")
        if not role or role == "?":
            continue
        key = (
            e.get("stroke", "none"),
            e.get("fill",   "none"),
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
        lookup[key] = role
    return lookup

def _path_style_key(p, text_words=None):
    rect = p.get("rect")
    rw   = round(rect.width,  1) if rect else 0
    rh   = round(rect.height, 1) if rect else 0
    color_hex = _normalize_color(p.get("color"))
    fill_raw  = p.get("fill")
    fill_hex  = _normalize_color(fill_raw) if fill_raw else "none"
    w         = round(p.get("width") or 0, 2)
    dash      = bool(p.get("dashes") and p.get("dashes") != "[] 0")
    items     = p.get("items", [])
    is_filled = fill_hex not in ("none", "#ffffff", "#ffffffff")
    is_closed = bool(p.get("closePath", False)) or is_filled
    _simple_stroke = (len(items) <= 2
                      and all(it[0] in ('l', 'c') for it in items)
                      and not is_closed)
    is_line   = (min(rw, rh) < 3) or _simple_stroke
    is_tiny   = rw < 18 and rh < 18
    near_text = bool(text_words and near_any_text(p.get("rect"), text_words))
    if is_line and not is_tiny:
        orient = _line_orient(items)
        if orient == "-":
            orient = "H" if rw > rh * 1.5 else ("V" if rh > rw * 1.5 else "D")
    else:
        orient = "-"
    area = rw * rh
    sz = "XS" if area < 600 else ("S" if area < 12000 else ("M" if area < 80000 else "L"))
    return (color_hex, fill_hex, w, dash, is_line, is_filled, is_tiny, is_closed, near_text, orient, sz)

def _path_data_sk(p, text_words=None):
    """Compute the group key string that VseReview.jsx uses for highlight matching."""
    color_hex = _normalize_color(p.get("color"))
    fill_raw  = p.get("fill")
    fill_hex  = _normalize_color(fill_raw) if fill_raw else "none"
    w         = round(p.get("width") or 0, 2)
    dash      = bool(p.get("dashes") and p.get("dashes") != "[] 0")
    items     = p.get("items", [])
    rect      = p.get("rect")
    rw        = round(rect.width,  1) if rect else 0
    rh        = round(rect.height, 1) if rect else 0
    is_filled = fill_hex not in ("none", "#ffffff", "#ffffffff")
    is_closed = bool(p.get("closePath", False)) or is_filled
    _simple   = (len(items) <= 2
                 and all(it[0] in ('l', 'c') for it in items)
                 and not is_closed)
    is_line   = (min(rw, rh) < 3) or _simple
    is_tiny   = rw < 18 and rh < 18
    if is_line and not is_tiny:
        orient = _line_orient(items)
        if orient == "-":
            orient = "H" if rw > rh * 1.5 else ("V" if rh > rw * 1.5 else "D")
    else:
        orient = "-"
    orient_key = "|D" if orient == "D" else ""
    return f"{color_hex}|{fill_hex}|{w}|{str(dash).lower()}{orient_key}"

def classify_with_registry(p, text_words, registry_lookup):
    """Registry takes priority over heuristic classify_path.
    Exception: simple open strokes use length-aware heuristic for callout/break."""
    items = p.get("items", [])
    rect  = p.get("rect")
    rw = round(rect.width,  1) if rect else 0
    rh = round(rect.height, 1) if rect else 0
    fill_raw  = p.get("fill")
    is_filled = fill_raw is not None
    is_closed = p.get("closePath", False) or is_filled
    _simple_stroke = (len(items) <= 2
                      and all(it[0] in ('l', 'c') for it in items)
                      and not is_closed)
    if _simple_stroke:
        # Length-sensitive roles — heuristic knows better than registry
        heur = classify_path(p, text_words)
        if heur in ("callout_line", "break_line"):
            return heur
    key = _path_style_key(p, text_words)
    if key in registry_lookup:
        return registry_lookup[key]
    return classify_path(p, text_words)


def items_to_svg_d(items, close=False):
    """
    Convert pymupdf drawing items to SVG path d string.
    Item formats:
      ('l', p_start, p_end)              — line segment
      ('c', p_start, cp1, cp2, p_end)    — cubic bezier
      ('re', Rect)                        — rectangle
      ('qu', Quad)                        — quadrilateral
    Chain consecutive segments into one path where endpoints match.
    """
    if not items:
        return ""

    segments = []  # list of (type, points...)
    for item in items:
        t = item[0]
        if t == 'l':
            segments.append(('l', item[1], item[2]))
        elif t == 'c':
            segments.append(('c', item[1], item[2], item[3], item[4]))
        elif t == 're':
            r = item[1]
            segments.append(('re', r))
        elif t == 'qu':
            segments.append(('qu', item[1]))

    if not segments:
        return ""

    d = []
    prev_end = None

    for seg in segments:
        t = seg[0]

        if t == 're':
            r = seg[1]
            d.append(f"M {r.x0:.2f} {r.y0:.2f} H {r.x1:.2f} V {r.y1:.2f} H {r.x0:.2f} Z")
            prev_end = None
            continue

        if t == 'qu':
            pts = seg[1]  # Quad has ul, ur, ll, lr
            d.append(f"M {pts.ul.x:.2f} {pts.ul.y:.2f} L {pts.ur.x:.2f} {pts.ur.y:.2f} L {pts.lr.x:.2f} {pts.lr.y:.2f} L {pts.ll.x:.2f} {pts.ll.y:.2f} Z")
            prev_end = None
            continue

        start = seg[1]

        # Move to start if not continuing from previous end
        EPS = 0.5
        if prev_end is None or abs(start.x - prev_end.x) > EPS or abs(start.y - prev_end.y) > EPS:
            d.append(f"M {start.x:.2f} {start.y:.2f}")

        if t == 'l':
            end = seg[2]
            d.append(f"L {end.x:.2f} {end.y:.2f}")
            prev_end = end
        elif t == 'c':
            cp1, cp2, end = seg[2], seg[3], seg[4]
            d.append(f"C {cp1.x:.2f} {cp1.y:.2f} {cp2.x:.2f} {cp2.y:.2f} {end.x:.2f} {end.y:.2f}")
            prev_end = end

    if close:
        d.append("Z")

    return " ".join(d)


def standardize(ai_path, svg_out):
    doc = fitz.open(ai_path)
    page = doc[0]

    paths           = page.get_drawings()
    text_words      = page.get_text("words")
    registry_lookup = _build_registry_lookup()

    # Full text lines for rendering (blocks → lines → spans)
    text_lines = []
    stitch_symbols = []  # spans that are stitch-symbol glyphs (vvvv etc.)
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
                # Detect stitch glyph: all same char, small font (≤5pt)
                if len(set(txt.lower())) == 1 and s.get("size", 99) <= 5:
                    x0, y0, x1, y1 = s["bbox"]
                    c = s.get("color", 0)
                    r = ((c >> 16) & 0xFF) / 255
                    g = ((c >> 8)  & 0xFF) / 255
                    b = (c         & 0xFF) / 255
                    hex_c = "#{:02x}{:02x}{:02x}".format(int(r*255), int(g*255), int(b*255))
                    stitch_symbols.append((x0, y1, txt, s.get("size", 3), hex_c))
                    continue
            full_text = " ".join(s["text"] for s in spans).strip()
            if not full_text:
                continue
            x0 = min(s["bbox"][0] for s in spans)
            y1 = max(s["bbox"][3] for s in spans)
            size = spans[0].get("size", 8)
            text_lines.append((x0, y1, full_text, size))

    bb = get_content_bbox(page)
    W, H = bb.width, bb.height
    vb = f"{bb.x0:.2f} {bb.y0:.2f} {bb.width:.2f} {bb.height:.2f}"

    # Classify all paths (registry overrides heuristics)
    classified = []
    for p in paths:
        role = classify_with_registry(p, text_words, registry_lookup)
        classified.append((role, p))

    render_classified = []
    for role, p in classified:
        if role == "_skip":
            pass
        else:
            render_classified.append((role, p))

    # Render order: backgrounds first, foreground last
    LAYER_ORDER = [
        "boundary_zone", "fill_shape", "fill_interlining", "fill_fabric",
        "contour_outer", "seam_line", "contour_cut",
        "construction_aux", "contour_fold", "seam_allowance",
        "boundary_interlining", "boundary_lining", "boundary_fragment",
        "stitch_edge", "stitch_thru",
        "stitch_L", "stitch_C", "stitch_O", "stitch_F", "stitch_zigzag", "stitch_Bt",
        "callout_line", "break_line", "dim_line",
        "hw_button", "hw_buttonhole", "hw_snap", "hw_other",
        "arrow", "unknown",
    ]
    render_classified.sort(key=lambda x: LAYER_ORDER.index(x[0]) if x[0] in LAYER_ORDER else 99)

    lines = []
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="{vb}">')
    lines.append('  <!-- VSE — Visual Standardization Engine -->')

    current_role = None
    for role, p in render_classified:
        if role != current_role:
            if current_role is not None:
                lines.append('  </g>')
            lines.append(f'  <g id="role-{role}" data-role="{role}">')
            current_role = role

        items = p.get("items", [])
        close = p.get("closePath", False)
        fill  = p.get("fill")
        if fill is not None:
            close = True

        d = items_to_svg_d(items, close)
        if d:
            style = style_attr(role)
            lines.append(f'    <path d="{d}" style="{style}" data-role="{role}"/>')

    if current_role is not None:
        lines.append('  </g>')

    # Stitch symbol glyphs (e.g. vvvvv in small font = stitch marking)
    if stitch_symbols:
        lines.append('  <g id="role-stitch_symbol" data-role="stitch_symbol">')
        for (x, y, txt, size, color) in stitch_symbols:
            safe = txt.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
            lines.append(f'    <text x="{x:.1f}" y="{y:.1f}" font-family="Arial,sans-serif" font-size="{size:.1f}" fill="{color}" data-role="stitch_symbol">{safe}</text>')
        lines.append('  </g>')

    # Text labels — full lines, not individual words
    lines.append('  <g id="role-label" data-role="label">')
    ls = get_style("label")
    ff = ls.get("font-family", "Arial, sans-serif")
    fc = ls.get("fill", "#1A1A1A")
    for (x, y, text, size) in text_lines:
        safe = text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
        fs = f"{size:.1f}"
        lines.append(f'    <text x="{x:.1f}" y="{y:.1f}" font-family="{ff}" font-size="{fs}" fill="{fc}">{safe}</text>')
    lines.append('  </g>')

    lines.append('</svg>')

    svg_content = "\n".join(lines)
    with open(svg_out, "w", encoding="utf-8") as f:
        f.write(svg_content)

    # Report
    role_counts = {}
    for role, _ in classified:
        role_counts[role] = role_counts.get(role, 0) + 1

    print(f"VSE — {ai_path.split('/')[-1].split(chr(92))[-1]}")
    print(f"  Canvas: {W:.0f}x{H:.0f}  Paths: {len(classified)}  Text: {len(text_words)}")
    for role, count in sorted(role_counts.items(), key=lambda x: -x[1]):
        lbl = ROLE_STYLES.get(role, {}).get("_label", role)
        print(f"  {role:25} {count:3}x  {lbl}")
    print(f"  -> {svg_out}")
    return svg_content


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "C:/temp/sample_node.ai"
    dst = sys.argv[2] if len(sys.argv) > 2 else "C:/temp/sample_node_std.svg"
    standardize(src, dst)
