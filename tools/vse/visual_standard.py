"""
Visual Standard — ISO 128 / ISO 129 / ISO 4915 inspired style rules.
Maps semantic role → SVG presentation attributes.

Role taxonomy (updated):
  Contours:    contour_outer, construction_line, contour_hidden
  Stitches / seams: seam_line, stitch_edge, stitch_thru, stitch_Bt, stitch_symbol
  Boundaries:  boundary_fragment, boundary_interlining
  Fills/components: fill_interlining, fill_fabric, fill_shape, component_half_belt, material_sweat_band
  Hardware:    hw_zipper, hw_zipper_tape, hw_ring, hw_loop, fill_velcro, fill_velcro_hook, fill_velcro_loop
  Annotations: callout_line, callout_zoom, arrow, label
  Other:       unknown
"""

import json
import os

ROLE_STYLES = {
    # ── Контуры ──────────────────────────────────────────────────────────────
    "contour_outer": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "1.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "stroke-linejoin":  "round",
        "opacity":          "1",
        "_label": "Контур детали (ISO 128-20 type B)",
    },
    "construction_line": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "0.9",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "stroke-linejoin":  "round",
        "opacity":          "1",
        "_label": "Конструктивная линия (внутренняя)",
    },
    # ── Швы ──────────────────────────────────────────────────────────────────
    "contour_hidden": {
        "stroke":           "#8A8A8A",
        "stroke-width":     "0.65",
        "stroke-dasharray": "4 2",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "0.85",
        "_label": "Невидимый контур / hidden contour",
    },
    "seam_line": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "2.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "1",
        "_label": "Линия шва (ISO 128 type A)",
    },
    # ── Строчки (ISO 4915 / Sportmaster AW24) ────────────────────────────────
    "stitch_edge": {
        "stroke":           "#C8102E",
        "stroke-width":     "0.75",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "1",
        "_label": "Строчка по краю / торцу (видимая)",
    },
    "stitch_thru": {
        "stroke":           "#C8102E",
        "stroke-width":     "0.75",
        "stroke-dasharray": "3 1.5",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "1",
        "_label": "Строчка сквозная (через все слои)",
    },
    "stitch_Bt": {
        "stroke":           "#C8102E",
        "stroke-width":     "3.0",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "1",
        "_label": "Закрепка на спецмашине, Bt / bar tack (гребёнка)",
    },
    # Stitch types by family (SPORTMASTER Workmanship, section 5). Same stitch red;
    # families are told apart by dash/width. Visual is approximate — the code (L1/C2/…)
    # still carries the needle count and ISO.
    "stitch_lockstitch": {
        "stroke": "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "none",
        "fill": "none", "stroke-linecap": "butt", "opacity": "1",
        "_label": "Строчка челночного стежка / lockstitch",
    },
    "stitch_chainstitch": {
        "stroke": "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "5 1",
        "fill": "none", "stroke-linecap": "butt", "opacity": "1",
        "_label": "Цепной стежок / chainstitch",
    },
    "stitch_zigzag": {
        "stroke": "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "2 2",
        "fill": "none", "stroke-linecap": "butt", "opacity": "1",
        "_label": "Зигзаг / zigzag",
    },
    "stitch_coverstitch": {
        "stroke": "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "3 1.5",
        "fill": "none", "stroke-linecap": "butt", "opacity": "1",
        "_label": "Плоскошовная / coverstitch",
    },
    "stitch_flatlock": {
        "stroke": "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "4 2 1 2",
        "fill": "none", "stroke-linecap": "butt", "opacity": "1",
        "_label": "Флок / flatlock",
    },
    "stitch_overlock": {
        "stroke": "#C8102E", "stroke-width": "0.9", "stroke-dasharray": "1 1.5",
        "fill": "none", "stroke-linecap": "butt", "opacity": "1",
        "_label": "Оверлок / overlock",
    },
    "stitch_backtack": {
        # Drawn as a short thick solid bar, which is also how the source draws it. It
        # must not be thin and dashed: that reads as a through stitch, which is exactly
        # what a back tack is not.
        "stroke": "#C8102E", "stroke-width": "2.5", "stroke-dasharray": "none",
        "fill": "none", "stroke-linecap": "butt", "opacity": "1",
        "_label": "Закрепка прямой-обратной, Bc / back tack",
    },
    "stitch_symbol": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "round",
        "stroke-linejoin":  "round",
        "opacity":          "1",
        "_label": "Символ строчки / закрепки (W-форма)",
    },
    # ── Границы ──────────────────────────────────────────────────────────────
    "boundary_fragment": {
        "stroke":           "#27A6DE",
        "stroke-width":     "1.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "1",
        "_label": "Граница фрагмента",
    },
    "boundary_interlining": {
        "stroke":           "#29B473",
        "stroke-width":     "1.0",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "1",
        "_label": "Граница прокладки / флизелина (Условные обозначения РФ)",
    },
    # ── Заливки и материалы ───────────────────────────────────────────────────
    "fill_interlining": {
        "stroke":           "#888888",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#DDDDDD",
        "opacity":          "0.5",
        "_label": "Штриховка прокладки (Условные обозначения РФ)",
    },
    "fill_cord": {
        "stroke":           "#333333",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#57585B",
        "opacity":          "1",
        "_label": "Шнур / cord",
    },
    "fill_material_mask": {
        "stroke":           "none",
        "stroke-width":     "0",
        "stroke-dasharray": "none",
        "fill":             "#FFFFFF",
        "opacity":          "1",
        "_label": "Маска материала / technical occluder only",
    },
    "fill_white_detail": {
        "stroke":           "none",
        "stroke-width":     "0",
        "stroke-dasharray": "none",
        "fill":             "#FFFFFF",
        "opacity":          "1",
        "_label": "Visible white detail / front white face",
    },
    "fill_fabric": {
        "stroke":           "#AAAAAA",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#F0EDE8",
        "opacity":          "0.6",
        "_label": "Штриховка ткани (Условные обозначения РФ)",
    },
    "fill_fabric_gray": {
        "stroke":           "#888888",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#BDBDBD",
        "opacity":          "0.6",
        "_label": "Серая ткань / нейтральная заливка",
    },
    "fill_dark_fabric": {
        "stroke":           "#888888",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#555555",
        "opacity":          "0.62",
        "_label": "Темная ткань / темная деталь",
    },
    "fill_contrast": {
        "stroke":           "#B54422",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#E56B5D",
        "opacity":          "0.62",
        "_label": "Контрастная деталь / контрастная заливка",
    },
    "fill_tape": {
        "stroke":           "#777777",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#D9D5C8",
        "opacity":          "0.65",
        "_label": "Тесьма / лента",
    },
    "fill_elastic": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "1.0",
        "stroke-dasharray": "none",
        "fill":             "#8F9092",
        "opacity":          "1",
        "_label": "Резинка / elastic band",
    },
    "material_sweat_band": {
        "stroke":           "#666666",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#D6D0C2",
        "opacity":          "0.72",
        "_label": "Внутренняя поясная лента / sweat band",
    },
    "component_half_belt": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "0.75",
        "stroke-dasharray": "none",
        "fill":             "#8F9092",
        "opacity":          "0.85",
        "_label": "Полупояс / регулировочный хлястик",
    },
    "component_visor": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "1.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "stroke-linejoin":  "round",
        "opacity":          "1",
        "_label": "Козырёк / visor",
    },
    "fill_velcro": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "0.75",
        "stroke-dasharray": "none",
        "fill":             "#A8A8A8",
        "opacity":          "1",
        "_label": "Липучка / velcro (не уточнено)",
    },
    "fill_velcro_hook": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "0.75",
        "stroke-dasharray": "none",
        "fill":             "#8A8A8A",
        "opacity":          "1",
        "_label": "Липучка: крючковая часть / Velcro hook",
    },
    "fill_velcro_loop": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "0.75",
        "stroke-dasharray": "none",
        "fill":             "#C2C2C2",
        "opacity":          "1",
        "_label": "Липучка: петельная часть / Velcro loop",
    },
    "fill_pu_tape": {
        "stroke":           "#6B6B6B",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#CAC2B8",
        "opacity":          "0.68",
        "_label": "PU tape / полиуретановая лента",
    },
    "fill_piping": {
        "stroke":           "#9B741B",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#F4C66D",
        "opacity":          "0.7",
        "_label": "Кант / piping",
    },
    "fill_glue": {
        "stroke":           "#7E6A3A",
        "stroke-width":     "0.5",
        "stroke-dasharray": "3 2",
        "fill":             "#E8DAA8",
        "opacity":          "0.55",
        "_label": "Клеевая зона / glue",
    },
    "fill_shape": {
        "stroke":           "#CCCCCC",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "#E8E8E8",
        "opacity":          "0.7",
        "_label": "Заливка конструктивного элемента",
    },
    # ── Фурнитура ─────────────────────────────────────────────────────────────
    "hw_zipper": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "1.2",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "square",
        "opacity":          "1",
        "_label": "Молния",
    },
    "hw_zipper_tape": {
        "stroke":           "#1D1C1A",
        "stroke-width":     "1.0",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "square",
        "opacity":          "1",
        "_label": "Молния",
    },
    "hw_ring": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "6.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "round",
        "stroke-linejoin":  "round",
        "opacity":          "1",
        "_label": "Кольцо / D-ring / Loop",
    },
    "hw_loop": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "4.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "round",
        "stroke-linejoin":  "round",
        "opacity":          "1",
        "_label": "Петля / рамка",
    },
    "hw_buckle": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "1.5",
        "stroke-dasharray": "none",
        "fill":             "#3A3A3A",
        "stroke-linecap":   "butt",
        "stroke-linejoin":  "round",
        "opacity":          "1",
        "_label": "Пряжка / buckle",
    },
    # ── Аннотации ─────────────────────────────────────────────────────────────
    "break_line": {
        "stroke":           "#1A1A1A",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "1",
        "_label": "Линия обрыва (ГОСТ 2.303)",
    },
    "callout_line": {
        "stroke":           "#333333",
        "stroke-width":     "0.6",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "0.9",
        "_label": "Линия-выноска (ISO 129-1)",
    },
    "callout_zoom": {
        "stroke":           "#1B4FA8",
        "stroke-width":     "0.75",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "butt",
        "opacity":          "0.9",
        "_label": "Выноска к увеличенному фрагменту",
    },
    "line_elastic": {
        "stroke":           "#8A8A8A",
        "stroke-width":     "0.75",
        "stroke-dasharray": "2 2",
        "fill":             "none",
        "stroke-linecap":   "round",
        "opacity":          "1",
        "_label": "Резинка / эластичная линия",
    },
    "line_fur": {
        "stroke":           "#4A453E",
        "stroke-width":     "0.65",
        "stroke-dasharray": "1 2",
        "fill":             "none",
        "stroke-linecap":   "round",
        "opacity":          "1",
        "_label": "Мех / ворсовая линия",
    },
    "line_gathered_edge": {
        "stroke":           "#777777",
        "stroke-width":     "0.45",
        "stroke-dasharray": "none",
        "fill":             "none",
        "stroke-linecap":   "round",
        "stroke-linejoin":  "round",
        "opacity":          "0.75",
        "_label": "Мятый / сборенный край материала",
    },
    "arrow": {
        "stroke":           "none",
        "stroke-width":     "0",
        "stroke-dasharray": "none",
        "fill":             "#1A1A1A",
        "opacity":          "1",
        "_label": "Стрелка (ISO 129-1 type B)",
    },
    "label": {
        "font-family":      "Arial, sans-serif",
        "font-size":        "8",
        "fill":             "#1A1A1A",
        "opacity":          "1",
        "_label": "Текстовая подпись (ISO 3098-2)",
    },
    "unknown": {
        "stroke":           "#AAAAAA",
        "stroke-width":     "0.5",
        "stroke-dasharray": "none",
        "fill":             "none",
        "opacity":          "0.5",
        "_label": "Не классифицировано",
    },
}


# ── User overrides ───────────────────────────────────────────────────────────
# ROLE_STYLES above stays the shipped default. Anything the user changes in the UI is
# written to role_style_overrides.json and layered on top, so a role can always be put
# back to the standard by dropping its entry.
_OVERRIDES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "role_style_overrides.json")
_EDITABLE_KEYS = ("stroke", "fill", "stroke-width", "stroke-dasharray", "opacity")
_overrides_cache = None
_overrides_mtime = None


def load_style_overrides():
    """Read the override file, re-reading it whenever it changes on disk."""
    global _overrides_cache, _overrides_mtime
    try:
        mtime = os.path.getmtime(_OVERRIDES_PATH)
    except OSError:
        _overrides_cache, _overrides_mtime = {}, None
        return {}
    if _overrides_cache is not None and mtime == _overrides_mtime:
        return _overrides_cache
    try:
        with open(_OVERRIDES_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        data = {}
    if not isinstance(data, dict):
        data = {}
    clean = {}
    for role, attrs in data.items():
        if role in ROLE_STYLES and isinstance(attrs, dict):
            picked = {k: str(v) for k, v in attrs.items() if k in _EDITABLE_KEYS and v not in (None, "")}
            if picked:
                clean[role] = picked
    _overrides_cache, _overrides_mtime = clean, mtime
    return clean


def save_style_overrides(data):
    """Persist role style overrides; returns the cleaned dict that was written."""
    global _overrides_cache, _overrides_mtime
    clean = {}
    for role, attrs in (data or {}).items():
        if role in ROLE_STYLES and isinstance(attrs, dict):
            picked = {k: str(v) for k, v in attrs.items() if k in _EDITABLE_KEYS and v not in (None, "")}
            if picked:
                clean[role] = picked
    with open(_OVERRIDES_PATH, "w", encoding="utf-8") as fh:
        json.dump(clean, fh, ensure_ascii=False, indent=2)
    _overrides_cache = clean
    try:
        _overrides_mtime = os.path.getmtime(_OVERRIDES_PATH)
    except OSError:
        _overrides_mtime = None
    return clean


def default_style(role):
    """The shipped style for a role, ignoring user overrides."""
    raw = ROLE_STYLES.get(role, ROLE_STYLES["unknown"])
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def get_style(role):
    """Return presentation attrs dict for a role (without private _label key)."""
    raw = ROLE_STYLES.get(role, ROLE_STYLES["unknown"])
    style = {k: v for k, v in raw.items() if not k.startswith("_")}
    style.update(load_style_overrides().get(role, {}))
    return style


def style_attr(role):
    """Return SVG style string for inline use."""
    attrs = get_style(role)
    parts = []
    for k, v in attrs.items():
        if k in ("font-family", "font-size"):
            continue  # handled separately for text
        parts.append(f"{k}:{v}")
    return ";".join(parts)
