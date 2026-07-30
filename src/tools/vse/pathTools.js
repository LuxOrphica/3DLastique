// Geometry kernel for the VSE line editor.
//
// paper.js is used headlessly — purely as a geometry library, never as a renderer.
// Rendering stays with the existing SVG/React layer, so data-role / data-elem-key and
// the whole role pipeline are untouched. Every tool here takes SVG `d` strings and
// returns SVG `d` strings; the caller stores the result as a geometry_override and the
// Python engine replays it. That is what lets a new tool ship without server work.
//
// Exact curve/curve intersection (getIntersections) is the reason for the dependency:
// trimming an overhang and extending a line to meet another both need it, and it is
// genuinely hard to write correctly by hand for cubics.
import paper from "paper";

let scope = null;

function paperScope() {
  if (scope) return scope;
  scope = new paper.PaperScope();
  // No canvas: a bare size is enough for geometry-only work.
  scope.setup(new paper.Size(1, 1));
  return scope;
}

/** Build a paper.Path from an SVG `d` string. Returns null for empty/invalid input. */
export function pathFromD(d) {
  if (!d || typeof d !== "string") return null;
  const s = paperScope();
  s.activate();
  try {
    const p = new s.Path(d);
    return p.segments && p.segments.length ? p : null;
  } catch {
    return null;
  }
}

/** SVG `d` for a paper path, rounded to keep stored geometry compact. */
export function dFromPath(path) {
  if (!path) return "";
  try {
    return path.getPathData(null, 3) || "";
  } catch {
    return path?.pathData || "";
  }
}

function toPoint(pt) {
  const s = paperScope();
  return pt instanceof s.Point ? pt : new s.Point(pt.x, pt.y);
}

/** Discard scratch paths so the headless project does not grow without bound. */
function cleanup(paths) {
  for (const p of paths) { try { p?.remove(); } catch { /* already gone */ } }
}

/**
 * Split a path into pieces at every intersection with `otherDs`.
 * Returns an array of `d` strings (the original, unchanged, when nothing crosses it).
 */
export function splitAtIntersections(targetD, otherDs = []) {
  const target = pathFromD(targetD);
  if (!target) return targetD ? [targetD] : [];

  const total = target.length;
  const EPS = Math.max(total * 1e-4, 1e-6); // ignore crossings at (or on top of) an end
  const offsets = crossingOffsets(target, otherDs, EPS);

  if (!offsets.length) {
    const out = [dFromPath(target)];
    cleanup([target]);
    return out;
  }

  // Walk the cuts from the far end backwards: splitAt() leaves `rest` holding the
  // prefix [0 … offset], so every remaining offset stays valid on it. Splitting the
  // freshly detached tail instead (with offsets measured on the original path) is what
  // produced fragmented, zero-length pieces.
  const tail = [];
  let rest = target;
  for (let i = offsets.length - 1; i >= 0; i--) {
    try {
      const piece = rest.splitAt(rest.getLocationAt(offsets[i]));
      if (piece) tail.unshift(piece);
    } catch { /* degenerate split — ignore */ }
  }
  const pieces = [rest, ...tail];
  const out = pieces.filter(p => p.length > EPS).map(dFromPath).filter(Boolean);
  cleanup(pieces);
  return out;
}

/** The stretch of a path between two offsets, as a `d` string. */
function subPathD(sourceD, from, to) {
  const p = pathFromD(sourceD);
  if (!p) return null;
  const total = p.length;
  const eps = Math.max(total * 1e-6, 1e-9);
  let head = p;
  if (to < total - eps) {
    try { const tail = head.splitAt(head.getLocationAt(to)); cleanup([tail]); } catch { /* keep head */ }
  }
  let result = head;
  if (from > eps) {
    try {
      const second = head.splitAt(head.getLocationAt(from));
      if (second) { result = second; cleanup([head]); }
    } catch { /* keep head */ }
  }
  const d = dFromPath(result);
  cleanup([result]);
  return d || null;
}

/** Offsets where `targetD` is crossed by any of `otherDs`, deduped and end-trimmed. */
function crossingOffsets(target, otherDs, eps) {
  const others = otherDs.map(pathFromD).filter(Boolean);
  const total = target.length;
  let offsets = [];
  for (const o of others) {
    try { offsets.push(...target.getIntersections(o).map(l => l.offset)); } catch { /* skip */ }
  }
  cleanup(others);
  return offsets
    .filter(t => t > eps && t < total - eps)
    .sort((a, b) => a - b)
    .filter((t, i, arr) => i === 0 || t - arr[i - 1] > eps);
}

/**
 * TRIM — "линия чуть вылезает".
 *
 * Removes only the stretch that was clicked, bounded by the crossings on either side of
 * it, and leaves the remainder as few pieces as possible. Splitting at every crossing
 * and dropping one piece (the obvious implementation) shatters a line that several
 * others cross into unrelated fragments, and produces slivers where two lines cross
 * almost the same spot — trimming an overhang must leave the line whole.
 */
export function trimAt(targetD, otherDs, clickPoint) {
  const target = pathFromD(targetD);
  if (!target) return null;
  const total = target.length;
  const eps = Math.max(total * 1e-4, 1e-6);
  const offsets = crossingOffsets(target, otherDs, eps);
  if (!offsets.length) { cleanup([target]); return null; } // nothing crosses it

  let clickOffset = 0;
  try { clickOffset = target.getNearestLocation(toPoint(clickPoint)).offset; } catch { cleanup([target]); return null; }
  cleanup([target]);

  // The span containing the click is the piece to drop.
  const bounds = [0, ...offsets, total];
  let i = 0;
  while (i < bounds.length - 2 && clickOffset > bounds[i + 1]) i++;
  const from = bounds[i], to = bounds[i + 1];

  const kept = [];
  if (from > eps) kept.push(subPathD(targetD, 0, from));
  if (to < total - eps) kept.push(subPathD(targetD, to, total));
  const out = kept.filter(Boolean);
  return out.length ? out : null;
}

/**
 * EXTEND — "где-то нет соединения".
 * Shoots a ray along the tangent at the chosen open end and stops at the first line it
 * meets, so a line that falls short is brought exactly onto its neighbour.
 */
export function extendToMeet(targetD, otherDs, whichEnd = "end", maxLen = 1e4) {
  const s = paperScope();
  s.activate();
  const target = pathFromD(targetD);
  if (!target) return null;
  const others = otherDs.map(pathFromD).filter(Boolean);

  const atEnd = whichEnd === "end";
  const anchor = atEnd ? target.lastSegment.point : target.firstSegment.point;
  let tangent;
  try {
    tangent = atEnd ? target.getTangentAt(target.length) : target.getTangentAt(0).multiply(-1);
  } catch {
    cleanup([target, ...others]);
    return null;
  }
  if (!tangent || !tangent.length) { cleanup([target, ...others]); return null; }

  const ray = new s.Path.Line(anchor, anchor.add(tangent.normalize().multiply(maxLen)));
  let best = null, bestDist = Infinity;
  for (const o of others) {
    let hits = [];
    try { hits = ray.getIntersections(o); } catch { /* skip */ }
    for (const h of hits) {
      const dist = h.point.getDistance(anchor);
      if (dist > 1e-6 && dist < bestDist) { bestDist = dist; best = h.point; }
    }
  }
  cleanup([ray, ...others]);
  if (!best) { cleanup([target]); return null; }

  if (atEnd) target.add(best);
  else target.insert(0, best);
  const out = dFromPath(target);
  cleanup([target]);
  return out;
}

/** CUT — split one path at an arbitrary point on it. Returns two `d` strings. */
export function splitAtPoint(targetD, point) {
  const target = pathFromD(targetD);
  if (!target) return null;
  let loc;
  try { loc = target.getNearestLocation(toPoint(point)); } catch { loc = null; }
  if (!loc) { cleanup([target]); return null; }
  let second = null;
  try { second = target.splitAt(loc); } catch { /* degenerate */ }
  if (!second) { cleanup([target]); return null; }
  const out = [dFromPath(target), dFromPath(second)].filter(Boolean);
  cleanup([target, second]);
  return out.length === 2 ? out : null;
}

/**
 * JOIN — weld two lines into one continuous path.
 *
 * Refuses when no pair of ends is within `tolerance`. paper.js's own join() falls back
 * to concatenating the segment lists when the ends do not meet, which silently produces
 * one path containing a jump; checking first keeps a mis-aimed click from creating
 * broken geometry. Returns null when the ends are too far apart to be joined.
 */
export function joinPaths(aD, bD, tolerance = 6) {
  const a = pathFromD(aD), b = pathFromD(bD);
  if (!a || !b) { cleanup([a, b]); return null; }
  const ends = (p) => [p.firstSegment.point, p.lastSegment.point];
  let gap = Infinity;
  for (const pa of ends(a)) {
    for (const pb of ends(b)) gap = Math.min(gap, pa.getDistance(pb));
  }
  if (!(gap <= tolerance)) { cleanup([a, b]); return null; }
  try { a.join(b, tolerance); } catch { cleanup([a, b]); return null; }
  const out = dFromPath(a);
  cleanup([a]);
  return out || null;
}

/** MOVE VERTEX — reposition one segment; adjacent handles ride along, keeping curves. */
export function moveVertex(targetD, segmentIndex, to) {
  const target = pathFromD(targetD);
  if (!target) return null;
  const seg = target.segments[segmentIndex];
  if (!seg) { cleanup([target]); return null; }
  seg.point = toPoint(to);
  const out = dFromPath(target);
  cleanup([target]);
  return out;
}

/** Distance from a point to a path's outline, in user units. Infinity if unusable. */
export function distanceToPath(targetD, point) {
  const p = pathFromD(targetD);
  if (!p) return Infinity;
  let d = Infinity;
  try { d = p.getNearestPoint(toPoint(point)).getDistance(toPoint(point)); } catch { /* skip */ }
  cleanup([p]);
  return d;
}

/** The anchor points of a path, for drawing drag handles. */
export function segmentsOf(targetD) {
  const target = pathFromD(targetD);
  if (!target) return [];
  const pts = target.segments.map((sg, i) => ({
    index: i,
    x: sg.point.x,
    y: sg.point.y,
    end: !target.closed && (i === 0 || i === target.segments.length - 1),
  }));
  cleanup([target]);
  return pts;
}

/**
 * SNAP while dragging — prefers, in order: another line's endpoint, an intersection,
 * then the nearest point on a line. Endpoints win because welding ends is the common
 * intent; falling back to on-curve keeps a dragged point glued to the geometry.
 */
export function snapPoint(point, otherDs, tolerance = 8) {
  const pt = toPoint(point);
  const others = otherDs.map(pathFromD).filter(Boolean);
  let best = null, bestD = tolerance, bestKind = null;

  for (const o of others) {
    for (const sg of o.segments) {
      const d = sg.point.getDistance(pt);
      if (d < bestD) { bestD = d; best = { x: sg.point.x, y: sg.point.y }; bestKind = "endpoint"; }
    }
  }
  if (!best) {
    for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) {
        let hits = [];
        try { hits = others[i].getIntersections(others[j]); } catch { /* skip */ }
        for (const h of hits) {
          const d = h.point.getDistance(pt);
          if (d < bestD) { bestD = d; best = { x: h.point.x, y: h.point.y }; bestKind = "intersection"; }
        }
      }
    }
  }
  if (!best) {
    for (const o of others) {
      try {
        const np = o.getNearestPoint(pt);
        const d = np.getDistance(pt);
        if (d < bestD) { bestD = d; best = { x: np.x, y: np.y }; bestKind = "oncurve"; }
      } catch { /* skip */ }
    }
  }
  cleanup(others);
  return best ? { ...best, kind: bestKind, dist: bestD } : null;
}
