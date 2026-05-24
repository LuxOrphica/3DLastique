import { useState, useEffect, useRef } from "react";
import "./VseReview.css";

const ROLE_STYLES = {
  // Контуры
  contour_outer:       { stroke: "#1A1A1A", "stroke-width": "1.5",  "stroke-dasharray": "none" },
  contour_fold:        { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "8 3 2 3" },
  contour_cut:         { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  // Швы
  seam_line:           { stroke: "#1A1A1A", "stroke-width": "2.5",  "stroke-dasharray": "none" },
  seam_allowance:      { stroke: "#555555", "stroke-width": "0.5",  "stroke-dasharray": "4 2" },
  // Строчки (ISO 4915 / Sportmaster AW24)
  stitch_edge:         { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "none" },
  stitch_thru:         { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "3 1.5" },
  stitch_L:            { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "3 1.5" },
  stitch_C:            { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "1 1.5" },
  stitch_O:            { stroke: "#C8102E", "stroke-width": "1.0",  "stroke-dasharray": "2 1 2 1" },
  stitch_F:            { stroke: "#C8102E", "stroke-width": "1.2",  "stroke-dasharray": "4 1 1 1 4 1" },
  stitch_zigzag:       { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "2 0.5" },
  stitch_Bt:           { stroke: "#1A1A1A", "stroke-width": "2.0",  "stroke-dasharray": "none" },
  // Границы
  boundary_fragment:   { stroke: "#27A6DE", "stroke-width": "1.5",  "stroke-dasharray": "none" },
  boundary_zone:       { stroke: "#1B4FA8", "stroke-width": "0.75", "stroke-dasharray": "6 3" },
  boundary_lining:     { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "6 2" },
  boundary_interlining:{ stroke: "#29B473", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  // Заливки и материалы
  fill_interlining:    { stroke: "#888888", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_fabric:         { stroke: "#AAAAAA", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  construction_aux:    { stroke: "#555555", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  fill_shape:          { stroke: "#CCCCCC", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  // Фурнитура
  hw_zipper:           { stroke: "#1A1A1A", "stroke-width": "1.2",  "stroke-dasharray": "none" },
  hw_zipper_tape:      { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  hw_button:           { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  hw_snap:             { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  hw_other:            { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  // Аннотации
  callout_line:        { stroke: "#333333", "stroke-width": "0.6",  "stroke-dasharray": "none" },
  break_line:          { stroke: "#999999", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  dim_line:            { stroke: "#333333", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  arrow:               { stroke: "#333333", "stroke-width": "0.6",  "stroke-dasharray": "none" },
  // Прочее
  unknown:             { stroke: "#999999", "stroke-width": "0.5",  "stroke-dasharray": "none" },
};

const ROLE_GROUPS = [
  { label: "— не назначено —", roles: ["?"] },
  { label: "Контуры",          roles: ["contour_outer", "contour_fold", "contour_cut"] },
  { label: "Швы",              roles: ["seam_line", "seam_allowance"] },
  { label: "Строчки",          roles: ["stitch_edge", "stitch_thru", "stitch_L", "stitch_C", "stitch_O", "stitch_F", "stitch_zigzag", "stitch_Bt"] },
  { label: "Слои и зоны",           roles: ["boundary_fragment", "boundary_zone", "boundary_lining", "boundary_interlining"] },
  { label: "Заливки",          roles: ["fill_interlining", "fill_fabric", "construction_aux", "fill_shape"] },
  { label: "Фурнитура",        roles: ["hw_zipper", "hw_zipper_tape", "hw_button", "hw_buttonhole", "hw_snap", "hw_other"] },
  { label: "Аннотации",        roles: ["callout_line", "break_line", "dim_line", "arrow", "stitch_symbol"] },
  { label: "Прочее",           roles: ["unknown", "_skip"] },
];

const ROLES = ROLE_GROUPS.flatMap(g => g.roles);

const ROLE_LABELS = {
  "?":                   "— не назначено —",
  // Контуры
  "contour_outer":       "Контур детали",
  "contour_fold":        "Линия сгиба",
  "contour_cut":         "Линия разреза",
  // Швы
  "seam_line":           "Линия шва",
  "seam_allowance":      "Припуск на шов",
  // Строчки
  "stitch_edge":         "Строчка по краю",
  "stitch_thru":         "Строчка сквозная",
  "stitch_L":            "Челночная L (ISO 301)",
  "stitch_C":            "Цепная C (ISO 401)",
  "stitch_O":            "Оверлок O (ISO 504/514)",
  "stitch_F":            "Распошивалка F (ISO 602/605)",
  "stitch_zigzag":       "Зигзаг",
  "stitch_Bt":           "Закрепка Bt",
  // Границы
  "boundary_fragment":   "Прокладка (Padding)",
  "boundary_zone":       "Конструктивная зона",
  "boundary_lining":     "Подкладка (Lining)",
  "boundary_interlining":"Флизелин (Interlining)",
  // Заливки
  "fill_interlining":    "Штриховка прокладки",
  "fill_fabric":         "Штриховка ткани",
  "construction_aux":    "Вспомогательная линия",
  "fill_shape":          "Заливка (прочее)",
  // Фурнитура
  "hw_zipper":           "Молния",
  "hw_zipper_tape":      "Молния",
  "hw_button":           "Пуговица (Button, Bs)",
  "hw_buttonhole":       "Петля (Buttonhole, Bh)",
  "hw_snap":             "Кнопка / люверс",
  "hw_other":            "Фурнитура (прочее)",
  // Аннотации
  "callout_line":        "Выноска",
  "break_line":          "Линия обрыва",
  "dim_line":            "Размерная линия",
  "arrow":               "Стрелка",
  "stitch_symbol":       "Символ строчки (vvvv)",
  // Прочее
  "unknown":             "Неизвестно",
  "_skip":               "— не выводить —",
};

function RoleOptions() {
  return ROLE_GROUPS.map(g => (
    <optgroup key={g.label} label={g.label}>
      {g.roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
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
    if (mode === "std") {
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

// Zoomable SVG panel — plain <img> for display, CSS overlay for highlight
function ZoomableSvgPanel({ url, label, hdrClass, hoveredEntry, mode, svgPrefix }) {
  const wrapRef  = useRef(null);
  const hlRef    = useRef(null); // hidden inline SVG for highlight queries
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
    fetch(url + "?t=" + Date.now())
      .then(r => r.text())
      .then(text => {
        if (hlRef.current) hlRef.current.innerHTML = sanitizeSvg(text, svgPrefix);
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
        <span className="vse-zoom-hint">{Math.round(scale * 100)}% · scroll = zoom · drag = pan</span>
      </div>
      <div ref={hlRef} style={{ display: "none" }} />
      <div ref={wrapRef} className="vse-zoom-viewport"
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        <div className="vse-zoom-content"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          <img
            src={url}
            className="vse-zoom-img"
            draggable={false}
            style={{ opacity: dimmed ? 0.15 : 1, transition: "opacity .15s" }}
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

// ── Tab 1: Annotate originals ─────────────────────────────────────────────────
function TabCompare({ manifest, registry, setRegistry, buildStatus, onSave, saving, buildTs }) {
  const [activeId, setActiveId] = useState(manifest[0]?.id);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => { setHoveredIdx(null); }, [activeId]);
  const node = manifest.find(n => n.id === activeId);

  const nodeStyles = registry
    .map((entry, i) => ({ entry, i }))
    .filter(({ entry }) => entry.files?.includes(activeId));

  const groups = groupNodeStyles(nodeStyles);

  const safeIdx = hoveredIdx !== null && hoveredIdx < groups.length ? hoveredIdx : null;
  const hoveredGroup = safeIdx !== null ? groups[safeIdx] ?? null : null;
  // hoveredGroup passed to ZoomableSvgPanel — contains key_strs[] and role
  const hoveredEntry = hoveredGroup ? { ...hoveredGroup.entry, key_strs: hoveredGroup.key_strs } : null;

  const allAssigned = groups.length > 0 && groups.every(g => g.entry.role && g.entry.role !== "?");
  const assignedCount = groups.filter(g => g.entry.role && g.entry.role !== "?").length;

  return (
    <div className="vse-compare">
      <div className="vse-node-tabs">
        {manifest.map(n => {
          const ns = registry.filter(e => e.files?.includes(n.id));
          const done = ns.length > 0 && ns.every(e => e.role && e.role !== "?");
          return (
            <button
              key={n.id}
              className={`vse-node-tab${activeId === n.id ? " active" : ""}${done ? " vse-node-tab-done" : ""}`}
              onClick={() => { setActiveId(n.id); setHoveredIdx(null); }}
            >
              {done ? "✓ " : ""}{n.label} <span className="vse-code">{n.code}</span>
            </button>
          );
        })}
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
                hoveredEntry={null}
                mode="std"
                svgPrefix={`${activeId}_std`}
              />
            </div>
          </div>

          {/* RIGHT: annotation table */}
          <div className="vse-annotate-right-sticky">
          <div className="vse-annotate-right">
            {nodeStyles.length > 0 && (
              <div className="vse-node-styles">
                <div className="vse-node-styles-hdr">
                  Наведи на строку → подсветка на оригинале · назначь роль каждому стилю
                  <span className="vse-assign-progress">{assignedCount} / {groups.length}</span>
                </div>
                <table className="vse-table">
                  <thead>
                    <tr>
                      <th style={{width:"64px"}}>Превью</th>
                      <th style={{width:"80px"}}>Цвет</th>
                      <th style={{width:"44px"}}>Толщ.</th>
                      <th>Роль</th>
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
                          <td>
                            <select
                              className="vse-role-sel-sm"
                              value={g.entry.role || "?"}
                              onChange={e => {
                                const next = [...registry];
                                g.indices.forEach(i => { next[i] = { ...next[i], role: e.target.value }; });
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
            )}

            {/* Generate button */}
            <div className="vse-generate-bar">
              <button
                className={`vse-generate-btn${saving ? " vse-save-btn-busy" : ""}${!allAssigned ? " vse-generate-btn-partial" : ""}`}
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Генерация…" : allAssigned ? "Сгенерировать стандарт →" : `Сгенерировать (${assignedCount}/${nodeStyles.length} назначено)`}
              </button>
              {buildStatus.state === "ok" && (
                <span className="vse-build-ok">✓ {buildStatus.message}</span>
              )}
              {buildStatus.state === "error" && (
                <span className="vse-build-error">✗ {buildStatus.message}</span>
              )}
              {buildStatus.state === "building" && (
                <span className="vse-muted">⏳ {buildStatus.message}</span>
              )}
            </div>
          </div>
          </div>{/* vse-annotate-right-sticky */}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Callout meanings ───────────────────────────────────────────────────
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

// ── Tab 3: Style registry ─────────────────────────────────────────────────────
function TabRegistry({ registry, setRegistry, manifest }) {
  const filled = registry.filter(r => r.role !== "?").length;

  // node_id → origSvg url
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
                  <span className="vse-muted">×{entry.count}</span>
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
      // Original SVG: match by stroke color (± tolerance)
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

// ── Main ──────────────────────────────────────────────────────────────────────
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

  const saveAndRegen = async () => {
    setBuildStatus({ state: "building", message: "Сохранение реестра..." });
    try {
      const r = await fetch(`${API}/api/save-registry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registry }),
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
            {buildStatus.state === "ok" ? "✓ " : "✗ "}{buildStatus.message}
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
