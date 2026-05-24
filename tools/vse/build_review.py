"""
Build single-page review for constructor.
Tabs: 1) Before/After  2) Callout meanings  3) Style registry
"""
import os, re, json, fitz
from engine import standardize
from bbox import get_content_bbox
from callout_graph import analyze
from roles import classify_color

SAMPLES = [
    ("C:/temp/sample_node.ai",                    "Воротник / молния CH00001"),
    ("C:/temp/samples/neckline_FN00001.ai",        "Горловина FN00001"),
    ("C:/temp/samples/waistband_BE00001.ai",       "Пояс BE00001"),
    ("C:/temp/samples/seams_SE00401.ai",           "Швы SE00401"),
    ("C:/temp/samples/front_placket_FP00129.ai",   "Планка спереди FP00129"),
    ("C:/temp/samples/sleeve_vent_SC00001.ai",     "Разрез рукава SC00001"),
]

def rgb_to_hex(c):
    if not c: return "none"
    return "#{:02x}{:02x}{:02x}".format(int(c[0]*255), int(c[1]*255), int(c[2]*255))

def swatch(h, size=16):
    if h in ("none","?"): return f'<span class="sw-empty"></span>'
    return f'<span class="sw" style="background:{h}"></span>'

def line_prev(hex_c, width, dashed=False):
    if hex_c in ("none","?"): return "—"
    w = max(float(width or 0.5), 0.5)
    dash = "stroke-dasharray='4 2'" if dashed else ""
    return f'<svg width="60" height="14"><line x1="2" y1="7" x2="58" y2="7" stroke="{hex_c}" stroke-width="{w}" {dash}/></svg>'

def make_svg(ai_path, std=False):
    if std:
        out = ai_path.replace(".ai","_std.svg")
        standardize(ai_path, out)
        with open(out, encoding="utf-8") as f:
            svg = f.read()
    else:
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

# ── TAB 1: Before/After ───────────────────────────────────────────────────────
tab1 = ""
for path, label in SAMPLES:
    if not os.path.exists(path): continue
    print(f"Rendering: {label}")
    orig = make_svg(path, std=False)
    std  = make_svg(path, std=True)
    tab1 += f"""
<div class="cmp-card">
  <div class="cmp-title">{label}</div>
  <div class="cmp-panels">
    <div class="cmp-panel">
      <div class="cmp-hdr orig-hdr">ОРИГИНАЛ</div>
      <div class="cmp-body">{orig}</div>
    </div>
    <div class="cmp-panel">
      <div class="cmp-hdr std-hdr">СТАНДАРТИЗИРОВАННЫЙ</div>
      <div class="cmp-body">{std}</div>
    </div>
  </div>
</div>"""

# ── TAB 2: Callout meanings ───────────────────────────────────────────────────
tab2_rows = ""
for path, label in SAMPLES:
    if not os.path.exists(path): continue
    items = analyze(path)
    for item in items:
        if item["label"].startswith("vvvv"): continue  # skip stitch-text
        tab2_rows += f"""<tr>
  <td class="muted">{label}</td>
  <td><strong>{item['label']}</strong></td>
  <td>{line_prev(item['callout_color'], item['callout_w'])} <code>{item['callout_color']}</code></td>
  <td>{swatch(item['target_color'])} {line_prev(item['target_color'], item['target_w'])}
      <code>{item['target_color']}</code> w={item['target_w']}</td>
  <td><input class="meaning-input" data-key="{label}|{item['label']}" placeholder="что означает эта линия?" /></td>
</tr>"""

tab2 = f"""
<p class="tab-hint">Для каждой подписи показана выноска и линия к которой она ведёт.<br>
Заполни колонку <strong>«Значение»</strong> — это станет основой справочника обозначений.</p>
<table class="data-table">
<thead><tr><th>Файл</th><th>Подпись</th><th>Линия выноски</th><th>Целевая линия</th><th>Значение</th></tr></thead>
<tbody>{tab2_rows}</tbody>
</table>
<button class="save-btn" onclick="saveMeanings()">Сохранить</button>
<div id="save-status"></div>"""

# ── TAB 3: Style registry ─────────────────────────────────────────────────────
with open("C:/temp/vse/style_registry.json", encoding="utf-8") as f:
    registry = json.load(f)

ROLE_OPTIONS = ["?","base_outer_contour","structure_line","stitch_line",
                "zone_frame","secondary_structure","heavy_seam",
                "callout_line","arrow","filled_shape","hardware_symbol","unknown"]

reg_rows = ""
for i, entry in enumerate(registry):
    opts = "".join(f'<option value="{r}"{"selected" if r==entry["role"] else ""}>{r}</option>'
                   for r in ROLE_OPTIONS)
    files_str = ", ".join(entry["files"])
    reg_rows += f"""<tr class="{'assigned' if entry['role'] != '?' else ''}">
  <td class="tc">{entry['count']}</td>
  <td class="tc">{swatch(entry['stroke'])}<br><code>{entry['stroke']}</code></td>
  <td class="tc">{swatch(entry['fill'])}<br><code>{entry['fill']}</code></td>
  <td class="tc">{entry['width']}</td>
  <td class="tc">{line_prev(entry['stroke'], entry['width'], entry['dashed'])}</td>
  <td class="tc">{'line' if entry['is_line'] else 'path'}{'·fill' if entry['is_filled'] else ''}{'·tiny' if entry['is_tiny'] else ''}</td>
  <td><select class="role-sel" data-idx="{i}" onchange="markRole(this)">{opts}</select></td>
  <td class="muted">{files_str}</td>
</tr>"""

tab3 = f"""
<p class="tab-hint">Все уникальные визуальные стили найденные в файлах. Назначь роль каждому.</p>
<table class="data-table">
<thead><tr><th>Кол-во</th><th>Stroke</th><th>Fill</th><th>Width</th><th>Превью</th><th>Тип</th><th>Роль</th><th>Файлы</th></tr></thead>
<tbody>{reg_rows}</tbody>
</table>
<button class="save-btn" onclick="saveRegistry()">Сохранить реестр</button>"""

# ── Assemble HTML ─────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>VSE — Обзор для конструктора</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:Arial,sans-serif;font-size:13px;background:#f0ede8;color:#222}}
header{{padding:16px 40px;background:#1a1a1a;color:#C8A84B;font-size:17px;font-weight:700;letter-spacing:.03em}}
header .sub{{font-size:12px;color:#888;margin-top:4px;font-weight:400}}

.tabs{{display:flex;gap:0;border-bottom:2px solid #C8A84B;margin:0 0 0;background:#fff;padding:0 40px}}
.tab-btn{{padding:12px 24px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;
          color:#888;border-bottom:3px solid transparent;margin-bottom:-2px;transition:color .15s}}
.tab-btn:hover{{color:#222}}
.tab-btn.active{{color:#C8A84B;border-bottom-color:#C8A84B}}

.tab-pane{{display:none;padding:24px 40px 60px}}
.tab-pane.active{{display:block}}
.tab-hint{{margin-bottom:16px;color:#666;font-size:13px;line-height:1.6}}

/* Compare */
.cmp-card{{margin-bottom:28px;border:1px solid #ccc;border-radius:6px;overflow:hidden;background:#fff}}
.cmp-title{{padding:10px 20px;font-weight:700;font-size:13px;background:#f5f2ee;border-bottom:1px solid #ddd}}
.cmp-panels{{display:grid;grid-template-columns:1fr 1fr}}
.cmp-panel{{border-right:1px solid #e0e0e0}}
.cmp-panel:last-child{{border-right:none}}
.cmp-hdr{{font-size:10px;font-weight:700;letter-spacing:.1em;padding:6px 16px;border-bottom:1px solid #eee}}
.orig-hdr{{background:#eee;color:#666}}
.std-hdr{{background:#C8A84B22;color:#8a6a1a}}
.cmp-body{{padding:16px}}
.cmp-body svg{{width:100%;height:auto;display:block}}

/* Tables */
.data-table{{width:100%;border-collapse:collapse;background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}}
.data-table th{{background:#1a1a1a;color:#C8A84B;padding:9px 12px;font-size:11px;letter-spacing:.08em;text-align:left}}
.data-table td{{padding:8px 12px;border-bottom:1px solid #eee;vertical-align:middle}}
.data-table tr:hover td{{background:#faf8f5}}
.data-table tr.assigned td{{background:#f0faf0}}
.tc{{text-align:center}}
.muted{{color:#999;font-size:11px}}
code{{font-size:10px;color:#666}}

.sw{{display:inline-block;width:16px;height:16px;border:1px solid #999;border-radius:2px;vertical-align:middle}}
.sw-empty{{display:inline-block;width:16px;height:16px;border:1px dashed #ccc;border-radius:2px;vertical-align:middle}}

.meaning-input{{width:240px;font-size:12px;padding:4px 8px;border:1px solid #C8A84B;border-radius:3px;background:#fffef8}}
.role-sel{{font-size:12px;padding:3px 6px;border:1px solid #C8A84B;border-radius:3px;min-width:170px}}

.save-btn{{margin-top:16px;padding:10px 28px;background:#C8A84B;color:#fff;border:none;border-radius:4px;
           font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s}}
.save-btn:hover{{opacity:.85}}
#save-status{{margin-top:8px;font-size:12px;color:#888}}
</style>
</head>
<body>
<header>
  VSE — Visual Standardization Engine
  <div class="sub">Обзор для конструктора — расшифровка обозначений</div>
</header>

<div class="tabs">
  <button class="tab-btn active" onclick="switchTab('compare',this)">До / После</button>
  <button class="tab-btn" onclick="switchTab('callouts',this)">Выноски и обозначения</button>
  <button class="tab-btn" onclick="switchTab('registry',this)">Реестр стилей</button>
</div>

<div id="tab-compare" class="tab-pane active">{tab1}</div>
<div id="tab-callouts" class="tab-pane">{tab2}</div>
<div id="tab-registry" class="tab-pane">{tab3}</div>

<script>
function switchTab(id, btn) {{
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}}

const regData = {json.dumps(registry, ensure_ascii=False)};

function markRole(sel) {{
  const i = parseInt(sel.dataset.idx);
  regData[i].role = sel.value;
  sel.closest('tr').classList.toggle('assigned', sel.value !== '?');
}}

function saveRegistry() {{
  const blob = new Blob([JSON.stringify(regData, null, 2)], {{type:'application/json'}});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'style_registry.json'; a.click();
  document.getElementById('save-status').textContent = 'Скачан style_registry.json';
}}

function saveMeanings() {{
  const data = {{}};
  document.querySelectorAll('.meaning-input').forEach(inp => {{
    if (inp.value.trim()) data[inp.dataset.key] = inp.value.trim();
  }});
  const blob = new Blob([JSON.stringify(data, null, 2)], {{type:'application/json'}});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'callout_meanings.json'; a.click();
  document.getElementById('save-status').textContent = 'Скачан callout_meanings.json';
}}
</script>
</body>
</html>"""

with open("C:/temp/vse_review.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Saved: C:/temp/vse_review.html")
