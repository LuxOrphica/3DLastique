"""
Hardware symbol generators.
Each function accepts a bounding box and returns SVG element strings.
"""
import math


def _cluster_rects(paths, gap=60):
    """
    Group paths into spatial clusters where any two rects are within `gap` px.
    Returns list of lists of paths.
    """
    indexed = [p for p in paths if p.get("rect")]
    if not indexed:
        return []

    # Union-find
    parent = list(range(len(indexed)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i, j):
        parent[find(i)] = find(j)

    for i in range(len(indexed)):
        ri = indexed[i]["rect"]
        for j in range(i + 1, len(indexed)):
            rj = indexed[j]["rect"]
            # Distance between nearest edges of rects
            dx = max(0, max(ri.x0, rj.x0) - min(ri.x1, rj.x1))
            dy = max(0, max(ri.y0, rj.y0) - min(ri.y1, rj.y1))
            if math.hypot(dx, dy) < gap:
                union(i, j)

    groups = {}
    for i, p in enumerate(indexed):
        g = find(i)
        groups.setdefault(g, []).append(p)

    return list(groups.values())


def _union_bbox(paths):
    x0 = min(p["rect"].x0 for p in paths)
    y0 = min(p["rect"].y0 for p in paths)
    x1 = max(p["rect"].x1 for p in paths)
    y1 = max(p["rect"].y1 for p in paths)
    return x0, y0, x1, y1


def zipper_symbol_svg(x0, y0, x1, y1, stroke="#1A1A1A"):
    """
    Standard tech-pack zipper symbol.
    Two tape lines + regular teeth marks + slider rectangle.
    Orientation auto-detected from bbox aspect ratio.
    """
    w = x1 - x0
    h = y1 - y0
    els = []

    TAPE_COLOR  = stroke
    TOOTH_COLOR = stroke
    TAPE_W      = "0.8"
    TOOTH_W     = "0.5"

    if w >= h:
        # Horizontal zipper
        half_gap = min(h * 0.28, 7)
        cy = (y0 + y1) / 2
        top = cy - half_gap
        bot = cy + half_gap

        # Tape edges
        els.append(f'<line x1="{x0:.1f}" y1="{top:.1f}" x2="{x1:.1f}" y2="{top:.1f}" '
                   f'stroke="{TAPE_COLOR}" stroke-width="{TAPE_W}"/>')
        els.append(f'<line x1="{x0:.1f}" y1="{bot:.1f}" x2="{x1:.1f}" y2="{bot:.1f}" '
                   f'stroke="{TAPE_COLOR}" stroke-width="{TAPE_W}"/>')

        # Teeth
        spacing = max(3.5, min(7, w / 22))
        tx = x0 + spacing * 0.5
        while tx < x1 - 1:
            els.append(f'<line x1="{tx:.1f}" y1="{top:.1f}" x2="{tx:.1f}" y2="{bot:.1f}" '
                       f'stroke="{TOOTH_COLOR}" stroke-width="{TOOTH_W}"/>')
            tx += spacing

        # Slider
        sx = (x0 + x1) / 2
        sw = min(14, w * 0.08)
        sh = half_gap * 2.8
        els.append(f'<rect x="{sx - sw/2:.1f}" y="{cy - sh/2:.1f}" '
                   f'width="{sw:.1f}" height="{sh:.1f}" '
                   f'fill="white" stroke="{stroke}" stroke-width="0.9"/>')

    else:
        # Vertical zipper
        half_gap = min(w * 0.28, 7)
        cx = (x0 + x1) / 2
        left  = cx - half_gap
        right = cx + half_gap

        # Tape edges
        els.append(f'<line x1="{left:.1f}" y1="{y0:.1f}" x2="{left:.1f}" y2="{y1:.1f}" '
                   f'stroke="{TAPE_COLOR}" stroke-width="{TAPE_W}"/>')
        els.append(f'<line x1="{right:.1f}" y1="{y0:.1f}" x2="{right:.1f}" y2="{y1:.1f}" '
                   f'stroke="{TAPE_COLOR}" stroke-width="{TAPE_W}"/>')

        # Teeth
        spacing = max(3.5, min(7, h / 22))
        ty = y0 + spacing * 0.5
        while ty < y1 - 1:
            els.append(f'<line x1="{left:.1f}" y1="{ty:.1f}" x2="{right:.1f}" y2="{ty:.1f}" '
                       f'stroke="{TOOTH_COLOR}" stroke-width="{TOOTH_W}"/>')
            ty += spacing

        # Slider
        sy = (y0 + y1) / 2
        sh = min(14, h * 0.08)
        sw = half_gap * 2.8
        els.append(f'<rect x="{cx - sw/2:.1f}" y="{sy - sh/2:.1f}" '
                   f'width="{sw:.1f}" height="{sh:.1f}" '
                   f'fill="white" stroke="{stroke}" stroke-width="0.9"/>')

    return "\n    ".join(els)


def render_zipper_clusters(zipper_paths, tape_paths=None):
    """
    Cluster hardware_zipper + hardware_zipper_tape paths together.
    Returns list of SVG snippet strings, one per cluster.
    """
    all_paths = list(zipper_paths) + list(tape_paths or [])
    clusters = _cluster_rects(all_paths, gap=60)
    snippets = []
    for cluster in clusters:
        x0, y0, x1, y1 = _union_bbox(cluster)
        svg = zipper_symbol_svg(x0, y0, x1, y1)
        snippets.append(svg)
    return snippets
