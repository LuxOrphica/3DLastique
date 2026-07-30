// Interactive line editor for the VSE standard panel.
//
// Two rules drive the design:
//
//  * Edits are applied LOCALLY and instantly. paper.js computes the resulting geometry
//    in the browser, the result is drawn as an overlay and the original element is
//    hidden, so nothing waits on the server and the drawing never reloads mid-edit.
//    Persisting is the caller's job (debounced), not part of the interaction.
//
//  * Snapping positions, it does not connect. Dragging a point only ever moves it —
//    snapping just makes it land exactly on a neighbouring point. Joining two lines
//    changes topology, so it is its own explicit tool.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  distanceToPath, extendToMeet, joinPaths, moveVertex,
  segmentsOf, snapPoint, splitAtPoint, trimAt,
} from "./pathTools";

export const TOOLS = [
  { key: "move",   label: "Точки",      hint: "Тащи точку — сдвиг. Держит притяжку к соседним точкам." },
  { key: "trim",   label: "Подрезать",  hint: "Клик по лишнему хвосту за пересечением — он отрезается." },
  { key: "extend", label: "Продлить",   hint: "Клик у конца линии — она дотянется до ближайшей линии." },
  { key: "join",   label: "Соединить",  hint: "Клик по концу первой линии, затем по концу второй." },
  { key: "cut",    label: "Разрезать",  hint: "Клик по линии — разрез в этой точке." },
  { key: "erase",  label: "Удалить",    hint: "Клик по линии — фрагмент удаляется." },
];

/** Read every editable line from the rendered SVG: elem_key, `d`, role. */
function readSceneFromDom(container) {
  if (!container) return [];
  const out = [];
  const els = [...container.querySelectorAll("path, line, polyline, polygon")]
    .filter(el => !el.closest("defs") && !el.closest('[data-trace-ignore="1"]'));
  for (const el of els) {
    const elemKey = el.getAttribute("data-elem-key");
    if (!elemKey) continue;
    const role = el.getAttribute("data-role") || el.closest("[data-role]")?.getAttribute("data-role") || "";
    let d = el.getAttribute("d");
    if (!d) {
      const tag = el.tagName.toLowerCase();
      if (tag === "line") {
        d = `M ${el.getAttribute("x1")} ${el.getAttribute("y1")} L ${el.getAttribute("x2")} ${el.getAttribute("y2")}`;
      } else if (tag === "polyline" || tag === "polygon") {
        const nums = (el.getAttribute("points") || "").trim().split(/[\s,]+/);
        if (nums.length >= 4) {
          d = `M ${nums[0]} ${nums[1]}` + nums.slice(2).reduce((acc, n, i) => i % 2 === 0 ? acc + ` L ${n}` : acc + ` ${n}`, "");
          if (tag === "polygon") d += " Z";
        }
      }
    }
    if (d) out.push({ elemKey, d, role });
  }
  return out;
}

/**
 * The scene as the user currently sees it: DOM geometry with local edits layered on top.
 * Returns a flat list of parts, each tagged with the elem_key it belongs to.
 */
function buildScene(container, working) {
  const base = readSceneFromDom(container);
  const parts = [];
  for (const item of base) {
    const edited = working[item.elemKey];
    if (edited === undefined) {
      parts.push({ ...item, partIndex: 0, edited: false });
      continue;
    }
    edited.forEach((p, i) => {
      parts.push({ elemKey: item.elemKey, d: p.d, role: p.role || item.role, partIndex: i, edited: true });
    });
  }
  return parts;
}

export default function LineEditor({
  container, viewBox, tool, selectedElemKey, onSelectElem,
  working, onChangeElement, styleForRole, disabled,
}) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const [joinFirst, setJoinFirst] = useState(null); // {elemKey, partIndex, x, y}
  const [hoverPt, setHoverPt] = useState(null);

  const vb = useMemo(() => (viewBox || "").split(/[\s,]+/).map(Number), [viewBox]);
  const [vx, vy, vw, vh] = vb.length === 4 ? vb : [0, 0, 100, 100];

  // Rebuilt whenever the local edits change, so handles follow the edited geometry.
  const scene = useMemo(
    () => (container ? buildScene(container, working) : []),
    [container, working, selectedElemKey, viewBox],
  );

  // Sizes are fixed in screen pixels: a radius in viewBox units collapses to a few
  // unclickable pixels once the panel is zoomed out.
  const pxPerUserRef = useRef(1);
  const [, bump] = useState(0);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !vw) return;
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const next = r.width / vw;
    if (Math.abs(next - pxPerUserRef.current) > 0.001) { pxPerUserRef.current = next; bump(t => t + 1); }
  });
  const pxPerUser = pxPerUserRef.current || 1;
  const uR = 5 / pxPerUser;
  const hitR = 15 / pxPerUser;
  const snapTol = 10 / pxPerUser;

  const toUser = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: vx + (clientX - r.left) / r.width * vw, y: vy + (clientY - r.top) / r.height * vh };
  }, [vx, vy, vw, vh]);

  const selectedParts = useMemo(
    () => scene.filter(p => p.elemKey === selectedElemKey),
    [scene, selectedElemKey],
  );

  const handles = useMemo(() => {
    const out = [];
    for (const part of selectedParts) {
      for (const s of segmentsOf(part.d)) {
        out.push({ ...s, elemKey: part.elemKey, partIndex: part.partIndex, d: part.d });
      }
    }
    return out;
  }, [selectedParts]);

  /** Everything except the given element — the context for snapping/trim/extend. */
  const othersOf = useCallback(
    (elemKey) => scene.filter(p => p.elemKey !== elemKey).map(p => p.d),
    [scene],
  );

  const partsOf = useCallback((elemKey) => {
    const cur = working[elemKey];
    if (cur !== undefined) return cur;
    const found = scene.filter(p => p.elemKey === elemKey);
    return found.map(p => ({ d: p.d, role: p.role }));
  }, [working, scene]);

  const replacePart = useCallback((elemKey, partIndex, newDs, role) => {
    const parts = [...partsOf(elemKey)];
    const roleOf = role ?? parts[partIndex]?.role;
    const replacement = newDs.map(d => ({ d, role: roleOf }));
    parts.splice(partIndex, 1, ...replacement);
    onChangeElement(elemKey, parts);
  }, [partsOf, onChangeElement]);

  // ── dragging a vertex ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const st = dragRef.current;
      if (!st) return;
      const u = toUser(e.clientX, e.clientY);
      if (!u) return;
      // Snap for PRECISION only. It never joins anything — dropping here just places
      // the point exactly on the neighbour, which is what "подвинуть" should do.
      const snap = snapPoint(u, st.others, snapTol);
      const cur = snap ? { x: snap.x, y: snap.y } : u;
      st.cur = cur; st.snap = snap;
      setDrag(d => (d ? { ...d, cur, snap } : d));
    };
    const onUp = () => {
      const st = dragRef.current;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDrag(null); dragRef.current = null;
      if (!st) return;
      const moved = Math.hypot(st.cur.x - st.from.x, st.cur.y - st.from.y) > 1e-6;
      if (!moved) return;
      const nd = moveVertex(st.d, st.segIndex, st.cur);
      if (nd) replacePart(st.elemKey, st.partIndex, [nd]);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [drag, toUser, snapTol, replacePart]);

  const startDrag = (h, e) => {
    if (e.button !== 0 || tool !== "move") return;
    e.preventDefault(); e.stopPropagation();
    const st = {
      elemKey: h.elemKey, partIndex: h.partIndex, segIndex: h.index, d: h.d,
      from: { x: h.x, y: h.y }, cur: { x: h.x, y: h.y }, snap: null,
      others: othersOf(h.elemKey),
    };
    dragRef.current = st;
    setDrag({ ...st });
  };

  // ── click tools ───────────────────────────────────────────────────────────
  const nearestPart = useCallback((u) => {
    let best = null, bestD = Infinity;
    for (const part of scene) {
      const d = distanceToPath(part.d, u);
      if (d < bestD) { bestD = d; best = part; }
    }
    return bestD <= hitR * 2 ? best : null;
  }, [scene, hitR]);

  const onOverlayClick = (e) => {
    if (disabled || tool === "move") return;
    const u = toUser(e.clientX, e.clientY);
    if (!u) return;
    const part = nearestPart(u);
    if (!part) return;
    e.preventDefault(); e.stopPropagation();

    if (tool === "erase") {
      const parts = partsOf(part.elemKey).filter((_, i) => i !== part.partIndex);
      onChangeElement(part.elemKey, parts);
      return;
    }
    if (tool === "cut") {
      const halves = splitAtPoint(part.d, u);
      if (halves) replacePart(part.elemKey, part.partIndex, halves);
      return;
    }
    if (tool === "trim") {
      const kept = trimAt(part.d, othersOf(part.elemKey), u);
      if (kept) replacePart(part.elemKey, part.partIndex, kept);
      return;
    }
    if (tool === "extend") {
      const segs = segmentsOf(part.d);
      if (segs.length < 2) return;
      const first = segs[0], last = segs[segs.length - 1];
      const useEnd = Math.hypot(last.x - u.x, last.y - u.y) <= Math.hypot(first.x - u.x, first.y - u.y);
      const nd = extendToMeet(part.d, othersOf(part.elemKey), useEnd ? "end" : "start");
      if (nd) replacePart(part.elemKey, part.partIndex, [nd]);
      return;
    }
    if (tool === "join") {
      if (!joinFirst) { setJoinFirst({ elemKey: part.elemKey, partIndex: part.partIndex, d: part.d }); return; }
      if (joinFirst.elemKey === part.elemKey && joinFirst.partIndex === part.partIndex) { setJoinFirst(null); return; }
      const joined = joinPaths(joinFirst.d, part.d, snapTol * 3);
      if (joined) {
        // First element keeps the fused line; the second is consumed.
        replacePart(joinFirst.elemKey, joinFirst.partIndex, [joined]);
        const secondParts = partsOf(part.elemKey).filter((_, i) => i !== part.partIndex);
        onChangeElement(part.elemKey, secondParts);
      }
      setJoinFirst(null);
      return;
    }
  };

  const onOverlayMove = (e) => {
    if (disabled || tool === "move" || drag) { if (hoverPt) setHoverPt(null); return; }
    const u = toUser(e.clientX, e.clientY);
    setHoverPt(u ? { ...u, part: nearestPart(u) } : null);
  };

  useEffect(() => { setJoinFirst(null); }, [tool, selectedElemKey]);

  if (disabled || vb.length !== 4) return null;

  const interactive = tool !== "move";
  const dragCur = drag?.cur;

  return (
    <svg
      ref={svgRef} viewBox={viewBox} className="vse-zoom-overlay vse-line-editor"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, pointerEvents: interactive ? "all" : "none", cursor: interactive ? "crosshair" : "default" }}
      onClick={onOverlayClick}
      onMouseMove={onOverlayMove}
      onMouseLeave={() => setHoverPt(null)}
    >
      {/* locally edited geometry, drawn over the (hidden) originals */}
      {scene.filter(p => p.edited).map((p, i) => {
        const st = styleForRole?.(p.role) || {};
        return (
          <path key={`e${p.elemKey}_${p.partIndex}_${i}`} d={p.d}
            fill="none"
            stroke={st.stroke && st.stroke !== "none" ? st.stroke : "#1A1A1A"}
            strokeWidth={st["stroke-width"] || 1}
            strokeDasharray={st["stroke-dasharray"] && st["stroke-dasharray"] !== "none" ? st["stroke-dasharray"] : undefined}
            style={{ pointerEvents: "none" }} />
        );
      })}

      {/* what the click tool is about to act on */}
      {hoverPt?.part && (
        <path d={hoverPt.part.d} fill="none" stroke="#e05a3a" strokeWidth={uR * 0.6}
          style={{ pointerEvents: "none", filter: "drop-shadow(0 0 3px #e05a3a)" }} />
      )}
      {joinFirst && (
        <path d={joinFirst.d} fill="none" stroke="#2ec26a" strokeWidth={uR * 0.6}
          style={{ pointerEvents: "none", filter: "drop-shadow(0 0 3px #2ec26a)" }} />
      )}

      {/* vertex handles (move tool only) */}
      {tool === "move" && handles.map((h, idx) => {
        const isDrag = drag && drag.elemKey === h.elemKey && drag.partIndex === h.partIndex && drag.segIndex === h.index;
        const cx = isDrag ? dragCur.x : h.x;
        const cy = isDrag ? dragCur.y : h.y;
        const snapped = isDrag && drag.snap;
        return (
          <g key={`h${idx}`}>
            <circle cx={cx} cy={cy} r={hitR} fill="transparent"
              style={{ cursor: "grab", pointerEvents: "all" }}
              onMouseDown={e => startDrag(h, e)} />
            <circle cx={cx} cy={cy} r={uR}
              fill={snapped ? "#2ec26a" : h.end ? "#fff" : "#C8A84B"}
              stroke={snapped ? "#2ec26a" : "#6b4f1d"} strokeWidth={uR * 0.35}
              style={{ pointerEvents: "none" }} />
          </g>
        );
      })}
    </svg>
  );
}
