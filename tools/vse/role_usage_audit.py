"""
Audit VSE role taxonomy usage.

Shows:
  - standard roles that are currently unused
  - non-standard assigned roles
  - aliases that can be normalized

Usage:
  python tools/vse/role_usage_audit.py
"""

import json
import os
import re
from collections import defaultdict

from visual_standard import ROLE_STYLES
from role_taxonomy import normalize_role as normalize_taxonomy_role


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "role_usage_audit.json")

STANDARD = set(ROLE_STYLES.keys()) | {"_skip"}

def load_json(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def normalize_role(role):
    return normalize_taxonomy_role(role, STANDARD)


used = defaultdict(set)
counts = defaultdict(int)

for entry in load_json(os.path.join(HERE, "style_registry.json")):
    role = (entry.get("role") or "").strip()
    if role and role != "?":
        used[role].add("style_registry")
        counts[role] += 1

for entry in load_json(os.path.join(HERE, "unknown_roles_assigned.json")):
    role = (entry.get("_role") or "").strip()
    if role:
        used[role].add("unknown_roles_assigned")
        counts[role] += 1

public_vse = os.path.join(ROOT, "public", "vse")
if os.path.isdir(public_vse):
    for name in os.listdir(public_vse):
        if not name.endswith(".svg"):
            continue
        with open(os.path.join(public_vse, name), encoding="utf-8", errors="ignore") as f:
            for role in re.findall(r'data-role="([^"]+)"', f.read()):
                used[role].add("public_svg")
                counts[role] += 1

unused_standard = sorted(role for role in STANDARD if role not in used)
used_standard = sorted(role for role in STANDARD if role in used)
non_standard = []
for role in sorted(set(used) - STANDARD):
    non_standard.append(
        {
            "role": role,
            "count": counts[role],
            "sources": sorted(used[role]),
            "suggested_standard_role": normalize_role(role),
        }
    )

report = {
    "standard_count": len(STANDARD),
    "used_standard_count": len(used_standard),
    "unused_standard": unused_standard,
    "used_standard": [{"role": role, "count": counts[role], "sources": sorted(used[role])} for role in used_standard],
    "non_standard": non_standard,
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print("VSE role usage audit")
print(f"  standard roles:      {report['standard_count']}")
print(f"  used standard roles: {report['used_standard_count']}")
print(f"  unused standard:     {len(unused_standard)}")
print(f"  non-standard used:   {len(non_standard)}")
print(f"-> {OUT}")

if unused_standard:
    print("\nUnused standard roles:")
    for role in unused_standard:
        print(f"  {role}")

if non_standard:
    print("\nNon-standard roles:")
    for item in non_standard:
        suggestion = f" -> {item['suggested_standard_role']}" if item["suggested_standard_role"] else ""
        print(f"  {item['role']} ({item['count']}){suggestion}")
