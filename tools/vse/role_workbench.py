"""
Summarize VSE unknown-role work and surface the next best manual actions.

This script is intentionally read-only for source assets. It reads:
  - unknown_roles_report.json
  - unknown_roles_assigned.json

And writes:
  - role_workbench_summary.json

Usage:
  python tools/vse/role_workbench.py
"""

import json
import os
from collections import Counter, defaultdict

from visual_standard import ROLE_STYLES
from role_taxonomy import normalize_role as normalize_taxonomy_role, suggest_semantic_role


HERE = os.path.dirname(os.path.abspath(__file__))
REPORT_PATH = os.path.join(HERE, "unknown_roles_report.json")
ASSIGNED_PATH = os.path.join(HERE, "unknown_roles_assigned.json")
OUT_PATH = os.path.join(HERE, "role_workbench_summary.json")

VALID_ROLES = set(ROLE_STYLES.keys()) | {"_skip"}
def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def normalize_role(role):
    return normalize_taxonomy_role(role, VALID_ROLES)


def role_status(role):
    if not role:
        return "empty"
    if role in VALID_ROLES:
        return "standard"
    if normalize_role(role):
        return "alias"
    return "custom"


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


def is_down(row):
    return row.get("files") and all(str(f).startswith("DP") for f in row["files"])


report = [row for row in load_json(REPORT_PATH, []) if not is_down(row)]
assigned_rows = load_json(ASSIGNED_PATH, [])
assigned_map = {
    row["key_str"]: row.get("_role", "").strip()
    for row in assigned_rows
    if row.get("key_str") and row.get("_role")
}

rows = []
for row in report:
    item = dict(row)
    role = assigned_map.get(row["key_str"], "")
    item["_role"] = role
    item["_normalized_role"] = normalize_role(role)
    item["_role_status"] = role_status(role)
    item["_family_key"] = family_key(row)
    item["_suggested_role"] = item.get("suggested_role") or suggest_semantic_role(item)
    rows.append(item)

status_counts = Counter(row["_role_status"] for row in rows)
role_counts = Counter(row["_role"] for row in rows if row.get("_role"))
role_weight = Counter()
family_rows = defaultdict(list)
for row in rows:
    count = int(row.get("count") or 0)
    if row.get("_role"):
        role_weight[row["_role"]] += count
    family_rows[row["_family_key"]].append(row)

families = []
conflicts = []
for key, items in family_rows.items():
    count = sum(int(row.get("count") or 0) for row in items)
    roles = Counter(row["_role"] for row in items if row.get("_role"))
    unassigned = sum(1 for row in items if not row.get("_role"))
    entry = {
        "family_key": key,
        "count": count,
        "styles": len(items),
        "unassigned_styles": unassigned,
        "roles": roles.most_common(),
        "examples": [
            {
                "count": row.get("count"),
                "role": row.get("_role"),
                "auto_role": row.get("auto_role"),
                "raw_stroke": row.get("raw_stroke"),
                "raw_fill": row.get("raw_fill"),
                "files": row.get("files", [])[:3],
                "key_str": row.get("key_str"),
            }
            for row in sorted(items, key=lambda r: -(int(r.get("count") or 0)))[:5]
        ],
    }
    families.append(entry)
    if len(roles) > 1:
        conflicts.append(entry)

top_unassigned = [
    {
        "count": row.get("count"),
        "auto_role": row.get("auto_role"),
        "raw_stroke": row.get("raw_stroke"),
        "raw_fill": row.get("raw_fill"),
        "suggested_role": row.get("_suggested_role", ""),
        "files": row.get("files", [])[:5],
        "key_str": row.get("key_str"),
    }
    for row in sorted((r for r in rows if not r.get("_role")), key=lambda r: -(int(r.get("count") or 0)))[:40]
]

custom_roles = [
    {
        "role": role,
        "styles": count,
        "weight": role_weight[role],
        "suggested_standard_role": normalize_role(role),
    }
    for role, count in role_counts.most_common()
    if role_status(role) != "standard"
]

summary = {
    "total_styles": len(rows),
    "assigned_styles": sum(1 for row in rows if row.get("_role")),
    "unassigned_styles": sum(1 for row in rows if not row.get("_role")),
    "unassigned_weight": sum(int(row.get("count") or 0) for row in rows if not row.get("_role")),
    "status_counts": dict(status_counts),
    "role_counts": role_counts.most_common(),
    "role_weight": role_weight.most_common(),
    "custom_roles": custom_roles,
    "top_unassigned": top_unassigned,
    "top_families": sorted(families, key=lambda item: -item["count"])[:50],
    "conflicts": sorted(conflicts, key=lambda item: -item["count"]),
}

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

print("VSE role workbench")
print(f"  styles:      {summary['total_styles']}")
print(f"  assigned:    {summary['assigned_styles']}")
print(f"  unassigned:  {summary['unassigned_styles']} (weight {summary['unassigned_weight']})")
print(f"  standard:    {status_counts.get('standard', 0)}")
print(f"  aliases:     {status_counts.get('alias', 0)}")
print(f"  custom:      {status_counts.get('custom', 0)}")
print(f"  conflicts:   {len(summary['conflicts'])}")
print(f"-> {OUT_PATH}")

if top_unassigned:
    print("\nTop unassigned:")
    for row in top_unassigned[:10]:
        files = ", ".join(row.get("files", [])[:2])
        print(f"  {row['count']:>4}  {row.get('auto_role')}  stroke={row.get('raw_stroke')} fill={row.get('raw_fill')}  {files}")

if custom_roles:
    print("\nNon-standard roles:")
    for row in custom_roles[:20]:
        suggestion = f" -> {row['suggested_standard_role']}" if row["suggested_standard_role"] else ""
        print(f"  {row['styles']:>3} styles / {row['weight']:>4}x  {row['role']}{suggestion}")
