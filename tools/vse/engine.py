"""
VSE — Visual Standardization Engine
Usage: python engine.py input.ai output.svg
"""

import sys, json, os, math, hashlib, re
import fitz
import xml.etree.ElementTree as ET
from roles import classify_path, near_any_text
from stitch_logic import normalize_stitch_role
from visual_standard import style_attr, get_style, ROLE_STYLES
from role_cleanup import normalize_active_role
from bbox import get_content_bbox
from hardware_symbols import render_zipper_clusters
from vse_keys import compute_group_key, compute_elem_key

REGISTRY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "style_registry.json")
NODE_STYLE_OVERRIDES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "node_style_overrides.json")
NODE_ANNOTATIONS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "node_annotations.json")

def _safe_print(text):
    try:
        print(text)
    except OSError:
        try:
            sys.stdout.buffer.write((str(text) + "\n").encode("utf-8", errors="replace"))
        except Exception:
            pass

def _rgb_to_hex(c):
    if not c:
        return "none"
    return "#{:02x}{:02x}{:02x}".format(int(c[0]*255), int(c[1]*255), int(c[2]*255))

def _is_blue_stroke(p):
    return _normalize_color(p.get("color")) == "#1b4fa8" and p.get("fill") is None

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
    if (
        isinstance(entries, list)
        and len(entries) == 1
        and isinstance(entries[0], dict)
        and isinstance(entries[0].get("value"), list)
    ):
        entries = entries[0]["value"]
    if not isinstance(entries, list):
        return {}
    lookup = {}
    for e in entries:
        if not isinstance(e, dict):
            continue
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

def _load_node_style_overrides():
    if not os.path.exists(NODE_STYLE_OVERRIDES_PATH):
        return {}
    try:
        with open(NODE_STYLE_OVERRIDES_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _load_node_annotations():
    if not os.path.exists(NODE_ANNOTATIONS_PATH):
        return {"version": 1, "nodes": {}}
    try:
        with open(NODE_ANNOTATIONS_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {"version": 1, "nodes": {}}
    if not isinstance(data, dict):
        return {"version": 1, "nodes": {}}
    nodes = data.get("nodes")
    if not isinstance(nodes, dict):
        data["nodes"] = {}
    return data


def _node_group_overrides(node_id, node_annotations):
    if not node_id:
        return {}
    nodes = node_annotations.get("nodes", {}) if isinstance(node_annotations, dict) else {}
    node = nodes.get(node_id, {}) if isinstance(nodes, dict) else {}
    group_overrides = node.get("group_overrides", {}) if isinstance(node, dict) else {}
    return group_overrides if isinstance(group_overrides, dict) else {}


def _node_element_overrides(node_id, node_annotations):
    if not node_id:
        return {}
    nodes = node_annotations.get("nodes", {}) if isinstance(node_annotations, dict) else {}
    node = nodes.get(node_id, {}) if isinstance(nodes, dict) else {}
    element_overrides = node.get("element_overrides", {}) if isinstance(node, dict) else {}
    return element_overrides if isinstance(element_overrides, dict) else {}


def _node_merge_groups(node_id, node_annotations):
    if not node_id:
        return []
    nodes = node_annotations.get("nodes", {}) if isinstance(node_annotations, dict) else {}
    node = nodes.get(node_id, {}) if isinstance(nodes, dict) else {}
    groups = node.get("merge_groups", []) if isinstance(node, dict) else []
    return groups if isinstance(groups, list) else []


def _node_splits(node_id, node_annotations):
    if not node_id:
        return []
    nodes = node_annotations.get("nodes", {}) if isinstance(node_annotations, dict) else {}
    node = nodes.get(node_id, {}) if isinstance(nodes, dict) else {}
    splits = node.get("splits", []) if isinstance(node, dict) else []
    return splits if isinstance(splits, list) else []


def _has_node_group_overrides(node_id, node_annotations):
    return bool(_node_group_overrides(node_id, node_annotations))

def apply_node_style_override(node_id, style_key, role, node_style_overrides):
    if not node_id or not style_key or not role:
        return role
    entries = node_style_overrides.get(node_id, [])
    if not isinstance(entries, list):
        return role
    for entry in entries:
        key_strs = entry.get("key_strs") or []
        from_role = entry.get("from_role")
        new_role = entry.get("new_role")
        if not new_role:
            continue
        if key_strs and style_key not in key_strs:
            continue
        if from_role and from_role != role:
            continue
        return new_role
    return role


def _normalized_group_key(key):
    """Re-run a stored group_key through the current formula.

    Overrides saved before vse_keys were keyed by _group_key_for_role_and_path,
    which took the width straight from _path_data_sk — rounded to 2 decimals. The
    current formula rounds to 1, so a stored "…|0.75|false" no longer equals the
    "…|0.8|false" now computed for the same element, and comparing the raw strings
    dropped the override on the next regenerate (verified on ac00402_gloves_mittens:
    a manual break_line silently reverted to fill_interlining). Normalizing both
    sides lets pre-existing annotations keep matching.
    """
    parts = str(key or "").split("|")
    if len(parts) < 5:
        return str(key or "")
    return compute_group_key(parts[0], parts[1], parts[2], parts[3], parts[4])


def apply_node_annotation_group_override(node_id, style_key, role, node_annotations):
    if not node_id or not style_key or not role:
        return role
    group_overrides = _node_group_overrides(node_id, node_annotations)
    if style_key in group_overrides:
        payload = group_overrides.get(style_key) or {}
        new_role = payload.get("role")
        if new_role:
            return new_role
    target_key = _normalized_group_key(style_key)
    for saved_key, payload in group_overrides.items():
        if not isinstance(payload, dict):
            continue
        if _normalized_group_key(saved_key) != target_key:
            continue
        new_role = payload.get("role")
        if new_role:
            return new_role
    for payload in group_overrides.values():
        if not isinstance(payload, dict):
            continue
        saved_keys = payload.get("key_strs") or []
        new_role = payload.get("role")
        from_role = payload.get("from_role")
        if not new_role:
            continue
        if saved_keys and style_key not in saved_keys:
            continue
        if from_role and from_role != role:
            continue
        return new_role
    return role


def _group_key_for_role_and_path(role, p):
    sk = _path_data_sk(p)
    parts = str(sk or "").split("|")
    if len(parts) >= 4:
        stroke, fill, w, dashed = parts[0], parts[1], parts[2], parts[3]
    else:
        stroke = _normalize_color(p.get("color"))
        fill_raw = p.get("fill")
        fill = _normalize_color(fill_raw) if fill_raw else "none"
        w = p.get("width") or 0
        dashed = bool(p.get("dashes") and p.get("dashes") != "[] 0")
    return compute_group_key(role, stroke, fill, w, dashed)


def _parse_style_attr(style_text):
    out = {}
    for chunk in (style_text or "").split(";"):
        if ":" not in chunk:
            continue
        k, v = chunk.split(":", 1)
        out[k.strip().lower()] = v.strip()
    return out


def _strip_ns(tag):
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _parse_width(value):
    try:
        return round(float(value or 0), 2)
    except Exception:
        return 0.0


def _orig_entity_group_key(role, data_sk, stroke, fill, width, dashed):
    data_sk = str(data_sk or "").strip()
    if data_sk:
        parts = data_sk.split("|")
        if len(parts) >= 4:
            stroke, fill, width, dashed = parts[0], parts[1], parts[2], parts[3]
    return compute_group_key(role, stroke, fill, width, dashed)


def _load_orig_identity_buckets(node_id, svg_out):
    std_path = os.path.abspath(svg_out)
    orig_path = std_path.replace("_std.svg", "_orig.svg") if std_path.endswith("_std.svg") else ""
    if not orig_path or not os.path.exists(orig_path):
        return {}
    try:
        root = ET.fromstring(open(orig_path, encoding="utf-8").read())
    except Exception:
        return {}
    buckets = {}
    for el in root.iter():
        tag = _strip_ns(el.tag)
        if tag not in {"path", "line", "polyline", "polygon", "rect", "circle", "ellipse"}:
            continue
        style_map = _parse_style_attr(el.attrib.get("style", ""))
        role = el.attrib.get("data-role", "") or "unknown"
        data_sk = el.attrib.get("data-sk", "") or ""
        stroke = (el.attrib.get("stroke") or style_map.get("stroke") or "none").strip().lower()
        fill = (el.attrib.get("fill") or style_map.get("fill") or "none").strip().lower()
        width = _parse_width(el.attrib.get("stroke-width") or style_map.get("stroke-width"))
        dash = (el.attrib.get("stroke-dasharray") or style_map.get("stroke-dasharray") or "").strip()
        dashed = dash not in ("", "none", "0")
        d_like = (
            el.attrib.get("d")
            or el.attrib.get("points")
            or f"rect:{el.attrib.get('x','')}:{el.attrib.get('y','')}:{el.attrib.get('width','')}:{el.attrib.get('height','')}"
            or f"circle:{el.attrib.get('cx','')}:{el.attrib.get('cy','')}:{el.attrib.get('r','')}"
        )
        prefix = str(d_like)[:80]
        if not prefix:
            continue
        elem_key = hashlib.sha1(f"{node_id}|{prefix}".encode("utf-8")).hexdigest()[:16]
        group_key = _orig_entity_group_key(role, data_sk, stroke, fill, width, dashed)
        buckets.setdefault(group_key, []).append({
            "elem_key": elem_key,
            "path_d_prefix": prefix,
            "group_key": group_key,
        })
    return buckets


def _element_key_for_path(node_id, p, role):
    items = p.get("items", [])
    close = p.get("closePath", False)
    fill = p.get("fill")
    if fill is not None:
        close = True
    if role in ("callout_line", "dim_line", "callout_zoom"):
        close = False
    d = items_to_svg_d(items, close)
    prefix = (d or "")[:80]
    if not prefix:
        return "", ""
    return compute_elem_key(node_id, prefix)


def _trace_key_list(value):
    if isinstance(value, (list, tuple, set)):
        return [str(v).strip() for v in value if str(v).strip()]
    value = str(value or "").strip()
    return [value] if value else []


def _merge_trace_identity(paths):
    elem_keys = []
    group_keys = []
    for p in paths:
        for key in _trace_key_list(p.get("_vse_elem_keys") or p.get("_vse_elem_key")):
            if key not in elem_keys:
                elem_keys.append(key)
        for key in _trace_key_list(p.get("_vse_group_keys") or p.get("_vse_group_key")):
            if key not in group_keys:
                group_keys.append(key)
    return elem_keys, group_keys


def apply_node_annotation_element_override(node_id, p, role, node_annotations):
    if not node_id or not role:
        return role
    elem_overrides = _node_element_overrides(node_id, node_annotations)
    if not elem_overrides:
        return role
    elem_key = str(p.get("_vse_elem_key") or "")
    prefix = str(p.get("_vse_path_d_prefix") or "")
    if not prefix:
        elem_key, prefix = _element_key_for_path(node_id, p, role)
    if not prefix:
        return role
    payload = elem_overrides.get(elem_key)
    if isinstance(payload, dict) and payload.get("role"):
        return payload.get("role")
    short_prefix = prefix[:40]
    for payload in elem_overrides.values():
        if not isinstance(payload, dict):
            continue
        saved_prefix = str(payload.get("path_d_prefix") or "")[:40]
        saved_role = payload.get("role")
        if not saved_prefix or not saved_role:
            continue
        if prefix.startswith(saved_prefix) or saved_prefix.startswith(short_prefix):
            return saved_role
    return role

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
    key = _path_style_key(p, text_words)
    if _simple_stroke:
        # Thin simple strokes are semantic lines first, not generic contours:
        # e.g. black 0.75 long strokes in Yoke nodes are break lines, while
        # real part contours start at heavier widths.
        heur = classify_path(p, text_words)
        if heur in ("callout_line", "break_line"):
            return heur
        if heur == "stitch_Bt":
            return heur
        if heur == "contour_outer" and key in registry_lookup and registry_lookup[key] == "hw_zipper_tape":
            return heur
        # Registry takes absolute priority for non-line roles
        if key in registry_lookup:
            reg_role = registry_lookup[key]
            if reg_role not in ("callout_line", "break_line", "unknown", "?"):
                return reg_role
        # Length-sensitive heuristic:
        #   - registry says break_line but path is very short → likely zipper tape stub
        from roles import _path_angle_and_length
        _, length = _path_angle_and_length(items)
        if key in registry_lookup and registry_lookup[key] == "break_line" and length < 40:
            return "hw_zipper_tape"
    heur = classify_path(p, text_words)
    if heur in ("line_gathered_edge", "fill_elastic", "fill_cord", "fill_material_mask"):
        return heur
    if heur == "stitch_Bt":
        return heur
    if key in registry_lookup:
        return registry_lookup[key]
    return heur


def _is_open_black_contour_candidate(path):
    if not path:
        return False
    if path.get("fill") is not None:
        return False
    if path.get("closePath", False):
        return False
    return _normalize_color(path.get("color")) == "#1a1a1a"


def _point_xy(point):
    if point is None:
        return None
    if hasattr(point, "x") and hasattr(point, "y"):
        return (float(point.x), float(point.y))
    try:
        return (float(point[0]), float(point[1]))
    except Exception:
        return None


def _path_trace_points(path):
    points = []
    for item in path.get("items", []) or []:
        kind = item[0]
        if kind == "l":
            candidates = (item[1], item[2])
        elif kind == "c":
            candidates = (item[1], item[4])
        elif kind == "re":
            rect = item[1]
            candidates = (
                (rect.x0, rect.y0),
                (rect.x1, rect.y0),
                (rect.x1, rect.y1),
                (rect.x0, rect.y1),
            )
        elif kind == "qu":
            quad = item[1]
            candidates = (quad.ul, quad.ur, quad.lr, quad.ll)
        else:
            candidates = ()
        for candidate in candidates:
            xy = _point_xy(candidate)
            if xy is not None:
                points.append(xy)
    return points


def _dist_points(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def _rect_center(rect):
    return ((float(rect.x0) + float(rect.x1)) / 2, (float(rect.y0) + float(rect.y1)) / 2)


def _rect_outer_score(rect, drawing_center):
    corners = (
        (float(rect.x0), float(rect.y0)),
        (float(rect.x1), float(rect.y0)),
        (float(rect.x1), float(rect.y1)),
        (float(rect.x0), float(rect.y1)),
    )
    return max(_dist_points(corner, drawing_center) for corner in corners)


def _touching_break_point(path, break_points, tol=8.0):
    path_points = _path_trace_points(path)
    if not path_points:
        return None
    for break_point in break_points:
        if any(_dist_points(path_point, break_point) <= tol for path_point in path_points):
            return break_point
    return None


def _reclassify_breakline_contour_continuations(classified):
    """Demote inner duplicate contours that continue from a crop/break line.

    Some AI nodes draw the crop edge as a thin L-shaped break line and then
    continue from its endpoint with two nearby heavy open contours. The outer
    one is the real shape contour; the inner one is a break/crop continuation.
    If both stay contour_outer, the break line visually fuses with a duplicate
    contour. Keep the outer path and render the inner continuation as break_line.
    """
    break_points = []
    for role, path in classified:
        if role != "break_line":
            continue
        for point in _path_trace_points(path):
            if not any(_dist_points(point, existing) <= 0.5 for existing in break_points):
                break_points.append(point)
    if not break_points:
        return classified

    rects = [
        p.get("rect")
        for _, p in classified
        if p.get("rect") is not None
    ]
    if not rects:
        return classified
    drawing_center = (
        (min(r.x0 for r in rects) + max(r.x1 for r in rects)) / 2,
        (min(r.y0 for r in rects) + max(r.y1 for r in rects)) / 2,
    )

    candidates_by_break = {}
    for idx, (role, path) in enumerate(classified):
        if role != "contour_outer" or not _is_open_black_contour_candidate(path):
            continue
        if round(float(path.get("width") or 0), 2) < 1.35:
            continue
        rect = path.get("rect")
        if rect is None:
            continue
        break_point = _touching_break_point(path, break_points)
        if break_point is None:
            continue
        candidates_by_break.setdefault(break_point, []).append((idx, rect))

    demote_indexes = set()
    for candidates in candidates_by_break.values():
        if len(candidates) < 2:
            continue
        keep_idx, _ = max(
            candidates,
            key=lambda item: _rect_outer_score(item[1], drawing_center),
        )
        for idx, _ in candidates:
            if idx != keep_idx:
                demote_indexes.add(idx)

    if not demote_indexes:
        return classified

    out = []
    for idx, (role, path) in enumerate(classified):
        out.append(("break_line" if idx in demote_indexes else role, path))
    return out


def reclassify_thin_contours(classified):
    """Split thin crop/break lines away from real garment contours.

    In the source drawings, real part contours are consistently the heavier
    black strokes in the node. Crop/break lines are open black strokes that are
    visibly thinner. Style registry entries can collapse both into
    contour_outer, so do this node-level pass before identity keys are built.
    """
    contour_widths = [
        round(float(p.get("width") or 0), 2)
        for role, p in classified
        if role == "contour_outer" and _is_open_black_contour_candidate(p)
    ]
    if not contour_widths:
        return classified
    max_contour_width = max(contour_widths)
    if max_contour_width < 1.35:
        return classified

    out = []
    for role, p in classified:
        if role != "contour_outer" or not _is_open_black_contour_candidate(p):
            out.append((role, p))
            continue
        width = round(float(p.get("width") or 0), 2)
        if width < 1.4 and width <= max_contour_width - 0.15:
            out.append(("break_line", p))
        else:
            out.append((role, p))
    return _reclassify_breakline_contour_continuations(out)


def apply_node_role_override(ai_path, p, role):
    """Per-source corrections for ambiguous drawings that cannot be solved by style alone."""
    name = os.path.basename(str(ai_path)).lower()
    rect = p.get("rect")
    if not rect:
        return role
    w = round(p.get("width") or 0, 2)
    items = p.get("items", [])
    is_simple_line = len(items) == 1 and items[0][0] == "l"
    slender_ratio = max(rect.width / max(rect.height, 0.001), rect.height / max(rect.width, 0.001))

    # RE00004: zoom callout elements — large circle, small oval, diagonal line
    if name.startswith("re00004"):
        # All filled arrow shapes in RE00004 = cord hardware (not directional arrows)
        if role == "arrow":
            return "fill_cord"
        if role == "stitch_edge" and rect.x0 >= 215 and rect.x1 >= 340 and rect.y0 <= 30:
            return "callout_zoom"  # large zoom detail circle (right side)
        if role == "stitch_edge" and 138 <= rect.x0 <= 148 and 165 <= rect.y0 <= 175:
            return "callout_zoom"  # small oval indicator (bottom area)
        if role == "stitch_edge" and 158 <= rect.x0 <= 168 and 122 <= rect.y0 <= 132 and rect.width > 50:
            return "callout_zoom"  # diagonal connecting line

    # RE (усиление/reinforcement) nodes: tiny solid red stubs (≤6pt) at the ends
    # of the arc seam are part of the through-stitch, not edge stitches.
    # Longer paths (>6pt) that cross the bottom contour stay as stitch_edge.
    if name.lower().startswith("re") and role == "stitch_edge" and w <= 1.1:
        if max(rect.width, rect.height) <= 6:
            return "stitch_thru"

    if name == "ac00207_cap_s half-belt.ai":
        # Tiny filled black dots on the plastic strap are hardware marks, not arrows.
        if (p.get("fill") is not None and rect.width <= 12 and rect.height <= 12
                and 145 <= rect.x0 <= 223 and 86 <= rect.y0 <= 108):
            p["_vse_preserve_fill"] = True
            return "hw_other"

    if role in ("_skip", "unknown", "boundary_zone") and _is_blue_stroke(p):
        # Blue construction callouts are magnification circles/connectors in the
        # reviewed workmanship diagrams. Some legacy registry entries marked
        # them as _skip, which drops zoom callouts from the standardized view.
        if 0.7 <= w <= 1.5 and (rect.width >= 6 or rect.height >= 6):
            return "callout_zoom"

    if name == "ac00004.ai" and role == "contour_outer" and is_simple_line and w == 1.5:
        # Top and right crop edges are break lines; the lower horizontal edge is a real contour.
        if rect.y0 < 20 or (rect.x0 > 150 and rect.height > 100):
            return "break_line"

    if name == "ac00002.ai" and role == "contour_outer" and is_simple_line and w == 1.0:
        # Shell fabric top/right crop edges are break lines in this node.
        if rect.y0 < 40 or (rect.x0 > 180 and rect.height > 100):
            return "break_line"

    if name == "ac00007.ai" and role == "contour_outer" and 0.65 <= w <= 0.8:
        # Thin vertical edge crossing the zipper start is the zipper tape edge,
        # not the garment contour.
        if 120 <= rect.x0 <= 132 and rect.x1 <= 132 and rect.y0 < 150 and rect.y1 > 190:
            return "hw_zipper_tape_edge"

    if name.startswith("ac00203") and role == "arrow" and rect and rect.width < 12 and rect.height < 12:
        # Tiny filled diagonal = callout pointer, not a directional arrow
        return "callout_line"

    if name == "ac00007.ai" and role == "callout_line" and 1.35 <= w <= 1.5:
        # Short parallel bars inside the zipper pull are part contours, not callouts.
        if 90 <= rect.x0 <= 116 and 88 <= rect.y0 <= 110 and rect.width <= 20 and rect.height <= 4:
            return "contour_outer"

    if name.startswith("ac0020"):
        if role == "line_velcro" and name in {
            "ac00201_cap_s half-belt.ai",
            "ac00202_cap_s half-belt.ai",
            "ac00203_cap_s half-belt.ai",
            "ac00204_cap_s half-belt.ai",
        }:
            # Registry may carry the outer material frame as Velcro.
            # Keep the large frame as garment contour.
            if (
                rect.width >= 128
                and 26 <= rect.height <= 32
                and 88 <= rect.x0 <= 91
                and 32 <= rect.y0 <= 35
                and 218 <= rect.x1 <= 221
                and 60 <= rect.y1 <= 63
            ):
                return "contour_outer"
        if role == "contour_outer" and name in {
            "ac00201_cap_s half-belt.ai",
            "ac00202_cap_s half-belt.ai",
            "ac00203_cap_s half-belt.ai",
            "ac00204_cap_s half-belt.ai",
        }:
            # The inset top rectangle is the Velcro patch itself.
            # The larger outer frame remains the garment/material contour.
            if (
                0.9 <= w <= 1.1
                and 110 <= rect.width <= 130
                and 22 <= rect.height <= 28
                and 90 <= rect.x0 <= 130
                and 30 <= rect.y0 <= 80
                and 215 <= rect.x1 <= 246
                and 58 <= rect.y1 <= 104
            ):
                return "line_velcro"
        if role == "fill_material_mask" and name in {
            "ac00202_cap_s half-belt.ai",
            "ac00203_cap_s half-belt.ai",
            "ac00204_cap_s half-belt.ai",
        }:
            # One white helper shape in these nodes incorrectly covers the hanging
            # gray reverse side of the folded strap. The visible white face should
            # only cover the horizontal band behind, not replace the hanging velcro patch.
            if (
                20 <= rect.width <= 36
                and 50 <= rect.height <= 80
                and 95 <= rect.x0 <= 150
                and 50 <= rect.y0 <= 110
                and rect.y1 <= 170
            ):
                return "_skip"
            # In these velcro half-belt nodes the white shapes are not service masks:
            # they are visible upper material layers that must remain readable.
            return "fill_white_detail"
        if role == "fill_material_mask" and name in {
            "ac00201_cap_s half-belt.ai",
            "ac00205_cap_s half-belt.ai",
            "ac00206_cap_s half-belt.ai",
            "ac00207_cap_s half-belt.ai",
        }:
            # In these accessory nodes the white occluders should stay plain masks
            # without adding a new visible contour in the standardized view.
            p["_vse_plain_mask"] = True
        if role == "fill_velcro" and name in {
            "ac00201_cap_s half-belt.ai",
            "ac00202_cap_s half-belt.ai",
            "ac00203_cap_s half-belt.ai",
            "ac00204_cap_s half-belt.ai",
        }:
            # Some "filled" Velcro helpers are actually degenerate leader lines /
            # skinny triangles near the label. Keep only real areas as fill_velcro.
            if len(items) <= 2 or rect.width < 6 or rect.height < 6 or rect.width * rect.height < 90 or slender_ratio >= 3.2:
                return "callout_line"
    if name.startswith("ac00200"):
        if role == "stitch_edge" and rect and rect.height < 5.0 and rect.width < 5.0:
            # Very short stitch marks at seam endpoints are through-stitches, not edge stitches
            return "stitch_thru"
        if role == "contour_outer" and 0.7 <= w <= 0.8:
            # Closed thin outline called out as Buckle. Render it as opaque hardware.
            if 185 <= rect.x0 <= 190 and 85 <= rect.y0 <= 90 and 215 <= rect.x1 <= 220 and 108 <= rect.y1 <= 113:
                return "hw_buckle"
        if role == "contour_outer" and 0.9 <= w <= 1.1:
            # D-ring buckle body: near-closed curved path x≈204-258, y≈168-224
            if rect.x0 >= 200 and rect.y0 >= 163 and rect.x1 <= 265 and rect.y1 <= 228 and rect.width > 30:
                return "hw_buckle"
            # Buckle bar (horizontal crossbar) x≈216-247, y≈171-178
            if rect.x0 >= 213 and rect.y0 >= 168 and rect.x1 <= 250 and rect.y1 <= 182 and rect.width > 15:
                return "hw_buckle"
            # Buckle pin hole circle x≈210-214, y≈170-174 (small circle ~3x3pt)
            if rect.x0 >= 208 and rect.y0 >= 168 and rect.x1 <= 216 and rect.y1 <= 176 and rect.width <= 6:
                return "hw_buckle"
        if role in ("arrow", "fill_interlining"):
            # Buckle / Bt / Tunnel callouts are stored as filled degenerate paths.
            if ((170 <= rect.x0 <= 252 and 60 <= rect.y0 <= 90)
                    or (228 <= rect.x0 <= 293 and 84 <= rect.y0 <= 168)):
                return "callout_line"

    return role


def _path_start_end(p):
    """Return (start_point, end_point) of a path, or None."""
    items = p.get("items", [])
    if not items:
        return None
    first = items[0]
    if first[0] == "l" and len(first) >= 3:
        start = first[1]
    elif first[0] == "c" and len(first) >= 5:
        start = first[1]
    else:
        return None
    last = items[-1]
    if last[0] == "l" and len(last) >= 3:
        end = last[2]
    elif last[0] == "c" and len(last) >= 5:
        end = last[4]
    else:
        return None
    return start, end


def _pt_dist(a, b):
    return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5


def _reverse_items(items):
    """Reverse path items so the path runs in opposite direction."""
    rev = []
    for item in reversed(items):
        if item[0] == "l" and len(item) >= 3:
            rev.append(("l", item[2], item[1]))
        elif item[0] == "c" and len(item) >= 5:
            rev.append(("c", item[4], item[3], item[2], item[1]))
        else:
            rev.append(item)
    return rev


def _path_exit_direction(items):
    """Return the direction vector of the last segment of a path."""
    if not items:
        return None
    last = items[-1]
    if last[0] == "l" and len(last) >= 3:
        a, b = last[1], last[2]
        return (b.x - a.x, b.y - a.y)
    if last[0] == "c" and len(last) >= 5:
        a, b = last[3], last[4]
        return (b.x - a.x, b.y - a.y)
    return None


def _path_entry_direction(items):
    """Return the direction vector of the first segment of a path."""
    if not items:
        return None
    first = items[0]
    if first[0] == "l" and len(first) >= 3:
        a, b = first[1], first[2]
        return (b.x - a.x, b.y - a.y)
    if first[0] == "c" and len(first) >= 5:
        a, b = first[1], first[4]
        return (b.x - a.x, b.y - a.y)
    return None


def _directions_compatible(d1, d2, max_angle_deg=50.0):
    """True if two direction vectors are within max_angle_deg of each other."""
    if not d1 or not d2:
        return True
    import math
    def norm(v):
        l = math.sqrt(v[0]**2 + v[1]**2)
        return (v[0]/l, v[1]/l) if l > 0.01 else None
    n1, n2 = norm(d1), norm(d2)
    if not n1 or not n2:
        return True
    dot = max(-1.0, min(1.0, n1[0]*n2[0] + n1[1]*n2[1]))
    return math.degrees(math.acos(dot)) <= max_angle_deg


def merge_stitch_chains(candidates, threshold=8.0, contour_segs=None):
    """Chain stitch_thru paths by endpoint proximity and concatenate items.

    Only chains segments whose joining direction is compatible with both
    the exiting direction of the chain and the entering direction of the next
    segment — prevents zig-zag false merges across unrelated stitch rows.
    """
    if not candidates:
        return []
    entries = []
    for p in candidates:
        ep = _path_start_end(p)
        entries.append({"path": p, "ep": ep, "used": False})

    result = []
    for i, entry in enumerate(entries):
        if entry["used"]:
            continue
        if not entry["ep"]:
            result.append(("stitch_thru", entry["path"]))
            entry["used"] = True
            continue

        chain = [{"path": entry["path"], "items": list(entry["path"].get("items", [])),
                  "start": entry["ep"][0], "end": entry["ep"][1]}]
        entry["used"] = True

        MAX_CHAIN_W = 150.0  # pt — don't create chains wider than this
        MAX_CHAIN_H = 130.0  # pt — or taller than this

        def _chain_bbox_ok(chain, candidate_path):
            """True if adding candidate keeps chain within MAX bounds."""
            all_rects = [link["path"].get("rect") for link in chain] + [candidate_path.get("rect")]
            all_rects = [r for r in all_rects if r]
            if not all_rects:
                return True
            min_x = min(r.x0 for r in all_rects)
            max_x = max(r.x1 for r in all_rects)
            min_y = min(r.y0 for r in all_rects)
            max_y = max(r.y1 for r in all_rects)
            return (max_x - min_x) <= MAX_CHAIN_W and (max_y - min_y) <= MAX_CHAIN_H

        changed = True
        while changed:
            changed = False
            chain_end = chain[-1]["end"]
            chain_exit = _path_exit_direction(chain[-1]["items"])
            best = (threshold + 1, -1, False)
            for j, other in enumerate(entries):
                if other["used"] or not other["ep"]:
                    continue
                d_s = _pt_dist(chain_end, other["ep"][0])
                d_e = _pt_dist(chain_end, other["ep"][1])
                other_entry_items = list(other["path"].get("items", []))
                # Check direction compatibility for forward connection
                if d_s < best[0]:
                    gap_dir = (other["ep"][0].x - chain_end.x, other["ep"][0].y - chain_end.y)
                    entry_dir = _path_entry_direction(other_entry_items)
                    # Small gaps (≤ 6pt) are always chained — stub beyond contour edge
                    if d_s <= 6.0:
                        if (_directions_compatible(chain_exit, gap_dir) and
                                _directions_compatible(gap_dir, entry_dir) and
                                _chain_bbox_ok(chain, other["path"])):
                            best = (d_s, j, False)
                        continue
                    gap_blocked = bool(contour_segs) and _segment_crosses_h_strip(
                        chain_end.x, chain_end.y, other["ep"][0].x, other["ep"][0].y,
                        min(chain_end.x, other["ep"][0].x), max(chain_end.x, other["ep"][0].x),
                        (chain_end.y + other["ep"][0].y) / 2, abs(chain_end.y - other["ep"][0].y) / 2 + 4,
                    ) if contour_segs else False
                    # simpler gap contour check: any contour seg crossing the gap line
                    if not gap_blocked and contour_segs:
                        gap_blocked = any(
                            _segment_crosses_h_strip(cx1, cy1, cx2, cy2,
                                min(chain_end.x, other["ep"][0].x) - 2,
                                max(chain_end.x, other["ep"][0].x) + 2,
                                (chain_end.y + other["ep"][0].y) / 2,
                                abs(chain_end.y - other["ep"][0].y) / 2 + 4)
                            for cx1, cy1, cx2, cy2 in contour_segs
                        )
                    if (not gap_blocked and
                            _directions_compatible(chain_exit, gap_dir) and
                            _directions_compatible(gap_dir, entry_dir) and
                            _chain_bbox_ok(chain, other["path"])):
                        best = (d_s, j, False)
                # Check direction compatibility for reversed connection
                if d_e < best[0]:
                    gap_dir = (other["ep"][1].x - chain_end.x, other["ep"][1].y - chain_end.y)
                    rev_entry = _path_exit_direction(other_entry_items)
                    if d_e <= 6.0:
                        if (_directions_compatible(chain_exit, gap_dir) and
                                _directions_compatible(gap_dir, rev_entry)):
                            best = (d_e, j, True)
                        continue
                    gap_blocked = bool(contour_segs) and any(
                        _segment_crosses_h_strip(cx1, cy1, cx2, cy2,
                            min(chain_end.x, other["ep"][1].x) - 2,
                            max(chain_end.x, other["ep"][1].x) + 2,
                            (chain_end.y + other["ep"][1].y) / 2,
                            abs(chain_end.y - other["ep"][1].y) / 2 + 4)
                        for cx1, cy1, cx2, cy2 in contour_segs
                    ) if contour_segs else False
                    if (not gap_blocked and
                            _directions_compatible(chain_exit, gap_dir) and
                            _directions_compatible(gap_dir, rev_entry) and
                            _chain_bbox_ok(chain, other["path"])):
                        best = (d_e, j, True)
            if best[1] >= 0:
                nxt = entries[best[1]]
                nxt["used"] = True
                raw_items = list(nxt["path"].get("items", []))
                if best[2]:
                    raw_items = _reverse_items(raw_items)
                    s, e = nxt["ep"][1], nxt["ep"][0]
                else:
                    s, e = nxt["ep"][0], nxt["ep"][1]
                chain.append({"path": nxt["path"], "items": raw_items, "start": s, "end": e})
                changed = True

        if len(chain) == 1:
            result.append(("stitch_thru", chain[0]["path"]))
            continue

        BRIDGE_GAP = 10.0
        merged_items = []
        for i, link in enumerate(chain):
            if i > 0:
                prev_end = chain[i-1]["end"]
                cur_start = link["start"]
                gap = _pt_dist(prev_end, cur_start)
                if gap > 0.5 and gap < BRIDGE_GAP:
                    # Bridge small gap with L so dash pattern flows continuously
                    merged_items.append(("l", prev_end, cur_start))
            merged_items.extend(link["items"])
        source = dict(chain[0]["path"])
        source["items"] = merged_items
        source["closePath"] = False
        source["fill"] = None
        elem_keys, group_keys = _merge_trace_identity([link["path"] for link in chain])
        source["_vse_elem_keys"] = elem_keys
        source["_vse_group_keys"] = group_keys
        if elem_keys:
            source["_vse_elem_key"] = elem_keys[0]
        if group_keys:
            source["_vse_group_key"] = group_keys[0]
        xs, ys = [], []
        for link in chain:
            r = link["path"].get("rect")
            if r:
                xs += [r.x0, r.x1]
                ys += [r.y0, r.y1]
        if xs:
            source["rect"] = fitz.Rect(min(xs), min(ys), max(xs), max(ys))
        result.append(("stitch_thru", source))

    return result


def _is_simple_horizontal_stroke(p, min_len=6):
    items = p.get("items", [])
    if len(items) != 1 or items[0][0] != "l":
        return False
    a, b = items[0][1], items[0][2]
    return abs(a.y - b.y) <= 1.5 and abs(a.x - b.x) >= min_len


def _is_simple_vertical_stroke(p, min_len=6):
    items = p.get("items", [])
    if len(items) != 1 or items[0][0] != "l":
        return False
    a, b = items[0][1], items[0][2]
    return abs(a.x - b.x) <= 1.5 and abs(a.y - b.y) >= min_len


def _line_span(p):
    items = p.get("items", [])
    a, b = items[0][1], items[0][2]
    return min(a.x, b.x), max(a.x, b.x), (a.y + b.y) / 2


def _vertical_line_span(p):
    items = p.get("items", [])
    a, b = items[0][1], items[0][2]
    return (a.x + b.x) / 2, min(a.y, b.y), max(a.y, b.y)


def _near_rect(a, b, pad=8):
    return not (
        a.x1 < b.x0 - pad or a.x0 > b.x1 + pad
        or a.y1 < b.y0 - pad or a.y0 > b.y1 + pad
    )


def normalize_fragmented_stitches(classified):
    """Merge only small solid fragments into nearby through-stitch rows.

    Source drawings often split one through stitch into a dashed segment and
    short solid fragments where the line crosses a small construction detail.
    Keep this conservative: long solid edge-stitch rows must stay edge stitches.
    """
    thru_rows = []
    thru_columns = []
    thru_rects = []
    for role, p in classified:
        if role != "stitch_thru":
            continue
        if _is_simple_horizontal_stroke(p):
            x0, x1, y = _line_span(p)
            thru_rows.append((x0, x1, y, round(p.get("width") or 0, 2)))
        elif _is_simple_vertical_stroke(p):
            x, y0, y1 = _vertical_line_span(p)
            thru_columns.append((x, y0, y1, round(p.get("width") or 0, 2)))
        if p.get("rect"):
            thru_rects.append((fitz.Rect(p.get("rect")), round(p.get("width") or 0, 2)))

    if not thru_rows and not thru_columns and not thru_rects:
        return classified

    normalized = []
    for role, p in classified:
        if role != "stitch_edge":
            normalized.append((role, p))
            continue
        dashes = p.get("dashes")
        is_dashed = bool(dashes) and str(dashes) not in ("[] 0", "[]", "")
        if not is_dashed:
            # Contract rule: on the original drawing, through-stitch is dashed.
            # Solid red stitch fragments must remain stitch_edge and should not be
            # silently folded back into through-stitch rows.
            normalized.append((role, p))
            continue
        width = round(p.get("width") or 0, 2)
        should_merge = False
        if _is_simple_horizontal_stroke(p):
            x0, x1, y = _line_span(p)
            should_merge = (x1 - x0) <= 8 and any(
                abs(y - ty) <= 2.5
                and abs(width - tw) <= 0.1
                and not (x1 < tx0 - 90 or x0 > tx1 + 90)
                for tx0, tx1, ty, tw in thru_rows
            )
        elif _is_simple_vertical_stroke(p):
            x, y0, y1 = _vertical_line_span(p)
            should_merge = (y1 - y0) <= 25 and any(
                abs(x - tx) <= 3.5
                and abs(width - tw) <= 0.1
                and not (y1 < ty0 - 30 or y0 > ty1 + 30)
                for tx, ty0, ty1, tw in thru_columns
            )
        elif p.get("rect"):
            rect = fitz.Rect(p.get("rect"))
            short_fragment = rect.width <= 8 and rect.height <= 8
            should_merge = short_fragment and any(
                abs(width - tw) <= 0.1 and _near_rect(rect, tr, pad=8)
                for tr, tw in thru_rects
            )
        normalized.append(("stitch_thru" if should_merge else role, p))
    return normalized


def _path_endpoints(p):
    pts = []
    for item in p.get("items", []):
        if not item:
            continue
        if item[0] == "l" and len(item) >= 3:
            pts.extend([item[1], item[2]])
        elif item[0] == "c" and len(item) >= 5:
            pts.extend([item[1], item[4]])
    if not pts and p.get("rect"):
        r = fitz.Rect(p["rect"])
        pts = [fitz.Point(r.x0, r.y0), fitz.Point(r.x1, r.y1)]
    return pts


_PATH_TOKEN_RE = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?")


def parse_svg_path_d(d):
    """Parse an SVG path `d` string into pymupdf-style items.

    The inverse of items_to_svg_d(), so geometry computed on the client (paper.js)
    can be handed back to the engine. Emits only ('l', …) and ('c', …) — quadratics
    are elevated to cubics, and every command is resolved to absolute coordinates.
    Arcs are approximated by a straight chord; paper.js does not emit them for the
    shapes we handle, so this is a safety net rather than a real code path.
    """
    if not d:
        return []
    toks = _PATH_TOKEN_RE.findall(str(d))
    items = []
    i = 0
    cx = cy = sx = sy = 0.0
    cmd = ""
    prev_c2 = None   # reflection anchor for S
    prev_q = None    # reflection anchor for T

    def num():
        nonlocal i
        v = float(toks[i]); i += 1
        return v

    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]; i += 1
            if cmd in ("Zz"):
                pass
        if not cmd:
            i += 1
            continue
        C = cmd.upper()
        rel = cmd.islower()
        try:
            if C == "M":
                x, y = num(), num()
                if rel: x, y = cx + x, cy + y
                cx, cy, sx, sy = x, y, x, y
                prev_c2 = prev_q = None
                cmd = "l" if rel else "L"   # extra pairs after M are implicit lineto
            elif C == "L":
                x, y = num(), num()
                if rel: x, y = cx + x, cy + y
                items.append(("l", fitz.Point(cx, cy), fitz.Point(x, y)))
                cx, cy = x, y; prev_c2 = prev_q = None
            elif C == "H":
                x = num()
                if rel: x = cx + x
                items.append(("l", fitz.Point(cx, cy), fitz.Point(x, cy)))
                cx = x; prev_c2 = prev_q = None
            elif C == "V":
                y = num()
                if rel: y = cy + y
                items.append(("l", fitz.Point(cx, cy), fitz.Point(cx, y)))
                cy = y; prev_c2 = prev_q = None
            elif C == "C":
                x1, y1, x2, y2, x, y = (num() for _ in range(6))
                if rel:
                    x1, y1, x2, y2, x, y = cx+x1, cy+y1, cx+x2, cy+y2, cx+x, cy+y
                items.append(("c", fitz.Point(cx, cy), fitz.Point(x1, y1), fitz.Point(x2, y2), fitz.Point(x, y)))
                cx, cy = x, y; prev_c2 = (x2, y2); prev_q = None
            elif C == "S":
                x2, y2, x, y = (num() for _ in range(4))
                if rel:
                    x2, y2, x, y = cx+x2, cy+y2, cx+x, cy+y
                rx, ry = (2*cx - prev_c2[0], 2*cy - prev_c2[1]) if prev_c2 else (cx, cy)
                items.append(("c", fitz.Point(cx, cy), fitz.Point(rx, ry), fitz.Point(x2, y2), fitz.Point(x, y)))
                cx, cy = x, y; prev_c2 = (x2, y2); prev_q = None
            elif C in ("Q", "T"):
                if C == "Q":
                    qx, qy, x, y = (num() for _ in range(4))
                    if rel:
                        qx, qy, x, y = cx+qx, cy+qy, cx+x, cy+y
                else:
                    x, y = num(), num()
                    if rel: x, y = cx + x, cy + y
                    qx, qy = (2*cx - prev_q[0], 2*cy - prev_q[1]) if prev_q else (cx, cy)
                # quadratic -> cubic
                c1 = fitz.Point(cx + 2.0/3.0*(qx - cx), cy + 2.0/3.0*(qy - cy))
                c2 = fitz.Point(x + 2.0/3.0*(qx - x), y + 2.0/3.0*(qy - y))
                items.append(("c", fitz.Point(cx, cy), c1, c2, fitz.Point(x, y)))
                cx, cy = x, y; prev_q = (qx, qy); prev_c2 = None
            elif C == "A":
                _rx, _ry, _rot, _laf, _sf, x, y = (num() for _ in range(7))
                if rel: x, y = cx + x, cy + y
                items.append(("l", fitz.Point(cx, cy), fitz.Point(x, y)))
                cx, cy = x, y; prev_c2 = prev_q = None
            elif C == "Z":
                if abs(cx - sx) > 1e-9 or abs(cy - sy) > 1e-9:
                    items.append(("l", fitz.Point(cx, cy), fitz.Point(sx, sy)))
                cx, cy = sx, sy; prev_c2 = prev_q = None
            else:
                i += 1
        except (IndexError, ValueError):
            break
    return items


def _node_geometry_overrides(node_id, node_annotations):
    if not node_id:
        return {}
    nodes = node_annotations.get("nodes", {}) if isinstance(node_annotations, dict) else {}
    node = nodes.get(node_id, {}) if isinstance(nodes, dict) else {}
    ov = node.get("geometry_overrides", {}) if isinstance(node, dict) else {}
    return ov if isinstance(ov, dict) else {}


def apply_geometry_overrides(classified, node_id, node_annotations):
    """Client-authored final geometry, keyed by elem_key:

        geometry_overrides: { elem_key: [ {d, role?}, … ] }

    Each entry is the list of parts the element becomes, so one record type covers
    every edit the point editor can make: one part = moved/trimmed, several = split,
    none = deleted. The client owns the geometry maths (paper.js) and the engine just
    replays the result, which is what lets new tools ship without touching the server.
    Legacy split/merge/vertex records still apply on top for drawings edited before this.
    """
    overrides = _node_geometry_overrides(node_id, node_annotations)
    if not overrides:
        return classified
    result = []
    for role, p in classified:
        ek = str(p.get("_vse_elem_key") or "")
        parts = overrides.get(ek) if ek else None
        if parts is None:
            result.append((role, p))
            continue
        if not isinstance(parts, list):
            result.append((role, p))
            continue
        for idx, part in enumerate(parts):
            if not isinstance(part, dict):
                continue
            items = parse_svg_path_d(part.get("d"))
            if not items:
                continue
            np = dict(p)
            np["items"] = items
            np["rect"] = _items_bbox2(items) or p.get("rect")
            np["closePath"] = False
            part_role = part.get("role") or role
            if len(parts) > 1:
                part_key, part_prefix = compute_elem_key(node_id, f"{ek}|o{idx}")
                np["_vse_elem_key"] = part_key
                np["_vse_elem_keys"] = [part_key]
                np["_vse_path_d_prefix"] = part_prefix
            np["_vse_final_role"] = part_role
            result.append((part_role, np))
    return result


def _lerp(a, b, t):
    return fitz.Point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)


def _items_bbox2(items):
    pts = []
    for it in items:
        if it[0] == "l" and len(it) >= 3:
            pts.extend([it[1], it[2]])
        elif it[0] == "c" and len(it) >= 5:
            pts.extend([it[1], it[2], it[3], it[4]])
    if not pts:
        return None
    xs = [p.x for p in pts]
    ys = [p.y for p in pts]
    return fitz.Rect(min(xs), min(ys), max(xs), max(ys))


def _nearest_on_line(a, b, x, y):
    dx, dy = b.x - a.x, b.y - a.y
    L2 = dx * dx + dy * dy
    if L2 < 1e-9:
        return 0.0, a, (a.x - x) ** 2 + (a.y - y) ** 2
    t = ((x - a.x) * dx + (y - a.y) * dy) / L2
    t = max(0.0, min(1.0, t))
    px, py = a.x + t * dx, a.y + t * dy
    return t, fitz.Point(px, py), (px - x) ** 2 + (py - y) ** 2


def _cubic_point(p0, c1, c2, p3, t):
    u = 1 - t
    x = u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x
    y = u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y
    return fitz.Point(x, y)


def _nearest_on_cubic(p0, c1, c2, p3, x, y, samples=32):
    best_t, best_pt, best_d2 = 0.0, p0, float("inf")
    for k in range(samples + 1):
        t = k / samples
        pt = _cubic_point(p0, c1, c2, p3, t)
        d2 = (pt.x - x) ** 2 + (pt.y - y) ** 2
        if d2 < best_d2:
            best_t, best_pt, best_d2 = t, pt, d2
    return best_t, best_pt, best_d2


def _nearest_on_items(items, x, y):
    """(item_index, t, dist2) of the nearest point on a path to (x, y)."""
    best = (None, 0.0, float("inf"))
    for i, it in enumerate(items):
        if it[0] == "l" and len(it) >= 3:
            t, _pt, d2 = _nearest_on_line(it[1], it[2], x, y)
        elif it[0] == "c" and len(it) >= 5:
            t, _pt, d2 = _nearest_on_cubic(it[1], it[2], it[3], it[4], x, y)
        else:
            continue
        if d2 < best[2]:
            best = (i, t, d2)
    return best


def _split_cubic(p0, c1, c2, p3, t):
    """De Casteljau: split one cubic into two, returning both as ('c', …) items."""
    A = _lerp(p0, c1, t)
    B = _lerp(c1, c2, t)
    C = _lerp(c2, p3, t)
    D = _lerp(A, B, t)
    E = _lerp(B, C, t)
    F = _lerp(D, E, t)
    return ("c", p0, A, D, F), ("c", F, E, C, p3)


def _split_items_at(items, item_index, t):
    it = items[item_index]
    if it[0] == "l" and len(it) >= 3:
        p = _lerp(it[1], it[2], t)
        first = list(items[:item_index]) + [("l", it[1], p)]
        second = [("l", p, it[2])] + list(items[item_index + 1:])
        return first, second
    if it[0] == "c" and len(it) >= 5:
        c_first, c_second = _split_cubic(it[1], it[2], it[3], it[4], t)
        first = list(items[:item_index]) + [c_first]
        second = [c_second] + list(items[item_index + 1:])
        return first, second
    return items, []


def _split_items_multi(items, points):
    """Split a path into parts at each (x, y): the part whose nearest point is closest
    gets split there. Returns a list of item-lists (one per resulting part)."""
    parts = [items]
    for (x, y) in points:
        best = None  # (dist2, part_index, item_index, t)
        for pi, part in enumerate(parts):
            ii, t, d2 = _nearest_on_items(part, x, y)
            if ii is None:
                continue
            if best is None or d2 < best[0]:
                best = (d2, pi, ii, t)
        if best is None:
            continue
        _d2, pi, ii, t = best
        first, second = _split_items_at(parts[pi], ii, t)
        if first and second:
            parts = parts[:pi] + [first, second] + parts[pi + 1:]
    return parts


def _node_geometry_edits(node_id, node_annotations):
    if not node_id:
        return []
    nodes = node_annotations.get("nodes", {}) if isinstance(node_annotations, dict) else {}
    node = nodes.get(node_id, {}) if isinstance(nodes, dict) else {}
    edits = node.get("geometry_edits", []) if isinstance(node, dict) else []
    return edits if isinstance(edits, list) else []


# User-dragged vertices are matched to item endpoints within this radius (user units).
# The client sends the exact anchor it grabbed; the tolerance only absorbs the rounding
# that happens when geometry is emitted to the SVG `d` string and parsed back.
_VERTEX_EPS = 1.2


def _snap_point(pt, frm, to, eps):
    """If pt is within eps of frm, return (moved point, True); else (pt, False)."""
    if abs(pt.x - frm[0]) <= eps and abs(pt.y - frm[1]) <= eps:
        return fitz.Point(to[0], to[1]), True
    return pt, False


def apply_vertex_moves(classified, node_id, node_annotations):
    """User-dragged vertices. Stored per node as geometry_edits
    [{elem_key, from:[x,y], to:[x,y]}]. Every item endpoint within _VERTEX_EPS of `from`
    snaps to `to`, so a vertex shared by two segments drags both and the line stays
    continuous. Adjacent cubic control points ride along by the same delta to preserve
    the curve's tangent. Applied before splits so a later cut lands on moved geometry.
    """
    edits = _node_geometry_edits(node_id, node_annotations)
    if not edits:
        return classified
    by_elem = {}
    for ed in edits:
        if not isinstance(ed, dict):
            continue
        k = str(ed.get("elem_key") or "")
        frm = ed.get("from")
        to = ed.get("to")
        if not k or not isinstance(frm, (list, tuple)) or not isinstance(to, (list, tuple)):
            continue
        try:
            frm = (float(frm[0]), float(frm[1]))
            to = (float(to[0]), float(to[1]))
        except (TypeError, ValueError, IndexError):
            continue
        by_elem.setdefault(k, []).append((frm, to))
    if not by_elem:
        return classified

    for _role, p in classified:
        ek = str(p.get("_vse_elem_key") or "")
        edits_for = by_elem.get(ek)
        if not edits_for or not p.get("items"):
            continue
        items = p["items"]
        for (frm, to) in edits_for:
            dx, dy = to[0] - frm[0], to[1] - frm[1]
            new_items = []
            for it in items:
                if it[0] == "l" and len(it) >= 3:
                    a, _ = _snap_point(it[1], frm, to, _VERTEX_EPS)
                    b, _ = _snap_point(it[2], frm, to, _VERTEX_EPS)
                    new_items.append(("l", a, b))
                elif it[0] == "c" and len(it) >= 5:
                    a, ma = _snap_point(it[1], frm, to, _VERTEX_EPS)
                    d, md = _snap_point(it[4], frm, to, _VERTEX_EPS)
                    c1 = fitz.Point(it[2].x + dx, it[2].y + dy) if ma else it[2]
                    c2 = fitz.Point(it[3].x + dx, it[3].y + dy) if md else it[3]
                    new_items.append(("c", a, c1, c2, d))
                else:
                    new_items.append(it)
            items = new_items
        p["items"] = items
        p["rect"] = _items_bbox2(items) or p.get("rect")
    return classified


def apply_explicit_splits(classified, node_id, node_annotations):
    """User-declared splits: cut an element into separate parts at clicked points, so
    each part can then carry its own role. Stored per node as splits [{elem_key, x, y}].
    """
    splits = _node_splits(node_id, node_annotations)
    if not splits:
        return classified
    by_elem = {}
    for sp in splits:
        k = str(sp.get("elem_key") or "")
        try:
            x = float(sp.get("x"))
            y = float(sp.get("y"))
        except (TypeError, ValueError):
            continue
        if k:
            by_elem.setdefault(k, []).append((x, y))
    if not by_elem:
        return classified

    result = []
    for role, p in classified:
        ek = str(p.get("_vse_elem_key") or "")
        pts = by_elem.get(ek)
        items = [it for it in (p.get("items") or []) if it and it[0] in ("l", "c")]
        if not pts or not items:
            result.append((role, p))
            continue
        parts = _split_items_multi(items, pts)
        if len(parts) < 2:
            result.append((role, p))
            continue
        for i, part_items in enumerate(parts):
            np = dict(p)
            np["items"] = part_items
            np["rect"] = _items_bbox2(part_items) or p.get("rect")
            np["closePath"] = False
            part_key, part_prefix = compute_elem_key(node_id, f"{ek}|s{i}")
            np["_vse_elem_key"] = part_key
            np["_vse_elem_keys"] = [part_key]
            np["_vse_path_d_prefix"] = part_prefix
            result.append((role, np))
    return result


def _node_deleted_elements(node_id, node_annotations):
    if not node_id:
        return set()
    nodes = node_annotations.get("nodes", {}) if isinstance(node_annotations, dict) else {}
    node = nodes.get(node_id, {}) if isinstance(nodes, dict) else {}
    deleted = node.get("deleted_elements", []) if isinstance(node, dict) else []
    return {str(k) for k in deleted if isinstance(deleted, list) and k}


def apply_deleted_elements(classified, node_id, node_annotations):
    """User-deleted fragments. Stored per node as deleted_elements [elem_key, ...].
    Runs after splits/merges so the key can refer to a split part or a merged line —
    whatever the user actually clicked and deleted in the UI.
    """
    deleted = _node_deleted_elements(node_id, node_annotations)
    if not deleted:
        return classified
    return [(role, p) for (role, p) in classified if str(p.get("_vse_elem_key") or "") not in deleted]


def _chain_fragments(fragments):
    """Join fragments into one continuous item list by nearest endpoints, preserving
    each fragment's own geometry (curves stay curves). Each next fragment attaches to
    whichever free end of the growing chain its nearest endpoint reaches, flipped if
    needed; gaps are bridged with a straight connector. This keeps a curved fragment
    from being flattened or merged by the wrong end.
    """
    chain = list(fragments[0])
    remaining = [list(f) for f in fragments[1:]]
    while remaining:
        ends = _path_start_end({"items": chain})
        if not ends:
            break
        cs, ce = ends
        best = None  # (dist, idx, reversed, side)
        for i, f in enumerate(remaining):
            fe = _path_start_end({"items": f})
            if not fe:
                continue
            fstart, fend = fe
            for dist, rev, side in (
                (_pt_dist(ce, fstart), False, "end"),
                (_pt_dist(ce, fend), True, "end"),
                (_pt_dist(cs, fend), False, "start"),
                (_pt_dist(cs, fstart), True, "start"),
            ):
                if best is None or dist < best[0]:
                    best = (dist, i, rev, side)
        if best is None:
            break
        dist, idx, rev, side = best
        frag = remaining.pop(idx)
        if rev:
            frag = _reverse_items(frag)
        fstart, fend = _path_start_end({"items": frag})
        if side == "end":
            if dist > 1e-3:
                chain.append(("l", ce, fstart))
            chain.extend(frag)
        else:
            pre = list(frag)
            if dist > 1e-3:
                pre.append(("l", fend, cs))
            chain = pre + chain
    return chain


def apply_explicit_merges(classified, node_id, node_annotations):
    """User-declared merges: fuse the exact elements named in a merge group into one
    continuous line, ignoring gap distance, bound to the group's role. Fragments are
    chained by nearest endpoints so curved pieces keep their shape and join at the right
    ends. This is the manual escape hatch for fragments too far apart for the automatic
    same-role stitch merge to reach.
    """
    groups = _node_merge_groups(node_id, node_annotations)
    if not groups:
        return classified

    by_key = {}
    for idx, (_role, p) in enumerate(classified):
        for k in (p.get("_vse_elem_keys") or [p.get("_vse_elem_key")]):
            if k and k not in by_key:
                by_key[k] = idx

    consumed = set()
    merged_out = []
    for g in groups:
        keys = [str(k) for k in (g.get("elem_keys") or []) if str(k)]
        role = normalize_active_role(g.get("role") or "")
        members = [by_key[k] for k in keys if k in by_key and by_key[k] not in consumed]
        members = list(dict.fromkeys(members))
        if len(members) < 2 or not role:
            continue
        member_paths = [classified[i][1] for i in members]
        fragments = []
        for mp in member_paths:
            items = [it for it in (mp.get("items") or []) if it and it[0] in ("l", "c")]
            if not items:
                eps = _path_endpoints(mp)
                if len(eps) >= 2:
                    items = [("l", eps[0], eps[-1])]
            if items:
                fragments.append(items)
        if len(fragments) < 2:
            continue
        merged_items = _chain_fragments(fragments)
        bbox = _items_bbox2(merged_items)
        if bbox is None:
            continue
        source = dict(member_paths[0])
        source["items"] = merged_items
        source["rect"] = bbox
        source["closePath"] = False
        source["fill"] = None
        elem_keys, group_keys = _merge_trace_identity(member_paths)
        source["_vse_elem_keys"] = elem_keys
        source["_vse_group_keys"] = group_keys
        if elem_keys:
            source["_vse_elem_key"] = elem_keys[0]
        if group_keys:
            source["_vse_group_key"] = group_keys[0]
        source["_vse_manual_role_override"] = True
        source["_vse_final_role"] = role
        merged_out.append((role, source))
        consumed.update(members)

    if not consumed:
        return classified
    result = [rp for i, rp in enumerate(classified) if i not in consumed]
    result.extend(merged_out)
    return result


_CONTOUR_ROLES = frozenset(("contour_outer", "contour_cut", "contour_fold", "contour_hidden"))


def _collect_contour_segments(render_classified):
    """Extract segments from contour paths as (x1,y1,x2,y2) tuples.

    Straight lines ("l") are taken as-is.
    Cubic beziers ("c") are approximated by their chord (start→end) plus two
    sub-chords (start→cp2, cp2→end) for better intersection coverage on curves.
    """
    segs = []
    for role, p in render_classified:
        if role not in _CONTOUR_ROLES:
            continue
        for item in p.get("items", []):
            if item[0] == "l" and len(item) >= 3:
                a, b = item[1], item[2]
                segs.append((a.x, a.y, b.x, b.y))
            elif item[0] == "c" and len(item) >= 5:
                # p1=start, p2=cp1, p3=cp2, p4=end
                p1, p2, p3, p4 = item[1], item[2], item[3], item[4]
                # Chord
                segs.append((p1.x, p1.y, p4.x, p4.y))
                # Sub-chords for better coverage
                segs.append((p1.x, p1.y, p3.x, p3.y))
                segs.append((p3.x, p3.y, p4.x, p4.y))
    return segs


def _segment_crosses_h_strip(x1, y1, x2, y2, x_lo, x_hi, y_mid, tol_y=4.0):
    """True if segment (x1,y1)-(x2,y2) crosses vertical strip x∈[x_lo,x_hi] at y≈y_mid."""
    if min(y1, y2) > y_mid + tol_y or max(y1, y2) < y_mid - tol_y:
        return False
    if min(x1, x2) > x_hi or max(x1, x2) < x_lo:
        return False
    dy = y2 - y1
    if abs(dy) < 0.01:
        return False  # horizontal segment — doesn't separate stitches vertically
    t = (y_mid - y1) / dy
    if not (0.0 <= t <= 1.0):
        return False
    x_at_y = x1 + t * (x2 - x1)
    return x_lo <= x_at_y <= x_hi


def _segment_crosses_v_strip(x1, y1, x2, y2, y_lo, y_hi, x_mid, tol_x=4.0):
    """True if segment crosses horizontal strip y∈[y_lo,y_hi] at x≈x_mid."""
    if min(x1, x2) > x_mid + tol_x or max(x1, x2) < x_mid - tol_x:
        return False
    if min(y1, y2) > y_hi or max(y1, y2) < y_lo:
        return False
    dx = x2 - x1
    if abs(dx) < 0.01:
        return False
    t = (x_mid - x1) / dx
    if not (0.0 <= t <= 1.0):
        return False
    y_at_x = y1 + t * (y2 - y1)
    return y_lo <= y_at_x <= y_hi


def _contour_blocks_h_gap(x_gap0, x_gap1, y, contour_segs, tol_y=4.0):
    """True if any contour segment crosses the horizontal gap [x_gap0..x_gap1] at height y."""
    if x_gap0 >= x_gap1:
        return False
    for x1, y1, x2, y2 in contour_segs:
        if _segment_crosses_h_strip(x1, y1, x2, y2, x_gap0, x_gap1, y, tol_y):
            return True
    return False


def _contour_blocks_v_gap(x, y_gap0, y_gap1, contour_segs, tol_x=4.0):
    """True if any contour segment crosses the vertical gap [y_gap0..y_gap1] at column x."""
    if y_gap0 >= y_gap1:
        return False
    for x1, y1, x2, y2 in contour_segs:
        if _segment_crosses_v_strip(x1, y1, x2, y2, y_gap0, y_gap1, x, tol_x):
            return True
    return False


def _point_near_seg(px, py, cx1, cy1, cx2, cy2, tol):
    """True if point (px,py) is within tol of segment (cx1,cy1)-(cx2,cy2)."""
    dx, dy = cx2 - cx1, cy2 - cy1
    seg_len2 = dx*dx + dy*dy
    if seg_len2 < 0.001:
        return (px - cx1)**2 + (py - cy1)**2 <= tol*tol
    t = max(0.0, min(1.0, ((px - cx1)*dx + (py - cy1)*dy) / seg_len2))
    nx, ny = cx1 + t*dx, cy1 + t*dy
    return (px - nx)**2 + (py - ny)**2 <= tol*tol


def _path_crosses_contour(p, contour_segs):
    """True if any 'l'-segment of path p strictly crosses a contour segment.

    'Strictly' means both intersection parameters t and u are in (0, 1) —
    the crossing must be in the interior of both segments, not at endpoints.
    This avoids false positives for long through-stitches that merely start or
    end on the contour boundary.
    """
    EPS = 1e-6
    for item in p.get("items", []):
        if item[0] != "l" or len(item) < 3:
            continue
        ax, ay = item[1].x, item[1].y
        bx, by = item[2].x, item[2].y
        dx, dy = bx - ax, by - ay
        for cx1, cy1, cx2, cy2 in contour_segs:
            denom = dx * (cy2 - cy1) - dy * (cx2 - cx1)
            if abs(denom) < 0.001:
                continue
            t = ((cx1 - ax) * (cy2 - cy1) - (cy1 - ay) * (cx2 - cx1)) / denom
            u = ((cx1 - ax) * dy - (cy1 - ay) * dx) / denom
            if EPS < t < 1.0 - EPS and EPS < u < 1.0 - EPS:
                return True
    return False


_STITCH_ROLES = frozenset((
    "stitch_edge", "stitch_thru", "stitch_topstitch", "stitch_double",
    "stitch_hidden", "stitch_cover", "stitch_overlock", "stitch_zigzag",
    "stitch_L", "stitch_C", "stitch_O", "stitch_F", "stitch_Bt",
))
_BOUNDARY_ROLES = frozenset((
    "boundary_lining", "boundary_interlining", "boundary_fragment", "boundary_zone",
))

def _is_red_stroke(p):
    c = _normalize_color(p.get("color"))
    if not c.startswith("#") or len(c) != 7:
        return False
    try:
        r = int(c[1:3], 16)
        g = int(c[3:5], 16)
        b = int(c[5:7], 16)
    except ValueError:
        return False
    return r >= 175 and g <= 105 and b <= 105


def _is_black_stroke(p):
    c = _normalize_color(p.get("color"))
    return c in ("#1a1a1a", "#221f1f", "#000000")


def scale_stitch_bt_height(render_classified, scale_y=0.5):
    """Scale bar tack and stitch symbol paths to half height around their vertical center."""
    result = []
    for role, p in render_classified:
        if role != "stitch_symbol":
            result.append((role, p))
            continue
        rect = p.get("rect")
        if not rect:
            result.append((role, p))
            continue
        cy = (rect.y0 + rect.y1) / 2.0
        new_items = []
        for item in p.get("items", []):
            def sy(pt):
                return fitz.Point(pt.x, cy + (pt.y - cy) * scale_y)
            if item[0] == "l" and len(item) >= 3:
                new_items.append(("l", sy(item[1]), sy(item[2])))
            elif item[0] == "c" and len(item) >= 5:
                new_items.append(("c", sy(item[1]), sy(item[2]), sy(item[3]), sy(item[4])))
            else:
                new_items.append(item)
        new_p = dict(p)
        new_p["items"] = new_items
        new_h = (rect.y1 - rect.y0) * scale_y
        new_p["rect"] = fitz.Rect(rect.x0, cy - new_h / 2, rect.x1, cy + new_h / 2)
        result.append((role, new_p))
    return result


def sanitize_color_role_conflicts(render_classified):
    """Fix registry assignments that contradict path color.

    Known impossible combinations:
    - RED dashed stroke → cannot be boundary_lining / boundary_interlining
      (red = stitch; green = boundary)
    - RED stroke → cannot be fill_* roles
    """
    result = []
    for role, p in render_classified:
        fixed = role
        if (
            role == "break_line"
            and not p.get("_vse_manual_role_override")
            and _is_black_stroke(p)
            and (p.get("width") or 0) >= 1.35
        ):
            fixed = "contour_outer"
        fill = p.get("fill")
        red_line_role_conflict = (
            role in _BOUNDARY_ROLES
            or role in {"stitch_thru", "stitch_edge", "unknown"}
            or (str(role).startswith("fill_") and fill is None)
        )
        if red_line_role_conflict and _is_red_stroke(p):
            # Red dashed = stitch_thru; red solid = stitch_edge.
            # Keep this invariant before any stitch-merge render pass so solid
            # seam markers do not get merged into dashed through-stitch rows.
            dashes = p.get("dashes")
            is_dashed = bool(dashes) and str(dashes) not in ("[] 0", "[]", "")
            if role in {"stitch_thru", "stitch_edge"}:
                # A manual role assignment is the user's explicit intent, so do not
                # renormalize it back by dash pattern. This is what lets a fragmented
                # through-stitch be unified: tag the solid end-caps stitch_thru and they
                # survive to the merge pass instead of being forced to stitch_edge here.
                if not p.get("_vse_manual_role_override"):
                    fixed = normalize_stitch_role(role, is_dashed)
            else:
                fixed = "stitch_thru" if is_dashed else "stitch_edge"
        result.append((fixed, p))
    return result


_STITCH_EDGE_MAX_LEN = 80.0  # pt — paths longer than this stay stitch_thru even if crossing


def reclassify_stitch_thru_crossing_contour(render_classified):
    """stitch_thru paths that cross a contour boundary → stitch_edge.

    Only SHORT paths (bounding box < 80pt) are reclassified.
    Long through-stitches that cross internal zone-separator lines (e.g. Shell/Sweat band
    horizontal divider) must remain stitch_thru — those separators are also contour_outer
    but they are not the garment cut edge.
    """
    contour_segs = _collect_contour_segments(render_classified)
    if not contour_segs:
        return render_classified
    result = []
    for role, p in render_classified:
        if role == "stitch_thru":
            rect = p.get("rect")
            is_short = (not rect) or (
                rect.width <= _STITCH_EDGE_MAX_LEN and rect.height <= _STITCH_EDGE_MAX_LEN
            )
            if is_short and _path_crosses_contour(p, contour_segs):
                result.append(("stitch_edge", p))
                continue
        result.append((role, p))
    return result


def merge_stitch_thru_rows_for_render(render_classified):
    """Render aligned through-stitch fragments as one continuous dashed path.

    Two fragments are merged only if no contour path crosses the gap between them.
    """
    rows = []
    columns = []
    curved = []
    passthrough = []
    contour_segs = _collect_contour_segments(render_classified)

    for role, p in render_classified:
        if role == "stitch_thru" and _is_simple_horizontal_stroke(p, min_len=1):
            x0, x1, y = _line_span(p)
            rows.append({
                "x0": x0,
                "x1": x1,
                "y": y,
                "width": round(p.get("width") or 0, 2),
                "path": p,
            })
        elif role == "stitch_thru" and _is_simple_vertical_stroke(p, min_len=1):
            x, y0, y1 = _vertical_line_span(p)
            if y1 - y0 <= 5:
                # Tiny vertical stub — send to curved bucket so it can chain with arcs
                curved.append(p)
            else:
                columns.append({
                    "x": x,
                    "y0": y0,
                    "y1": y1,
                    "width": round(p.get("width") or 0, 2),
                    "path": p,
                })
        elif role == "stitch_thru":
            curved.append(p)
        else:
            passthrough.append((role, p))

    if not rows and not columns and not curved:
        return render_classified

    rows.sort(key=lambda r: (round(r["y"] / 2.5), r["width"], r["x0"]))
    merged_groups = []
    for row in rows:
        placed = False
        for group in merged_groups:
            if abs(row["y"] - group["y"]) <= 2.5 and abs(row["width"] - group["width"]) <= 0.1:
                last_x1 = max(item["x1"] for item in group["items"])
                gap = row["x0"] - last_x1
                if 0 <= gap <= 25 and (gap <= 15 or not _contour_blocks_h_gap(last_x1, row["x0"], group["y"], contour_segs)):
                    group["items"].append(row)
                    group["x0"] = min(group["x0"], row["x0"])
                    group["x1"] = max(group["x1"], row["x1"])
                    group["y"] = sum(item["y"] for item in group["items"]) / len(group["items"])
                    placed = True
                    break
        if not placed:
            merged_groups.append({
                "x0": row["x0"],
                "x1": row["x1"],
                "y": row["y"],
                "width": row["width"],
                "items": [row],
            })

    for group in merged_groups:
        if len(group["items"]) == 1:
            item = group["items"][0]
            passthrough.append(("stitch_thru", item["path"]))
            continue

        source = dict(group["items"][0]["path"])
        y = group["y"]
        p0 = fitz.Point(group["x0"], y)
        p1 = fitz.Point(group["x1"], y)
        source["items"] = [("l", p0, p1)]
        source["rect"] = fitz.Rect(group["x0"], y, group["x1"], y)
        source["closePath"] = False
        source["fill"] = None
        elem_keys, group_keys = _merge_trace_identity([item["path"] for item in group["items"]])
        source["_vse_elem_keys"] = elem_keys
        source["_vse_group_keys"] = group_keys
        if elem_keys:
            source["_vse_elem_key"] = elem_keys[0]
        if group_keys:
            source["_vse_group_key"] = group_keys[0]
        passthrough.append(("stitch_thru", source))

    columns.sort(key=lambda r: (round(r["x"] / 3.5), r["width"], r["y0"]))
    merged_groups = []
    for column in columns:
        placed = False
        for group in merged_groups:
            if abs(column["x"] - group["x"]) <= 3.5 and abs(column["width"] - group["width"]) <= 0.1:
                last_y1 = max(item["y1"] for item in group["items"])
                gap = column["y0"] - last_y1
                if 0 <= gap <= 30 and (gap <= 10 or not _contour_blocks_v_gap(group["x"], last_y1, column["y0"], contour_segs)):
                    group["items"].append(column)
                    group["y0"] = min(group["y0"], column["y0"])
                    group["y1"] = max(group["y1"], column["y1"])
                    group["x"] = sum(item["x"] for item in group["items"]) / len(group["items"])
                    placed = True
                    break
        if not placed:
            merged_groups.append({
                "x": column["x"],
                "y0": column["y0"],
                "y1": column["y1"],
                "width": column["width"],
                "items": [column],
            })

    for group in merged_groups:
        if len(group["items"]) == 1:
            item = group["items"][0]
            passthrough.append(("stitch_thru", item["path"]))
            continue

        source = dict(group["items"][0]["path"])
        x = group["x"]
        p0 = fitz.Point(x, group["y0"])
        p1 = fitz.Point(x, group["y1"])
        source["items"] = [("l", p0, p1)]
        source["rect"] = fitz.Rect(x, group["y0"], x, group["y1"])
        source["closePath"] = False
        source["fill"] = None
        elem_keys, group_keys = _merge_trace_identity([item["path"] for item in group["items"]])
        source["_vse_elem_keys"] = elem_keys
        source["_vse_group_keys"] = group_keys
        if elem_keys:
            source["_vse_elem_key"] = elem_keys[0]
        if group_keys:
            source["_vse_group_key"] = group_keys[0]
        passthrough.append(("stitch_thru", source))

    passthrough.extend(merge_stitch_chains(curved, threshold=12.0, contour_segs=contour_segs))
    return passthrough


def add_buckle_fills_for_render(render_classified):
    """Add opaque hardware fills under closed buckle outlines."""
    result = []

    def point_close(a, b, tol=0.25):
        return abs(a.x - b.x) <= tol and abs(a.y - b.y) <= tol

    def item_start_end(item):
        if item[0] == "l":
            return item[1], item[2]
        if item[0] == "c":
            return item[1], item[4]
        if item[0] == "re":
            r = item[1]
            return fitz.Point(r.x0, r.y0), fitz.Point(r.x0, r.y0)
        if item[0] == "qu":
            q = item[1]
            return q.ul, q.ul
        return None, None

    for role, p in render_classified:
        if role != "hw_buckle":
            continue
        items = p.get("items") or []
        if len(items) < 3:
            continue
        # Skip tiny closed paths (pin holes, rivets) — they should stay transparent
        rect = p.get("rect")
        if rect and rect.width <= 6 and rect.height <= 6:
            continue
        start, _ = item_start_end(items[0])
        _, end = item_start_end(items[-1])
        if not start or not end or not point_close(start, end):
            continue
        fill_path = dict(p)
        fill_path["closePath"] = True
        fill_path["fill"] = (1, 1, 1)
        fill_path["width"] = 0
        fill_path["color"] = None
        fill_path["_vse_trace_ignore"] = True
        result.append(("hw_buckle_fill", fill_path))

    result.extend(render_classified)
    return result


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


def trim_simple_line_items(items, ratio=0.10):
    """Shorten a single straight segment from both ends."""
    if len(items) != 1 or items[0][0] != "l":
        return items
    start, end = items[0][1], items[0][2]
    dx = end.x - start.x
    dy = end.y - start.y
    length = math.sqrt(dx * dx + dy * dy)
    if length < 6:
        return items
    trim = min(length * ratio, 3.0)
    ux = dx / length
    uy = dy / length
    p1 = fitz.Point(start.x + ux * trim, start.y + uy * trim)
    p2 = fitz.Point(end.x - ux * trim, end.y - uy * trim)
    return [("l", p1, p2)]


def _rect_contains_with_tolerance(outer, inner, pad=4.0):
    if not outer or not inner:
        return False
    return (
        outer.x0 <= inner.x0 + pad
        and outer.y0 <= inner.y0 + pad
        and outer.x1 >= inner.x1 - pad
        and outer.y1 >= inner.y1 - pad
    )


def original_dasharray(p):
    dashes = p.get("dashes", "[] 0")
    if not dashes or dashes == "[] 0":
        return "none"
    import re
    m = re.search(r"\[([^\]]*)\]", dashes)
    if not m:
        return "none"
    nums = m.group(1).split()
    return " ".join(nums) if nums else "none"


def standardize(ai_path, svg_out, elem_overrides=None):
    doc = fitz.open(ai_path)
    page = doc[0]

    paths           = page.get_drawings()
    text_words      = page.get_text("words")
    registry_lookup = _build_registry_lookup()
    node_style_overrides = _load_node_style_overrides()
    node_annotations = _load_node_annotations()

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
            stitch_span_count = 0
            text_span_count = 0
            for s in spans:
                txt = s["text"].strip()
                if not txt:
                    continue
                text_span_count += 1
                # Detect stitch glyph: repeated V marks in small text are bar-tack /
                # stitch symbols, not readable labels.
                if len(set(txt.lower())) == 1 and txt.lower()[0] == "v" and len(txt) >= 2:
                    x0, y0, x1, y1 = s["bbox"]
                    c = s.get("color", 0)
                    r = ((c >> 16) & 0xFF) / 255
                    g = ((c >> 8)  & 0xFF) / 255
                    b = (c         & 0xFF) / 255
                    hex_c = "#{:02x}{:02x}{:02x}".format(int(r*255), int(g*255), int(b*255))
                    stitch_symbols.append((x0, y0, x1, y1, txt, s.get("size", 3), hex_c))
                    stitch_span_count += 1
                    continue
            if text_span_count and stitch_span_count == text_span_count:
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
    node_name = os.path.basename(str(ai_path)).lower()
    out_name = os.path.basename(str(svg_out)).lower()
    if out_name.endswith("_std.svg"):
        node_id = out_name[:-8]
    else:
        node_id = os.path.splitext(node_name)[0].replace(" ", "_")
    orig_identity_buckets = _load_orig_identity_buckets(node_id, svg_out)

    # Classify all paths (registry overrides heuristics), then split thin
    # crop/break lines away from heavier garment contours before identity keys
    # are built.
    base_classified = []
    use_legacy_group_overrides = not _has_node_group_overrides(node_id, node_annotations)
    for p in paths:
        role = classify_with_registry(p, text_words, registry_lookup)
        style_key = _path_style_key(p, text_words)
        if use_legacy_group_overrides:
            role = apply_node_style_override(node_id, style_key, role, node_style_overrides)
        role = normalize_active_role(apply_node_role_override(ai_path, p, role))
        base_classified.append((role, p))

    classified = []
    stable_classified = sanitize_color_role_conflicts(reclassify_thin_contours(base_classified))
    for role, p in stable_classified:
        role = normalize_active_role(role)
        detected_role = role
        group_key = _group_key_for_role_and_path(detected_role, p)
        elem_key, prefix = _element_key_for_path(node_id, p, detected_role)
        orig_identity = None
        bucket = orig_identity_buckets.get(group_key) or []
        if bucket:
            orig_identity = bucket.pop(0)
        if orig_identity:
            elem_key = orig_identity.get("elem_key") or elem_key
            prefix = orig_identity.get("path_d_prefix") or prefix
            group_key = orig_identity.get("group_key") or group_key
        p = dict(p)
        p["_vse_detected_role"] = detected_role
        p["_vse_group_key"] = group_key
        p["_vse_group_keys"] = [group_key] if group_key else []
        p["_vse_elem_key"] = elem_key
        p["_vse_elem_keys"] = [elem_key] if elem_key else []
        p["_vse_path_d_prefix"] = prefix
        role_before_manual = role
        role = normalize_active_role(apply_node_annotation_group_override(node_id, group_key, role, node_annotations))
        role = normalize_active_role(apply_node_annotation_element_override(node_id, p, role, node_annotations))
        p["_vse_manual_role_override"] = role != role_before_manual
        p["_vse_final_role"] = role
        classified.append((role, p))
    classified = normalize_fragmented_stitches(classified)
    classified = apply_geometry_overrides(classified, node_id, node_annotations)
    classified = apply_vertex_moves(classified, node_id, node_annotations)
    classified = apply_explicit_splits(classified, node_id, node_annotations)
    classified = apply_explicit_merges(classified, node_id, node_annotations)
    classified = apply_deleted_elements(classified, node_id, node_annotations)

    render_classified = []
    zipper_paths = []
    zipper_tape_paths = []
    for role, p in classified:
        if role == "_skip":
            pass
        elif role == "hw_zipper":
            zipper_paths.append(p)
        elif role == "hw_zipper_tape":
            # Zipper tapes/stops often already encode the source tooth rhythm and
            # exact stop geometry. Preserve them instead of synthesizing a loose bbox symbol.
            render_classified.append((role, p))
        else:
            render_classified.append((role, p))

    render_classified = sanitize_color_role_conflicts(render_classified)
    render_classified = scale_stitch_bt_height(render_classified)
    render_classified = merge_stitch_thru_rows_for_render(render_classified)
    # reclassify_stitch_thru_crossing_contour: disabled — too many false positives.
    # The contour_outer role is used for both external cut edges and internal zone
    # separators, so automated crossing-based reclassification is unreliable.
    # Use workbench registry assignments to fix individual cases.

    render_classified = add_buckle_fills_for_render(render_classified)
    render_classified = [(normalize_active_role(role), p) for role, p in render_classified]

    # Preserve original AI draw order — this is the designer's intentional z-order.
    # Only push annotation roles to the top so they're never obscured by content.
    _ANNOTATION_ROLES = frozenset({
        "callout_line", "callout_zoom", "dim_line", "arrow",
        "stitch_symbol", "label", "unknown",
    })

    def _render_priority(item):
        role, _ = item
        if role == "break_line":
            return -1
        if role in _ANNOTATION_ROLES:
            return 1
        return 0

    render_classified.sort(key=_render_priority)

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
        if role == "stitch_Bt":
            items = trim_simple_line_items(items)
        close = p.get("closePath", False)
        fill  = p.get("fill")
        if fill is not None:
            close = True
        if role in ("callout_line", "dim_line", "callout_zoom"):
            close = False
            fill = None

        d = items_to_svg_d(items, close)
        if d:
            # Apply per-element override by path_d match
            if elem_overrides:
                d_prefix = d[:40]
                for o in elem_overrides:
                    if d.startswith(o.get("path_d", "")[:40]) or o.get("path_d", "").startswith(d_prefix):
                        role = normalize_active_role(o["new_role"])
                        break
            if role == "hw_zipper_tape":
                if p.get("fill") is not None:
                    style = "stroke:none;stroke-width:0;stroke-dasharray:none;fill:#1A1A1A;opacity:1"
                elif (p.get("width") or 0) >= 5:
                    dash = original_dasharray(p)
                    dash_attr = f";stroke-dasharray:{dash}" if dash != "none" else ";stroke-dasharray:none"
                    style = (
                        f"stroke:#1A1A1A;stroke-width:{p.get('width') or 1:.2f}"
                        f"{dash_attr};fill:none;stroke-linecap:butt;opacity:1"
                    )
                else:
                    style = style_attr(role)
            elif role == "line_velcro":
                style = (
                    "stroke:#1A1A1A;stroke-width:0.75;stroke-dasharray:none;"
                    "fill:none;stroke-linecap:butt;opacity:1"
                )
            elif role == "fill_material_mask":
                if (
                    node_name not in {
                        "ac00201_cap_s half-belt.ai",
                        "ac00202_cap_s half-belt.ai",
                        "ac00203_cap_s half-belt.ai",
                        "ac00204_cap_s half-belt.ai",
                        "ac00205_cap_s half-belt.ai",
                        "ac00206_cap_s half-belt.ai",
                        "ac00207_cap_s half-belt.ai",
                    }
                    and not p.get("_vse_plain_mask")
                    and p.get("color") is not None
                    and (p.get("width") or 0) > 0
                ):
                    style = (
                        f"stroke:#1A1A1A;stroke-width:{p.get('width') or 1:.2f};"
                        "stroke-dasharray:none;fill:#FFFFFF;stroke-linecap:butt;"
                        "stroke-linejoin:round;opacity:1"
                    )
                else:
                    style = style_attr(role)
            elif role == "fill_white_detail":
                rect = p.get("rect")
                if (
                    node_name in {
                        "ac00202_cap_s half-belt.ai",
                        "ac00203_cap_s half-belt.ai",
                        "ac00204_cap_s half-belt.ai",
                    }
                    and rect
                    and rect.x1 < 180
                    and rect.y1 < 140
                ):
                    style = (
                        "stroke:#1A1A1A;stroke-width:1.5;"
                        "stroke-dasharray:none;fill:#FFFFFF;stroke-linecap:butt;"
                        "stroke-linejoin:round;opacity:1"
                    )
                elif p.get("color") is not None and (p.get("width") or 0) > 0:
                    style = (
                        f"stroke:#1A1A1A;stroke-width:{p.get('width') or 1:.2f};"
                        "stroke-dasharray:none;fill:#FFFFFF;stroke-linecap:butt;"
                        "stroke-linejoin:round;opacity:1"
                    )
                else:
                    style = style_attr(role)
            elif role == "hw_other" and p.get("_vse_preserve_fill"):
                fill_hex = _normalize_color(p.get("fill")) if p.get("fill") is not None else _normalize_color(p.get("color"))
                style = (
                    "stroke:none;stroke-width:0;stroke-dasharray:none;"
                    f"fill:{fill_hex};opacity:1"
                )
            else:
                style = style_attr(role)
            extra_attrs = []
            elem_key = str(p.get("_vse_elem_key") or "").strip()
            group_key = str(p.get("_vse_group_key") or "").strip()
            elem_keys = _trace_key_list(p.get("_vse_elem_keys") or elem_key)
            group_keys = _trace_key_list(p.get("_vse_group_keys") or group_key)
            if elem_key:
                extra_attrs.append(f'data-elem-key="{elem_key}"')
            if len(elem_keys) > 1:
                extra_attrs.append(f'data-elem-keys="{",".join(elem_keys)}"')
            if group_key:
                extra_attrs.append(f'data-group-key="{group_key}"')
            if len(group_keys) > 1:
                extra_attrs.append(f'data-group-keys="{",".join(group_keys)}"')
            if p.get("_vse_trace_ignore"):
                extra_attrs.append('data-trace-ignore="1"')
            extra_attr_text = (" " + " ".join(extra_attrs)) if extra_attrs else ""
            lines.append(f'    <path d="{d}" style="{style}" data-role="{role}"{extra_attr_text}/>')

    if current_role is not None:
        lines.append('  </g>')

    zipper_snippets = render_zipper_clusters(zipper_paths, zipper_tape_paths)
    if zipper_snippets:
        lines.append('  <g id="role-hw_zipper" data-role="hw_zipper">')
        for snippet in zipper_snippets:
            if isinstance(snippet, dict):
                svg = snippet.get("svg", "")
                elem_keys = _trace_key_list(snippet.get("elem_keys") or snippet.get("primary_elem_key"))
                group_keys = _trace_key_list(snippet.get("group_keys") or snippet.get("primary_group_key"))
                attrs = ['data-role="hw_zipper"', 'data-render-kind="generated_symbol"']
                if len(elem_keys) == 1:
                    attrs.append(f'data-elem-key="{elem_keys[0]}"')
                if elem_keys:
                    attrs.append(f'data-source-elem-keys="{",".join(elem_keys)}"')
                    attrs.append(f'data-elem-keys="{",".join(elem_keys)}"')
                if len(group_keys) == 1:
                    attrs.append(f'data-group-key="{group_keys[0]}"')
                if group_keys:
                    attrs.append(f'data-source-group-keys="{",".join(group_keys)}"')
                    attrs.append(f'data-group-keys="{",".join(group_keys)}"')
                lines.append(f'    <g {" ".join(attrs)}>\n    {svg}\n    </g>')
            else:
                lines.append(f'    <g data-role="hw_zipper" data-render-kind="generated_symbol">\n    {snippet}\n    </g>')
        lines.append('  </g>')

    # Stitch symbol glyphs (e.g. vvvvv in small font = stitch marking)
    if stitch_symbols:
        lines.append('  <g id="role-stitch_symbol" data-role="stitch_symbol" data-trace-ignore="1">')
        for (x0, y0, x1, y1, txt, size, color) in stitch_symbols:
            count = max(1, len(txt.strip()))
            width = max(x1 - x0, size * count * 0.55)
            height = max(y1 - y0, size * 0.75)
            step = width / count
            # Keep bottom at original position (aligns with stitch line).
            # Amplitude = 0.225 * height (half of the previous 0.45).
            y_bottom = y0 + height * 0.9
            y_top = y_bottom - height * 0.225
            pts = []
            for i in range(count):
                left = x0 + i * step
                mid = left + step * 0.5
                right = left + step
                if not pts:
                    pts.append((left, y_top))
                pts.append((mid, y_bottom))
                pts.append((right, y_top))
            d = "M " + " L ".join(f"{px:.2f} {py:.2f}" for px, py in pts)
            lines.append(f'    <path d="{d}" style="stroke:#1A1A1A;stroke-width:0.5;stroke-dasharray:none;fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:1" data-role="stitch_symbol" data-trace-ignore="1"/>')
        lines.append('  </g>')

    # Text labels — full lines, not individual words
    lines.append('  <g id="role-label" data-role="label" data-trace-ignore="1">')
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

    _safe_print(f"VSE - {ai_path.split('/')[-1].split(chr(92))[-1]}")
    _safe_print(f"  Canvas: {W:.0f}x{H:.0f}  Paths: {len(classified)}  Text: {len(text_words)}")
    for role, count in sorted(role_counts.items(), key=lambda x: -x[1]):
        lbl = ROLE_STYLES.get(role, {}).get("_label", role)
        _safe_print(f"  {role:25} {count:3}x  {lbl}")
    _safe_print(f"  -> {svg_out}")
    return svg_content


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "C:/temp/sample_node.ai"
    dst = sys.argv[2] if len(sys.argv) > 2 else "C:/temp/sample_node_std.svg"
    standardize(src, dst)
