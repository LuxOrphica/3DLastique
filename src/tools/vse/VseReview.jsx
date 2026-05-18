import { useState, useEffect, useRef } from "react";
import "./VseReview.css";

const ROLE_STYLES = {
  base_outer_contour:  { stroke: "#1A1A1A", "stroke-width": "1.5",  "stroke-dasharray": "none" },
  structure_line:      { stroke: "#1A1A1A", "stroke-width": "0.75", "stroke-dasharray": "none" },
  stitch_line:         { stroke: "#C8102E", "stroke-width": "0.75", "stroke-dasharray": "3 1.5" },
  zone_frame:          { stroke: "#1B4FA8", "stroke-width": "0.75", "stroke-dasharray": "6 3" },
  secondary_structure: { stroke: "#555555", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  heavy_seam:          { stroke: "#1A1A1A", "stroke-width": "2.5",  "stroke-dasharray": "none" },
  callout_line:        { stroke: "#333333", "stroke-width": "0.6",  "stroke-dasharray": "none" },
  arrow:               { stroke: "#333333", "stroke-width": "0.6",  "stroke-dasharray": "none" },
  filled_shape:        { stroke: "#CCCCCC", "stroke-width": "0.5",  "stroke-dasharray": "none" },
  hardware_symbol:     { stroke: "#1A1A1A", "stroke-width": "1.0",  "stroke-dasharray": "none" },
  unknown:             { stroke: "#999999", "stroke-width": "0.5",  "stroke-dasharray": "none" },
};

const ROLES = [
  "?", "base_outer_contour", "structure_line", "stitch_line",
  "zone_frame", "secondary_structure", "heavy_seam",
  "callout_line", "arrow", "filled_shape", "hardware_symbol", "unknown",
];

const ROLE_LABELS = {
  "base_outer_contour": "Внешний контур",
  "structure_line":     "Конструктивная линия",
  "stitch_line":        "Строчка / шов",
  "zone_frame":         "Граница зоны",
  "secondary_structure":"Вторичная структура",
  "heavy_seam":         "Шов (толстый)",
  "callout_line":       "Выноска",
  "arrow":              "Стрелка",
  "filled_shape":       "Заливка",
  "hardware_symbol":    "Фурнитура / символ",
  "unknown":            "Неизвестно",
  "?":                  "— не назначено —",
};

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

function applyHighlight(container, targetColor, targetWidth, mode, targetRole) {
  // Exclude elements inside <defs> (font glyphs etc.)
  const els = [...container.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
    .filter(el => !el.closest("defs"));
  els.forEach(el => {
    let match = false;
    if (mode === "std") {
      match = !!el.closest(`[data-role="${targetRole}"]`);
    } else {
      const elColor = normalizeHex(resolveAttr(el, "stroke"));
      const elWidthRaw = resolveAttr(el, "stroke-width");
      const elWidth = elWidthRaw ? parseFloat(elWidthRaw) : 1;
      const colorOk = hexDistance(elColor, normalizeHex(targetColor)) < 30;
      const widthOk = Math.abs(elWidth - targetWidth) < 0.5;
      match = colorOk && widthOk;
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
  const [hlStyles, setHlStyles] = useState([]); // [{selector, dim}]
  const dragging = useRef(null);

  // Load SVG text into hidden div for DOM queries
  useEffect(() => {
    if (!url) return;
    setScale(1); setPan({ x: 0, y: 0 }); setReady(false); setHlStyles([]);
    fetch(url + "?t=" + Date.now())
      .then(r => r.text())
      .then(text => {
        if (hlRef.current) hlRef.current.innerHTML = sanitizeSvg(text, svgPrefix);
        setReady(true);
      });
  }, [url]);

  // Compute which paths match — store as data, render as SVG overlay
  useEffect(() => {
    const hidden = hlRef.current;
    if (!hidden || !ready) return;
    if (hoveredEntry === null) { setHlStyles([]); return; }

    const els = [...hidden.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
      .filter(el => !el.closest("defs"));

    const matched = [];
    els.forEach(el => {
      let match = false;
      if (mode === "std") {
        match = !!el.closest(`[data-role="${hoveredEntry.role}"]`);
      } else {
        const elColor = normalizeHex(resolveAttr(el, "stroke"));
        const elW     = parseFloat(resolveAttr(el, "stroke-width") || "1");
        match = hexDistance(elColor, normalizeHex(hoveredEntry.stroke)) < 30
             && Math.abs(elW - hoveredEntry.width) < 0.5;
      }
      el._hlMatch = match;
    });
    setHlStyles(els.map(el => ({ match: el._hlMatch })));
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

  const dimmed = hoveredEntry !== null;

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
          {dimmed && ready && (() => {
            const hidden = hlRef.current;
            if (!hidden) return null;
            const svgEl = hidden.querySelector("svg");
            if (!svgEl) return null;
            const vb = svgEl.getAttribute("viewBox");
            const els = [...hidden.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")]
              .filter(el => !el.closest("defs"));
            const matched = els.filter(el => el._hlMatch);
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

// ── Tab 1: Before / After + Inspector ────────────────────────────────────────
function TabCompare({ manifest, registry, setRegistry }) {
  const [activeId, setActiveId] = useState(manifest[0]?.id);
  const [hovered, setHovered] = useState({ idx: null, side: null });

  useEffect(() => { setHovered({ idx: null, side: null }); }, [activeId]);
  const node = manifest.find(n => n.id === activeId);

  const nodeStyles = registry
    .map((entry, i) => ({ entry, i }))
    .filter(({ entry }) => entry.files?.includes(activeId));

  // Guard: idx may be stale after node switch
  const safeIdx = hovered.idx !== null && hovered.idx < nodeStyles.length ? hovered.idx : null;
  const hoveredEntry = safeIdx !== null ? nodeStyles[safeIdx]?.entry ?? null : null;
  // Pass null to panel if that side isn't hovered
  const origEntry = hoveredEntry && (hovered.side === "orig" || hovered.side === "both") ? hoveredEntry : null;
  const stdEntry  = hoveredEntry && (hovered.side === "std"  || hovered.side === "both") ? hoveredEntry : null;

  return (
    <div className="vse-compare">
      <div className="vse-node-tabs">
        {manifest.map(n => (
          <button
            key={n.id}
            className={`vse-node-tab${activeId === n.id ? " active" : ""}`}
            onClick={() => { setActiveId(n.id); setHovered({ idx: null, side: null }); }}
          >
            {n.label} <span className="vse-code">{n.code}</span>
          </button>
        ))}
      </div>

      {node && (
        <>
          <div className="vse-compare-wrap">
            {/* LEFT: sticky stacked SVG panels */}
            <div className="vse-panels-sticky">
              <ZoomableSvgPanel url={node.origSvg} label="ОРИГИНАЛ"            hdrClass="orig" hoveredEntry={origEntry} mode="orig" svgPrefix={`${activeId}_orig`} />
              <ZoomableSvgPanel url={node.stdSvg}  label="СТАНДАРТИЗИРОВАННЫЙ" hdrClass="std"  hoveredEntry={stdEntry}  mode="std"  svgPrefix={`${activeId}_std`} />
            </div>

            {/* RIGHT: scrollable style table */}
            {nodeStyles.length > 0 && (
            <div className="vse-node-styles">
              <div className="vse-node-styles-hdr">
                Стили узла — наведи на строку чтобы подсветить на обоих SVG
              </div>
              <table className="vse-table">
                <thead>
                  <tr>
                    <th colSpan={3} className="vse-th-orig">БЫЛО</th>
                    <th className="vse-th-arrow"></th>
                    <th colSpan={3} className="vse-th-std">СТАЛО</th>
                    <th>Роль</th>
                  </tr>
                  <tr className="vse-subhead">
                    <th>Превью</th><th>Цвет</th><th>Толщина</th>
                    <th></th>
                    <th>Превью</th><th>Цвет</th><th>Толщина</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {nodeStyles.map(({ entry, i }, idx) => {
                    const stdStyle = ROLE_STYLES[entry.role];
                    const isHov = safeIdx === idx;
                    return (
                      <tr
                        key={i}
                        className={`vse-inspector-row${isHov ? " hovered" : ""}${entry.role !== "?" ? " vse-row-filled" : ""}`}
                        onMouseLeave={() => setHovered({ idx: null, side: null })}
                      >
                        {/* БЫЛО — hover подсвечивает оригинал */}
                        <td className="vse-tc vse-td-orig" onMouseEnter={() => setHovered({ idx, side: "orig" })}>
                          <LineSwatch color={entry.stroke} width={entry.width} dashed={entry.dashed} />
                        </td>
                        <td className="vse-td-orig" onMouseEnter={() => setHovered({ idx, side: "orig" })}>
                          <ColorDot hex={entry.stroke} /><code>{entry.stroke}</code>
                        </td>
                        <td className="vse-tc vse-muted vse-td-orig" onMouseEnter={() => setHovered({ idx, side: "orig" })}>
                          {entry.width}
                        </td>

                        <td className="vse-arrow-cell" onMouseEnter={() => setHovered({ idx, side: "both" })}>→</td>

                        {/* СТАЛО — hover подсвечивает стандарт */}
                        <td className="vse-tc vse-td-std" onMouseEnter={() => setHovered({ idx, side: "std" })}>
                          {stdStyle
                            ? <LineSwatch color={stdStyle.stroke} width={parseFloat(stdStyle["stroke-width"]) * 2} dashed={stdStyle["stroke-dasharray"] !== "none"} />
                            : <span className="vse-muted">—</span>}
                        </td>
                        <td className="vse-td-std" onMouseEnter={() => setHovered({ idx, side: "std" })}>
                          {stdStyle
                            ? <><ColorDot hex={stdStyle.stroke} /><code>{stdStyle.stroke}</code></>
                            : <span className="vse-muted">не назначено</span>}
                        </td>
                        <td className="vse-tc vse-muted vse-td-std" onMouseEnter={() => setHovered({ idx, side: "std" })}>
                          {stdStyle ? stdStyle["stroke-width"] : ""}
                        </td>

                        <td onMouseEnter={() => setHovered({ idx, side: "both" })}>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </>
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

  const API = "http://localhost:7070";

  useEffect(() => {
    fetch("/vse/manifest.json").then(r => r.json()).then(setManifest);
    fetch("/vse/callout_graph.json").then(r => r.json()).then(setCallout);
    fetch("/vse/style_registry.json").then(r => r.json()).then(setRegistry);
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
            // Reload SVGs by busting cache on manifest
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
    { id: "compare",  label: "До / После" },
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
        {(tab === "registry" || tab === "compare") && (
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
        {tab === "compare"  && manifest.length > 0 && <TabCompare manifest={manifest} registry={registry} setRegistry={setRegistry} />}
        {tab === "callouts" && <TabCallouts calloutGraph={calloutGraph} meanings={meanings} setMeanings={setMeanings} />}
        {tab === "registry" && <TabRegistry registry={registry} setRegistry={setRegistry} manifest={manifest} />}
      </div>
    </div>
  );
}
