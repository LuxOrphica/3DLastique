"""
Shared VSE role taxonomy helpers.

The intent is to keep semantic roles separate from visual presentation:
  - semantic role: what the element means in a construction node
  - visual style: how that semantic role is rendered in standardized SVG
"""

ROLE_ALIASES = {
    "выносная линия": "callout_line",
    "выноски с увеличением": "callout_zoom",
    "размерная линия": "dim_line",
    "строчка по краю": "stitch_edge",
    "соединяющая стрелка": "arrow",
    "резинка": "line_elastic",
    "мех": "line_fur",
    "mesh": "line_mesh",
    "decorative fabric": "line_decorative",
    "reflectig piping": "fill_piping",
    "reflective piping": "fill_piping",
}

SEMANTIC_LINE_ROLES = [
    "callout_line",
    "callout_zoom",
    "dim_line",
    "break_line",
    "guide_line",
    "line_reference",
    "line_elastic",
    "line_fur",
    "line_velcro",
    "line_mesh",
    "line_decorative",
    "line_photo_trace",
]

STITCH_ROLES = [
    "stitch_edge",
    "stitch_thru",
    "stitch_topstitch",
    "stitch_double",
    "stitch_hidden",
    "stitch_cover",
    "stitch_overlock",
    "stitch_zigzag",
    "stitch_L",
    "stitch_C",
    "stitch_O",
    "stitch_F",
    "stitch_Bt",
]


def normalize_role(role, valid_roles):
    value = (role or "").strip()
    if not value:
        return ""
    if value in valid_roles:
        return value
    return ROLE_ALIASES.get(value.lower(), "")


def suggest_semantic_role(row):
    """Suggest a semantic role from existing unknown-role report metadata."""
    key = row.get("key") or []
    files = " ".join(str(f).lower() for f in row.get("files", []))
    raw_role = (row.get("_role") or "").strip()
    if raw_role:
        return raw_role
    if len(key) < 11:
        return ""

    stroke, fill, width, dashed, is_line, _is_filled, is_tiny, _is_closed, near_text, orient, size = key
    stroke = (row.get("raw_stroke") or stroke or "").lower()
    fill = (row.get("raw_fill") or fill or "").lower()

    if "elastic" in files or "резин" in files:
        return "line_elastic" if is_line else "fill_tape"
    if "velcro" in files:
        return "line_velcro" if is_line else "fill_tape"
    if "fur" in files or "мех" in files:
        return "line_fur" if is_line else "fill_dark_fabric"
    if "mesh" in files:
        return "line_mesh"
    if "piping" in files:
        return "fill_piping"
    if "glue" in files or "welding" in files:
        return "fill_glue"

    if is_line and stroke in ("#d2d2d2", "#d9dad9"):
        return "line_elastic"
    if is_line and fill in ("#ffffff", "#fdfefd") and stroke in ("", "none"):
        return "line_photo_trace"
    if is_line and dashed and size in ("XS", "S") and stroke in ("#4a453e", "#56585b", "#6c6966"):
        return "line_fur"
    if is_line and dashed and stroke in ("#56585b", "#6c6966"):
        return "line_velcro"
    if is_line and stroke in ("#b9141b", "#e02020", "#c8102e"):
        return "stitch_thru" if dashed else "stitch_edge"
    if is_line and near_text and orient == "D":
        return "callout_zoom"
    if is_line and near_text and not dashed and size in ("XS", "S"):
        return "callout_line"
    return ""
