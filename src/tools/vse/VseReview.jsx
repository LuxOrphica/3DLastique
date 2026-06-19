import { useState, useEffect, useMemo, useRef } from "react";
import "./VseReview.css";

const ROLE_STYLES = {
  // Контуры
  contour_outer:       { stroke: "#1A1A1A", "stroke-width": "1.5",  "stroke-dasharray": "none" },
  construction_line:   { stroke: "#1A1A1A", "stroke-width": "0.9",  "stroke-dasharray": "none" },
  contour_hidden:      { stroke: "#8A8A8A", "stroke-width": "0.65", "stroke-dasharray": "4 2" },
  // Строчки / швы
  seam_line:           { stroke: "#1A1A1A", "stroke-width": "2.5",  "stroke-dasharray": "none" },
  stitch_edge:         { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "none" },
  stitch_thru:         { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "3 1.5" },
  stitch_Bt:           { stroke: "#C8102E", "stroke-width": "3.0",  "stroke-dasharray": "none" },
  // Границы
  boundary_fragment:   { stroke: "#27A6DE", "stroke-width": "1.5",  "stroke-dasharray": "none" },
  boundary_interlining:{ stroke: "#29B473", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  // Заливки и материалы
  fill_interlining:    { stroke: "#888888", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_fabric:         { stroke: "#AAAAAA", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_fabric_gray:    { stroke: "#888888", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_dark_fabric:    { stroke: "#888888", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_contrast:       { stroke: "#B54422", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_tape:           { stroke: "#777777", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_elastic:        { stroke: "#666666", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  material_sweat_band: { stroke: "#666666", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  component_half_belt: { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "none" },
  fill_cord:           { stroke: "#333333", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_velcro:         { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "none" },
  fill_velcro_hook:    { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "none" },
  fill_velcro_loop:    { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "none" },
  fill_material_mask:  { stroke: "none",    "stroke-width": "0",    "stroke-dasharray": "none" },
  fill_white_detail:   { stroke: "none",    "stroke-width": "0",    "stroke-dasharray": "none" },
  fill_pu_tape:        { stroke: "#6B6B6B", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_piping:         { stroke: "#9B741B", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_glue:           { stroke: "#7E6A3A", "stroke-width": "0.5",  "stroke-dasharray": "3 2" },
  fill_shape:          { stroke: "#CCCCCC", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  // Фурнитура
  hw_zipper:           { stroke: "#1A1A1A", "stroke-width": "1.2",  "stroke-dasharray": "none" },
  hw_zipper_tape:      { stroke: "#1D1C1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  hw_ring:             { stroke: "#1A1A1A", "stroke-width": "6.5",  "stroke-dasharray": "none" },
  hw_loop:             { stroke: "#1A1A1A", "stroke-width": "4.5",  "stroke-dasharray": "none" },
  // Аннотации
  callout_line:        { stroke: "#333333", "stroke-width": "0.6",  "stroke-dasharray": "none" },
  callout_zoom:        { stroke: "#1B4FA8", "stroke-width": "0.75", "stroke-dasharray": "none" },
  break_line:          { stroke: "#1A1A1A", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  line_elastic:        { stroke: "#8A8A8A", "stroke-width": "0.75", "stroke-dasharray": "2 2" },
  line_fur:            { stroke: "#4A453E", "stroke-width": "0.65", "stroke-dasharray": "1 2" },
  line_gathered_edge:  { stroke: "#777777", "stroke-width": "0.45", "stroke-dasharray": "none" },
  arrow:               { stroke: "none",    "stroke-width": "0",    "stroke-dasharray": "none" },
  stitch_symbol:       { stroke: "#1A1A1A", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  // Прочее
  unknown:             { stroke: "#999999", "stroke-width": "0.5",  "stroke-dasharray": "none" },
};

const ROLE_GROUPS = [
  { label: "— не назначено —", roles: ["?"] },
  { label: "Контуры и конструкция", roles: ["contour_outer", "construction_line", "contour_hidden", "break_line"] },
  { label: "Строчки / швы", roles: ["seam_line", "stitch_edge", "stitch_thru", "stitch_Bt", "stitch_symbol"] },
  { label: "Материалы и слои", roles: ["boundary_fragment", "boundary_interlining", "fill_interlining", "fill_fabric", "fill_fabric_gray", "fill_dark_fabric", "fill_contrast", "fill_shape", "component_half_belt", "fill_white_detail", "fill_material_mask"] },
  { label: "Ленты, резинки, шнуры", roles: ["fill_tape", "fill_elastic", "material_sweat_band", "line_elastic", "fill_cord", "fill_pu_tape", "fill_piping", "fill_glue", "line_fur", "line_gathered_edge"] },
  { label: "Фурнитура", roles: ["hw_zipper", "hw_zipper_tape", "hw_ring", "hw_loop", "fill_velcro", "fill_velcro_hook", "fill_velcro_loop"] },
  { label: "Выноски и обозначения", roles: ["callout_line", "callout_zoom", "arrow", "label"] },
  { label: "Прочее", roles: ["unknown"] },
];

const ROLES = ROLE_GROUPS.flatMap(g => g.roles);

const ROLE_LABELS = {
  "?":                   "— не назначено —",
  // Контуры
  "contour_outer":       "Контур детали",
  "construction_line":   "Конструктивная линия",
  "contour_hidden":      "Невидимый контур / пунктир",
  // Строчки / швы
  "seam_line":           "Линия шва",
  "stitch_edge":         "Строчка по краю",
  "stitch_thru":         "Строчка сквозная",
  "stitch_Bt":           "Закрепка / bar tack (Bc/Bt)",
  // Границы
  "boundary_fragment":   "Прокладка (Padding)",
  "boundary_interlining":"Флизелин (Interlining)",
  // Заливки
  "fill_interlining":    "Штриховка прокладки",
  "fill_fabric":         "Штриховка ткани",
  "fill_fabric_gray":    "Серая ткань / нейтральная заливка",
  "fill_dark_fabric":    "Темная ткань / темная деталь",
  "fill_contrast":       "Контрастная деталь",
  "fill_tape":           "Тесьма / лента",
  "fill_elastic":        "Резинка / elastic band",
  "material_sweat_band": "Внутренняя поясная лента",
  "component_half_belt": "Полупояс / регулировочный хлястик",
  "fill_cord":           "Шнур / cord",
  "fill_velcro":         "Липучка: не уточнено",
  "fill_velcro_hook":    "Липучка: крючковая часть",
  "fill_velcro_loop":    "Липучка: петельная часть",
  "fill_material_mask":  "Маска материала",
  "fill_pu_tape":        "PU tape / полиуретановая лента",
  "fill_piping":         "Кант / piping",
  "fill_glue":           "Клеевая зона / glue",
  "fill_shape":          "Заливка (прочее)",
  // Фурнитура
  "hw_zipper":           "Молния",
  "hw_zipper_tape":      "Молния",
  "hw_loop":             "Петля / рамка",
  // Аннотации
  "callout_line":        "Выноска",
  "callout_zoom":        "Выноска к увеличению",
  "break_line":          "Линия обрыва",
  "line_elastic":        "Резинка / эластичная линия",
  "line_fur":            "Мех / ворсовая линия",
  "line_gathered_edge":  "Мятый / сборенный край материала",
  "arrow":               "Стрелка",
  "stitch_symbol":       "Символ строчки (vvvv)",
  // Прочее
  "unknown":             "Неизвестно",
};

const ROLE_GROUP_LABELS = {
  "— не назначено —": "— не назначено —",
  "Контуры и конструкция": "Контуры и конструкция",
  "Строчки / швы": "Строчки / швы",
  "Материалы и слои": "Материалы и слои",
  "Ленты, резинки, шнуры": "Ленты, резинки, шнуры",
  "Фурнитура": "Фурнитура",
  "Выноски и обозначения": "Выноски и обозначения",
  "Прочее": "Прочее",
};

const ROLE_LABELS_CLEAN = {
  "?": "— не назначено —",
  contour_outer: "Контур детали",
  contour_hidden: "Невидимый контур / пунктир",
  seam_line: "Линия шва",
  stitch_edge: "Строчка по краю",
  stitch_thru: "Сквозная строчка",
  stitch_Bt: "Закрепка / bar tack (Bc/Bt)",
  boundary_fragment: "Прокладка / padding",
  boundary_interlining: "Флизелин / interlining",
  fill_interlining: "Штриховка прокладки",
  fill_fabric: "Штриховка ткани",
  fill_fabric_gray: "Серая ткань / нейтральная заливка",
  fill_dark_fabric: "Темная ткань / темная деталь",
  fill_contrast: "Контрастная деталь",
  fill_tape: "Тесьма / лента",
  fill_elastic: "Резинка / elastic band",
  material_sweat_band: "Внутренняя поясная лента",
  component_half_belt: "Полупояс / регулировочный хлястик",
  fill_cord: "Шнур / cord",
  fill_velcro: "Липучка: не уточнено",
  fill_velcro_hook: "Липучка: крючковая часть",
  fill_velcro_loop: "Липучка: петельная часть",
  fill_material_mask: "Маска материала",
  fill_pu_tape: "PU tape / полиуретановая лента",
  fill_piping: "Кант / piping",
  fill_glue: "Клеевая зона / glue",
  fill_shape: "Заливка / прочее",
  hw_zipper: "Молния",
  hw_zipper_tape: "Тесьма молнии",
  hw_loop: "Петля / рамка",
  callout_line: "Выноска",
  callout_zoom: "Выноска к увеличению",
  break_line: "Линия обрыва",
  line_elastic: "Резинка / эластичная линия",
  line_fur: "Мех / ворсовая линия",
  line_gathered_edge: "Мятый / сборенный край материала",
  arrow: "Стрелка",
  stitch_symbol: "Символ строчки",
  unknown: "Неизвестно",
};

const ROLE_GROUPS_UI = [
  { label: "— не назначено —", roles: ["?"] },
  { label: "Контуры и конструкция", roles: ["contour_outer", "construction_line", "contour_hidden", "break_line"] },
  { label: "Строчки / швы", roles: ["seam_line", "stitch_edge", "stitch_thru", "stitch_Bt", "stitch_symbol"] },
  { label: "Материалы и слои", roles: ["boundary_fragment", "boundary_interlining", "fill_interlining", "fill_fabric", "fill_fabric_gray", "fill_dark_fabric", "fill_contrast", "fill_shape", "component_half_belt", "fill_white_detail", "fill_material_mask"] },
  { label: "Ленты, резинки, шнуры", roles: ["fill_tape", "fill_elastic", "material_sweat_band", "line_elastic", "fill_cord", "fill_pu_tape", "fill_piping", "fill_glue", "line_fur", "line_gathered_edge"] },
  { label: "Фурнитура", roles: ["hw_zipper", "hw_zipper_tape", "hw_ring", "hw_loop", "fill_velcro", "fill_velcro_hook", "fill_velcro_loop"] },
  { label: "Выноски и обозначения", roles: ["callout_line", "callout_zoom", "arrow", "label"] },
  { label: "Прочее", roles: ["unknown"] },
];

const ROLE_LABELS_UI = {
  "?": "— не назначено —",
  contour_outer: "Контур детали",
  construction_line: "Конструктивная линия",
  contour_hidden: "Скрытый контур / пунктир",
  seam_line: "Линия шва",
  stitch_edge: "Строчка по краю",
  stitch_thru: "Сквозная строчка",
  stitch_Bt: "Закрепка / bar tack (Bc/Bt)",
  boundary_fragment: "Прокладка / padding",
  boundary_interlining: "Флизелин / interlining",
  fill_interlining: "Заливка прокладки",
  fill_fabric: "Заливка ткани",
  fill_fabric_gray: "Серая ткань / нейтральная заливка",
  fill_dark_fabric: "Темная ткань / темная деталь",
  fill_contrast: "Контрастная деталь",
  fill_tape: "Тесьма / лента",
  fill_elastic: "Резинка / elastic band",
  material_sweat_band: "Внутренняя поясная лента",
  component_half_belt: "Полупояс / регулировочный хлястик",
  fill_cord: "Шнур / cord",
  fill_velcro: "Липучка: не уточнено",
  fill_velcro_hook: "Липучка: крючковая часть",
  fill_velcro_loop: "Липучка: петельная часть",
  fill_material_mask: "Маска материала",
  fill_pu_tape: "PU tape / полиуретановая лента",
  fill_piping: "Кант / piping",
  fill_glue: "Клеевая зона / glue",
  fill_shape: "Заливка / прочее",
  hw_zipper: "Молния",
  hw_zipper_tape: "Тесьма молнии",
  hw_loop: "Петля / рамка",
  callout_line: "Выноска",
  callout_zoom: "Выноска к увеличению",
  break_line: "Линия обрыва",
  line_elastic: "Резинка / эластичная линия",
  line_fur: "Мех / ворсовая линия",
  line_gathered_edge: "Мятый / собранный край",
  arrow: "Стрелка",
  stitch_symbol: "Символ строчки",
  unknown: "Неизвестно",
};

const REMOVED_ROLE_OPTIONS = new Set([
  "_skip",
  "boundary_lining",
  "boundary_zone",
  "construction_aux",
  "contour_cut",
  "contour_fold",
  "dim_line",
  "fill_binding",
  "fill_fur",
  "fill_gradient",
  "fill_pink_dark",
  "fill_pink_light",
  "fill_shadow",
  "guide_line",
  "hw_buckle",
  "hw_buckle_fill",
  "hw_button",
  "hw_buttonhole",
  "hw_other",
  "hw_snap",
  "hw_zipper_tape_edge",
  "line_decorative",
  "line_mesh",
  "line_photo_trace",
  "line_reference",
  "line_velcro",
  "seam_allowance",
  "stitch_C",
  "stitch_F",
  "stitch_L",
  "stitch_O",
  "stitch_cover",
  "stitch_double",
  "stitch_hidden",
  "stitch_overlock",
  "stitch_topstitch",
  "stitch_zigzag",
]);

const roleLabel = role => ROLE_LABELS_UI[role] || role;

function roleCatalogEntry(roleCatalog, role) {
  return roleCatalog?.roles?.[role] || null;
}

function roleCatalogLabel(roleCatalog, role) {
  return roleCatalogEntry(roleCatalog, role)?.label_ru || roleLabel(role);
}

function activeRoleChoices(roleCatalog) {
  if (Array.isArray(roleCatalog?.role_choices) && roleCatalog.role_choices.length) {
    return roleCatalog.role_choices;
  }
  return ROLE_GROUPS_UI.flatMap(group =>
    group.roles
      .filter(role => !REMOVED_ROLE_OPTIONS.has(role))
      .map(role => ({
        choice_key: role,
        label_ru: roleLabel(role),
        group: group.label,
        role,
      }))
  );
}

function roleLayerKind(style = {}) {
  const fill = style?.fill || "none";
  const stroke = style?.stroke || "none";
  if (fill && fill !== "none") return "fill";
  if (stroke && stroke !== "none") return "stroke";
  return "symbol";
}

function choiceKeyForRole(roleCatalog, role) {
  const choices = activeRoleChoices(roleCatalog);
  const found = choices.find(choice => {
    if (choice.role === role) return true;
    return Object.values(choice.variants || {}).includes(role);
  });
  return found?.choice_key || role || "unknown";
}

function roleForChoice(roleCatalog, choiceKey, style = {}) {
  const choice = activeRoleChoices(roleCatalog).find(item => item.choice_key === choiceKey);
  if (!choice) return choiceKey || "unknown";
  if (choice.role) return choice.role;
  const variants = choice.variants || {};
  const layer = roleLayerKind(style);
  return variants[layer] || variants.fill || variants.stroke || variants.symbol || Object.values(variants)[0] || "unknown";
}

function roleObjectLabel(roleCatalog, role) {
  const entry = roleCatalogEntry(roleCatalog, role);
  const objectRole = entry?.object_role;
  if (objectRole && roleCatalog?.object_roles?.[objectRole]?.label_ru) {
    return roleCatalog.object_roles[objectRole].label_ru;
  }
  if (entry?.label_ru?.includes(":")) {
    return entry.label_ru.split(":")[0].trim();
  }
  return entry?.label_ru || "";
}

function roleMetaLine(roleCatalog, role) {
  const entry = roleCatalogEntry(roleCatalog, role);
  if (!entry) return "";
  return "";
}

function roleMetaTitle(roleCatalog, role) {
  const entry = roleCatalogEntry(roleCatalog, role);
  if (!entry) return "";
  const bits = [
    entry.label_ru,
    entry.family,
    entry.entity_type,
    entry.object_role,
    entry.part_role,
  ].filter(Boolean);
  return bits.join(" · ");
}

function objectLabelForRole(role, roleCatalog = null) {
  const catalogLabel = roleObjectLabel(roleCatalog, role);
  if (catalogLabel) return catalogLabel;
  const r = role || "";
  if (r === "fill_elastic" || r === "line_elastic") return "Резинка / elastic band";
  if (r === "line_gathered_edge") return "Окантовка / край";
  if (r.startsWith("hw_zipper")) return "Молния";
  if (r.startsWith("boundary_interlining") || r === "fill_interlining") return "Флизелин / interlining";
  if (r.startsWith("stitch_")) return "Строчка";
  if (r.startsWith("callout_") || r === "arrow") return "Выноска / обозначение";
  if (r.startsWith("contour_")) return "Контур / форма";
  if (r.startsWith("fill_")) return roleLabel(role);
  return roleLabel(role);
}

function layerLabelForRole(role, style = {}) {
  const r = role || "";
  if (r.startsWith("fill_") || (style.fill && style.fill !== "none")) return "заливка";
  return "обводка";
}

function StyleParams({ style }) {
  const stroke = style?.stroke || "none";
  const fill = style?.fill || "none";
  const width = style?.width ?? "—";
  const dash = style?.dasharray && style.dasharray !== "none" ? style.dasharray : "нет";
  const hasStroke = stroke && stroke !== "none";
  const hasFill = fill && fill !== "none";
  return (
    <div className="vse-style-params" title={`Обводка: ${stroke}; заливка: ${fill}; толщина: ${width}; пунктир: ${dash}`}>
      {hasFill && (
        <span className={`vse-style-fill${hasFill ? "" : " vse-style-muted"}`} title={`Заливка ${fill}`}>
          <ColorDot hex={fill} />
        </span>
      )}
      {hasStroke && (
        <>
          <span className={`vse-style-line${hasStroke ? "" : " vse-style-muted"}`} title={`Обводка ${stroke}, толщина ${width}, пунктир ${dash}`}>
            <LineSwatch color={stroke} width={width} dashed={dash !== "нет"} />
          </span>
          <span className="vse-style-width" title={`Толщина ${width}`}>
            <code>{width}</code>
          </span>
        </>
      )}
      {!hasFill && !hasStroke && <span className="vse-style-muted"><span className="vse-swatch-empty" /></span>}
    </div>
  );
}

for (const groups of [ROLE_GROUPS, ROLE_GROUPS_UI]) {
  const fillGroup = groups.find(group => Array.isArray(group.roles) && group.roles.includes("fill_material_mask"));
  if (fillGroup && !fillGroup.roles.includes("fill_white_detail")) {
    fillGroup.roles.splice(fillGroup.roles.indexOf("fill_material_mask") + 1, 0, "fill_white_detail");
  }
}

ROLE_LABELS.fill_white_detail = "Видимая белая деталь";
ROLE_LABELS_CLEAN.fill_white_detail = "Видимая белая деталь";
ROLE_LABELS_UI.fill_white_detail = "Видимая белая деталь";

function RoleOptions({ roleCatalog = null } = {}) {
  const byGroup = new Map();
  for (const choice of activeRoleChoices(roleCatalog)) {
    if (!choice?.choice_key) continue;
    const group = choice.group || "Прочее";
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(choice);
  }
  return [...byGroup.entries()].map(([group, choices]) => (
    <optgroup key={group} label={group}>
      {choices.map(choice => (
        <option key={choice.choice_key} value={choice.choice_key}>
          {choice.label_ru || choice.choice_key}
        </option>
      ))}
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

function resolveDisplayStyle(baseEntry = {}, role) {
  const roleStyle = role ? ROLE_STYLES[role] || null : null;
  return {
    stroke: roleStyle?.stroke || baseEntry.stroke || "#999999",
    fill: roleStyle?.fill || baseEntry.fill || "none",
    width: roleStyle?.["stroke-width"] ? parseFloat(roleStyle["stroke-width"]) : (baseEntry.width ?? 0.5),
    dashed: roleStyle?.["stroke-dasharray"]
      ? roleStyle["stroke-dasharray"] !== "none" && roleStyle["stroke-dasharray"] !== ""
      : Boolean(baseEntry.dashed),
    dasharray: roleStyle?.["stroke-dasharray"] || (baseEntry.dashed ? "4 2" : "none"),
  };
}

function resolveActualStyle(baseEntry = {}) {
  return {
    stroke: baseEntry.stroke || "#999999",
    fill: baseEntry.fill || "none",
    width: baseEntry.width ?? 0.5,
    dashed: Boolean(baseEntry.dashed),
    dasharray: baseEntry.dashed ? "4 2" : "none",
  };
}

function styleFromGroupKey(groupKey) {
  const parts = String(groupKey || "").split("|");
  if (parts.length < 5) return null;
  return resolveActualStyle({
    stroke: parts[1] || "#999999",
    fill: parts[2] || "none",
    width: parseFloat(parts[3] || "0") || 0.5,
    dashed: parts[4] === "true",
  });
}

function parseRenderedGroupStyles(svgText) {
  if (!svgText || typeof DOMParser === "undefined") return {};
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const map = {};
  const els = [...doc.querySelectorAll("[data-group-key]")].filter(el => !el.closest("defs"));
  for (const el of els) {
    const groupKey = el.getAttribute("data-group-key");
    if (!groupKey || map[groupKey]) continue;
    const dasharray = resolveAttr(el, "stroke-dasharray") || "none";
    map[groupKey] = resolveActualStyle({
      stroke: normalizeHex(resolveAttr(el, "stroke")) || "none",
      fill: normalizeHex(resolveAttr(el, "fill")) || "none",
      width: parseFloat(resolveAttr(el, "stroke-width") || "0") || 0,
      dashed: dasharray !== "none" && dasharray !== "0" && dasharray !== "",
    });
  }
  return map;
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

function cssAttrEscape(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildSvgOverrideCss({ roleOverrides, elemOverrides, selectedElemKey, singleOverride }) {
  const shapeSel = "path, line, polyline, polygon, rect, circle, ellipse";
  const groupRules = Object.entries(roleOverrides || {}).map(([groupKey, newRole]) => {
    const ds = resolveDisplayStyle({}, newRole);
    const g = cssAttrEscape(groupKey);
    return `
[data-group-key="${g}"],
[data-group-key="${g}"] ${shapeSel} {
  stroke: ${ds.stroke} !important;
  stroke-width: ${ds.width} !important;
  stroke-dasharray: ${ds.dasharray === "none" ? "none" : ds.dasharray} !important;
  opacity: 1 !important;
}`;
  }).join("\n");

  const elemRules = Object.entries(elemOverrides || {}).map(([elemKey, newRole]) => {
    const ds = resolveDisplayStyle({}, newRole);
    const e = cssAttrEscape(elemKey);
    return `
[data-elem-key="${e}"],
[data-elem-key="${e}"] ${shapeSel} {
  stroke: ${ds.stroke} !important;
  stroke-width: ${ds.width} !important;
  stroke-dasharray: ${ds.dasharray === "none" ? "none" : ds.dasharray} !important;
  opacity: 1 !important;
}`;
  }).join("\n");

  const singleRule = selectedElemKey && singleOverride?.newRole ? (() => {
    const ds = resolveDisplayStyle({}, singleOverride.newRole);
    const e = cssAttrEscape(selectedElemKey);
    return `
[data-elem-key="${e}"],
[data-elem-key="${e}"] ${shapeSel} {
  stroke: ${ds.stroke} !important;
  stroke-width: ${ds.width} !important;
  stroke-dasharray: ${ds.dasharray === "none" ? "none" : ds.dasharray} !important;
  opacity: 1 !important;
}`;
  })() : "";

  return [groupRules, elemRules, singleRule].filter(Boolean).join("\n");
}

function injectSvgOverrideStyle(svgText, cssText) {
  if (!svgText || !cssText) return svgText;
  return svgText.replace(/<svg\b([^>]*)>/i, `<svg$1><style id="vse-inline-overrides">${cssText}</style>`);
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
    "fill_velcro_hook",
    "fill_velcro_loop",
    "fill_white_detail",
    "contour_outer",
    "stitch_edge",
    "stitch_thru",
  ]);
  const genericFillClusterRoles = new Set(["fill_cord", "fill_elastic"]);

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

function ZoomableSvgPanel({ url, label, hdrClass, hoveredEntry, mode, svgPrefix, roleOverrides, elemOverrides, selectedElemKey, selectedElemIndex, singleOverride, onElementClick }) {
  const wrapRef  = useRef(null);
  const hlRef    = useRef(null); // ref to query SVG elements
  const [svgHtml, setSvgHtml] = useState(""); // SVG content managed by React
  const [ready, setReady]     = useState(false);
  const [loadError, setLoadError] = useState("");
  // CSS-based live preview: inject <style> overrides that survive innerHTML resets
  const overrideStyleId = `vse-override-${svgPrefix}`;
  useEffect(() => {
    if (mode !== "std" || !roleOverrides) return;
    let el = document.getElementById(overrideStyleId);
    if (!el) {
      el = document.createElement('style');
      el.id = overrideStyleId;
      document.head.appendChild(el);
    }
    const rules = Object.entries(roleOverrides).map(([groupKey, newRole]) => {
      const ns = ROLE_STYLES[newRole];
      if (!ns || !groupKey) return '';
      const strokeRule = ns.stroke && ns.stroke !== 'none' ? `stroke: ${ns.stroke} !important;` : '';
      const widthRule = ns['stroke-width'] ? `stroke-width: ${ns['stroke-width']} !important;` : '';
      const dashRule = ns['stroke-dasharray']
        ? `stroke-dasharray: ${ns['stroke-dasharray'] === 'none' ? 'none' : ns['stroke-dasharray']} !important;`
        : '';
      const sel = `.${svgPrefix.replace(/[^a-zA-Z0-9]/g, '_')} [data-group-key="${groupKey}"]`;
      return `${sel}, ${sel} path, ${sel} line, ${sel} polyline, ${sel} polygon { ${strokeRule} ${widthRule} ${dashRule} opacity: 1 !important; }`;
    }).join('\n');
    const elemRules = elemOverrides ? Object.entries(elemOverrides).map(([elemKey, newRole]) => {
      const ns = ROLE_STYLES[newRole];
      if (!ns) return '';
      const strokeR = ns.stroke && ns.stroke !== 'none' ? `stroke: ${ns.stroke} !important;` : '';
      const widthR = ns['stroke-width'] ? `stroke-width: ${ns['stroke-width']} !important;` : '';
      const dashR = ns['stroke-dasharray'] ? `stroke-dasharray: ${ns['stroke-dasharray'] === 'none' ? 'none' : ns['stroke-dasharray']} !important;` : '';
      const s = `.${svgPrefix.replace(/[^a-zA-Z0-9]/g, '_')} [data-elem-key="${elemKey}"]`;
      return `${s}, ${s} path { ${strokeR} ${widthR} ${dashR} opacity: 1 !important; }`;
    }).join('\n') : '';

    // Single-element override via [data-selected]
    if (singleOverride) {
      const ns = ROLE_STYLES[singleOverride.newRole];
      if (ns) {
        const strokeRule = ns.stroke && ns.stroke !== 'none' ? `stroke: ${ns.stroke} !important;` : '';
        const widthRule = ns['stroke-width'] ? `stroke-width: ${ns['stroke-width']} !important;` : '';
        const dashRule = ns['stroke-dasharray']
          ? `stroke-dasharray: ${ns['stroke-dasharray'] === 'none' ? 'none' : ns['stroke-dasharray']} !important;`
          : '';
        const selSingle = `.${svgPrefix.replace(/[^a-zA-Z0-9]/g, '_')} [data-selected="1"]`;
        const singleRule = `${selSingle}, ${selSingle} path, ${selSingle} line, ${selSingle} polyline, ${selSingle} polygon { ${strokeRule} ${widthRule} ${dashRule} opacity: 1 !important; }`;
        el.textContent = rules + '\n' + elemRules + '\n' + singleRule;
      } else {
        el.textContent = rules + '\n' + elemRules;
      }
    } else {
      el.textContent = rules + '\n' + elemRules;
    }
    return () => { el.textContent = ''; };
  }, [roleOverrides, elemOverrides, singleOverride, mode, svgPrefix]);

  // Apply data-selected after every render
  useEffect(() => {
    if (!hlRef.current || !ready) return;
    const els = [...hlRef.current.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
      .filter(el => !el.closest("defs"));
    els.forEach((p, idx) => {
      const byKey = selectedElemKey && p.getAttribute("data-elem-key") === selectedElemKey;
      const byIndex = !selectedElemKey && Number.isInteger(selectedElemIndex) && idx === selectedElemIndex;
      if (byKey || byIndex) p.setAttribute("data-selected", "1");
      else p.removeAttribute("data-selected");
    });
  }, [selectedElemKey, selectedElemIndex, svgHtml, ready]);

  const displayHtml = useMemo(() => {
    if (mode !== "std") return svgHtml;
    const cssText = buildSvgOverrideCss({ roleOverrides, elemOverrides, selectedElemKey, singleOverride });
    return injectSvgOverrideStyle(svgHtml, cssText);
  }, [svgHtml, mode, roleOverrides, elemOverrides, selectedElemKey, singleOverride]);
  const [scale, setScale]     = useState(1);
  const [pan,   setPan]       = useState({ x: 0, y: 0 });
  // Set of path indices that should be highlighted (index into `els` query)
  const [matchedIndices, setMatchedIndices] = useState(null); // null = no hover
  const dragging = useRef(null);

  // Load SVG text into hidden div for DOM queries
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setScale(1);
    setPan({ x: 0, y: 0 });
    setReady(false);
    setLoadError("");
    setSvgHtml("");
    setMatchedIndices(null);
    cachedFetch(url)
      .then(text => {
        if (cancelled) return;
        setSvgHtml(sanitizeSvg(text, svgPrefix));
        setReady(true);
      })
      .catch(err => {
        if (cancelled) return;
        setLoadError(String(err?.message || err));
        setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, svgPrefix]);

  const fitToView = () => {
    const viewport = wrapRef.current;
    const svgEl = hlRef.current?.querySelector("svg");
    if (!viewport || !svgEl) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const vp = viewport.getBoundingClientRect();
    const box = svgEl.getBoundingClientRect();
    if (!vp.width || !vp.height || !box.width || !box.height) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const currentScale = scale || 1;
    const baseWidth = box.width / currentScale;
    const baseHeight = box.height / currentScale;
    const widthScale = (vp.width - 20) / baseWidth;
    const heightScale = (vp.height - 20) / baseHeight;
    const nextScale = Math.max(0.3, Math.min(1, widthScale, heightScale));
    setScale(nextScale);
    setPan({
      x: Math.max(0, (vp.width - baseWidth * nextScale) / 2 - 8),
      y: Math.max(0, (vp.height - baseHeight * nextScale) / 2 - 8),
    });
  };

  useEffect(() => {
    if (!ready || !svgHtml) return;
    const frame = requestAnimationFrame(fitToView);
    return () => cancelAnimationFrame(frame);
  }, [ready, svgHtml]);

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

  const onMouseDown = e => { if (e.button !== 0) return; dragging.current = { sx: e.clientX - pan.x, sy: e.clientY - pan.y, moved: false }; };
  const onMouseMove = e => { if (!dragging.current) return; dragging.current.moved = true; setPan({ x: e.clientX - dragging.current.sx, y: e.clientY - dragging.current.sy }); };
  const onMouseUp   = () => { dragging.current = null; };
  const reset       = () => { fitToView(); };

  const onViewportClick = e => {
    if (!onElementClick || mode !== "std") return;
    if (dragging.current?.moved) return;
    let path = e.target.closest("path, line, polyline, polygon, circle, ellipse, rect");
    if ((!path || !hlRef.current?.contains(path)) && hlRef.current) {
      // Missed thin stroke — find nearest path within 12px
      const allEls = [...hlRef.current.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
        .filter(el => !el.closest("defs"));
      let best = null, bestDist = 12;
      for (const el of allEls) {
        const bb = el.getBoundingClientRect();
        const dx = Math.max(bb.left - e.clientX, 0, e.clientX - bb.right);
        const dy = Math.max(bb.top - e.clientY, 0, e.clientY - bb.bottom);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; best = el; }
      }
      path = best;
    }
    if (!path || !hlRef.current?.contains(path)) return;
    const role = path.getAttribute("data-role") || path.closest("[data-role]")?.getAttribute("data-role");
    if (!role) return;
    const els = [...hlRef.current.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
      .filter(el => !el.closest("defs"));
    const idx = els.indexOf(path);
    const dasharray = resolveAttr(path, "stroke-dasharray") || "none";
    onElementClick({
      role,
      idx,
      elemKey: path.getAttribute("data-elem-key") || "",
      groupKey: path.getAttribute("data-group-key") || "",
      pathD: path.getAttribute("d") || path.getAttribute("points") || "",
      renderedRole: role,
      stroke: normalizeHex(resolveAttr(path, "stroke")) || "none",
      fill: normalizeHex(resolveAttr(path, "fill")) || "none",
      width: parseFloat(resolveAttr(path, "stroke-width") || "0") || 0,
      dashed: dasharray !== "none" && dasharray !== "0" && dasharray !== "",
    });
  };

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
        onClick={onViewportClick}
      >
        {!ready && !loadError && <div className="vse-svg-state">Загрузка SVG...</div>}
        {loadError && <div className="vse-svg-state vse-svg-state-error">Ошибка SVG: {loadError}</div>}
        <div className="vse-zoom-content"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          <div
            ref={hlRef}
            className={`vse-zoom-img ${svgPrefix.replace(/[^a-zA-Z0-9]/g, '_')}`}
            draggable={false}
            style={{ opacity: dimmed ? 0.15 : 1, transition: "opacity .15s" }}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
          {/* Selected element overlay — yellow outline */}
          {ready && selectedElemKey && (() => {
            const hidden = hlRef.current;
            if (!hidden) return null;
            const svgEl = hidden.querySelector("svg");
            if (!svgEl) return null;
            const vb = svgEl.getAttribute("viewBox");
            const els = [...hidden.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
              .filter(el => !el.closest("defs"));
            const sel = els.find(el => el.getAttribute("data-elem-key") === selectedElemKey);
            if (!sel) return null;
            const clone = sel.cloneNode(true);
            // Apply singleOverride style if set, otherwise show original with yellow highlight
            if (singleOverride) {
              const ns = ROLE_STYLES[singleOverride.newRole];
              if (ns) {
                if (ns.stroke && ns.stroke !== "none") clone.style.stroke = ns.stroke;
                if (ns["stroke-width"]) clone.style.strokeWidth = ns["stroke-width"];
                if (ns["stroke-dasharray"]) clone.style.strokeDasharray = ns["stroke-dasharray"];
              }
              clone.style.filter = "drop-shadow(0 0 3px #C8A84B)";
            } else {
              clone.style.stroke = "#C8A84B";
              clone.style.filter = "drop-shadow(0 0 4px #C8A84B)";
            }
            clone.style.fill = "none";
            clone.style.opacity = "1";
            return (
              <svg viewBox={vb} className="vse-zoom-overlay" xmlns="http://www.w3.org/2000/svg" style={{pointerEvents:"none"}}>
                <g dangerouslySetInnerHTML={{ __html: clone.outerHTML }} />
              </svg>
            );
          })()}
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
                  // Apply roleOverride styles to clone so overlay reflects live preview
                  if (roleOverrides && mode === "std") {
                    const applyOverride = (target) => {
                      const elRole = target.getAttribute("data-role") || target.closest?.("[data-role]")?.getAttribute("data-role");
                      if (!elRole) return;
                      const entry = Object.entries(roleOverrides).find(([mk]) => mk.split("|")[0] === elRole);
                      if (!entry) return;
                      const ns = ROLE_STYLES[entry[1]];
                      if (!ns) return;
                      if (ns.stroke && ns.stroke !== "none") target.style.stroke = ns.stroke;
                      if (ns["stroke-width"]) target.style.strokeWidth = ns["stroke-width"];
                      if (ns["stroke-dasharray"]) target.style.strokeDasharray = ns["stroke-dasharray"] === "none" ? "none" : ns["stroke-dasharray"];
                    };
                    applyOverride(clone);
                    clone.querySelectorAll?.("[data-role]").forEach(applyOverride);
                  }
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

function isServiceNode(node) {
  const text = `${node?.sourceFile || ""} ${node?.label || ""} ${node?.id || ""}`.toLowerCase();
  return text.includes("игнорировать");
}

function firstWorkNode(nodes) {
  return nodes.find(n => !isServiceNode(n)) || nodes[0] || null;
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
const API = `http://${window.location.hostname}:7070`;

// Module-level SVG text cache — keyed by URL (includes ?t=buildTs)
const _svgTextCache = new Map();
function cachedFetch(url) {
  if (_svgTextCache.has(url)) return Promise.resolve(_svgTextCache.get(url));
  return fetch(url, { cache: "no-store" }).then(r => r.text()).then(t => { _svgTextCache.set(url, t); return t; });
}
function clearNodeCache(nodeId) {
  for (const key of _svgTextCache.keys()) {
    if (key.includes(nodeId)) _svgTextCache.delete(key);
  }
}

function traceStatusTone(status) {
  switch (status) {
    case "OK": return { bg: "#eaf7ef", fg: "#1d6b3a", bd: "#9bd0ad" };
    case "FAIL": return { bg: "#fff1f1", fg: "#a12626", bd: "#e0a2a2" };
    case "WARN": return { bg: "#fff8e8", fg: "#8a5a00", bd: "#e5c987" };
    case "DRAFT": return { bg: "#eef3ff", fg: "#3156a3", bd: "#b3c2ec" };
    case "SAVED": return { bg: "#f2f5f7", fg: "#4d5b66", bd: "#cbd4db" };
    case "RENDERED": return { bg: "#f0f8f6", fg: "#24695d", bd: "#a9d2c8" };
    default: return { bg: "#f4f4f4", fg: "#555", bd: "#ddd" };
  }
}

function TraceWarnings({ warnings }) {
  const items = (warnings || []).filter(Boolean);
  if (!items.length) return "—";
  return (
    <div style={{display:"grid", gap:4}}>
      {items.map((msg, idx) => (
        <div key={idx} style={{whiteSpace:"normal", wordBreak:"break-word", lineHeight:1.3}}>
          {msg}
        </div>
      ))}
    </div>
  );
}

function ContractMonitorPanel({ trace, loading, error, filter, onFilterChange, onRefresh, onClose, selectedEl }) {
  const selectedElemKey = selectedEl?.elemKey || "";
  const selectedGroupKey = selectedEl?.groupKey || "";
  const selectedPathD = selectedEl?.pathD || "";
  const selectedRenderedRole = selectedEl?.renderedRole || selectedEl?.role || "";

  const selectedTrace = useMemo(() => {
    const rows = trace?.elements || [];
    if (selectedElemKey) {
      return rows.find(row => row.elem_key === selectedElemKey) || null;
    }
    if (selectedPathD) {
      const normalized = selectedPathD.trim();
      const byPrefix = rows.find(row => {
        const prefix = (row.path_d_prefix || "").trim();
        if (!prefix) return false;
        return normalized.startsWith(prefix) || prefix.startsWith(normalized.slice(0, Math.min(normalized.length, 48)));
      });
      if (byPrefix) return byPrefix;
    }
    if (selectedRenderedRole) {
      return rows.find(row => row.rendered_role === selectedRenderedRole && row.match_status !== "unmatched") || null;
    }
    return null;
  }, [trace?.elements, selectedElemKey, selectedPathD, selectedRenderedRole]);

  const effectiveSelectedElemKey = selectedElemKey || selectedTrace?.elem_key || "";
  const effectiveSelectedGroupKey = selectedGroupKey || selectedTrace?.group_key || "";

  const groups = useMemo(() => {
    const rows = trace?.groups || [];
    return rows.filter(row => {
      if (filter === "changed") return row.changed;
      if (filter === "failed") return row.status === "FAIL" || row.status === "WARN";
      if (filter === "selected") return effectiveSelectedGroupKey && row.group_key === effectiveSelectedGroupKey;
      return true;
    });
  }, [trace?.groups, filter, effectiveSelectedGroupKey]);

  const elements = useMemo(() => {
    const rows = trace?.elements || [];
    return rows.filter(row => {
      if (filter === "changed") return row.changed;
      if (filter === "failed") return row.status === "FAIL" || row.status === "WARN";
      if (filter === "selected") return effectiveSelectedElemKey && row.elem_key === effectiveSelectedElemKey;
      return true;
    });
  }, [trace?.elements, filter, effectiveSelectedElemKey]);

  return (
    <div data-testid="contract-monitor" style={{marginTop:12, border:"1px solid #d8c08a", borderRadius:8, background:"#fffdf8", overflow:"hidden"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:"#f7f1df", borderBottom:"1px solid #e3d3aa"}}>
        <div>
          <strong>Contract Monitor</strong>
          <div style={{fontSize:11, color:"#6f6652"}}>{trace?.node_id || "—"} · save-state loop</div>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button data-testid="contract-monitor-refresh" className="vse-save-btn" onClick={onRefresh} disabled={loading} style={{padding:"6px 10px"}}>
            {loading ? "Обновляем…" : "Refresh trace"}
          </button>
          <button data-testid="contract-monitor-close" type="button" className="vse-save-btn" onClick={onClose} style={{padding:"6px 10px"}}>
            Закрыть
          </button>
        </div>
      </div>

      <div style={{padding:"10px 12px", display:"grid", gap:10}}>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          {[
            ["all", "All"],
            ["changed", "Changed only"],
            ["failed", "Failed only"],
            ["selected", "Selected only"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onFilterChange(id)}
              style={{
                padding:"4px 8px",
                borderRadius:999,
                border:"1px solid #c8a84b",
                background: filter === id ? "#c8a84b" : "#fff",
                color: filter === id ? "#fff" : "#7a6430",
                cursor:"pointer",
                fontSize:12,
              }}
            >{label}</button>
          ))}
        </div>

        {error && <div style={{color:"#a12626", fontSize:12}}>Ошибка trace: {error}</div>}

        {trace?.summary && (
          <div style={{display:"grid", gridTemplateColumns:"repeat(6, minmax(0, 1fr))", gap:8, fontSize:12}}>
            {[
              ["Группы", trace.summary.groups_total],
              ["Элементы", trace.summary.elements_total],
              ["Изм. групп", trace.summary.changed_groups],
              ["Изм. эл.", trace.summary.changed_elements],
              ["Fail", (trace.summary.failed_groups || 0) + (trace.summary.failed_elements || 0)],
              ["Warn", trace.summary.warnings || 0],
            ].map(([label, value]) => (
              <div key={label} style={{padding:"8px 10px", background:"#fff", border:"1px solid #eadfbe", borderRadius:6}}>
                <div style={{fontSize:11, color:"#7b7364"}}>{label}</div>
                <div style={{fontWeight:700}}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{padding:"8px 10px", background:"#fff", border:"1px solid #eadfbe", borderRadius:6, fontSize:12}}>
          <div style={{fontWeight:700, marginBottom:6}}>Selected element</div>
          {selectedEl ? (
            <div style={{display:"grid", gap:4}}>
              <div><strong>elem_key:</strong> <code>{effectiveSelectedElemKey || "—"}</code></div>
              <div><strong>group_key:</strong> <code>{effectiveSelectedGroupKey || "—"}</code></div>
              <div><strong>rendered_role:</strong> <code>{selectedEl.renderedRole || selectedEl.role || "—"}</code></div>
              {selectedTrace ? (
                <>
                  <div><strong>detected:</strong> <code>{selectedTrace.detected_role || "—"}</code></div>
                  <div><strong>override:</strong> <code>{selectedTrace.override_role || "—"}</code></div>
                  <div><strong>final:</strong> <code>{selectedTrace.final_role || "—"}</code></div>
                  <div><strong>match_status:</strong> <code>{selectedTrace.match_status || "—"}</code></div>
                </>
              ) : (
                <div style={{color:"#a12626"}}>FAIL: выбранный элемент не найден в node-state trace.</div>
              )}
            </div>
          ) : (
            <div style={{color:"#7b7364"}}>Выбери элемент в панели стандарта.</div>
          )}
        </div>

        <div style={{display:"grid", gap:8}}>

          <div style={{fontWeight:700}}>Groups Trace</div>
          <div style={{overflowX:"auto"}}>
            <table className="vse-table" style={{minWidth:1100}}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>group_key</th>
                  <th>detected</th>
                  <th>override</th>
                  <th>final</th>
                  <th>rendered</th>
                  <th>count</th>
                  <th>match</th>
                  <th>flags</th>
                  <th>warnings</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((row) => {
                  const tone = traceStatusTone(row.status);
                  return (
                    <tr key={row.group_key}>
                      <td><span style={{padding:"2px 6px", borderRadius:999, background:tone.bg, color:tone.fg, border:`1px solid ${tone.bd}`, fontSize:11, fontWeight:700}}>{row.status}</span></td>
                      <td><code>{row.group_key}</code></td>
                      <td><code>{row.detected_role || "—"}</code></td>
                      <td><code>{row.override_role || "—"}</code></td>
                      <td><code>{row.final_role || "—"}</code></td>
                      <td><code>{JSON.stringify(row.rendered_roles_summary || {})}</code></td>
                      <td>{row.count}</td>
                      <td><code>{row.match_status || "—"}</code></td>
                      <td>{[row.changed ? "changed" : null, row.saved ? "saved" : null, row.rendered ? "rendered" : null].filter(Boolean).join(" · ") || "—"}</td>
                      <td style={{minWidth:280, maxWidth:360}}>
                        <TraceWarnings warnings={row.warnings} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{display:"grid", gap:8}}>
          <div style={{fontWeight:700}}>Elements Trace</div>
          <div style={{overflowX:"auto"}}>
            <table className="vse-table" style={{minWidth:1300}}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>elem_key</th>
                  <th>group_key</th>
                  <th>detected</th>
                  <th>group_final</th>
                  <th>override</th>
                  <th>final</th>
                  <th>rendered_role</th>
                  <th>match</th>
                  <th>flags</th>
                  <th>warnings</th>
                </tr>
              </thead>
              <tbody>
                {elements.map((row) => {
                  const tone = traceStatusTone(row.status);
                  return (
                    <tr key={row.elem_key} style={effectiveSelectedElemKey && row.elem_key === effectiveSelectedElemKey ? {background:"#fff8e3"} : undefined}>
                      <td><span style={{padding:"2px 6px", borderRadius:999, background:tone.bg, color:tone.fg, border:`1px solid ${tone.bd}`, fontSize:11, fontWeight:700}}>{row.status}</span></td>
                      <td><code>{row.elem_key}</code></td>
                      <td><code>{row.group_key}</code></td>
                      <td><code>{row.detected_role || "—"}</code></td>
                      <td><code>{row.group_final_role || "—"}</code></td>
                      <td><code>{row.override_role || "—"}</code></td>
                      <td><code>{row.final_role || "—"}</code></td>
                      <td><code>{row.rendered_role || "—"}</code></td>
                      <td><code>{row.match_status || "—"}</code></td>
                      <td>{[row.changed ? "changed" : null, row.saved ? "saved" : null, row.rendered ? "rendered" : null].filter(Boolean).join(" · ") || "—"}</td>
                      <td style={{minWidth:280, maxWidth:360}}>
                        <TraceWarnings warnings={row.warnings} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabCompare({ manifest, buildTs, onNodeUpdated }) {
  const [activeId, setActiveId] = useState(() => firstWorkNode(manifest)?.id);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [nodeQuery, setNodeQuery] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [nodeState, setNodeState] = useState(null);
  const [nodeStateError, setNodeStateError] = useState("");
  const [groupDrafts, setGroupDrafts] = useState({});
  const [elementDrafts, setElementDrafts] = useState({});
  const [selectedEl, setSelectedEl] = useState(null);
  const [singleOverride, setSingleOverride] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ state: "idle", message: "" });
  const [saving, setSaving] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractTrace, setContractTrace] = useState(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractFilter, setContractFilter] = useState("all");
  const [renderedGroupStyles, setRenderedGroupStyles] = useState({});
  const [roleCatalog, setRoleCatalog] = useState(null);
  const NS_KEY = "vse_node_statuses_v2";

  const [nodeStatuses, setNodeStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NS_KEY)) || { approved: [], complex: [] }; }
    catch { return { approved: [], complex: [] }; }
  });

  useEffect(() => {
    fetch(`${API}/api/role-catalog`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok !== false && data?.catalog?.roles) setRoleCatalog(data.catalog);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/api/node-status`)
      .then(r => r.json())
      .then(apiData => {
        setNodeStatuses(prev => {
          const approved = [...new Set([...(prev.approved || []), ...(apiData.approved || [])])];
          const complex = [...new Set([...(prev.complex || []), ...(apiData.complex || [])])];
          const merged = { approved, complex };
          try { localStorage.setItem(NS_KEY, JSON.stringify(merged)); } catch {}
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  const setNodeStatus = (nodeId, status) => {
    setNodeStatuses(prev => {
      const next = { approved: [...(prev.approved || [])], complex: [...(prev.complex || [])] };
      next.approved = next.approved.filter(id => id !== nodeId);
      next.complex = next.complex.filter(id => id !== nodeId);
      if (status === "approved") next.approved.push(nodeId);
      if (status === "complex") next.complex.push(nodeId);
      try { localStorage.setItem(NS_KEY, JSON.stringify(next)); } catch {}
      fetch(`${API}/api/node-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: nodeId, status }),
      }).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    setHoveredIdx(null);
    setNodeState(null);
    setNodeStateError("");
    setGroupDrafts({});
    setElementDrafts({});
    setSelectedEl(null);
    setSingleOverride(null);
    setContractTrace(null);
    setContractError("");
    setContractFilter("all");
    setSaveStatus({ state: "idle", message: "" });
  }, [activeId]);

  const refreshNodeState = async () => {
    if (!activeId) return;
    setNodeStateError("");
    try {
      const r = await fetch(`${API}/api/node-state/${encodeURIComponent(activeId)}?t=${Date.now()}`);
      const data = await r.json();
      if (!r.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${r.status}`);
      setNodeState(data);
    } catch (err) {
      setNodeState(null);
      setNodeStateError(String(err?.message || err));
    }
  };

  const refreshContractTrace = async () => {
    if (!activeId) return;
    setContractLoading(true);
    setContractError("");
    try {
      const r = await fetch(`${API}/api/node-contract-trace/${encodeURIComponent(activeId)}?t=${Date.now()}`);
      const data = await r.json();
      if (!r.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${r.status}`);
      setContractTrace(data);
    } catch (err) {
      setContractError(String(err?.message || err));
    } finally {
      setContractLoading(false);
    }
  };

  useEffect(() => {
    if (!manifest.length) return;
    if (!activeId || !manifest.some(n => n.id === activeId)) setActiveId(firstWorkNode(manifest)?.id);
  }, [manifest, activeId]);

  const node = manifest.find(n => n.id === activeId);

  useEffect(() => {
    if (!activeSection && node) setActiveSection(nodeSection(node));
  }, [activeSection, node]);

  useEffect(() => {
    refreshNodeState();
  }, [activeId, buildTs]);

  useEffect(() => {
    let cancelled = false;
    setRenderedGroupStyles({});
    if (!node?.stdSvg) return;
    cachedFetch(node.stdSvg + "?t=" + buildTs)
      .then(text => {
        if (!cancelled) setRenderedGroupStyles(parseRenderedGroupStyles(text));
      })
      .catch(() => {
        if (!cancelled) setRenderedGroupStyles({});
      });
    return () => {
      cancelled = true;
    };
  }, [node?.stdSvg, buildTs]);

  useEffect(() => {
    if (!contractOpen || !activeId) return;
    refreshContractTrace();
  }, [contractOpen, activeId, buildTs]);

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
    if (!q && node && !limited.some(n => n.id === node.id)) return [node, ...limited];
    return limited;
  }, [manifest, node, nodeQuery, activeSection]);

  const chooseSection = key => {
    setActiveSection(key);
    setNodeQuery("");
    const sectionNodes = key === "all" ? manifest : manifest.filter(n => nodeSection(n) === key);
    const next = firstWorkNode(sectionNodes);
    if (next) {
      setActiveId(next.id);
      setHoveredIdx(null);
    }
  };

  const groups = useMemo(() => {
    const rows = nodeState?.groups || [];
    return rows.map((group, idx) => {
      const parts = String(group.group_key || "").split("|");
      const stroke = parts[1] || "#999999";
      const fill = parts[2] || "none";
      const width = parseFloat(parts[3] || "0") || 0.5;
      const dashed = parts[4] === "true";
      const currentRole = Object.prototype.hasOwnProperty.call(groupDrafts, group.group_key)
        ? groupDrafts[group.group_key]
        : (group.override_role || group.final_role || group.detected_role || "unknown");
      return {
        mapKey: group.group_key,
        indices: [idx],
        count: group.count || 0,
        key_strs: group.key_strs || [],
        detected_role: group.detected_role || "unknown",
        override_role: group.override_role || null,
        final_role: group.final_role || group.detected_role || "unknown",
        currentRole,
        entry: { role: currentRole, stroke, fill, width, dashed },
        renderedStyle: renderedGroupStyles[group.group_key] || null,
      };
    });
  }, [nodeState, groupDrafts, renderedGroupStyles]);

  const selectedState = useMemo(() => {
    const rows = nodeState?.elements || [];
    if (!rows.length || !selectedEl) return null;
    if (selectedEl.elemKey) return rows.find(row => row.elem_key === selectedEl.elemKey) || null;
    const pathD = (selectedEl.pathD || "").trim();
    if (pathD) {
      return rows.find(row => {
        const prefix = (row.path_d_prefix || "").trim();
        return prefix && (pathD.startsWith(prefix) || prefix.startsWith(pathD.slice(0, Math.min(pathD.length, 48))));
      }) || null;
    }
    return null;
  }, [nodeState, selectedEl]);

  const selectedDisplayRole =
    singleOverride?.newRole
    ?? elementDrafts[selectedState?.elem_key || selectedEl?.elemKey || ""]
    ?? selectedState?.override_role
    ?? selectedState?.final_role
    ?? selectedState?.detected_role
    ?? selectedEl?.role
    ?? "unknown";

  const selectedDisplayStyle = resolveDisplayStyle({
    stroke: selectedEl?.stroke,
    fill: selectedEl?.fill,
    width: selectedEl?.width,
    dashed: selectedEl?.dashed,
  }, selectedDisplayRole);
  const selectedActualStyle = styleFromGroupKey(selectedState?.group_key) || resolveActualStyle({
    stroke: selectedEl?.stroke,
    fill: selectedEl?.fill,
    width: selectedEl?.width,
    dashed: selectedEl?.dashed,
  });

  useEffect(() => {
    if (!selectedEl) return;
    if (!selectedEl.elemKey && selectedState?.elem_key) {
      setSelectedEl(prev => prev ? { ...prev, elemKey: selectedState.elem_key, groupKey: selectedState.group_key || prev.groupKey } : prev);
    }
  }, [selectedEl, selectedState]);

  const safeIdx = hoveredIdx !== null && hoveredIdx < groups.length ? hoveredIdx : null;
  const hoveredGroup = safeIdx !== null ? groups[safeIdx] ?? null : null;
  const hoveredEntry = hoveredGroup ? { ...hoveredGroup.entry, key_strs: hoveredGroup.key_strs } : null;

  const assignedCount = groups.filter(g => g.currentRole && g.currentRole !== "?" && g.currentRole !== "unknown").length;
  const allAssigned = groups.length > 0 && assignedCount === groups.length;
  const reviewStatus = nodeState?.review_status || (nodeStatuses.approved?.includes(activeId) ? "approved" : nodeStatuses.complex?.includes(activeId) ? "complex" : "pending");

  const saveCompareChanges = async () => {
    if (!activeId || !nodeState) return;
    setSaving(true);
    setSaveStatus({ state: "building", message: "Сохраняем правки..." });
    try {
      const group_overrides = {};
      for (const group of nodeState.groups || []) {
        const hasDraft = Object.prototype.hasOwnProperty.call(groupDrafts, group.group_key);
        const desired = hasDraft ? groupDrafts[group.group_key] : group.override_role;
        if (desired && (hasDraft || desired !== group.detected_role)) {
          group_overrides[group.group_key] = { role: desired, key_strs: group.key_strs || [] };
        }
      }
      const element_overrides = {};
      for (const element of nodeState.elements || []) {
        const hasDraft = Object.prototype.hasOwnProperty.call(elementDrafts, element.elem_key);
        const desired = hasDraft ? elementDrafts[element.elem_key] : element.override_role;
        if (desired && (hasDraft || desired !== element.detected_role)) {
          element_overrides[element.elem_key] = { role: desired, path_d_prefix: element.path_d_prefix || "" };
        }
      }

      const putRes = await fetch(`${API}/api/node-annotations/${encodeURIComponent(activeId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_overrides, element_overrides, review_status: reviewStatus }),
      });
      const putData = await putRes.json();
      if (!putRes.ok || putData?.ok === false) throw new Error(putData?.error || `PUT failed: HTTP ${putRes.status}`);

      const regenRes = await fetch(`${API}/api/regenerate-node/${encodeURIComponent(activeId)}`, { method: "POST" });
      const regenData = await regenRes.json();
      if (!regenRes.ok || regenData?.ok === false) throw new Error(regenData?.error || `Regenerate failed: HTTP ${regenRes.status}`);

      clearNodeCache("");
      onNodeUpdated?.();
      await refreshNodeState();
      if (contractOpen) await refreshContractTrace();
      setGroupDrafts({});
      setElementDrafts({});
      setSingleOverride(null);
      setSaveStatus({ state: "ok", message: regenData?.message || "Правки сохранены, нод пересобран." });
    } catch (err) {
      setSaveStatus({ state: "error", message: String(err?.message || err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vse-compare">
      <div className="vse-node-picker">
        <div className="vse-node-picker-head">
          <input className="vse-node-search" type="search" value={nodeQuery} onChange={e => setNodeQuery(e.target.value)} placeholder="Поиск узла: код, название, id..." />
          <span className="vse-node-count">Показано {visibleNodes.length} из {manifest.length}</span>
        </div>
        <div className="vse-node-catalog">
          <div className="vse-node-sections" aria-label="Разделы схем">
            <button type="button" className={`vse-section-btn${activeSection === "all" ? " active" : ""}`} onClick={() => chooseSection("all")}>
              <span>Все схемы</span><b>{manifest.length}</b>
            </button>
            {sections.map(section => (
              <button type="button" key={section.key} className={`vse-section-btn${activeSection === section.key ? " active" : ""}`} onClick={() => chooseSection(section.key)} title={section.label}>
                <span>{section.label}</span><b>{section.count}</b>
              </button>
            ))}
          </div>
          <div className="vse-node-tabs">
            {visibleNodes.map(n => {
              const isApproved = nodeStatuses.approved?.includes(n.id);
              const isComplex = nodeStatuses.complex?.includes(n.id);
              return (
                <button key={n.id} className={`vse-node-tab${activeId === n.id ? " active" : ""}${isApproved ? " vse-node-tab-done" : ""}${isComplex ? " vse-node-tab-has-styles" : ""}`} onClick={() => { setActiveId(n.id); setHoveredIdx(null); }} title={`${n.label} ${n.code}`}>
                  <span className="vse-node-tab-main"><span className="vse-node-tab-title">{n.label}</span><span className="vse-code">{n.code}</span></span>
                  {isApproved && <span className="vse-node-done-mark">Готово</span>}
                  {isComplex && <span className="vse-node-done-mark" style={{background:"#C8A84B"}}>Сложный</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {contractOpen && <><div className="vse-contract-backdrop" onClick={() => setContractOpen(false)} /><div className="vse-contract-drawer"><ContractMonitorPanel trace={contractTrace} loading={contractLoading} error={contractError} filter={contractFilter} onFilterChange={setContractFilter} onRefresh={refreshContractTrace} onClose={() => setContractOpen(false)} selectedEl={selectedEl} /></div></>}

      {node && (
        <div className="vse-annotate-wrap">
          <div className="vse-panels-sticky">
            <div className="vse-dual-panels">
              <ZoomableSvgPanel url={node.origSvg + "?t=" + buildTs} label="ОРИГИНАЛ" hdrClass="orig" hoveredEntry={hoveredEntry} mode="orig" svgPrefix={`${activeId}_orig`} />
              <ZoomableSvgPanel url={node.stdSvg + "?t=" + buildTs} label="СТАНДАРТ" hdrClass="std" hoveredEntry={hoveredEntry} mode="std" svgPrefix={`${activeId}_std`} roleOverrides={groupDrafts} elemOverrides={elementDrafts} selectedElemKey={selectedEl?.elemKey || selectedState?.elem_key || ""} selectedElemIndex={selectedEl?.idx ?? null} singleOverride={singleOverride} onElementClick={el => { setSelectedEl(el); setSingleOverride(null); }} />
            </div>
          </div>

          <div className="vse-annotate-right-sticky">
            <div className="vse-annotate-right">
              {nodeStateError && <div className="vse-empty-roles"><strong>Ошибка загрузки node-state.</strong><span>{nodeStateError}</span></div>}
              {groups.length > 0 ? (
                <div className="vse-node-styles">
                  <div className="vse-node-styles-hdr"><span>Наведи на строку: подсветка на оригинале и стандарте</span><span>Роли из node-state</span><span className="vse-assign-progress">{assignedCount} / {groups.length}</span></div>
                  <table className="vse-table">
                    <thead><tr><th style={{width:"190px"}}>Сущность</th><th>Параметры</th><th style={{width:"44px"}}>Кол.</th><th style={{width:"220px"}}>Назначить роль</th></tr></thead>
                    <tbody>
                      {selectedEl && (
                        <tr className="vse-inspector-row vse-row-selected-el">
                          {(() => {
                            return (
                              <>
                          <td>
                            <div className="vse-object-cell" title={roleMetaTitle(roleCatalog, selectedDisplayRole) || undefined}>
                              <strong>{objectLabelForRole(selectedDisplayRole, roleCatalog)}</strong>
                              {roleMetaLine(roleCatalog, selectedDisplayRole) && (
                                <span title={roleMetaTitle(roleCatalog, selectedDisplayRole) || undefined}>{roleMetaLine(roleCatalog, selectedDisplayRole)}</span>
                              )}
                            </div>
                          </td>
                          <td><StyleParams style={selectedActualStyle} /></td>
                          <td className="vse-tc vse-muted">1</td>
                          <td style={{display:"flex",gap:"4px",alignItems:"center"}}>
                            <div style={{display:"flex",flexDirection:"column",gap:"2px",flex:1}}>
                              <span style={{fontSize:"11px",color:"#C8A84B"}}>Выбрано: {roleLabel(selectedState?.detected_role || selectedEl.role)}</span>
                              <select className="vse-role-sel-sm" style={{flex:1}} value={choiceKeyForRole(roleCatalog, selectedDisplayRole)} onChange={e => {
                                const newRole = roleForChoice(roleCatalog, e.target.value, selectedActualStyle);
                                const elemKey = selectedState?.elem_key || selectedEl?.elemKey;
                                setSingleOverride({ role: selectedState?.detected_role || selectedEl.role, newRole });
                                if (elemKey) setElementDrafts(prev => ({ ...prev, [elemKey]: newRole }));
                              }}><RoleOptions roleCatalog={roleCatalog} /></select>
                            </div>
                            <button title="Снять выделение" style={{fontSize:"11px",padding:"2px 5px",background:"#444",border:"none",borderRadius:"3px",cursor:"pointer",color:"#aaa"}} onClick={() => { setSelectedEl(null); setSingleOverride(null); }}>✕</button>
                          </td>
                              </>
                            );
                          })()}
                        </tr>
                      )}
                      {groups.map((g, idx) => {
                        const isHov = safeIdx === idx;
                        const assigned = g.currentRole && g.currentRole !== "?";
                        const actualStyle = resolveActualStyle(g.entry);
                        return (
                          <tr key={g.mapKey} className={`vse-inspector-row${isHov ? " hovered" : ""}${assigned ? " vse-row-filled" : ""}${Object.prototype.hasOwnProperty.call(groupDrafts, g.mapKey) ? " vse-row-override" : ""}`} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
                            <td>
                              <div className="vse-object-cell" title={roleMetaTitle(roleCatalog, g.currentRole) || undefined}>
                                <strong>{objectLabelForRole(g.currentRole, roleCatalog)}</strong>
                                {roleMetaLine(roleCatalog, g.currentRole) && (
                                  <span title={roleMetaTitle(roleCatalog, g.currentRole) || undefined}>{roleMetaLine(roleCatalog, g.currentRole)}</span>
                                )}
                              </div>
                            </td>
                            <td><StyleParams style={actualStyle} /></td>
                            <td className="vse-tc vse-muted">{g.count}</td>
                            <td><select className="vse-role-sel-sm" value={choiceKeyForRole(roleCatalog, g.currentRole ?? "?")} onChange={e => {
                              const newRole = roleForChoice(roleCatalog, e.target.value, actualStyle);
                              setGroupDrafts(prev => ({ ...prev, [g.mapKey]: newRole }));
                            }}><RoleOptions roleCatalog={roleCatalog} /></select></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : !nodeStateError ? (
                <div className="vse-empty-roles"><strong>Для этого узла пока нет строк ролей.</strong><span>Проверь node-state или выбери другой узел.</span></div>
              ) : null}

              <div className="vse-generate-bar">
                <button data-testid="compare-save-regenerate" className={`vse-generate-btn${saving ? " vse-save-btn-busy" : ""}${!allAssigned ? " vse-generate-btn-partial" : ""}`} onClick={saveCompareChanges} disabled={saving || !nodeState}>
                  {saving ? "Генерация..." : allAssigned ? "Сгенерировать стандарт →" : `Сгенерировать (${assignedCount}/${groups.length} ролей распознано)`}
                </button>
                {saveStatus.state === "ok" && <span className="vse-build-ok">OK: {saveStatus.message}</span>}
                {saveStatus.state === "error" && <span className="vse-build-error">Ошибка: {saveStatus.message}</span>}
                {saveStatus.state === "building" && <span className="vse-muted">Генерация: {saveStatus.message}</span>}
                <div style={{marginTop:8}}><button data-testid="contract-monitor-open" type="button" className="vse-save-btn" onClick={() => { const nextOpen = !contractOpen; setContractOpen(nextOpen); if (nextOpen) refreshContractTrace(); }}>Contract Monitor</button></div>
                {activeId && (() => {
                  const isApproved = nodeStatuses.approved?.includes(activeId);
                  const isComplex = nodeStatuses.complex?.includes(activeId);
                  return (
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={() => setNodeStatus(activeId, isApproved ? "pending" : "approved")} style={{ flex:1, padding:"5px 0", borderRadius:4, border:"1px solid #29b473", background: isApproved ? "#29b473" : "transparent", color: isApproved ? "#fff" : "#29b473", cursor:"pointer", fontSize:12, fontWeight:600 }}>{isApproved ? "✓ Утвержден" : "✓ Утвердить"}</button>
                      <button onClick={() => setNodeStatus(activeId, isComplex ? "pending" : "complex")} style={{ flex:1, padding:"5px 0", borderRadius:4, border:"1px solid #C8A84B", background: isComplex ? "#C8A84B" : "transparent", color: isComplex ? "#fff" : "#C8A84B", cursor:"pointer", fontSize:12, fontWeight:600 }}>{isComplex ? "⚠ Сложный" : "⚠ Отметить сложным"}</button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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
        Мы собираем пары выносок и целевых линий, а ты задаешь им смысл.<br />
        Заполни поле <strong>Что это</strong> и эти подписи станут осмысленными обозначениями.
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
                    placeholder="название / тип линии"
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

// Tab 3: Style registry
function TabRegistry({ registry, setRegistry, manifest }) {
  const filled = registry.filter(r => r.role !== "?").length;

  // node_id -> origSvg url
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

  const API = `http://${window.location.hostname}:7070`;

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
            // Small delay to ensure file is flushed to disk before re-fetch
            setTimeout(() => {
              clearNodeCache("");  // clear entire cache so fresh SVGs are loaded
              setBuildTs(Date.now());
              fetch("/vse/manifest.json?" + Date.now()).then(r => r.json()).then(setManifest);
            }, 300);
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
        <div className="pom-sub">Расшифровка обозначений и проверка стандартизации узлов</div>
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
        {tab === "compare"  && manifest.length > 0 && (
          <TabCompare
            manifest={manifest}
            buildTs={buildTs}
            onNodeUpdated={() => {
              clearNodeCache("");
              setBuildTs(Date.now());
              fetch("/vse/manifest.json?" + Date.now()).then(r => r.json()).then(setManifest);
            }}
          />
        )}
        {tab === "callouts" && <TabCallouts calloutGraph={calloutGraph} meanings={meanings} setMeanings={setMeanings} />}
        {tab === "registry" && <TabRegistry registry={registry} setRegistry={setRegistry} manifest={manifest} />}
      </div>
    </div>
  );
}
