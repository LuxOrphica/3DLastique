"""Compute tight bounding box of all paths and text in a page."""
import fitz

def get_content_bbox(page, margin=20):
    paths = page.get_drawings()
    words = page.get_text("words")

    xs, ys = [], []
    for p in paths:
        r = p.get("rect")
        if r:
            xs += [r.x0, r.x1]
            ys += [r.y0, r.y1]
    for w in words:
        xs += [w[0], w[2]]
        ys += [w[1], w[3]]

    if not xs:
        return page.rect

    x0 = max(0, min(xs) - margin)
    y0 = max(0, min(ys) - margin)
    x1 = min(page.rect.width,  max(xs) + margin)
    y1 = min(page.rect.height, max(ys) + margin)
    return fitz.Rect(x0, y0, x1, y1)
