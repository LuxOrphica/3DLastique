"""
Audit unknown line-like styles from unknown_roles_report.json.

This does not rescan AI files. It uses the existing report and focuses on
styles where the VSE style key says the element is a line/open stroke.

Usage:
  python tools/vse/line_unknown_audit.py
"""

import json
import os
import sys
from collections import Counter, defaultdict

from role_taxonomy import suggest_semantic_role


HERE = os.path.dirname(os.path.abspath(__file__))
REPORT_PATH = os.path.join(HERE, "unknown_roles_report.json")
ASSIGNED_PATH = os.path.join(HERE, "unknown_roles_assigned.json")
OUT = os.path.join(HERE, "line_unknown_audit.json")


def load_json(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def color_group(stroke):
    if not stroke or stroke == "none":
        return "no-stroke"
    h = stroke.lstrip("#")
    if len(h) != 6:
        return "other"
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    if r < 0.30 and g < 0.30 and b < 0.30:
        return "black"
    if abs(r - g) < 0.1 and abs(g - b) < 0.1:
        return "gray"
    if r > 0.65 and g < 0.35 and b < 0.35:
        return "red"
    if b > 0.45 and b > r + 0.1:
        return "blue"
    if g > 0.55 and r < 0.5:
        return "green"
    return "other"


def bucket_width(width):
    try:
        w = float(width)
    except (TypeError, ValueError):
        return "?"
    if w < 0.4:
        return "hairline"
    if w < 0.8:
        return "thin"
    if w < 1.4:
        return "regular"
    if w < 2.5:
        return "bold"
    return "heavy"


assigned = {row.get("key_str"): row.get("_role", "").strip() for row in load_json(ASSIGNED_PATH)}
report = load_json(REPORT_PATH)
include_down = "--include-down" in sys.argv

line_rows = []
groups = defaultdict(list)

for row in report:
    if not include_down and row.get("files") and all(str(f).startswith("DP") for f in row["files"]):
        continue
    key = row.get("key") or []
    if len(key) < 11:
        continue
    stroke, fill, width, dashed, is_line, is_filled, is_tiny, is_closed, near_text, orient, size = key
    if not is_line:
        continue
    role = assigned.get(row.get("key_str"), "")
    item = {
        "count": row.get("count", 0),
        "assigned_role": role,
        "auto_role": row.get("auto_role"),
        "stroke": row.get("raw_stroke") or stroke,
        "fill": row.get("raw_fill") or fill,
        "width": width,
        "width_bucket": bucket_width(width),
        "dashed": dashed,
        "is_tiny": is_tiny,
        "is_closed": is_closed,
        "near_text": near_text,
        "orient": orient,
        "size": size,
        "files": row.get("files", [])[:5],
        "key_str": row.get("key_str"),
    }
    item["suggested_role"] = row.get("suggested_role") or suggest_semantic_role({**row, "_role": role})
    signature = "|".join(
        str(v)
        for v in (
            color_group(item["stroke"]),
            item["width_bucket"],
            dashed,
            is_tiny,
            near_text,
            orient,
            size,
            row.get("auto_role"),
            role or "?",
        )
    )
    item["signature"] = signature
    line_rows.append(item)
    groups[signature].append(item)

summary_groups = []
for signature, items in groups.items():
    total = sum(int(item.get("count") or 0) for item in items)
    roles = Counter(item.get("assigned_role") or "?" for item in items)
    examples = sorted(items, key=lambda item: -(int(item.get("count") or 0)))[:6]
    summary_groups.append(
        {
            "signature": signature,
            "count": total,
            "styles": len(items),
            "roles": roles.most_common(),
            "examples": examples,
        }
    )

summary_groups.sort(key=lambda item: -item["count"])
unassigned_lines = sorted(
    [item for item in line_rows if not item.get("assigned_role")],
    key=lambda item: -(int(item.get("count") or 0)),
)

report_out = {
    "include_down": include_down,
    "line_style_count": len(line_rows),
    "line_weight": sum(int(item.get("count") or 0) for item in line_rows),
    "unassigned_line_style_count": len(unassigned_lines),
    "unassigned_line_weight": sum(int(item.get("count") or 0) for item in unassigned_lines),
    "top_groups": summary_groups[:50],
    "top_unassigned_lines": unassigned_lines[:80],
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(report_out, f, ensure_ascii=False, indent=2)

print("VSE line unknown audit")
print(f"  line styles:          {report_out['line_style_count']}")
print(f"  line weight:          {report_out['line_weight']}")
print(f"  unassigned styles:    {report_out['unassigned_line_style_count']}")
print(f"  unassigned weight:    {report_out['unassigned_line_weight']}")
print(f"-> {OUT}")

if unassigned_lines:
    print("\nTop unassigned line-like styles:")
    for item in unassigned_lines[:15]:
        files = ", ".join(item.get("files", [])[:2])
        print(
            f"  {item['count']:>4}  {item['stroke']} w={item['width']} "
            f"dash={item['dashed']} orient={item['orient']} size={item['size']} "
            f"near_text={item['near_text']} suggest={item['suggested_role']}  {files}"
        )
