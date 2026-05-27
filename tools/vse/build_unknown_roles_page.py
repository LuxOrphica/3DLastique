"""
Build an interactive workbench for assigning roles to unknown VSE styles.

Input:
  tools/vse/unknown_roles_report.json
  tools/vse/unknown_roles_assigned.json, optional

Output:
  public/vse-tools/unknown_roles.html
"""

import html
import json
import os
import re
from collections import Counter, defaultdict

from visual_standard import ROLE_STYLES
from role_taxonomy import normalize_role as normalize_taxonomy_role, suggest_semantic_role


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

REPORT_PATH = os.path.join(HERE, "unknown_roles_report.json")
ASSIGNED_PATH = os.path.join(HERE, "unknown_roles_assigned.json")
OUT = os.path.join(ROOT, "public", "vse-tools", "unknown_roles.html")

VALID_ROLES = ["?"] + sorted(ROLE_STYLES.keys()) + ["_skip"]
COMMON_ALIASES = {
    "выносная линия": "callout_line",
    "выноски с увеличением": "callout_line",
    "размерная линия": "dim_line",
    "строчка по краю": "stitch_edge",
    "соединяющая стрелка": "arrow",
}


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def normalize_role(role):
    return normalize_taxonomy_role(role, set(VALID_ROLES))


def role_status(role):
    if not role:
        return "empty"
    if role in VALID_ROLES:
        return "standard"
    if normalize_role(role):
        return "alias"
    return "custom"


def is_down(row):
    return row.get("files") and all(str(f).startswith("DP") for f in row["files"])


def color_group(stroke, fill):
    c = fill if fill and fill != "none" else stroke
    if not c or c == "none":
        return "no-color"
    h = c.lstrip("#")
    if len(h) != 6:
        return "other"
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    if r < 0.35 and g < 0.35 and b < 0.35:
        return "dark"
    if abs(r - g) < 0.1 and abs(g - b) < 0.1 and r > 0.35:
        return "gray"
    if b > 0.45 and b > r + 0.1:
        return "blue"
    if r > 0.6 and b > 0.4 and g < r - 0.1:
        return "pink-purple"
    if r > 0.7 and g > 0.4 and b < 0.55:
        return "orange"
    if r > 0.7 and g < 0.3 and b < 0.3:
        return "red"
    if g > 0.55 and r < 0.5 and b < 0.5:
        return "green"
    return "other"


def family_key(row):
    key = row.get("key") or []
    if len(key) < 11:
        return "unknown-family"
    stroke = row.get("raw_stroke") or key[0]
    fill = row.get("raw_fill") or key[1]
    width, dashed = key[2], key[3]
    is_line, is_filled, is_tiny, is_closed = key[4], key[5], key[6], key[7]
    near_text, orient, sz = key[8], key[9], key[10]
    return "|".join(
        str(v)
        for v in (
            color_group(stroke, fill),
            row.get("auto_role", "unknown"),
            width,
            dashed,
            is_line,
            is_filled,
            is_tiny,
            is_closed,
            near_text,
            orient,
            sz,
        )
    )


def swatch(color, size=20):
    if not color or color == "none":
        return f'<span class="swatch swatch-empty" style="width:{size}px;height:{size}px"></span>'
    safe = html.escape(color)
    return f'<span class="swatch" style="width:{size}px;height:{size}px;background:{safe}"></span>'


def line_preview(stroke, fill, width, dashed):
    s = html.escape(stroke if stroke and stroke != "none" else "#999")
    f = html.escape(fill if fill and fill != "none" else "none")
    try:
        sw = max(float(width or 0.5), 0.5)
    except (TypeError, ValueError):
        sw = 0.5
    dash = "stroke-dasharray='5 3'" if dashed else ""
    if f != "none":
        return f'<svg width="70" height="24"><rect x="3" y="3" width="64" height="18" fill="{f}" stroke="{s}" stroke-width="{sw}"/></svg>'
    return f'<svg width="70" height="24"><line x1="4" y1="12" x2="66" y2="12" stroke="{s}" stroke-width="{sw}" {dash}/></svg>'


def file_thumb(fname):
    m = re.match(r"([A-Z]{2}\d{4,6})", fname)
    code = m.group(1) if m else ""
    label = fname.replace(".ai", "")
    if code:
        label = label.replace(code, "").lstrip("_- ")
    if not code:
        return f'<span class="file-pill">{html.escape(fname)}</span>'
    esc_fname = html.escape(fname)
    esc_code = html.escape(code)
    esc_label = html.escape(label)
    return f"""
<div class="thumb">
  <a href="/nodes/{esc_code}.jpg" target="_blank"><img src="/nodes/{esc_code}.jpg" title="{esc_fname}" onerror="this.style.display='none'"></a>
  <div>{esc_code}<br>{esc_label}</div>
</div>"""


report = load_json(REPORT_PATH, [])
assigned = load_json(ASSIGNED_PATH, [])
assigned_map = {e["key_str"]: e.get("_role", "").strip() for e in assigned if e.get("key_str") and e.get("_role")}
print(f"Loaded {len(assigned_map)} existing assignments")

rows = [dict(r) for r in report if not is_down(r)]
for row in rows:
    role = assigned_map.get(row["key_str"], "")
    row["_role"] = role
    row["_normalized_role"] = normalize_role(role)
    row["_role_status"] = role_status(role)
    row["_family_key"] = family_key(row)
    row["_suggested_role"] = row.get("suggested_role") or suggest_semantic_role(row)
    key = row.get("key") or []
    row["_color_group"] = color_group(row.get("raw_stroke") or (key[0] if key else ""), row.get("raw_fill") or (key[1] if len(key) > 1 else ""))

family_roles = defaultdict(Counter)
family_counts = Counter()
for row in rows:
    family_counts[row["_family_key"]] += int(row.get("count") or 0)
    if row.get("_role"):
        family_roles[row["_family_key"]][row["_role"]] += int(row.get("count") or 0)

for row in rows:
    roles = [role for role, _ in family_roles[row["_family_key"]].most_common()]
    row["_family_roles"] = roles
    row["_family_conflict"] = len(roles) > 1
    row["_family_count"] = family_counts[row["_family_key"]]

assigned_count = sum(1 for row in rows if row.get("_role"))
standard_count = sum(1 for row in rows if row["_role_status"] == "standard")
alias_count = sum(1 for row in rows if row["_role_status"] == "alias")
custom_count = sum(1 for row in rows if row["_role_status"] == "custom")
conflict_count = sum(1 for row in rows if row["_family_conflict"])

role_counter = Counter(row["_role"] for row in rows if row.get("_role"))
unassigned_weight = sum(int(row.get("count") or 0) for row in rows if not row.get("_role"))

role_options_html = "\n".join(f'<option value="{html.escape(role)}"></option>' for role in VALID_ROLES if role != "?")
quick_roles = [
    "fill_fabric",
    "fill_interlining",
    "fill_shape",
    "boundary_interlining",
    "stitch_edge",
    "stitch_thru",
    "stitch_topstitch",
    "stitch_double",
    "seam_line",
    "contour_outer",
    "callout_line",
    "callout_zoom",
    "dim_line",
    "line_elastic",
    "line_fur",
    "line_velcro",
    "line_decorative",
    "arrow",
    "_skip",
]
quick_buttons = "\n".join(
    f'<button class="quick-role" type="button" data-role="{html.escape(role)}">{html.escape(role)}</button>'
    for role in quick_roles
)

rows_html = []
for i, row in enumerate(rows):
    key = row.get("key") or ["", "", "", "", "", "", "", "", "", "", ""]
    stroke = row.get("raw_stroke") or key[0]
    fill = row.get("raw_fill") or key[1]
    width, dashed = key[2], key[3]
    is_line, is_filled, is_tiny = key[4], key[5], key[6]
    near_text, orient, sz = key[8], key[9], key[10]
    geom = ("line" if is_line else "path") + (" filled" if is_filled else "") + (" tiny" if is_tiny else "")
    thumbs = "".join(file_thumb(str(fname)) for fname in row.get("files", [])[:4])
    status = row["_role_status"]
    normalized = row["_normalized_role"]
    family_roles_label = ", ".join(row["_family_roles"][:4])
    family_class = " conflict" if row["_family_conflict"] else ""
    role_value = html.escape(row.get("_role", ""))
    normalized_html = ""
    if status == "alias":
        normalized_html = f'<button class="use-suggestion" type="button" data-role="{html.escape(normalized)}">заменить на {html.escape(normalized)}</button>'
    elif status == "custom":
        normalized_html = '<span class="role-warn">не стандартная роль</span>'
    elif not row.get("_role") and row.get("_suggested_role"):
        normalized_html = f'<button class="use-suggestion" type="button" data-role="{html.escape(row["_suggested_role"])}">предложить {html.escape(row["_suggested_role"])}</button>'

    rows_html.append(
        f"""
<tr class="data-row{family_class}" data-group="{row['_color_group']}" data-assigned="{'1' if row.get('_role') else '0'}" data-status="{status}" data-family="{html.escape(row['_family_key'])}" data-count="{row.get('count', 0)}">
  <td class="tc count-cell">{row.get('count', 0)}<br><small>семья: {row['_family_count']}</small></td>
  <td class="tc">{swatch(stroke)} <code>{html.escape(str(stroke))}</code></td>
  <td class="tc">{swatch(fill)} <code>{html.escape(str(fill))}</code></td>
  <td class="tc">{html.escape(str(width))}</td>
  <td class="tc">{line_preview(str(stroke), str(fill), width, dashed)}</td>
  <td class="tc"><code>{html.escape(geom)}</code><br><small>{html.escape(str(orient))} {html.escape(str(sz))}</small><br><small>{'near text' if near_text else ''}</small><br><b>{html.escape(row.get('auto_role', ''))}</b></td>
  <td>
    <input class="role-inp" data-idx="{i}" list="role-options" type="text" value="{role_value}" placeholder="введи роль...">
    <div class="role-meta status-{status}">{status}{' · ' + html.escape(family_roles_label) if family_roles_label else ''}</div>
    {normalized_html}
  </td>
  <td>{thumbs}</td>
</tr>"""
    )

data_json = json.dumps(rows, ensure_ascii=False)
role_counts_json = json.dumps(role_counter.most_common(), ensure_ascii=False)

html_doc = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>VSE - Unknown Roles Workbench</title>
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: Arial, sans-serif; font-size: 13px; background: #f5f2ee; color: #222; }}
header {{ padding: 16px 32px; background: #1a1a1a; color: #C8A84B; }}
header h1 {{ font-size: 18px; margin-bottom: 4px; }}
.sub {{ font-size: 12px; color: #cfc6b6; }}
.toolbar {{ position: sticky; top: 0; z-index: 5; padding: 12px 32px; background: #fff; border-bottom: 1px solid #e0d8cc; display: grid; gap: 10px; }}
.stats {{ display: flex; gap: 10px; flex-wrap: wrap; }}
.stat {{ padding: 7px 10px; border: 1px solid #e0d8cc; border-radius: 4px; background: #faf8f5; }}
.controls {{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }}
.filters {{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; }}
button {{ font: inherit; cursor: pointer; }}
.save-btn, .bulk-btn {{ padding: 8px 14px; background: #C8A84B; color: #fff; border: none; border-radius: 4px; font-weight: 700; }}
.bulk-btn {{ background: #1a1a1a; }}
.flt-btn, .quick-role {{ padding: 4px 10px; background: #eee; color: #333; border: 1px solid #ccc; border-radius: 12px; font-size: 11px; }}
.flt-btn.active, .quick-role:hover {{ border-color: #C8A84B; box-shadow: 0 0 0 2px #C8A84B44; }}
.quick-role {{ background: #fff; }}
#search, #bulkRole {{ padding: 7px 9px; border: 1px solid #cfc6b6; border-radius: 4px; min-width: 220px; }}
#status {{ font-size: 12px; color: #666; }}
table {{ width: 100%; border-collapse: collapse; background: #fff; }}
th {{ background: #1a1a1a; color: #C8A84B; padding: 8px 12px; font-size: 11px; text-align: left; position: sticky; top: 153px; z-index: 4; }}
td {{ padding: 7px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }}
.tc {{ text-align: center; }}
tr:hover td {{ background: #faf8f5; }}
tr.done td {{ background: #f0faf0; }}
tr.conflict td {{ box-shadow: inset 3px 0 0 #d65f36; }}
code {{ font-size: 10px; color: #666; }}
small {{ font-size: 10px; color: #888; }}
b {{ color: #9b741b; font-size: 10px; }}
.swatch {{ display:inline-block; border:1px solid #999; border-radius:2px; vertical-align:middle; }}
.swatch-empty {{ border:1px dashed #bbb; background:#fff; }}
.role-inp {{ width: 210px; padding: 5px 8px; border: 1px solid #C8A84B; border-radius: 3px; font-size: 13px; }}
.role-meta {{ margin-top: 4px; font-size: 10px; color: #777; }}
.status-custom {{ color: #b54422; font-weight: 700; }}
.status-alias {{ color: #7d641c; font-weight: 700; }}
.role-warn {{ display:inline-block; margin-top:4px; color:#b54422; font-size:11px; }}
.use-suggestion {{ display:inline-block; margin-top:4px; border:1px solid #C8A84B; background:#fff8df; border-radius:3px; padding:2px 6px; font-size:11px; }}
.thumb {{ display:inline-block; vertical-align:top; text-align:center; margin:2px; max-width:74px; }}
.thumb img {{ width:64px; height:48px; object-fit:cover; border:1px solid #ddd; border-radius:2px; cursor:zoom-in; }}
.thumb div {{ font-size:9px; color:#666; word-break:break-word; line-height:1.2; margin-top:2px; }}
.file-pill {{ display:inline-block; padding:3px 6px; background:#eee; border-radius:3px; margin:2px; font-size:11px; }}
</style>
</head>
<body>
<header>
  <h1>VSE - разметка неизвестных ролей</h1>
  <div class="sub">Сначала закрываем самые частотные группы, затем разбираем нестандартные и конфликтные назначения.</div>
</header>
<div class="toolbar">
  <div class="stats">
    <div class="stat">Стилей: <b>{len(rows)}</b></div>
    <div class="stat">Назначено: <b>{assigned_count}</b></div>
    <div class="stat">Стандартных: <b>{standard_count}</b></div>
    <div class="stat">Алиасов: <b>{alias_count}</b></div>
    <div class="stat">Нестандартных: <b>{custom_count}</b></div>
    <div class="stat">Конфликтных строк: <b>{conflict_count}</b></div>
    <div class="stat">Вес без роли: <b>{unassigned_weight}</b></div>
  </div>
  <div class="controls">
    <button class="save-btn" onclick="saveJSON()">Сохранить назначения</button>
    <input id="search" type="search" placeholder="поиск: роль, файл, цвет, геометрия">
    <input id="bulkRole" list="role-options" type="text" placeholder="роль для массового назначения">
    <button class="bulk-btn" onclick="bulkApplyVisible()">Применить к видимым без роли</button>
    <span id="status"></span>
  </div>
  <div class="filters">
    <span style="font-size:11px;color:#888">Фильтр:</span>
    <button class="flt-btn active" data-g="all" onclick="setFilter(this)">Все</button>
    <button class="flt-btn" data-g="unassigned" onclick="setFilter(this)">Без роли</button>
    <button class="flt-btn" data-g="custom" onclick="setFilter(this)">Нестандартные</button>
    <button class="flt-btn" data-g="conflict" onclick="setFilter(this)">Конфликты</button>
    <button class="flt-btn" data-g="orange" onclick="setFilter(this)">Оранжевые</button>
    <button class="flt-btn" data-g="pink-purple" onclick="setFilter(this)">Розово-фиолетовые</button>
    <button class="flt-btn" data-g="blue" onclick="setFilter(this)">Синие</button>
    <button class="flt-btn" data-g="dark" onclick="setFilter(this)">Темные</button>
    <button class="flt-btn" data-g="gray" onclick="setFilter(this)">Серые</button>
    <button class="flt-btn" data-g="red" onclick="setFilter(this)">Красные</button>
    <button class="flt-btn" data-g="green" onclick="setFilter(this)">Зеленые</button>
  </div>
  <div class="filters">
    <span style="font-size:11px;color:#888">Быстрые роли:</span>
    {quick_buttons}
  </div>
</div>
<datalist id="role-options">
{role_options_html}
</datalist>
<table>
<thead><tr>
  <th>Кол-во</th><th>Stroke</th><th>Fill</th><th>Width</th><th>Preview</th><th>Геометрия</th><th>Роль</th><th>Файлы</th>
</tr></thead>
<tbody>
{''.join(rows_html)}
</tbody>
</table>
<script>
const data = {data_json};
const roleCounts = {role_counts_json};
let activeFilter = 'all';
let searchText = '';

function rowMatches(tr) {{
  const g = activeFilter;
  const okFilter = g === 'all'
    || (g === 'unassigned' && tr.dataset.assigned === '0')
    || (g === 'custom' && tr.dataset.status === 'custom')
    || (g === 'conflict' && tr.classList.contains('conflict'))
    || tr.dataset.group === g;
  if (!okFilter) return false;
  if (!searchText) return true;
  return tr.textContent.toLowerCase().includes(searchText);
}}

function refreshVisible() {{
  let visible = 0;
  document.querySelectorAll('tbody tr').forEach(tr => {{
    const show = rowMatches(tr);
    tr.style.display = show ? '' : 'none';
    if (show) visible++;
  }});
  document.getElementById('status').textContent = `Показано: ${{visible}}`;
}}

function setFilter(btn) {{
  document.querySelectorAll('.flt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.g;
  refreshVisible();
}}

function setRole(inp, role) {{
  inp.value = role;
  const tr = inp.closest('tr');
  const idx = Number(inp.dataset.idx);
  data[idx]._role = role.trim();
  tr.dataset.assigned = role.trim() ? '1' : '0';
  tr.classList.toggle('done', role.trim() !== '');
}}

document.querySelectorAll('.role-inp').forEach(inp => {{
  if (inp.value.trim()) inp.closest('tr').classList.add('done');
  inp.addEventListener('input', () => setRole(inp, inp.value));
}});

document.querySelectorAll('.quick-role').forEach(btn => {{
  btn.addEventListener('click', () => {{
    document.getElementById('bulkRole').value = btn.dataset.role;
  }});
}});

document.querySelectorAll('.use-suggestion').forEach(btn => {{
  btn.addEventListener('click', () => {{
    const inp = btn.closest('td').querySelector('.role-inp');
    setRole(inp, btn.dataset.role);
    btn.remove();
  }});
}});

document.getElementById('search').addEventListener('input', e => {{
  searchText = e.target.value.trim().toLowerCase();
  refreshVisible();
}});

function bulkApplyVisible() {{
  const role = document.getElementById('bulkRole').value.trim();
  if (!role) {{
    document.getElementById('status').textContent = 'Сначала укажи роль для массового назначения';
    return;
  }}
  let changed = 0;
  document.querySelectorAll('tbody tr').forEach(tr => {{
    if (tr.style.display === 'none' || tr.dataset.assigned === '1') return;
    const inp = tr.querySelector('.role-inp');
    setRole(inp, role);
    changed++;
  }});
  document.getElementById('status').textContent = `Массово назначено: ${{changed}}`;
  refreshVisible();
}}

function saveJSON() {{
  document.querySelectorAll('.role-inp').forEach(inp => {{
    data[Number(inp.dataset.idx)]._role = inp.value.trim();
  }});
  const assigned = data.filter(r => r._role);
  const blob = new Blob([JSON.stringify(assigned, null, 2)], {{type: 'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'unknown_roles_assigned.json';
  a.click();
  document.getElementById('status').textContent = `Сохранено: ${{assigned.length}} назначений из {len(rows)}`;
}}

refreshVisible();
</script>
</body>
</html>"""

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html_doc)

print(f"Unknown styles (excl. Down): {len(rows)}")
print(f"Assigned: {assigned_count}; standard: {standard_count}; aliases: {alias_count}; custom: {custom_count}")
print(f"-> {OUT}")
