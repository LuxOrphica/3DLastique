"""Generate multi-file comparison HTML."""
import os, re, fitz
from engine import standardize
from bbox import get_content_bbox

SAMPLES = [
    ("C:/temp/sample_node.ai",                "Воротник / молния — CH00001"),
    ("C:/temp/samples/neckline_FN00001.ai",   "Горловина — FN00001"),
    ("C:/temp/samples/waistband_BE00001.ai",  "Пояс — BE00001"),
    ("C:/temp/samples/seams_SE00401.ai",      "Швы — SE00401"),
    ("C:/temp/samples/front_placket_FP00129.ai", "Планка спереди — FP00129"),
    ("C:/temp/samples/sleeve_vent_SC00001.ai","Разрез рукава — SC00001"),
]

def svg_orig(ai_path):
    doc = fitz.open(ai_path)
    page = doc[0]
    bb = get_content_bbox(page)
    svg = page.get_svg_image()
    vb = f"{bb.x0:.2f} {bb.y0:.2f} {bb.width:.2f} {bb.height:.2f}"
    svg = re.sub(r'viewBox="[^"]*"', f'viewBox="{vb}"', svg)
    svg = re.sub(r'(<svg\b)', r'\1 style="width:100%;height:auto"', svg)
    svg = re.sub(r'(<svg[^>]*)\s+width="[\d.]+"', r'\1', svg)
    svg = re.sub(r'(<svg[^>]*)\s+height="[\d.]+"', r'\1', svg)
    return svg

def svg_std(ai_path):
    out = ai_path.replace(".ai", "_std.svg")
    standardize(ai_path, out)
    with open(out, encoding="utf-8") as f:
        content = f.read()
    content = re.sub(r'(<svg\b)', r'\1 style="width:100%;height:auto"', content)
    content = re.sub(r'(<svg[^>]*)\s+width="[\d.]+"', r'\1', content)
    content = re.sub(r'(<svg[^>]*)\s+height="[\d.]+"', r'\1', content)
    return content

cards = []
for path, label in SAMPLES:
    if not os.path.exists(path):
        print(f"  SKIP (not found): {path}")
        continue
    print(f"Processing: {label}")
    orig = svg_orig(path)
    std  = svg_std(path)
    cards.append((label, orig, std))

html_cards = ""
for label, orig, std in cards:
    html_cards += f"""
<section class="card">
  <div class="card-title">{label}</div>
  <div class="card-panels">
    <div class="panel">
      <div class="panel-hdr orig-hdr">ORIGINAL</div>
      <div class="panel-body">{orig}</div>
    </div>
    <div class="panel">
      <div class="panel-hdr std-hdr">STANDARDIZED</div>
      <div class="panel-body">{std}</div>
    </div>
  </div>
</section>
"""

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VSE — Batch Compare</title>
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: Arial, sans-serif; background: #f0ede8; color: #222; }}
header {{ padding: 18px 40px; background: #1a1a1a; color: #C8A84B; font-size: 17px; font-weight: 700; }}
.card {{ margin: 24px 40px; border: 1px solid #ccc; border-radius: 6px; overflow: hidden; background: #fff; }}
.card-title {{ padding: 10px 20px; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; background: #f5f2ee; border-bottom: 1px solid #ddd; }}
.card-panels {{ display: grid; grid-template-columns: 1fr 1fr; }}
.panel {{ border-right: 1px solid #e0e0e0; }}
.panel:last-child {{ border-right: none; }}
.panel-hdr {{ font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 6px 16px; border-bottom: 1px solid #eee; }}
.orig-hdr {{ background: #eee; color: #666; }}
.std-hdr  {{ background: #C8A84B22; color: #8a6a1a; }}
.panel-body {{ padding: 16px; background: #fff; }}
.panel-body svg {{ width: 100%; height: auto; display: block; }}
</style>
</head>
<body>
<header>VSE — Visual Standardization Engine &nbsp;|&nbsp; Batch Compare ({len(cards)} nodes)</header>
{html_cards}
</body>
</html>"""

out = "C:/temp/vse_batch.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"\nSaved: {out}")
