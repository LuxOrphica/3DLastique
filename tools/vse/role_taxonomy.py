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
    "невидимый контур": "contour_hidden",
    "пунктир": "contour_hidden",
    "штриховая линия": "contour_hidden",
    "строчка по краю": "stitch_edge",
    "соединяющая стрелка": "arrow",
    "резинка": "line_elastic",
    "мех": "line_fur",
    "меховая заливка": "fill_fur",
    "градиент": "fill_gradient",
    "градиентная заливка": "fill_gradient",
    "тень": "fill_shadow",
    "теневая заливка": "fill_shadow",
    "mesh": "line_mesh",
    "decorative fabric": "line_decorative",
    "reflectig piping": "fill_piping",
    "reflective piping": "fill_piping",
    "gradient": "fill_gradient",
    "gradient fill": "fill_gradient",
    "shading": "fill_gradient",
    "shadow": "fill_shadow",
    "fur fill": "fill_fur",
    "hidden contour": "contour_hidden",
    "dashed contour": "contour_hidden",
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
    "line_gathered_edge",
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

CONTOUR_ROLES = [
    "contour_outer",
    "contour_fold",
    "contour_cut",
    "contour_hidden",
]

FILL_EFFECT_ROLES = [
    "fill_gradient",
    "fill_fur",
    "fill_shadow",
]


def normalize_role(role, valid_roles):
    value = (role or "").strip()
    if not value:
        return ""
    if value in valid_roles:
        return value
    return ROLE_ALIASES.get(value.lower(), "")


def _hex_rgb(value):
    if not value or not isinstance(value, str):
        return None
    value = value.strip().lower()
    if not value.startswith("#") or len(value) != 7:
        return None
    try:
        return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))
    except ValueError:
        return None


def _is_grayish(value):
    rgb = _hex_rgb(value)
    if not rgb:
        return False
    r, g, b = rgb
    return max(rgb) - min(rgb) <= 18 and 70 <= (r + g + b) / 3 <= 235


def _is_brownish(value):
    rgb = _hex_rgb(value)
    if not rgb:
        return False
    r, g, b = rgb
    return r >= g >= b and r >= 95 and b <= 155


def _is_neutral_gray(value):
    rgb = _hex_rgb(value)
    if not rgb:
        return False
    r, g, b = rgb
    avg = (r + g + b) / 3
    return max(rgb) - min(rgb) <= 28 and 55 <= avg <= 190


def suggest_semantic_role(row):
    """Suggest a semantic role from existing unknown-role report metadata."""
    key = row.get("key") or []
    files = " ".join(str(f).lower() for f in row.get("files", []))
    raw_role = (row.get("_role") or "").strip()
    if raw_role:
        return raw_role
    if len(key) < 11:
        return ""

    stroke, fill, width, dashed, is_line, is_filled, is_tiny, _is_closed, near_text, orient, size = key
    stroke = (row.get("raw_stroke") or stroke or "").lower()
    fill = (row.get("raw_fill") or fill or "").lower()

    if "elastic" in files or "резин" in files:
        return "line_elastic" if is_line else "fill_tape"
    if "velcro" in files:
        if is_line:
            return "line_velcro"
        return "fill_shadow" if _is_grayish(fill) else "fill_tape"
    if "fur" in files or "мех" in files or "fh0" in files:
        if is_line:
            return "line_fur"
        return "fill_fur" if _is_brownish(fill) else "fill_gradient"
    if "mesh" in files:
        return "line_mesh"
    if "piping" in files:
        return "fill_piping"
    if "glue" in files or "welding" in files:
        return "fill_glue"

    if is_filled and _is_grayish(fill) and any(token in files for token in ("buckle", "patch", "snap", "button")):
        return "fill_shadow"
    if is_filled and _is_brownish(fill) and any(token in files for token in ("fur", "fh0")):
        return "fill_fur"

    if is_line and stroke in ("#d2d2d2", "#d9dad9"):
        return "line_elastic"
    if is_line and fill in ("#ffffff", "#fdfefd") and stroke in ("", "none"):
        return "line_photo_trace"
    if is_line and dashed and _is_neutral_gray(stroke):
        return "contour_hidden"
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
