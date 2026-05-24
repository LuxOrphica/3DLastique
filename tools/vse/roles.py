"""
Role classification for construction node paths.
Input: raw path/text data from pymupdf
Output: each element tagged with a semantic role

Role taxonomy (ISO 4915 / Sportmaster AW24 / Условные обозначения РФ):
  contour_outer, construction_line, contour_fold, contour_cut
  seam_line, seam_allowance
  stitch_edge, stitch_thru, stitch_L, stitch_C, stitch_O, stitch_F, stitch_zigzag, stitch_Bt
  boundary_fragment, boundary_zone, boundary_lining, boundary_interlining
  fill_interlining, fill_fabric, fill_shape, construction_aux
  hw_zipper, hw_zipper_tape, hw_button, hw_snap, hw_other
  callout_line, dim_line, arrow, unknown
"""
import math

def classify_color(c):
    if not c:
        return "none"
    r, g, b = c[0], c[1], c[2]
    if r > 0.75 and g < 0.35 and b < 0.35:
        return "RED"
    if g > 0.55 and r < 0.35 and b < 0.55:
        return "GREEN"
    if b > 0.45 and r < 0.65 and g > 0.45:
        return "CYAN"
    if b > 0.45 and r < 0.35 and g < 0.45:
        return "BLUE"
    if r < 0.25 and g < 0.25 and b < 0.25:
        return "BLACK"
    if r > 0.85 and g > 0.85 and b > 0.85:
        return "WHITE"
    return "OTHER"


def _path_angle_and_length(items):
    """Return (angle_from_horizontal, length) for simple open paths, or (None, 0)."""
    pts = []
    for it in items:
        if it[0] == 'l': pts += [it[1], it[2]]
        elif it[0] == 'c': pts += [it[1], it[4]]
    if len(pts) < 2:
        return None, 0
    dx = pts[-1].x - pts[0].x
    dy = pts[-1].y - pts[0].y
    length = math.sqrt(dx*dx + dy*dy)
    if length < 1:
        return None, 0
    return abs(math.degrees(math.atan2(abs(dy), abs(dx)))), length

def _path_angle(items):
    angle, _ = _path_angle_and_length(items)
    return angle

def near_any_text(rect, text_words, threshold=45):
    """True if rect is within threshold px of any text word."""
    if not rect:
        return False
    cx = (rect.x0 + rect.x1) / 2
    cy = (rect.y0 + rect.y1) / 2
    for t in text_words:
        tx = (t[0] + t[2]) / 2
        ty = (t[1] + t[3]) / 2
        if abs(tx - cx) < threshold + rect.width / 2 and abs(ty - cy) < threshold + rect.height / 2:
            return True
    return False


def classify_path(p, text_words):
    """
    Heuristic role classification. Registry overrides this in engine.py.
    """
    rect   = p.get("rect")
    w      = p.get("width") or 0
    color  = classify_color(p.get("color"))
    fill   = p.get("fill")
    dashes = p.get("dashes", "[] 0")

    rw = rect.width  if rect else 0
    rh = rect.height if rect else 0
    is_line   = min(rw, rh) < 3
    is_tiny   = rw < 18 and rh < 18
    is_small  = rw < 60 and rh < 60
    is_filled = fill is not None and classify_color(fill) not in ("none", "WHITE")
    is_closed = p.get("closePath", False) or is_filled
    is_dashed = dashes and dashes != "[] 0"

    # Arrow / arrowhead: filled tiny closed shape
    if is_filled and is_tiny and is_closed:
        return "arrow"

    # Hardware zipper: dense small repeated pattern, black, many segments
    items = p.get("items", [])
    _simple_stroke = (len(items) <= 2
                      and all(it[0] in ('l', 'c') for it in items)
                      and not is_closed)
    if color == "BLACK" and is_small and len(items) > 8 and w >= 1.0:
        return "hw_zipper"

    if color == "BLUE" and rw > 100 and rh > 100:
        return "boundary_zone"

    if color == "RED" and is_dashed and (rw > 80 or rh > 80):
        return "boundary_lining"

    # Stitches: red lines — dashed = through layers, solid = edge/visible
    if color == "RED" and is_dashed:
        return "stitch_thru"
    if color == "RED":
        return "stitch_edge"

    if color == "GREEN":
        return "boundary_interlining"

    # Heavy seam / zipper tape: very thick black
    if w >= 5 and color == "BLACK" and is_dashed:
        return "hw_zipper_tape"
    if w >= 5 and color == "BLACK":
        return "seam_line"

    # Zipper tape edge lines: ~1.02 thin black simple stroke (frame the w=6 tape)
    if _simple_stroke and color == "BLACK" and 0.95 < w < 1.1:
        return "hw_zipper_tape"

    if color == "CYAN":
        return "boundary_fragment"

    # Interlining fill: black filled closed shape (diagonal hatch)
    if is_filled and is_closed and color == "BLACK" and not is_tiny:
        return "fill_interlining"

    # Angle-based classification for simple open strokes (1-2 segments)
    _simple_stroke = (len(items) <= 2
                      and all(it[0] in ('l', 'c') for it in items)
                      and not is_closed)
    if _simple_stroke and color == "BLACK" and w < 1.5:
        angle, length = _path_angle_and_length(items)
        if angle is not None:
            if length >= 80:
                return "break_line"    # длинная линия → линия обрыва
            else:
                return "callout_line"  # короткая линия рядом с подписью → выноска

    # Callout line: thin black line near text (fallback)
    if is_line and w < 1.2 and near_any_text(rect, text_words) and color == "BLACK":
        return "callout_line"

    # Outer contour: thicker black closed shape
    if color == "BLACK" and w >= 1.4 and not is_line:
        return "contour_outer"

    # Contour line: thinner black
    if color == "BLACK" and not is_filled:
        return "contour_outer"

    if is_filled:
        return "fill_shape"

    return "unknown"
