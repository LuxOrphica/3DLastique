"""Generate side-by-side comparison HTML: original vs standardized SVG."""
import fitz
import sys
from engine import standardize

def make_comparison(ai_path, out_html):
    import re as _re
    from bbox import get_content_bbox

    # Original SVG via pymupdf with tight viewBox
    doc = fitz.open(ai_path)
    page = doc[0]
    bb = get_content_bbox(page)
    original_svg = page.get_svg_image()
    # Patch viewBox to crop to content
    vb = f"{bb.x0:.2f} {bb.y0:.2f} {bb.width:.2f} {bb.height:.2f}"
    original_svg = _re.sub(r'viewBox="[^"]*"', f'viewBox="{vb}"', original_svg)

    # Standardized SVG
    import io, contextlib
    std_svg_path = ai_path.replace(".ai", "_std.svg")
    standardize(ai_path, std_svg_path)
    with open(std_svg_path, encoding="utf-8") as f:
        std_svg = f.read()

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VSE — Before / After</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, sans-serif; background: #f0ede8; color: #222; }}
  header {{ padding: 20px 40px; background: #1a1a1a; color: #C8A84B; font-size: 18px; font-weight: 700; letter-spacing: 0.05em; }}
  .sub {{ font-size: 12px; color: #888; font-weight: 400; margin-top: 4px; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0; height: calc(100vh - 70px); }}
  .panel {{ display: flex; flex-direction: column; border-right: 1px solid #ccc; }}
  .panel:last-child {{ border-right: none; }}
  .panel-header {{ padding: 12px 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #ccc; display: flex; align-items: center; gap: 10px; }}
  .badge {{ font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 700; }}
  .badge-orig {{ background: #ddd; color: #555; }}
  .badge-std  {{ background: #C8A84B; color: #fff; }}
  .panel-body {{ flex: 1; overflow: auto; display: flex; align-items: flex-start; justify-content: center; padding: 20px; background: #fff; }}
  .panel-body svg {{ width: 595px; height: 842px; flex-shrink: 0; border: 1px solid #e0e0e0; }}
  .legend {{ padding: 12px 20px; border-top: 1px solid #eee; font-size: 11px; color: #888; background: #fafafa; }}
  .role-list {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }}
  .role-chip {{ padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; }}
</style>
</head>
<body>
<header>
  VSE — Visual Standardization Engine
  <div class="sub">Construction Node: {ai_path.split('/')[-1].split('\\')[-1]}</div>
</header>
<div class="grid">
  <div class="panel">
    <div class="panel-header">
      <span class="badge badge-orig">ORIGINAL</span>
      As exported from Adobe Illustrator CS5
    </div>
    <div class="panel-body">
      {original_svg}
    </div>
    <div class="legend">Raw AI file — no standardization applied</div>
  </div>
  <div class="panel">
    <div class="panel-header">
      <span class="badge badge-std">STANDARDIZED</span>
      ISO 128 / 129 / 4915 Visual Standard
    </div>
    <div class="panel-body">
      {std_svg}
    </div>
    <div class="legend">
      Roles detected:
      <div class="role-list">
        <span class="role-chip" style="background:#1a1a1a;color:#fff">base_outer_contour</span>
        <span class="role-chip" style="background:#555;color:#fff">structure_line</span>
        <span class="role-chip" style="background:#C8102E;color:#fff">stitch_line</span>
        <span class="role-chip" style="background:#1B4FA8;color:#fff">zone_frame</span>
        <span class="role-chip" style="background:#1A7A45;color:#fff">secondary_structure</span>
        <span class="role-chip" style="background:#333;color:#fff">heavy_seam</span>
        <span class="role-chip" style="background:#aaa;color:#fff">callout_line</span>
        <span class="role-chip" style="background:#1a1a1a;color:#fff">arrow</span>
      </div>
    </div>
  </div>
</div>
</body>
</html>"""

    import re
    # Remove fixed width/height and inject inline style
    html = re.sub(r'(<svg[^>]*)\s+width="[\d.]+"', r'\1', html)
    html = re.sub(r'(<svg[^>]*)\s+height="[\d.]+"', r'\1', html)
    html = re.sub(r'(<svg\b)', r'\1 style="width:595px;height:842px;flex-shrink:0"', html)

    with open(out_html, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Comparison saved: {out_html}")

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "C:/temp/sample_node.ai"
    out = sys.argv[2] if len(sys.argv) > 2 else "C:/temp/vse_compare.html"
    make_comparison(src, out)
