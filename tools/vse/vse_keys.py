"""
VSE — Unified key computation for groups and elements.

Phase 2.1: single source of truth for group_key and elem_key formulas.
Used by both engine.py (rendering) and api_server.py (UI state).

Previously there were 4 different formulas for group_key in the codebase:
  - engine._path_data_sk        : round(width, 2) + |D suffix for diagonal orient
  - engine._group_key_for_role_and_path : parsed data_sk, dropped |D suffix
  - engine._orig_entity_group_key : round(width, 1), no orient
  - api_server._entity_group_key    : round(width, 1), no orient

A width of 1.05 became "1.05" in one place and "1.1" in another, so an override
saved from the UI (group_key from api_server) sometimes did not match the same
element during rendering (group_key from engine). The fix is one formula.

Design choices:
  - round(width, 1): the source AI widths (0.5, 0.75, 1.0, 1.5, 2.0, 3.0) are
    visually distinct at this precision. Widths like 1.05 vs 1.10 are noise
    from AI file encoding and should NOT split one visual style into two
    groups — that breaks the "one style → one role" contract of style_registry.
  - No orientation suffix: orientation is already factored into the *role*
    assignment (e.g. via classify_path), not into the visual style key.
    Adding |D to the key would split one visual style into two groups just
    because some elements are diagonal — that breaks the "one style → one role"
    contract of style_registry.json.
  - elem_key is SHA-1(node_id | path_d_prefix[:80])[:16] — already consistent
    across the codebase, but factored here so future changes happen in one place.

Legacy data in node_annotations.json written with the old formulas still works:
  - _build_node_state has a Pass 2 "fallback_matched" path that matches by
    key_strs intersection when the exact group_key does not match.
  - So old overrides migrate gracefully to the new keys as nodes are re-edited.
"""

import hashlib


def _coerce_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off", ""}:
        return False
    return bool(value)


def compute_group_key(role, stroke, fill, width, dashed):
    """Single source of truth for group_key.

    Args:
        role:   role string (e.g. "contour_outer", "stitch_edge"), or "" / None.
        stroke: normalized stroke color hex (e.g. "#1a1a1a") or "none".
        fill:   normalized fill color hex or "none".
        width:  stroke width as number (int/float/str). Will be rounded to 1 decimal.
        dashed: truthy or falsy; coerced to "true"/"false".

    Returns:
        str: "<role>|<stroke>|<fill>|<width rounded to 1>|<dashed lowercased>"
    """
    role_s = str(role or "")
    stroke_s = str(stroke or "none")
    fill_s = str(fill or "none")
    try:
        w = round(float(width), 1)
    except (TypeError, ValueError):
        w = 0.0
    dashed_s = "true" if _coerce_bool(dashed) else "false"
    return f"{role_s}|{stroke_s}|{fill_s}|{w}|{dashed_s}"


def compute_elem_key(node_id, path_d_prefix):
    """Single source of truth for elem_key.

    Args:
        node_id:        canonical node id.
        path_d_prefix:  first ~80 chars of the SVG `d` attribute (or equivalent
                        unique-per-path string). Longer values are truncated.

    Returns:
        (elem_key, prefix) tuple:
            - elem_key: 16-hex SHA-1 prefix, or "" if prefix is empty.
            - prefix:   the (possibly truncated) path_d_prefix that was hashed.
    """
    prefix = str(path_d_prefix or "")[:80]
    if not prefix:
        return "", ""
    digest = hashlib.sha1(f"{node_id}|{prefix}".encode("utf-8")).hexdigest()[:16]
    return digest, prefix
