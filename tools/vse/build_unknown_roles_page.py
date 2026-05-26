"""
Build interactive HTML page for assigning roles to unknown styles.
Input: unknown_roles_report.json
Output: C:/temp/unknown_roles.html
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "unknown_roles_report.json"), encoding="utf-8") as f:
    report = json.load(f)

# Load previously assigned roles
assigned_file = os.path.join(HERE, "unknown_roles_assigned.json")
assigned_map = {}
if os.path.exists(assigned_file):
    with open(assigned_file, encoding="utf-8") as f:
        for entry in json.load(f):
            if entry.get("_role"):
                assigned_map[entry["key_str"]] = entry["_role"]
    print(f"Loaded {len(assigned_map)} existing assignments")

# Filter out DP (Down) files
def is_down(r):
    return all(f.startswith("DP") for f in r["files"])

rows = [r for r in report if not is_down(r)]

# Inject saved roles
for r in rows:
    if r["key_str"] in assigned_map:
        r["_role"] = assigned_map[r["key_str"]]
print(f"Unknown styles (excl. Down): {len(rows)}")

def color_group(stroke, fill):
    """Classify into a broad color group for filtering."""
    c = fill if fill and fill != "none" else stroke
    if not c or c == "none":
        return "no-color"
    h = c.lstrip("#")
    if len(h) != 6: return "other"
    r, g, b = int(h[0:2],16)/255, int(h[2:4],16)/255, int(h[4:6],16)/255
    # dark
    if r < 0.35 and g < 0.35 and b < 0.35: return "dark"
    # gray
    if abs(r-g)<0.1 and abs(g-b)<0.1 and r > 0.35: return "gray"
    # blue/cyan
    if b > 0.45 and b > r+0.1: return "blue"
    # pink/purple
    if r > 0.6 and b > 0.4 and g < r-0.1: return "pink-purple"
    # orange/amber/beige
    if r > 0.7 and g > 0.4 and b < 0.55: return "orange"
    # red
    if r > 0.7 and g < 0.3 and b < 0.3: return "red"
    # green
    if g > 0.55 and r < 0.5 and b < 0.5: return "green"
    return "other"

def swatch(color, size=20):
    if not color or color == "none":
        return f'<span style="display:inline-block;width:{size}px;height:{size}px;border:1px dashed #bbb;border-radius:2px"></span>'
    return f'<span style="display:inline-block;width:{size}px;height:{size}px;background:{color};border:1px solid #999;border-radius:2px"></span>'

def line_preview(stroke, fill, width, dashed):
    s = stroke if stroke and stroke != "none" else "#999"
    f = fill if fill and fill != "none" else "none"
    sw = max(float(width or 0.5), 0.5)
    dash = "stroke-dasharray='5 3'" if dashed else ""
    if f != "none":
        return f'<svg width="60" height="20"><rect x="2" y="2" width="56" height="16" fill="{f}" stroke="{s}" stroke-width="{sw}"/></svg>'
    return f'<svg width="60" height="20"><line x1="2" y1="10" x2="58" y2="10" stroke="{s}" stroke-width="{sw}" {dash}/></svg>'

rows_html = ""
for i, r in enumerate(rows):
    k = r["key"]
    stroke = r.get("raw_stroke") or k[0]
    fill   = r.get("raw_fill")   or k[1]
    width, dashed = k[2], k[3]
    is_line, is_filled, is_tiny = k[4], k[5], k[6]
    near_text, orient, sz = k[8], k[9], k[10]
    geom = ("line" if is_line else "path") + (" filled" if is_filled else "") + (" tiny" if is_tiny else "")
    cgroup = color_group(stroke, fill)
    # Build thumbnails from example files
    thumbs = ""
    for fname in r["files"][:3]:
        import re as _re
        m = _re.match(r"([A-Z]{2}\d{4,6})", fname)
        code = m.group(1) if m else ""
        if code:
            label = fname.replace(".ai", "").replace(code, "").lstrip("_- ")
            thumbs += f'''<div style="display:inline-block;vertical-align:top;text-align:center;margin:2px;max-width:70px">
  <a href="/nodes/{code}.jpg" target="_blank"><img src="/nodes/{code}.jpg" title="{fname}" style="width:64px;height:48px;object-fit:cover;border:1px solid #ddd;border-radius:2px;cursor:zoom-in" onerror="this.style.display=\'none\'"></a>
  <div style="font-size:9px;color:#666;word-break:break-word;line-height:1.2;margin-top:2px">{code}<br>{label}</div>
</div>'''
    rows_html += f"""
<tr data-group="{cgroup}" data-assigned="{'1' if r.get('_role') else '0'}">
  <td class="tc">{r['count']}</td>
  <td class="tc">{swatch(stroke)} <code style="font-size:9px">{stroke}</code></td>
  <td class="tc">{swatch(fill)} <code style="font-size:9px">{fill}</code></td>
  <td class="tc">{width}</td>
  <td class="tc">{line_preview(stroke, fill, width, dashed)}</td>
  <td class="tc"><code>{geom}</code><br><small>{orient} {sz}</small><br><small style="color:#C8A84B">{r.get('auto_role','')}</small></td>
  <td><input class="role-inp" data-idx="{i}" type="text" value="{r.get('_role','')}" placeholder="введи роль..." style="width:200px;padding:4px 8px;border:1px solid #C8A84B;border-radius:3px;font-size:13px"></td>
  <td>{thumbs}</td>
</tr>"""

data_json = json.dumps(rows, ensure_ascii=False)

html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>VSE — Unknown Roles</title>
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: Arial, sans-serif; font-size: 13px; background: #f5f2ee; }}
header {{ padding: 16px 32px; background: #1a1a1a; color: #C8A84B; font-size: 16px; font-weight: 700; }}
.sub {{ font-size: 12px; color: #aaa; margin-top: 4px; }}
.toolbar {{ padding: 12px 32px; background: #fff; border-bottom: 1px solid #e0d8cc; display:flex; gap:12px; align-items:center; }}
table {{ width: 100%; border-collapse: collapse; background: #fff; }}
th {{ background: #1a1a1a; color: #C8A84B; padding: 8px 12px; font-size: 11px; text-align: left; position:sticky; top:0; }}
td {{ padding: 7px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }}
.tc {{ text-align: center; }}
tr:hover td {{ background: #faf8f5; }}
tr.done td {{ background: #f0faf0; }}
code {{ font-size: 10px; color: #666; }}
small {{ font-size: 10px; color: #999; }}
.save-btn {{ padding: 8px 20px; background: #C8A84B; color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; }}
.save-btn:hover {{ opacity: 0.85; }}
.flt-btn {{ padding: 4px 10px; background: #eee; color: #333; border: 1px solid #ccc; border-radius: 12px; font-size: 11px; cursor: pointer; }}
.flt-btn.active {{ border-color: #C8A84B; box-shadow: 0 0 0 2px #C8A84B44; }}
#status {{ font-size: 12px; color: #888; }}
</style>
</head>
<body>
<header>
  VSE — Неизвестные роли
  <div class="sub">{len(rows)} стилей · Down-схемы исключены · Впиши название роли → Save</div>
</header>
<div class="toolbar">
  <button class="save-btn" onclick="saveJSON()">Сохранить назначения</button>
  <span id="status"></span>
  <div style="margin-left:16px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
    <span style="font-size:11px;color:#888">Фильтр:</span>
    <button class="flt-btn active" data-g="all" onclick="filter(this)">Все</button>
    <button class="flt-btn" data-g="unassigned" onclick="filter(this)">⚠ Без роли</button>
    <button class="flt-btn" data-g="orange" onclick="filter(this)" style="background:#f9ae40">Оранжевый</button>
    <button class="flt-btn" data-g="pink-purple" onclick="filter(this)" style="background:#d069a3;color:#fff">Розово-фиолетовый</button>
    <button class="flt-btn" data-g="blue" onclick="filter(this)" style="background:#32a9e0;color:#fff">Синий</button>
    <button class="flt-btn" data-g="dark" onclick="filter(this)" style="background:#333;color:#fff">Тёмный</button>
    <button class="flt-btn" data-g="gray" onclick="filter(this)" style="background:#999;color:#fff">Серый</button>
    <button class="flt-btn" data-g="red" onclick="filter(this)" style="background:#e02020;color:#fff">Красный</button>
    <button class="flt-btn" data-g="green" onclick="filter(this)" style="background:#29b473;color:#fff">Зелёный</button>
    <button class="flt-btn" data-g="no-color" onclick="filter(this)">Без цвета</button>
    <button class="flt-btn" data-g="other" onclick="filter(this)">Прочее</button>
  </div>
</div>
<table>
<thead><tr>
  <th>Кол-во</th><th>Stroke</th><th>Fill</th><th>Width</th><th>Preview</th><th>Геометрия</th><th>Роль</th><th>Файлы</th>
</tr></thead>
<tbody>{rows_html}</tbody>
</table>
<script>
const data = {data_json};

function filter(btn) {{
  document.querySelectorAll('.flt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const g = btn.dataset.g;
  let visible = 0;
  document.querySelectorAll('tbody tr').forEach(tr => {{
    const show = g === 'all'
      || (g === 'unassigned' && tr.dataset.assigned === '0')
      || tr.dataset.group === g;
    tr.style.display = show ? '' : 'none';
    if (show) visible++;
  }});
  document.getElementById('status').textContent = `Показано: ${{visible}}`;
}}

document.querySelectorAll('.role-inp').forEach(inp => {{
  if (inp.value.trim()) inp.closest('tr').classList.add('done');
  inp.addEventListener('input', () => {{
    inp.closest('tr').classList.toggle('done', inp.value.trim() !== '');
    data[inp.dataset.idx]._role = inp.value.trim();
  }});
}});

function saveJSON() {{
  document.querySelectorAll('.role-inp').forEach(inp => {{
    data[inp.dataset.idx]._role = inp.value.trim();
  }});
  const assigned = data.filter(r => r._role);
  const blob = new Blob([JSON.stringify(assigned, null, 2)], {{type: 'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'unknown_roles_assigned.json';
  a.click();
  const done = assigned.length;
  document.getElementById('status').textContent = `Сохранено: ${{done}} назначений из {len(rows)}`;
}}
</script>
</body>
</html>"""

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT  = os.path.join(ROOT, "public", "vse-tools", "unknown_roles.html")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print(f"-> {OUT}")
