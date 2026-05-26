"""
Auto-assign roles to fill_shape entries based on color family.
Merges into unknown_roles_assigned.json.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "unknown_roles_report.json"), encoding="utf-8") as f:
    report = json.load(f)

assigned_file = os.path.join(HERE, "unknown_roles_assigned.json")
assigned_map = {}
if os.path.exists(assigned_file):
    with open(assigned_file, encoding="utf-8") as f:
        for e in json.load(f):
            if e.get("_role"):
                assigned_map[e["key_str"]] = e["_role"]

def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) != 6: return (0,0,0)
    return tuple(int(h[i:i+2], 16)/255 for i in (0,2,4))

def classify_fill_color(raw_fill, raw_stroke, files):
    if not raw_fill or raw_fill == "none":
        return None
    r, g, b = hex_to_rgb(raw_fill)

    # Orange / beige / amber family → основная ткань
    if r > 0.8 and g > 0.5 and b < 0.6:
        return "fill_fabric"

    # Light pink (r>0.85) → светло-розовый
    if r > 0.85 and b > 0.55 and g > 0.5 and r > b:
        return "fill_pink_light"

    # Dark purple/pink (r 0.65-0.85) → тёмно-фиолетовый
    if 0.65 < r < 0.86 and b > 0.55 and g < 0.55:
        return "fill_pink_dark"

    # Blue / cyan family → прокладка/дублерин
    if b > 0.5 and r < 0.5:
        return "fill_interlining"

    # Dark (near black) → тёмная ткань
    if r < 0.35 and g < 0.35 and b < 0.35:
        return "fill_dark_fabric"

    # Medium gray
    if abs(r-g) < 0.08 and abs(g-b) < 0.08 and 0.35 < r < 0.75:
        return "fill_fabric_gray"

    # Bright red / magenta / green / yellow → контрастная деталь
    if r > 0.7 and g < 0.3 and b < 0.3:
        return "fill_contrast"
    if r > 0.7 and b > 0.7 and g < 0.5:
        return "fill_contrast"
    if g > 0.6 and r < 0.4 and b < 0.4:
        return "fill_contrast"

    return None

auto_assigned = 0
for entry in report:
    if entry.get("auto_role") != "fill_shape":
        continue
    if entry["key_str"] in assigned_map:
        continue
    role = classify_fill_color(entry.get("raw_fill"), entry.get("raw_stroke"), entry.get("files", []))
    if role:
        assigned_map[entry["key_str"]] = role
        entry["_role"] = role
        auto_assigned += 1

print(f"Auto-assigned: {auto_assigned} fill_shape roles")

# Save merged
result = []
for entry in report:
    ks = entry["key_str"]
    if ks in assigned_map:
        entry["_role"] = assigned_map[ks]
        result.append(entry)

with open(assigned_file, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

# Summary
from collections import Counter
counts = Counter(e["_role"] for e in result)
print(f"\nTotal assigned: {len(result)}")
for role, cnt in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"  {role}: {cnt}")
