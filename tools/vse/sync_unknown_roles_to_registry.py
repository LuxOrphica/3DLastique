"""
Prepare or apply unknown-role assignments to style_registry.json.

By default this script is a dry run and writes role_registry_patch.json.
Use --write to update style_registry.json.

Usage:
  python tools/vse/sync_unknown_roles_to_registry.py
  python tools/vse/sync_unknown_roles_to_registry.py --write
"""

import json
import os
import sys

from visual_standard import ROLE_STYLES
from role_taxonomy import normalize_role as normalize_taxonomy_role


HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY_PATH = os.path.join(HERE, "style_registry.json")
ASSIGNED_PATH = os.path.join(HERE, "unknown_roles_assigned.json")
PATCH_PATH = os.path.join(HERE, "role_registry_patch.json")

VALID_ROLES = set(ROLE_STYLES.keys()) | {"_skip"}

def normalize_role(role):
    return normalize_taxonomy_role(role, VALID_ROLES)


def registry_key(entry):
    return (
        entry.get("stroke", "none"),
        entry.get("fill", "none"),
        round(float(entry.get("width", 0)), 2),
        bool(entry.get("dashed", False)),
        bool(entry.get("is_line", False)),
        bool(entry.get("is_filled", False)),
        bool(entry.get("is_tiny", False)),
        bool(entry.get("is_closed", False)),
        bool(entry.get("near_text", False)),
        entry.get("orient", "-"),
        entry.get("sz", "M"),
    )


def tuple_to_entry(key, source, role):
    return {
        "stroke": key[0],
        "fill": key[1],
        "width": key[2],
        "dashed": key[3],
        "is_line": key[4],
        "is_filled": key[5],
        "is_tiny": key[6],
        "is_closed": key[7],
        "near_text": key[8],
        "orient": key[9],
        "sz": key[10],
        "count": source.get("count", 0),
        "files": source.get("files", []),
        "role": role,
        "source": "unknown_roles_assigned",
        "key_str": source.get("key_str"),
    }


with open(REGISTRY_PATH, encoding="utf-8") as f:
    registry = json.load(f)
with open(ASSIGNED_PATH, encoding="utf-8") as f:
    assigned = json.load(f)

index = {registry_key(entry): i for i, entry in enumerate(registry)}
changes = []
skipped = []

for row in assigned:
    raw_role = row.get("_role", "")
    role = normalize_role(raw_role)
    if not role:
        skipped.append(
            {
                "reason": "non_standard_role",
                "role": raw_role,
                "count": row.get("count", 0),
                "files": row.get("files", [])[:5],
                "key_str": row.get("key_str"),
            }
        )
        continue

    key = tuple(row.get("key") or [])
    if len(key) != 11:
        skipped.append({"reason": "bad_key", "role": raw_role, "key_str": row.get("key_str")})
        continue

    if key in index:
        target = registry[index[key]]
        old_role = target.get("role", "?")
        if old_role == role:
            continue
        changes.append(
            {
                "action": "update",
                "old_role": old_role,
                "new_role": role,
                "raw_role": raw_role,
                "count": row.get("count", 0),
                "files": row.get("files", [])[:5],
                "key_str": row.get("key_str"),
            }
        )
        if "--write" in sys.argv:
            target["role"] = role
            target["source"] = "unknown_roles_assigned"
    else:
        entry = tuple_to_entry(key, row, role)
        changes.append(
            {
                "action": "append",
                "new_role": role,
                "raw_role": raw_role,
                "count": row.get("count", 0),
                "files": row.get("files", [])[:5],
                "key_str": row.get("key_str"),
            }
        )
        if "--write" in sys.argv:
            index[key] = len(registry)
            registry.append(entry)

patch = {
    "write": "--write" in sys.argv,
    "changes": changes,
    "skipped": skipped,
    "change_count": len(changes),
    "skipped_count": len(skipped),
}

with open(PATCH_PATH, "w", encoding="utf-8") as f:
    json.dump(patch, f, ensure_ascii=False, indent=2)

if "--write" in sys.argv:
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)

print("VSE registry sync")
print(f"  mode:     {'write' if '--write' in sys.argv else 'dry-run'}")
print(f"  changes:  {len(changes)}")
print(f"  skipped:  {len(skipped)}")
print(f"-> {PATCH_PATH}")
