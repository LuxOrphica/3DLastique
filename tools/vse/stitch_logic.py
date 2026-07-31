"""Shared stitch-role resolution rules for node-state and renderer.

Current contract:
- dashed red stitch semantics => stitch_thru
- solid red stitch semantics => stitch_edge

Contour-crossing upgrades are intentionally disabled in the shared resolver.
They caused node-state to disagree with render output for large batches of
elements. If we later reintroduce crossing-aware upgrades, both state and
engine must consume the same function and the rule must not conflict with the
canonical dashed/solid style mapping.
"""

import json
import re
from functools import lru_cache
from pathlib import Path


HERE = Path(__file__).resolve().parent
STITCH_OPERATION_CODES_PATH = HERE / "stitch_operation_codes.json"
STITCH_GUIDELINE_CODES_PATH = HERE / "stitch_guideline_codes.json"

# Stitch-type letter -> role. The guideline spells the family in its "stitch_type"
# column, so a code we have never seen before still resolves as long as its family is
# known. Stab is an обмёточная machine, i.e. the overlock family.
_TYPE_TO_ROLE = {
    "L": "stitch_lockstitch",
    "Z": "stitch_zigzag",
    "C": "stitch_chainstitch",
    "O": "stitch_overlock",
    "Co": "stitch_coverstitch",
    "F": "stitch_flatlock",
    "Stab": "stitch_overlock",
    "Stab-2": "stitch_overlock",
    "Bt": "stitch_Bt",
}

# Buttonholes and button attachment are operations on hardware, not stitching drawn
# along a seam, so they get no line role — recognising the code is still useful.
_TYPES_WITHOUT_LINE_ROLE = {"Bh", "Bs"}


def normalize_stitch_role(role, dashed):
    """Return canonical stitch role from semantic role + dash state."""
    if role not in {"stitch_thru", "stitch_edge"}:
        return role
    return "stitch_thru" if bool(dashed) else "stitch_edge"


@lru_cache(maxsize=1)
def load_stitch_operation_codes():
    """Load Sportmaster stitch operation-code reference."""
    if not STITCH_OPERATION_CODES_PATH.exists():
        return {}
    with STITCH_OPERATION_CODES_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    return data.get("codes", {})


@lru_cache(maxsize=1)
def load_stitch_guideline_codes():
    """Load the "Guideline on Stitching" table (parametrised codes: L1_1mm, Co2(dn3mm)…)."""
    if not STITCH_GUIDELINE_CODES_PATH.exists():
        return {}
    with STITCH_GUIDELINE_CODES_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    return data.get("codes", {})


@lru_cache(maxsize=1)
def _code_index():
    """All known codes, longest first, each with its resolved role.

    Both tables are searched. The guideline wins on overlap: it describes the same
    stitches in more detail, and its codes are the ones written on drawings.
    """
    ops = load_stitch_operation_codes()
    guide = load_stitch_guideline_codes()
    index = {}
    for code, meta in ops.items():
        index[code] = {"code": code, "source": "workmanship", "meta": meta,
                       "role": meta.get("default_role") or ""}
    for code, meta in guide.items():
        stitch_type = str(meta.get("stitch_type") or "")
        if code == "Bc" or meta.get("group") == "secure_ends":
            role = "stitch_backtack"
        elif stitch_type in _TYPES_WITHOUT_LINE_ROLE:
            role = ""
        else:
            role = _TYPE_TO_ROLE.get(stitch_type, "")
        index[code] = {"code": code, "source": "guideline", "meta": meta, "role": role}
    # Longest first so "L2(dn3mm)_1mm" is preferred over "L2", and "Bt(7mm)" over "Bt".
    return sorted(index.values(), key=lambda e: -len(e["code"]))


def stitch_code_role(code):
    """Role a stitch code implies, or "" when it maps to no line (petля, пуговица)."""
    for entry in _code_index():
        if entry["code"].lower() == str(code or "").lower():
            return entry["role"]
    return ""


def stitch_code_info(code):
    """Full record for a code from whichever table defines it."""
    for entry in _code_index():
        if entry["code"].lower() == str(code or "").lower():
            return entry
    return None


def find_stitch_operation_codes(text):
    """Return operation codes mentioned in a text label, e.g. Bt, Co2(dn3mm), L1_1mm.

    Matches are claimed longest-first and may not overlap, because the short codes are
    prefixes of the detailed ones — plain "L1" also occurs inside "L1_1mm", and reporting
    both would mean two different stitches on one label.
    """
    if not text:
        return []
    text = str(text)
    found, claimed = [], []
    for entry in _code_index():
        code = entry["code"]
        # `_` counts as part of a code, so "L1" cannot match the head of "L1_1mm".
        pattern = rf"(?<![A-Za-z0-9_]){re.escape(code)}(?![A-Za-z0-9_])"
        for m in re.finditer(pattern, text, flags=re.IGNORECASE):
            span = (m.start(), m.end())
            if any(span[0] < c[1] and c[0] < span[1] for c in claimed):
                continue
            claimed.append(span)
            found.append(code)
    return found
