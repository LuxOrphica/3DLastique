import { useState, useEffect, useMemo, useRef } from "react";
import "./VseReview.css";

const ROLE_STYLES = {
  // Контуры
  contour_outer:       { stroke: "#1A1A1A", "stroke-width": "1.5",  "stroke-dasharray": "none" },
  contour_fold:        { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "8 3 2 3" },
  contour_cut:         { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  contour_hidden:      { stroke: "#8A8A8A", "stroke-width": "0.65", "stroke-dasharray": "4 2" },
  // РЁРІС‹
  seam_line:           { stroke: "#1A1A1A", "stroke-width": "2.5",  "stroke-dasharray": "none" },
  seam_allowance:      { stroke: "#555555", "stroke-width": "0.5",  "stroke-dasharray": "4 2" },
  // Строчки (ISO 4915 / Sportmaster AW24)
  stitch_edge:         { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "none" },
  stitch_thru:         { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "3 1.5" },
  stitch_topstitch:    { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "none" },
  stitch_double:       { stroke: "#C8102E", "stroke-width": "1.0",  "stroke-dasharray": "1 2" },
  stitch_hidden:       { stroke: "#C8102E", "stroke-width": "0.65", "stroke-dasharray": "5 3" },
  stitch_cover:        { stroke: "#C8102E", "stroke-width": "1.1",  "stroke-dasharray": "4 1 1 1" },
  stitch_overlock:     { stroke: "#C8102E", "stroke-width": "1.0",  "stroke-dasharray": "2 1 2 1" },
  stitch_L:            { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "3 1.5" },
  stitch_C:            { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "1 1.5" },
  stitch_O:            { stroke: "#C8102E", "stroke-width": "1.0",  "stroke-dasharray": "2 1 2 1" },
  stitch_F:            { stroke: "#C8102E", "stroke-width": "1.2",  "stroke-dasharray": "4 1 1 1 4 1" },
  stitch_zigzag:       { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "2 0.5" },
  stitch_Bt:           { stroke: "#C8102E", "stroke-width": "3.0",  "stroke-dasharray": "none" },
  // Границы
  boundary_fragment:   { stroke: "#27A6DE", "stroke-width": "1.5",  "stroke-dasharray": "none" },
  boundary_zone:       { stroke: "#1B4FA8", "stroke-width": "0.75", "stroke-dasharray": "6 3" },
  boundary_lining:     { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "6 2" },
  boundary_interlining:{ stroke: "#29B473", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  // Заливки и материалы
  fill_interlining:    { stroke: "#888888", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_fabric:         { stroke: "#AAAAAA", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_fabric_gray:    { stroke: "#888888", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_dark_fabric:    { stroke: "#444444", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_contrast:       { stroke: "#B54422", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_tape:           { stroke: "#777777", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_binding:        { stroke: "#B8763A", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_elastic:        { stroke: "#666666", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_cord:           { stroke: "#333333", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_velcro:         { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  fill_material_mask:  { stroke: "none",    "stroke-width": "0",    "stroke-dasharray": "none" },
  fill_white_detail:   { stroke: "none",    "stroke-width": "0",    "stroke-dasharray": "none" },
  fill_pu_tape:        { stroke: "#6B6B6B", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_piping:         { stroke: "#9B741B", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_glue:           { stroke: "#7E6A3A", "stroke-width": "0.5",  "stroke-dasharray": "3 2" },
  fill_gradient:       { stroke: "#777777", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_fur:            { stroke: "#6B4A2E", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_shadow:         { stroke: "#6F6F6F", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_pink_light:     { stroke: "#C785A8", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_pink_dark:      { stroke: "#9A4A73", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  construction_aux:    { stroke: "#555555", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_shape:          { stroke: "#CCCCCC", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  // Фурнитура
  hw_zipper:           { stroke: "#1A1A1A", "stroke-width": "1.2",  "stroke-dasharray": "none" },
  hw_zipper_tape:      { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  hw_zipper_tape_edge: { stroke: "#333333", "stroke-width": "0.65", "stroke-dasharray": "none" },
  hw_buckle_fill:      { stroke: "none",    "stroke-width": "0",    "stroke-dasharray": "none" },
  hw_buckle:           { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "none" },
  hw_ring:             { stroke: "#1A1A1A", "stroke-width": "6.5",  "stroke-dasharray": "none" },
  hw_button:           { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  hw_snap:             { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  hw_other:            { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  // Аннотации
  callout_line:        { stroke: "#333333", "stroke-width": "0.6",  "stroke-dasharray": "none" },
  callout_zoom:        { stroke: "#1B4FA8", "stroke-width": "0.75", "stroke-dasharray": "none" },
  break_line:          { stroke: "#999999", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  dim_line:            { stroke: "#333333", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  guide_line:          { stroke: "#777777", "stroke-width": "0.5",  "stroke-dasharray": "4 2" },
  line_reference:      { stroke: "#555555", "stroke-width": "0.5",  "stroke-dasharray": "2 2" },
  line_elastic:        { stroke: "#8A8A8A", "stroke-width": "0.75", "stroke-dasharray": "2 2" },
  line_fur:            { stroke: "#4A453E", "stroke-width": "0.65", "stroke-dasharray": "1 2" },
  line_velcro:         { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "none" },
  line_mesh:           { stroke: "#555555", "stroke-width": "0.5",  "stroke-dasharray": "1 2" },
  line_decorative:     { stroke: "#1B4FA8", "stroke-width": "0.75", "stroke-dasharray": "none" },
  line_photo_trace:    { stroke: "#AAAAAA", "stroke-width": "0.5",  "stroke-dasharray": "2 2" },
  line_gathered_edge:  { stroke: "#777777", "stroke-width": "0.45", "stroke-dasharray": "none" },
  arrow:               { stroke: "#333333", "stroke-width": "0.6",  "stroke-dasharray": "none" },
  stitch_symbol:       { stroke: "#1A1A1A", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  // Прочее
  unknown:             { stroke: "#999999", "stroke-width": "0.5",  "stroke-dasharray": "none" },
};

const ROLE_GROUPS = [
  { label: "— не назначено —", roles: ["?"] },
  { label: "Контуры",          roles: ["contour_outer", "contour_fold", "contour_cut", "contour_hidden"] },
  { label: "РЁРІС‹",              roles: ["seam_line", "seam_allowance"] },
  { label: "Строчки",          roles: ["stitch_edge", "stitch_thru", "stitch_topstitch", "stitch_double", "stitch_hidden", "stitch_cover", "stitch_overlock", "stitch_zigzag", "stitch_L", "stitch_C", "stitch_O", "stitch_F", "stitch_Bt", "stitch_symbol"] },
  { label: "Слои и зоны",           roles: ["boundary_fragment", "boundary_zone", "boundary_lining", "boundary_interlining"] },
  { label: "Заливки",          roles: ["fill_interlining", "fill_fabric", "fill_fabric_gray", "fill_dark_fabric", "fill_contrast", "fill_tape", "fill_binding", "fill_elastic", "fill_cord", "fill_velcro", "fill_material_mask", "fill_pu_tape", "fill_piping", "fill_glue", "fill_pink_light", "fill_pink_dark", "construction_aux", "fill_shape"] },
  { label: "Фурнитура",        roles: ["hw_zipper", "hw_zipper_tape", "hw_zipper_tape_edge", "hw_buckle", "hw_buckle_fill", "hw_ring", "hw_button", "hw_buttonhole", "hw_snap", "hw_other"] },
  { label: "Выноски",          roles: ["callout_line", "callout_zoom", "dim_line", "arrow"] },
  { label: "Смысловые линии",  roles: ["guide_line", "line_reference", "line_elastic", "line_fur", "line_velcro", "line_mesh", "line_decorative", "line_photo_trace", "line_gathered_edge", "break_line"] },
  { label: "Прочее",           roles: ["unknown", "_skip"] },
];

ROLE_GROUPS.splice(6, 0, { label: "Эффекты заливки", roles: ["fill_gradient", "fill_fur", "fill_shadow"] });

const ROLES = ROLE_GROUPS.flatMap(g => g.roles);

const ROLE_LABELS = {
  "?":                   "— не назначено —",
  // Контуры
  "contour_outer":       "Контур детали",
  "contour_fold":        "Линия сгиба",
  "contour_cut":         "Линия разреза",
  "contour_hidden":      "Невидимый контур / пунктир",
  // РЁРІС‹
  "seam_line":           "Линия шва",
  "seam_allowance":      "Припуск на шов",
  // Строчки
  "stitch_edge":         "Строчка по краю",
  "stitch_thru":         "Строчка сквозная",
  "stitch_topstitch":    "Отделочная строчка / topstitch",
  "stitch_double":       "Двойная строчка",
  "stitch_hidden":       "Скрытая / потайная строчка",
  "stitch_cover":        "Распошивальная / cover stitch",
  "stitch_overlock":     "Оверлочная строчка",
  "stitch_L":            "Челночная L (ISO 301)",
  "stitch_C":            "Цепная C (ISO 401)",
  "stitch_O":            "Оверлок O (ISO 504/514)",
  "stitch_F":            "Распошивалка F (ISO 602/605)",
  "stitch_zigzag":       "Зигзаг",
  "stitch_Bt":           "Закрепка / bar tack (Bc/Bt)",
  // Границы
  "boundary_fragment":   "Прокладка (Padding)",
  "boundary_zone":       "Конструктивная зона",
  "boundary_lining":     "Подкладка (Lining)",
  "boundary_interlining":"Флизелин (Interlining)",
  // Заливки
  "fill_interlining":    "Штриховка прокладки",
  "fill_fabric":         "Штриховка ткани",
  "fill_fabric_gray":    "Серая ткань / нейтральная заливка",
  "fill_dark_fabric":    "Темная ткань / темная деталь",
  "fill_contrast":       "Контрастная деталь",
  "fill_tape":           "Тесьма / лента",
  "fill_binding":        "Окантовка / binding",
  "fill_elastic":        "Резинка / elastic band",
  "fill_cord":           "Шнур / cord",
  "fill_velcro":         "Велкро / velcro",
  "fill_material_mask":  "Маска материала",
  "fill_pu_tape":        "PU tape / полиуретановая лента",
  "fill_piping":         "Кант / piping",
  "fill_glue":           "Клеевая зона / glue",
  "fill_pink_light":     "Светлая розовая заливка",
  "fill_pink_dark":      "Темная розово-фиолетовая заливка",
  "construction_aux":    "Вспомогательная линия",
  "fill_shape":          "Заливка (прочее)",
  // Фурнитура
  "hw_zipper":           "Молния",
  "hw_zipper_tape":      "Молния",
  "hw_zipper_tape_edge": "Контур тесьмы молнии",
  "hw_buckle":           "Пряжка",
  "hw_buckle_fill":      "Заливка пряжки",
  "hw_button":           "Пуговица (Button, Bs)",
  "hw_buttonhole":       "Петля (Buttonhole, Bh)",
  "hw_snap":             "Кнопка / люверс",
  "hw_other":            "Фурнитура (прочее)",
  // Аннотации
  "callout_line":        "Выноска",
  "callout_zoom":        "Выноска к увеличению",
  "break_line":          "Линия обрыва",
  "dim_line":            "Размерная линия",
  "guide_line":          "Вспомогательная направляющая",
  "line_reference":      "Справочная смысловая линия",
  "line_elastic":        "Резинка / эластичная линия",
  "line_fur":            "Мех / ворсовая линия",
  "line_velcro":         "Обводка липучки / Velcro outline",
  "line_mesh":           "Сетка / mesh",
  "line_decorative":     "Декоративная линия",
  "line_photo_trace":    "Линия с фото / неуверенная",
  "line_gathered_edge":  "Мятый / сборенный край материала",
  "arrow":               "Стрелка",
  "stitch_symbol":       "Символ строчки (vvvv)",
  // Прочее
  "unknown":             "Неизвестно",
  "_skip":               "— не выводить —",
};

const ROLE_GROUP_LABELS = {
  "— РЅРµ назначено —": "— не назначено —",
  "Контуры": "Контуры",
  "РЁРІС‹": "Швы",
  "Строчки": "Строчки",
  "Слои Рё Р·РѕРЅС‹": "Слои и зоны",
  "Заливки": "Заливки",
  "Эффекты заливки": "Эффекты заливки",
  "Фурнитура": "Фурнитура",
  "Выноски": "Выноски",
  "Смысловые линии": "Смысловые линии",
  "Прочее": "Прочее",
};

const ROLE_LABELS_CLEAN = {
  "?": "— не назначено —",
  contour_outer: "Контур детали",
  contour_fold: "Линия сгиба",
  contour_cut: "Линия разреза",
  contour_hidden: "Невидимый контур / пунктир",
  seam_line: "Линия шва",
  seam_allowance: "Припуск на шов",
  stitch_edge: "Строчка по краю",
  stitch_thru: "Сквозная строчка",
  stitch_topstitch: "Отделочная строчка / topstitch",
  stitch_double: "Двойная строчка",
  stitch_hidden: "Скрытая / потайная строчка",
  stitch_cover: "Распошивальная / cover stitch",
  stitch_overlock: "Оверлочная строчка",
  stitch_L: "Челночная L (ISO 301)",
  stitch_C: "Цепная C (ISO 401)",
  stitch_O: "Оверлок O (ISO 504/514)",
  stitch_F: "Распошивальная F (ISO 602/605)",
  stitch_zigzag: "Зигзаг",
  stitch_Bt: "Закрепка / bar tack (Bc/Bt)",
  boundary_fragment: "Прокладка / padding",
  boundary_zone: "Конструктивная зона",
  boundary_lining: "Подкладка / lining",
  boundary_interlining: "Флизелин / interlining",
  fill_interlining: "Штриховка прокладки",
  fill_fabric: "Штриховка ткани",
  fill_fabric_gray: "Серая ткань / нейтральная заливка",
  fill_dark_fabric: "Темная ткань / темная деталь",
  fill_contrast: "Контрастная деталь",
  fill_tape: "Тесьма / лента",
  fill_binding: "Окантовка / binding",
  fill_elastic: "Резинка / elastic band",
  fill_cord: "Шнур / cord",
  fill_material_mask: "Маска материала",
  fill_pu_tape: "PU tape / полиуретановая лента",
  fill_piping: "Кант / piping",
  fill_glue: "Клеевая зона / glue",
  fill_gradient: "Градиентная заливка / shading",
  fill_fur: "Меховая градиентная заливка / fur fill",
  fill_shadow: "Теневая / металлическая градиентная заливка",
  fill_pink_light: "Светлая розовая заливка",
  fill_pink_dark: "Темная розово-фиолетовая заливка",
  construction_aux: "Вспомогательная линия",
  fill_shape: "Заливка / прочее",
  hw_zipper: "Молния",
  hw_zipper_tape: "Тесьма молнии",
  hw_zipper_tape_edge: "Контур тесьмы молнии",
  hw_buckle: "Пряжка / buckle",
  hw_buckle_fill: "Заливка пряжки",
  hw_button: "Пуговица / button",
  hw_buttonhole: "Петля / buttonhole",
  hw_snap: "Кнопка / люверс",
  hw_other: "Фурнитура / прочее",
  callout_line: "Выноска",
  callout_zoom: "Выноска к увеличению",
  break_line: "Линия обрыва",
  dim_line: "Размерная линия",
  guide_line: "Вспомогательная направляющая",
  line_reference: "Справочная смысловая линия",
  line_elastic: "Резинка / эластичная линия",
  line_fur: "Мех / ворсовая линия",
  line_velcro: "Обводка липучки / Velcro outline",
  line_mesh: "Сетка / mesh",
  line_decorative: "Декоративная линия",
  line_photo_trace: "Линия с фото / неуверенная",
  line_gathered_edge: "Мятый / сборенный край материала",
  arrow: "Стрелка",
  stitch_symbol: "Символ строчки",
  unknown: "Неизвестно",
  _skip: "— не выводить —",
};

const ROLE_GROUPS_UI = [
  { label: "— не назначено —", roles: ["?"] },
  { label: "Контуры", roles: ["contour_outer", "contour_fold", "contour_cut", "contour_hidden"] },
  { label: "Швы", roles: ["seam_line", "seam_allowance"] },
  { label: "Строчки", roles: ["stitch_edge", "stitch_thru", "stitch_topstitch", "stitch_double", "stitch_hidden", "stitch_cover", "stitch_overlock", "stitch_zigzag", "stitch_L", "stitch_C", "stitch_O", "stitch_F", "stitch_Bt"] },
  { label: "Слои и зоны", roles: ["boundary_fragment", "boundary_zone", "boundary_lining", "boundary_interlining"] },
{ label: "Заливки", roles: ["fill_interlining", "fill_fabric", "fill_fabric_gray", "fill_dark_fabric", "fill_contrast", "fill_tape", "fill_binding", "fill_elastic", "fill_cord", "fill_velcro", "fill_material_mask", "fill_pu_tape", "fill_piping", "fill_glue", "fill_pink_light", "fill_pink_dark", "construction_aux", "fill_shape"] },
  { label: "Эффекты заливки", roles: ["fill_gradient", "fill_fur", "fill_shadow"] },
  { label: "Фурнитура", roles: ["hw_zipper", "hw_zipper_tape", "hw_zipper_tape_edge", "hw_buckle", "hw_buckle_fill", "hw_ring", "hw_button", "hw_buttonhole", "hw_snap", "hw_other"] },
  { label: "Выноски", roles: ["callout_line", "callout_zoom", "dim_line", "arrow", "stitch_symbol"] },
  { label: "Смысловые линии", roles: ["guide_line", "line_reference", "line_elastic", "line_fur", "line_velcro", "line_mesh", "line_decorative", "line_photo_trace", "line_gathered_edge", "break_line"] },
  { label: "Прочее", roles: ["unknown", "_skip"] },
];

const ROLE_LABELS_UI = {
  "?": "— не назначено —",
  contour_outer: "Контур детали",
  contour_fold: "Линия сгиба",
  contour_cut: "Линия разреза",
  contour_hidden: "Невидимый контур / пунктир",
  seam_line: "Линия шва",
  seam_allowance: "Припуск на шов",
  stitch_edge: "Строчка по краю",
  stitch_thru: "Сквозная строчка",
  stitch_topstitch: "Отделочная строчка / topstitch",
  stitch_double: "Двойная строчка",
  stitch_hidden: "Скрытая / потайная строчка",
  stitch_cover: "Распошивальная / cover stitch",
  stitch_overlock: "Оверлочная строчка",
  stitch_L: "Челночная L (ISO 301)",
  stitch_C: "Цепная C (ISO 401)",
  stitch_O: "Оверлок O (ISO 504/514)",
  stitch_F: "Распошивальная F (ISO 602/605)",
  stitch_zigzag: "Зигзаг",
  stitch_Bt: "Закрепка / bar tack (Bc/Bt)",
  boundary_fragment: "Прокладка / padding",
  boundary_zone: "Конструктивная зона",
  boundary_lining: "Подкладка / lining",
  boundary_interlining: "Флизелин / interlining",
  fill_interlining: "Штриховка прокладки",
  fill_fabric: "Штриховка ткани",
  fill_fabric_gray: "Серая ткань / нейтральная заливка",
  fill_dark_fabric: "Темная ткань / темная деталь",
  fill_contrast: "Контрастная деталь",
  fill_tape: "Тесьма / лента",
  fill_binding: "Окантовка / binding",
  fill_elastic: "Резинка / elastic band",
  fill_cord: "Шнур / cord",
  fill_material_mask: "Маска материала",
  fill_pu_tape: "PU tape / полиуретановая лента",
  fill_piping: "Кант / piping",
  fill_glue: "Клеевая зона / glue",
  fill_gradient: "Градиентная заливка / shading",
  fill_fur: "Меховая градиентная заливка / fur fill",
  fill_shadow: "Теневая / металлическая градиентная заливка",
  fill_pink_light: "Светлая розовая заливка",
  fill_pink_dark: "Темная розово-фиолетовая заливка",
  construction_aux: "Вспомогательная линия",
  fill_shape: "Заливка / прочее",
  hw_zipper: "Молния",
  hw_zipper_tape: "Тесьма молнии",
  hw_zipper_tape_edge: "Контур тесьмы молнии",
  hw_buckle: "Пряжка / buckle",
  hw_buckle_fill: "Заливка пряжки",
  hw_button: "Пуговица / button",
  hw_buttonhole: "Петля / buttonhole",
  hw_snap: "Кнопка / люверс",
  hw_other: "Фурнитура / прочее",
  callout_line: "Выноска",
  callout_zoom: "Выноска к увеличению",
  break_line: "Линия обрыва",
  dim_line: "Размерная линия",
  guide_line: "Вспомогательная направляющая",
  line_reference: "Справочная смысловая линия",
  line_elastic: "Резинка / эластичная линия",
  line_fur: "Мех / ворсовая линия",
  line_velcro: "Обводка липучки / Velcro outline",
  line_mesh: "Сетка / mesh",
  line_decorative: "Декоративная линия",
  line_photo_trace: "Линия с фото / неуверенная",
  line_gathered_edge: "Мятый / сборенный край материала",
  arrow: "Стрелка",
  stitch_symbol: "Символ строчки",
  unknown: "Неизвестно",
  _skip: "— не выводить —",
};

const roleLabel = role => ROLE_LABELS_UI[role] || role;

for (const groups of [ROLE_GROUPS, ROLE_GROUPS_UI]) {
  const fillGroup = groups.find(group => Array.isArray(group.roles) && group.roles.includes("fill_material_mask"));
  if (fillGroup && !fillGroup.roles.includes("fill_white_detail")) {
    fillGroup.roles.splice(fillGroup.roles.indexOf("fill_material_mask") + 1, 0, "fill_white_detail");
  }
}

ROLE_LABELS.fill_white_detail = "Видимая белая деталь";
ROLE_LABELS_CLEAN.fill_white_detail = "Видимая белая деталь";
ROLE_LABELS_UI.fill_white_detail = "Видимая белая деталь";

function RoleOptions() {
  return ROLE_GROUPS_UI.map(g => (
    <optgroup key={g.label} label={g.label}>
      {g.roles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
    </optgroup>
  ));
}

function LineSwatch({ color, width, dashed }) {
  if (!color || color === "none") return <span className="vse-swatch-empty" />;
  const w = Math.max(parseFloat(width) || 0.5, 0.5);
  return (
    <svg width="60" height="14" style={{ verticalAlign: "middle" }}>
      <line x1="2" y1="7" x2="58" y2="7"
        stroke={color} strokeWidth={w}
        strokeDasharray={dashed ? "4 2" : undefined} />
    </svg>
  );
}

function ColorDot({ hex }) {
  if (!hex || hex === "none") return <span className="vse-swatch-empty" />;
  return <span className="vse-color-dot" style={{ background: hex }} />;
}

// Resolve effective stroke/fill walking up ancestor <g> elements
function resolveAttr(el, attr) {
  let cur = el;
  while (cur && cur.tagName !== "svg") {
    const style = cur.getAttribute("style") || "";
    const re = new RegExp("(?:^|;)\\s*" + attr + "\\s*:\\s*([^;]+)");
    const m = style.match(re);
    if (m) return m[1].trim();
    const direct = cur.getAttribute(attr);
    if (direct) return direct.trim();
    cur = cur.parentElement;
  }
  return null;
}

function normalizeHex(s) {
  if (!s) return "";
  s = s.trim().toLowerCase();
  if (s === "none" || s === "transparent") return "none";
  if (/^#[0-9a-f]{3}$/.test(s))
    s = "#" + s[1]+s[1]+s[2]+s[2]+s[3]+s[3];
  return s;
}

function hexDistance(a, b) {
  if (!a || !b || a === "none" || b === "none") return 999;
  const parse = h => [
    parseInt(h.slice(1,3),16),
    parseInt(h.slice(3,5),16),
    parseInt(h.slice(5,7),16),
  ];
  try {
    const [r1,g1,b1] = parse(a);
    const [r2,g2,b2] = parse(b);
    return Math.abs(r1-r2) + Math.abs(g1-g2) + Math.abs(b1-b2);
  } catch { return 999; }
}

function applyHighlight(container, targetColor, targetWidth, mode, targetRole, keyStrs) {
  const els = [...container.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
    .filter(el => !el.closest("defs"));
  els.forEach(el => {
    let match = false;
    // Always use data-role for matching — both orig and std SVGs carry the attribute.
    // This ensures the same semantic elements are highlighted in both panels.
    if (targetRole) {
      match = !!el.closest(`[data-role="${targetRole}"]`);
    } else if (keyStrs && keyStrs.length > 0) {
      const sk = el.getAttribute("data-sk");
      match = sk != null && keyStrs.includes(sk);
    } else {
      const elColor = normalizeHex(resolveAttr(el, "stroke"));
      const elWidthRaw = resolveAttr(el, "stroke-width");
      const elWidth = elWidthRaw ? parseFloat(elWidthRaw) : 1;
      match = hexDistance(elColor, normalizeHex(targetColor)) < 30
           && Math.abs(elWidth - targetWidth) < 0.5;
    }
    el.style.opacity = match ? "1" : "0.06";
    el.style.filter  = match ? "drop-shadow(0 0 4px #C8A84B)" : "";
  });
}

function clearHighlight(container) {
  container.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")
    .forEach(el => { el.style.opacity = ""; el.style.filter = ""; });
}

function sanitizeSvg(svgText, prefix) {
  return svgText
    .replace(/\bid="([^"]+)"/g,            (_, id) => `id="${prefix}_${id}"`)
    .replace(/\burl\(#([^)]+)\)/g,          (_, id) => `url(#${prefix}_${id})`)
    .replace(/\bclip-path="url\(#([^)]+)\)"/g, (_, id) => `clip-path="url(#${prefix}_${id})"`)
    .replace(/\bhref="#([^"]+)"/g,           (_, id) => `href="#${prefix}_${id}"`)
    // xlink:href is deprecated — convert to href so browsers render <use> font glyphs
    .replace(/\bxlink:href="#([^"]+)"/g,     (_, id) => `href="#${prefix}_${id}"`);
}

function tryGetBBox(el) {
  try {
    return typeof el.getBBox === "function" ? el.getBBox() : null;
  } catch {
    return null;
  }
}

function bboxNear(a, b, pad = 6) {
  if (!a || !b) return false;
  return !(
    a.x + a.width < b.x - pad ||
    b.x + b.width < a.x - pad ||
    a.y + a.height < b.y - pad ||
    b.y + b.height < a.y - pad
  );
}

function collectRelatedStdIndices(els, baseIndices, hoveredRole) {
  if (baseIndices.size === 0) return baseIndices;

  const velcroClusterRoles = new Set([
    "fill_velcro",
    "fill_white_detail",
    "line_velcro",
    "contour_outer",
    "stitch_edge",
    "stitch_thru",
  ]);
  const genericFillClusterRoles = new Set(["fill_cord", "fill_binding", "fill_elastic"]);

  let relatedRoles = null;
  if (velcroClusterRoles.has(hoveredRole)) {
    relatedRoles = velcroClusterRoles;
  } else if (genericFillClusterRoles.has(hoveredRole)) {
    relatedRoles = new Set(["contour_outer", "stitch_edge", "stitch_thru", hoveredRole]);
  } else {
    return baseIndices;
  }

  const targetBBoxes = [...baseIndices].map(idx => tryGetBBox(els[idx])).filter(Boolean);
  if (!targetBBoxes.length) return baseIndices;

  const expanded = new Set(baseIndices);
  els.forEach((el, idx) => {
      const role = el.getAttribute("data-role") || el.closest("[data-role]")?.getAttribute("data-role");
      if (!relatedRoles.has(role)) return;
      const bbox = tryGetBBox(el);
      if (!bbox) return;
      if (targetBBoxes.some(target => bboxNear(target, bbox, 5))) {
        expanded.add(idx);
      }
  });
  return expanded;
}

// Zoomable SVG panel — plain <img> for display, CSS overlay for highlight
function applyRoleOverridesToSvg(svgText, roleOverrides) {
  if (!svgText || !roleOverrides || Object.keys(roleOverrides).length === 0) return svgText;
  let result = svgText;
  Object.entries(roleOverrides).forEach(([mapKey, newRole]) => {
    const oldRole = mapKey.split('|')[0];
    if (!oldRole || oldRole === newRole) return;
    const newStyle = ROLE_STYLES[newRole];
    if (!newStyle) return;
    // Replace style attr for elements with data-role="oldRole"
    // SVG format: style="..." data-role="oldRole"
    result = result.replace(
      new RegExp(`(style=")([^"]*)(")([^/\\n>]*data-role="${oldRole}")`, 'g'),
      (match, s, oldSty, e, rest) => {
        let sty = oldSty;
        if (newStyle.stroke) sty = sty.replace(/stroke:[^;]+/, `stroke:${newStyle.stroke}`);
        if (newStyle["stroke-width"]) sty = sty.replace(/stroke-width:[^;]+/, `stroke-width:${newStyle["stroke-width"]}`);
        if (newStyle["stroke-dasharray"]) {
          const da = newStyle["stroke-dasharray"] === "none" ? "none" : newStyle["stroke-dasharray"];
          sty = sty.replace(/stroke-dasharray:[^;]+/, `stroke-dasharray:${da}`);
        }
        return `${s}${sty}${e}${rest}`;
      }
    );
  });
  return result;
}

function ZoomableSvgPanel({ url, label, hdrClass, hoveredEntry, mode, svgPrefix, roleOverrides }) {
  const wrapRef  = useRef(null);
  const hlRef    = useRef(null); // ref to query SVG elements
  const [svgHtml, setSvgHtml] = useState(""); // SVG content managed by React
  const [ready, setReady]     = useState(false);
  const [scale, setScale]     = useState(1);
  const [pan,   setPan]       = useState({ x: 0, y: 0 });
  // Set of path indices that should be highlighted (index into `els` query)
  const [matchedIndices, setMatchedIndices] = useState(null); // null = no hover
  const dragging = useRef(null);

  // Load SVG text into hidden div for DOM queries
  useEffect(() => {
    if (!url) return;
    setScale(1); setPan({ x: 0, y: 0 }); setReady(false); setMatchedIndices(null);
    cachedFetch(url)
      .then(text => {
        setSvgHtml(sanitizeSvg(text, svgPrefix));
        setReady(true);
      });
  }, [url]);

  // Compute which paths match — store indices in state for reliable re-render
  useEffect(() => {
    const hidden = hlRef.current;
    if (!hidden || !ready) { setMatchedIndices(null); return; }
    if (hoveredEntry === null) { setMatchedIndices(null); return; }

    const els = [...hidden.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
      .filter(el => !el.closest("defs"));

    const indices = new Set();
    els.forEach((el, idx) => {
      let match = false;
      const dataRole = el.getAttribute("data-role");
      if (dataRole) {
        match = dataRole === hoveredEntry.role;
      } else if (mode === "std") {
        match = !!el.closest(`[data-role="${hoveredEntry.role}"]`);
      } else {
        const elColor  = normalizeHex(resolveAttr(el, "stroke"));
        const elW      = parseFloat(resolveAttr(el, "stroke-width") || "1");
        const elDash   = resolveAttr(el, "stroke-dasharray") || "";
        const elDashed = elDash !== "" && elDash !== "none" && elDash !== "0" && elDash !== "[] 0";
        const colorOk  = hexDistance(elColor, normalizeHex(hoveredEntry.stroke)) < 30;
        const widthOk  = Math.abs(elW - hoveredEntry.width) < 0.5;
        const dashOk   = elDashed === Boolean(hoveredEntry.dashed);
        match = colorOk && widthOk && dashOk;
      }
      if (match) indices.add(idx);
    });
    setMatchedIndices(indices);
  }, [hoveredEntry, ready, mode]);

  // Native wheel
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const h = e => { e.preventDefault(); setScale(s => Math.min(8, Math.max(0.3, s - e.deltaY * 0.001))); };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  const onMouseDown = e => { if (e.button !== 0) return; dragging.current = { sx: e.clientX - pan.x, sy: e.clientY - pan.y }; };
  const onMouseMove = e => { if (!dragging.current) return; setPan({ x: e.clientX - dragging.current.sx, y: e.clientY - dragging.current.sy }); };
  const onMouseUp   = () => { dragging.current = null; };
  const reset       = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const dimmed = matchedIndices !== null;

  return (
    <div className="vse-zoom-panel">
      <div className={`vse-panel-hdr ${hdrClass}`}>
        {label}
        <button className="vse-zoom-reset" onClick={reset} title="Сбросить">↺</button>
        <span className="vse-zoom-hint">{Math.round(scale * 100)}% · колесо = масштаб · перетаскивание = сдвиг</span>
      </div>
      <div ref={wrapRef} className="vse-zoom-viewport"
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        <div className="vse-zoom-content"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          <div
            ref={hlRef}
            className="vse-zoom-img"
            draggable={false}
            style={{ opacity: dimmed ? 0.15 : 1, transition: "opacity .15s" }}
            dangerouslySetInnerHTML={{ __html: mode === "std" ? applyRoleOverridesToSvg(svgHtml, roleOverrides) : svgHtml }}
          />
          {dimmed && ready && matchedIndices && (() => {
            const hidden = hlRef.current;
            if (!hidden) return null;
            const svgEl = hidden.querySelector("svg");
            if (!svgEl) return null;
            const vb = svgEl.getAttribute("viewBox");
            const els = [...hidden.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
              .filter(el => !el.closest("defs"));
            const matched = els.filter((_, idx) => matchedIndices.has(idx));
            return (
              <svg viewBox={vb} className="vse-zoom-overlay" xmlns="http://www.w3.org/2000/svg">
                {matched.map((el, i) => {
                  const clone = el.cloneNode(true);
                  clone.style.filter = "drop-shadow(0 0 3px #C8A84B)";
                  clone.style.opacity = "1";
                  return <g key={i} dangerouslySetInnerHTML={{ __html: clone.outerHTML }} />;
                })}
              </svg>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// Group registry entries by visual appearance (stroke+fill+width+dashed)
function groupNodeStyles(nodeStyles) {
  const map = new Map();
  for (const { entry, i } of nodeStyles) {
    const role = entry.role ?? "?";
    if (!map.has(role)) {
      map.set(role, { entry: { ...entry }, indices: [i], key_strs: entry.key_str ? [entry.key_str] : [] });
    } else {
      const g = map.get(role);
      g.indices.push(i);
      if (entry.key_str && !g.key_strs.includes(entry.key_str)) g.key_strs.push(entry.key_str);
    }
  }
  return [...map.values()];
}

function nodeSection(node) {
  const label = (node?.label || "").trim();
  const first = label.split("/")[0]?.trim();
  return first || "Без раздела";
}

function roleGroupsFromSvg(svgText) {
  if (!svgText) return [];
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const els = [...doc.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
    .filter(el => !el.closest("defs"));
  const map = new Map();
  els.forEach(el => {
    const role = el.getAttribute("data-role") || el.closest("[data-role]")?.getAttribute("data-role") || "unknown";
    const key = el.getAttribute("data-sk") || "";
    const stroke = normalizeHex(resolveAttr(el, "stroke")) || "none";
    const fill = normalizeHex(resolveAttr(el, "fill")) || "none";
    const width = parseFloat(resolveAttr(el, "stroke-width") || "0") || 0;
    const dash = resolveAttr(el, "stroke-dasharray") || "";
    const dashed = dash !== "" && dash !== "none" && dash !== "0" && dash !== "[] 0";
    const groupDashed = role === "stitch_thru" ? true : dashed;
    const mapKey = `${role}|${stroke}|${fill}|${width}|${groupDashed}`;
    if (!map.has(mapKey)) {
      map.set(mapKey, {
        mapKey,
        entry: { role, stroke, fill, width, dashed },
        indices: [],
        key_strs: key ? [key] : [],
        count: 0,
      });
    }
    const group = map.get(mapKey);
    group.count += 1;
    if (role === "stitch_thru" && dashed) group.entry.dashed = true;
    if (key && !group.key_strs.includes(key)) group.key_strs.push(key);
  });
  // Merge groups with the same role + similar color (hexDistance < 40)
  // Keeps the representative with the highest count; sums counts.
  const COLOR_MERGE_THRESHOLD = 90;
  const groups = [...map.values()].sort((a, b) => b.count - a.count);
  const merged = [];
  for (const g of groups) {
    const rep = merged.find(m =>
      m.entry.role === g.entry.role &&
      m.entry.fill === g.entry.fill &&
      m.entry.dashed === g.entry.dashed &&
      Math.abs(m.entry.width - g.entry.width) < 0.6 &&
      hexDistance(m.entry.stroke, g.entry.stroke) < COLOR_MERGE_THRESHOLD
    );
    if (rep) {
      rep.count += g.count;
      g.key_strs.forEach(k => { if (!rep.key_strs.includes(k)) rep.key_strs.push(k); });
    } else {
      merged.push(g);
    }
  }
  return merged.sort((a, b) => {
    if (a.entry.role === b.entry.role) return b.count - a.count;
    if (a.entry.role === "unknown") return 1;
    if (b.entry.role === "unknown") return -1;
    return a.entry.role.localeCompare(b.entry.role);
  });
}

// в"Ђв"Ђ Tab 1: Annotate originals в"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђ
const API = "http://localhost:7070";

// Module-level SVG text cache — survives re-renders, cleared only on explicit buildTs change
const _svgTextCache = new Map();
function cachedFetch(url) {
  if (_svgTextCache.has(url)) return Promise.resolve(_svgTextCache.get(url));
  return fetch(url).then(r => r.text()).then(t => { _svgTextCache.set(url, t); return t; });
}

function TabCompare({ manifest, registry, setRegistry, buildStatus, onSave, saving, buildTs }) {
  const [activeId, setActiveId] = useState(manifest[0]?.id);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [nodeQuery, setNodeQuery] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [actualGroups, setActualGroups] = useState([]);
  const [roleOverrides, setRoleOverrides] = useState({}); // mapKey → role
  const NS_KEY = "vse_node_statuses_v2";

  const [nodeStatuses, setNodeStatuses] = useState(() => {
    // Primary: localStorage (always available)
    try { return JSON.parse(localStorage.getItem(NS_KEY)) || { approved: [], complex: [] }; }
    catch { return { approved: [], complex: [] }; }
  });

  // On startup: also try API and merge (API file survives browser clears)
  useEffect(() => {
    fetch(`${API}/api/node-status`)
      .then(r => r.json())
      .then(apiData => {
        setNodeStatuses(prev => {
          // Merge: union of localStorage + file
          const approved = [...new Set([...(prev.approved||[]), ...(apiData.approved||[])])];
          const complex  = [...new Set([...(prev.complex||[]),  ...(apiData.complex||[])])];
          const merged = { approved, complex };
          try { localStorage.setItem(NS_KEY, JSON.stringify(merged)); } catch {}
          return merged;
        });
      })
      .catch(() => {}); // API unavailable — localStorage is enough
  }, []);

  const setNodeStatus = (nodeId, status) => {
    setNodeStatuses(prev => {
      const next = { approved: [...(prev.approved||[])], complex: [...(prev.complex||[])] };
      next.approved = next.approved.filter(id => id !== nodeId);
      next.complex  = next.complex.filter(id => id !== nodeId);
      if (status === "approved") next.approved.push(nodeId);
      if (status === "complex")  next.complex.push(nodeId);
      // Save to localStorage immediately (always works)
      try { localStorage.setItem(NS_KEY, JSON.stringify(next)); } catch {}
      // Also sync to API file (for cross-browser/backup)
      fetch(`${API}/api/node-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: nodeId, status }),
      }).catch(() => {});
      return next;
    });
  };

  useEffect(() => { setHoveredIdx(null); setRoleOverrides({}); }, [activeId]);
  const entryMatchesNode = (entry, nodeId) =>
    entry.nodeIds?.includes(nodeId) || entry.files?.includes(nodeId);

  useEffect(() => {
    if (!manifest.length) return;
    if (!activeId || !manifest.some(n => n.id === activeId)) {
      setActiveId(manifest[0]?.id);
    }
  }, [manifest, activeId]);

  const node = manifest.find(n => n.id === activeId);

  useEffect(() => {
    if (!activeSection && node) setActiveSection(nodeSection(node));
  }, [activeSection, node]);

  useEffect(() => {
    if (!node?.origSvg) {
      setActualGroups([]);
      return;
    }
    let alive = true;
    const stdUrl  = (node.stdSvg  || node.origSvg) + "?t=" + buildTs;
    const origUrl = node.origSvg + "?t=" + buildTs;
    Promise.all([
      cachedFetch(stdUrl),
      cachedFetch(origUrl).catch(() => ""),
    ]).then(([stdText, origText]) => {
      if (!alive) return;
      const groups = roleGroupsFromSvg(stdText);
      // Merge key_strs from origSvg so registry assignments work
      if (origText) {
        const origDoc = new DOMParser().parseFromString(origText, "image/svg+xml");
        const origEls = [...origDoc.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
          .filter(el => !el.closest("defs"));
        const origKeyMap = new Map();
        origEls.forEach(el => {
          const role = el.getAttribute("data-role") || el.closest("[data-role]")?.getAttribute("data-role") || "unknown";
          const sk   = el.getAttribute("data-sk") || "";
          const stroke = normalizeHex(resolveAttr(el, "stroke")) || "none";
          const fill   = normalizeHex(resolveAttr(el, "fill"))   || "none";
          const width  = parseFloat(resolveAttr(el, "stroke-width") || "0") || 0;
          const dash   = resolveAttr(el, "stroke-dasharray") || "";
          const dashed = dash !== "" && dash !== "none" && dash !== "0";
          const mapKey = `${role}|${stroke}|${fill}|${Math.round(width * 10) / 10}|${dashed}`;
          if (sk) {
            if (!origKeyMap.has(mapKey)) origKeyMap.set(mapKey, []);
            if (!origKeyMap.get(mapKey).includes(sk)) origKeyMap.get(mapKey).push(sk);
          }
        });
        groups.forEach(g => {
          const { role, stroke, fill, width, dashed } = g.entry;
          const mapKey = `${role}|${stroke}|${fill}|${Math.round((width||0) * 10) / 10}|${Boolean(dashed)}`;
          const origKeys = origKeyMap.get(mapKey) || [];
          if (origKeys.length > 0) g.key_strs = origKeys;
        });
      }
      setActualGroups(groups);
    }).catch(() => { if (alive) setActualGroups([]); });
    return () => { alive = false; };
  }, [node?.origSvg, buildTs]);

  const registryMetaByNode = useMemo(() => {
    const map = new Map();
    const add = (nodeId, assigned) => {
      if (!nodeId) return;
      const prev = map.get(nodeId) || { count: 0, assigned: 0 };
      prev.count += 1;
      if (assigned) prev.assigned += 1;
      map.set(nodeId, prev);
    };
    registry.forEach(entry => {
      const assigned = !!entry.role && entry.role !== "?";
      const ids = entry.nodeIds?.length ? entry.nodeIds : entry.files || [];
      ids.forEach(id => add(id, assigned));
    });
    return map;
  }, [registry]);

  const sections = useMemo(() => {
    const map = new Map();
    manifest.forEach(n => {
      const key = nodeSection(n);
      const item = map.get(key) || { key, label: key, count: 0 };
      item.count += 1;
      map.set(key, item);
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }, [manifest]);

  const visibleNodes = useMemo(() => {
    const q = nodeQuery.trim().toLowerCase();
    const sectionNodes = activeSection === "all" || !activeSection
      ? manifest
      : manifest.filter(n => nodeSection(n) === activeSection);
    const filtered = q
      ? manifest.filter(n => `${n.label} ${n.code} ${n.id} ${n.sourceFile || ""}`.toLowerCase().includes(q))
      : sectionNodes;
    const limited = filtered.slice(0, 140);
    if (!q && node && !limited.some(n => n.id === node.id)) {
      return [node, ...limited];
    }
    return limited;
  }, [manifest, node, nodeQuery, activeSection]);

  const chooseSection = key => {
    setActiveSection(key);
    setNodeQuery("");
    const next = key === "all" ? manifest[0] : manifest.find(n => nodeSection(n) === key);
    if (next) {
      setActiveId(next.id);
      setHoveredIdx(null);
    }
  };

  const registryNodeStyles = registry
    .map((entry, i) => ({ entry, i }))
    .filter(({ entry }) => entryMatchesNode(entry, activeId));

  const groups = actualGroups.length > 0 ? actualGroups : groupNodeStyles(registryNodeStyles);

  const safeIdx = hoveredIdx !== null && hoveredIdx < groups.length ? hoveredIdx : null;
  const hoveredGroup = safeIdx !== null ? groups[safeIdx] ?? null : null;
  // hoveredGroup passed to ZoomableSvgPanel — contains key_strs[] and role
  const hoveredEntry = hoveredGroup ? { ...hoveredGroup.entry, key_strs: hoveredGroup.key_strs } : null;

  const allAssigned = groups.length > 0 && groups.every(g => g.entry.role && g.entry.role !== "?" && g.entry.role !== "unknown");
  const assignedCount = groups.filter(g => g.entry.role && g.entry.role !== "?" && g.entry.role !== "unknown").length;

  return (
    <div className="vse-compare">
      <div className="vse-node-picker">
        <div className="vse-node-picker-head">
          <input
            className="vse-node-search"
            type="search"
            value={nodeQuery}
            onChange={e => setNodeQuery(e.target.value)}
            placeholder="Поиск узла: код, название, id..."
          />
          <span className="vse-node-count">
            показано {visibleNodes.length} из {manifest.length}
          </span>
        </div>
        <div className="vse-node-catalog">
          <div className="vse-node-sections" aria-label="Разделы схем">
            <button
              type="button"
              className={`vse-section-btn${activeSection === "all" ? " active" : ""}`}
              onClick={() => chooseSection("all")}
            >
              <span>Все схемы</span>
              <b>{manifest.length}</b>
            </button>
            {sections.map(section => (
              <button
                type="button"
                key={section.key}
                className={`vse-section-btn${activeSection === section.key ? " active" : ""}`}
                onClick={() => chooseSection(section.key)}
                title={section.label}
              >
                <span>{section.label}</span>
                <b>{section.count}</b>
              </button>
            ))}
          </div>
          <div className="vse-node-tabs">
          {visibleNodes.map(n => {
            const isApproved = nodeStatuses.approved?.includes(n.id);
            const isComplex  = nodeStatuses.complex?.includes(n.id);
            return (
              <button
                key={n.id}
                className={`vse-node-tab${activeId === n.id ? " active" : ""}${isApproved ? " vse-node-tab-done" : ""}${isComplex ? " vse-node-tab-has-styles" : ""}`}
                onClick={() => { setActiveId(n.id); setHoveredIdx(null); }}
                title={`${n.label} ${n.code}`}
              >
                <span className="vse-node-tab-main">
                  <span className="vse-node-tab-title">{n.label}</span>
                  <span className="vse-code">{n.code}</span>
                </span>
                {isApproved && <span className="vse-node-done-mark">готово</span>}
                {isComplex  && <span className="vse-node-done-mark" style={{background:"#C8A84B"}}>сложный</span>}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {node && (
        <div className="vse-annotate-wrap">
          {/* LEFT: original + standard SVG panels */}
          <div className="vse-panels-sticky">
            <div className="vse-dual-panels">
              <ZoomableSvgPanel
                url={node.origSvg + "?t=" + buildTs}
                label="ОРИГИНАЛ"
                hdrClass="orig"
                hoveredEntry={hoveredEntry}
                mode="orig"
                svgPrefix={`${activeId}_orig`}
              />
              <ZoomableSvgPanel
                url={node.stdSvg + "?t=" + buildTs}
                label="СТАНДАРТ"
                hdrClass="std"
                hoveredEntry={hoveredEntry}
                mode="std"
                svgPrefix={`${activeId}_std`}
                roleOverrides={roleOverrides}
              />
            </div>
          </div>

          {/* RIGHT: annotation table */}
          <div className="vse-annotate-right-sticky">
          <div className="vse-annotate-right">
            {groups.length > 0 ? (
              <div className="vse-node-styles">
                <div className="vse-node-styles-hdr">
                  <span>Наведи на строку → подсветка на оригинале и стандарте</span>
                  <span>Роли из фактического SVG</span>
                  <span className="vse-assign-progress">{assignedCount} / {groups.length}</span>
                </div>
                <table className="vse-table">
                  <thead>
                    <tr>
                      <th style={{width:"64px"}}>Превью</th>
                      <th style={{width:"80px"}}>Цвет</th>
                      <th style={{width:"48px"}}>Толщ.</th>
                      <th style={{width:"44px"}}>Кол.</th>
                      <th style={{width:"220px"}}>Роль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g, idx) => {
                      const isHov = safeIdx === idx;
                      const assigned = g.entry.role && g.entry.role !== "?";
                      return (
                        <tr
                          key={g.indices[0]}
                          className={`vse-inspector-row${isHov ? " hovered" : ""}${assigned ? " vse-row-filled" : ""}`}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                        >
                          <td className="vse-tc">
                            <LineSwatch color={g.entry.stroke} width={g.entry.width} dashed={g.entry.dashed} />
                          </td>
                          <td>
                            <ColorDot hex={g.entry.stroke} /><code>{g.entry.stroke}</code>
                          </td>
                          <td className="vse-tc vse-muted">{g.entry.width}</td>
                          <td className="vse-tc vse-muted">{g.count ?? g.indices.length}</td>
                          <td>
                            <select
                              className="vse-role-sel-sm"
                              value={roleOverrides[g.mapKey] ?? g.entry.role ?? "?"}
                              onChange={e => {
                                const newRole = e.target.value;
                                const oldRole = g.entry.role;
                                // Update local display immediately
                                setRoleOverrides(prev => ({ ...prev, [g.mapKey]: newRole }));
                                // Live preview handled via roleOverrides → applyRoleOverridesToSvg
                                // Update registry
                                const next = [...registry];
                                const keys = g.key_strs || [];
                                if (keys.length > 0) {
                                  let found = false;
                                  next.forEach((entry, i) => {
                                    if (keys.includes(entry.key_str)) {
                                      next[i] = { ...entry, role: newRole };
                                      found = true;
                                    }
                                  });
                                  if (!found) {
                                    keys.forEach(k => next.push({ key_str: k, role: newRole }));
                                  }
                                } else {
                                  const { stroke, fill, width, dashed } = g.entry;
                                  const syntheticKey = `${stroke}|${fill}|${width}|${String(dashed)}`;
                                  next.push({ stroke, fill, width: width || 0, dashed: Boolean(dashed),
                                    is_line: false, is_filled: false, is_tiny: false, is_closed: false,
                                    near_text: false, orient: "-", sz: "M", role: newRole, key_str: syntheticKey });
                                }
                                setRegistry(next);
                              }}
                            >
                              <RoleOptions />
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="vse-empty-roles">
                <strong>Для этого узла пока нет строк ролей.</strong>
                <span>В сгенерированном SVG нет элементов с data-role. Проверь экспорт или выбери другой узел.</span>
              </div>
            )}

            {/* Generate button */}
            <div className="vse-generate-bar">
              <button
                className={`vse-generate-btn${saving ? " vse-save-btn-busy" : ""}${!allAssigned ? " vse-generate-btn-partial" : ""}`}
                onClick={() => onSave(activeId)}
                disabled={saving}
              >
                {saving ? "Генерация..." : allAssigned ? "Сгенерировать стандарт →" : `Сгенерировать (${assignedCount}/${groups.length} ролей распознано)`}
              </button>
              {buildStatus.state === "ok" && (
                <span className="vse-build-ok">OK: {buildStatus.message}</span>
              )}
              {buildStatus.state === "error" && (
                <span className="vse-build-error">Ошибка: {buildStatus.message}</span>
              )}
              {buildStatus.state === "building" && (
                <span className="vse-muted">Генерация: {buildStatus.message}</span>
              )}
              {activeId && (() => {
                const isApproved = nodeStatuses.approved?.includes(activeId);
                const isComplex  = nodeStatuses.complex?.includes(activeId);
                return (
                  <div style={{ display:"flex", gap:6, marginTop:8 }}>
                    <button
                      onClick={() => setNodeStatus(activeId, isApproved ? "pending" : "approved")}
                      style={{ flex:1, padding:"5px 0", borderRadius:4, border:"1px solid #29b473",
                               background: isApproved ? "#29b473" : "transparent",
                               color: isApproved ? "#fff" : "#29b473", cursor:"pointer", fontSize:12, fontWeight:600 }}
                    >{isApproved ? "✓ Утверждён" : "✓ Утвердить"}</button>
                    <button
                      onClick={() => setNodeStatus(activeId, isComplex ? "pending" : "complex")}
                      style={{ flex:1, padding:"5px 0", borderRadius:4, border:"1px solid #C8A84B",
                               background: isComplex ? "#C8A84B" : "transparent",
                               color: isComplex ? "#fff" : "#C8A84B", cursor:"pointer", fontSize:12, fontWeight:600 }}
                    >{isComplex ? "⚠ Сложный" : "⚠ Отметить сложным"}</button>
                  </div>
                );
              })()}
            </div>
          </div>
          </div>{/* vse-annotate-right-sticky */}
        </div>
      )}
    </div>
  );
}

// в"Ђв"Ђ Tab 2: Callout meanings в"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђ
function TabCallouts({ calloutGraph, meanings, setMeanings }) {
  const rows = [];
  for (const [nodeId, items] of Object.entries(calloutGraph)) {
    for (const item of items) {
      rows.push({ nodeId, ...item });
    }
  }

  return (
    <div>
      <p className="vse-hint">
        Для каждой подписи показана линия-выноска и линия к которой она ведёт.<br />
        Заполни поле <strong>«Что это»</strong> — это станет основой справочника обозначений.
      </p>
      <table className="vse-table">
        <thead>
          <tr>
            <th>Файл</th>
            <th>Подпись</th>
            <th>Выноска</th>
            <th>Целевая линия</th>
            <th>Что это</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = `${row.nodeId}|${row.label}|${i}`;
            return (
              <tr key={key} className={meanings[key] ? "vse-row-filled" : ""}>
                <td className="vse-muted">{row.nodeId}</td>
                <td><strong>{row.label}</strong></td>
                <td>
                  <LineSwatch color={row.callout_color} width={row.callout_w} />
                  <code>{row.callout_color}</code>
                </td>
                <td>
                  <ColorDot hex={row.target_color} />
                  <LineSwatch color={row.target_color} width={row.target_w} />
                  <code>{row.target_color}</code> w={row.target_w}
                </td>
                <td>
                  <input
                    className="vse-meaning-input"
                    placeholder="название / тип линии…"
                    value={meanings[key] || ""}
                    onChange={e => setMeanings(m => ({ ...m, [key]: e.target.value }))}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// в"Ђв"Ђ Tab 3: Style registry в"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђ
function TabRegistry({ registry, setRegistry, manifest }) {
  const filled = registry.filter(r => r.role !== "?").length;

  // node_id в†' origSvg url
  const svgByNodeId = Object.fromEntries(manifest.map(n => [n.id, n.origSvg]));

  return (
    <div>
      <p className="vse-hint">
        Все уникальные визуальные стили найденные в файлах ({registry.length} шт., назначено: {filled}).
        <br />Под каждым стилем — узлы где он встречается. Назначь роль.
      </p>
      <div className="vse-reg-cards">
        {registry.map((entry, i) => (
          <div key={i} className={`vse-reg-card${entry.role !== "?" ? " filled" : ""}`}>
            {/* Style header */}
            <div className="vse-reg-card-head">
              <div className="vse-reg-style">
                <LineSwatch color={entry.stroke} width={entry.width} dashed={entry.dashed} />
                <span className="vse-reg-meta">
                  <ColorDot hex={entry.stroke} />
                  <code>{entry.stroke}</code>
                  {entry.fill && entry.fill !== "none" && <><ColorDot hex={entry.fill} /><code>{entry.fill}</code></>}
                  <span className="vse-muted">w={entry.width}</span>
                  <span className="vse-muted">
                    {entry.is_line ? "линия" : "путь"}
                    {entry.is_filled ? " · заливка" : ""}
                    {entry.is_tiny ? " · мелкий" : ""}
                  </span>
                  <span className="vse-muted">Г—{entry.count}</span>
                </span>
              </div>
              <select
                className="vse-role-sel"
                value={entry.role}
                onChange={e => {
                  const next = [...registry];
                  next[i] = { ...next[i], role: e.target.value };
                  setRegistry(next);
                }}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                ))}
              </select>
            </div>
            {/* Node thumbnails */}
            {entry.files?.length > 0 && (
              <div className="vse-reg-thumbs">
                {entry.files.map(fid => svgByNodeId[fid] ? (
                  <div key={fid} className="vse-reg-thumb">
                    <img src={svgByNodeId[fid]} alt={fid} className="vse-reg-thumb-img" />
                    <span className="vse-reg-thumb-label">{fid}</span>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 4 (removed — merged into TabCompare) ─────────────────────────────────
function TabInspector_REMOVED({ manifest, registry, setRegistry }) {
  const [activeId, setActiveId]   = useState(manifest[0]?.id);
  const [mode, setMode]           = useState("orig"); // "orig" | "std"
  const [hoveredIdx, setHovered]  = useState(null);
  const svgRef                    = useRef(null);
  const [svgHtml, setSvgHtml]     = useState("");

  const node = manifest.find(n => n.id === activeId);

  // Styles for this node
  const nodeStyles = registry
    .map((entry, i) => ({ entry, i }))
    .filter(({ entry }) => entry.files?.includes(activeId));

  // Load SVG as text
  useEffect(() => {
    if (!node) return;
    const url = mode === "orig" ? node.origSvg : node.stdSvg;
    fetch(url + "?" + Date.now())
      .then(r => r.text())
      .then(setSvgHtml);
  }, [activeId, mode]);

  // Apply highlight when hovered style changes
  useEffect(() => {
    const container = svgRef.current;
    if (!container) return;

    const paths = container.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse");

    if (hoveredIdx === null) {
      // Reset all
      paths.forEach(el => {
        el.style.opacity = "";
        el.style.filter  = "";
      });
      return;
    }

    const { entry } = nodeStyles[hoveredIdx] || {};
    if (!entry) return;

    const targetColor = normalizeHex(entry.stroke);
    const targetWidth = entry.width;

    if (mode === "std") {
      // Standardized SVG: match by data-role on ancestor <g>
      const targetRole = entry.role;
      paths.forEach(el => {
        const inRole = !!el.closest(`[data-role="${targetRole}"]`);
        el.style.opacity = inRole ? "1" : "0.07";
        el.style.filter  = inRole ? "drop-shadow(0 0 3px #C8A84B)" : "";
      });
    } else {
      // Original SVG: match by stroke color (В± tolerance)
      paths.forEach(el => {
        const elColor = parseStroke(el);
        const elWidth = parseStrokeWidth(el);
        const colorMatch = elColor === targetColor;
        // width match with tolerance
        const widthMatch = elWidth === null || Math.abs((elWidth || 0) - targetWidth) < 0.4;
        const match = colorMatch && widthMatch;
        el.style.opacity = match ? "1" : "0.07";
        el.style.filter  = match ? "drop-shadow(0 0 3px #C8A84B)" : "";
      });
    }
  }, [hoveredIdx, svgHtml, mode]);

  return (
    <div className="vse-inspector">
      {/* Node selector */}
      <div className="vse-node-tabs" style={{ marginBottom: 12 }}>
        {manifest.map(n => (
          <button
            key={n.id}
            className={`vse-node-tab${activeId === n.id ? " active" : ""}`}
            onClick={() => { setActiveId(n.id); setHovered(null); }}
          >
            {n.label} <span className="vse-code">{n.code}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="vse-mode-toggle">
          <button className={mode === "orig" ? "active" : ""} onClick={() => setMode("orig")}>Оригинал</button>
          <button className={mode === "std"  ? "active" : ""} onClick={() => setMode("std")}>Стандарт</button>
        </div>
      </div>

      <div className="vse-inspector-body">
        {/* SVG viewer */}
        <div className="vse-inspector-svg-wrap">
          <div
            ref={svgRef}
            className="vse-inspector-svg"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        </div>

        {/* Style table */}
        <div className="vse-inspector-panel">
          <div className="vse-inspector-panel-hdr">
            Стили узла — наведи чтобы подсветить
          </div>
          <table className="vse-table">
            <thead>
              <tr>
                <th>Превью</th>
                <th>Цвет</th>
                <th>w</th>
                <th>Роль</th>
              </tr>
            </thead>
            <tbody>
              {nodeStyles.map(({ entry, i }, idx) => (
                <tr
                  key={i}
                  className={`vse-inspector-row${hoveredIdx === idx ? " hovered" : ""}${entry.role !== "?" ? " vse-row-filled" : ""}`}
                  onMouseEnter={() => setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <td className="vse-tc">
                    <LineSwatch color={entry.stroke} width={entry.width} dashed={entry.dashed} />
                  </td>
                  <td>
                    <ColorDot hex={entry.stroke} />
                    <code>{entry.stroke}</code>
                  </td>
                  <td className="vse-tc vse-muted">{entry.width}</td>
                  <td>
                    <select
                      className="vse-role-sel-sm"
                      value={entry.role}
                      onChange={e => {
                        const next = [...registry];
                        next[i] = { ...next[i], role: e.target.value };
                        setRegistry(next);
                      }}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// в"Ђв"Ђ Main в"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђ
export default function VseReview() {
  const [tab, setTab]               = useState("compare");
  const [manifest, setManifest]     = useState([]);
  const [calloutGraph, setCallout]  = useState({});
  const [registry, setRegistry]     = useState([]);
  const [meanings, setMeanings]     = useState({});
  const [buildStatus, setBuildStatus] = useState(null); // null | {state, message}
  const [buildTs, setBuildTs] = useState(Date.now());

  const API = "http://localhost:7070";

  useEffect(() => {
    const t = "?t=" + Date.now();
    fetch("/vse/manifest.json" + t).then(r => r.json()).then(setManifest);
    fetch("/vse/callout_graph.json" + t).then(r => r.json()).then(setCallout);
    fetch("/vse/style_registry.json" + t).then(r => r.json()).then(setRegistry);
  }, []);

  // Poll build status while building
  useEffect(() => {
    if (!buildStatus || buildStatus.state !== "building") return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/status`);
        const s = await r.json();
        setBuildStatus(s);
        if (s.state !== "building") {
          clearInterval(id);
          if (s.state === "ok") {
            setBuildTs(Date.now());
            fetch("/vse/manifest.json?" + Date.now()).then(r => r.json()).then(setManifest);
          }
        }
      } catch {}
    }, 1500);
    return () => clearInterval(id);
  }, [buildStatus?.state]);

  const saveAndRegen = async (nodeId) => {
    setBuildStatus({ state: "building", message: nodeId ? `Обновляем нод...` : "Сохранение реестра..." });
    try {
      const r = await fetch(`${API}/api/save-registry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registry, node_id: nodeId || "" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setBuildStatus({ state: "building", message: data.message });
    } catch (e) {
      setBuildStatus({ state: "error", message: String(e) });
    }
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const TABS = [
    { id: "compare",  label: "Разметка" },
    { id: "callouts", label: "Выноски и обозначения" },
    { id: "registry", label: "Реестр стилей" },
  ];

  return (
    <div className="vse-wrap">
      <div className="vse-header">
        <div className="pom-label">Visual Standardization Engine</div>
        <div className="pom-title">Обзор для конструктора</div>
        <div className="pom-sub">Расшифровка обозначений — 6 узлов из библиотеки</div>
      </div>

      <div className="vse-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`vse-tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
        <div className="vse-tab-spacer" />
        {tab === "callouts" && (
          <button className="vse-save-btn" onClick={() => downloadJSON(meanings, "callout_meanings.json")}>
            Скачать выноски
          </button>
        )}
        {tab === "registry" && (
          <button
            className={`vse-save-btn${buildStatus?.state === "building" ? " vse-save-btn-busy" : ""}`}
            onClick={saveAndRegen}
            disabled={buildStatus?.state === "building"}
          >
            {buildStatus?.state === "building" ? "⏳ Генерация…" : "Сохранить и регенерировать"}
          </button>
        )}
        {buildStatus && buildStatus.state !== "building" && (
          <span className={`vse-build-status vse-build-${buildStatus.state}`}>
            {buildStatus.state === "ok" ? "OK: " : "Ошибка: "}{buildStatus.message}
          </span>
        )}
      </div>

      <div className={tab === "compare" ? "vse-body vse-body-compare" : "vse-body"}>
        {tab === "compare"  && manifest.length > 0 && <TabCompare manifest={manifest} registry={registry} setRegistry={setRegistry} buildStatus={buildStatus || {state:"idle",message:""}} onSave={saveAndRegen} saving={buildStatus?.state === "building"} buildTs={buildTs} />}
        {tab === "callouts" && <TabCallouts calloutGraph={calloutGraph} meanings={meanings} setMeanings={setMeanings} />}
        {tab === "registry" && <TabRegistry registry={registry} setRegistry={setRegistry} manifest={manifest} />}
      </div>
    </div>
  );
}

