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


def find_stitch_operation_codes(text):
    """Return operation codes mentioned in a text label, e.g. Bt, Bc, F4."""
    if not text:
        return []
    codes = load_stitch_operation_codes()
    found = []
    for code in codes:
        pattern = rf"(?<![A-Za-z0-9]){re.escape(code)}(?![A-Za-z0-9])"
        if re.search(pattern, str(text), flags=re.IGNORECASE):
            found.append(code)
    return found
