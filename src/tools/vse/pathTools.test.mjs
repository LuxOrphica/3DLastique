// Run: node src/tools/vse/pathTools.test.mjs

import {
  distanceToPath, extendToMeet, joinPaths, moveVertex, pathFromD,
  segmentsOf, snapPoint, splitAtIntersections, splitAtPoint, trimAt,
} from "./pathTools.js";

let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  OK   ${n}`); } else { fail++; console.log(`  FAIL ${n}  ${d}`); } };
const info = (d) => {
  const p = pathFromD(d); if (!p) return null;
  const r = { len: p.length, x0: p.bounds.left, x1: p.bounds.right, y0: p.bounds.top, y1: p.bounds.bottom };
  try { p.remove(); } catch { /* ignore */ }
  return r;
};
const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;

console.log("\n=== ПОДРЕЗКА ===");
{
  const target = "M 0 10 L 100 10", wall = "M 50 0 L 50 100";
  check("1 пересечение -> 2 куска", splitAtIntersections(target, [wall]).length === 2);

  const kept = trimAt(target, [wall], { x: 80, y: 10 });
  const k = kept && info(kept[0]);
  check("клик справа -> остался левый", kept?.length === 1 && near(k.x0, 0) && near(k.x1, 50), JSON.stringify(kept));

  const kept2 = trimAt(target, [wall], { x: 20, y: 10 });
  const k2 = kept2 && info(kept2[0]);
  check("клик слева -> остался правый", kept2?.length === 1 && near(k2.x0, 50) && near(k2.x1, 100), JSON.stringify(kept2));
}
console.log("\n=== ПОДРЕЗКА: несколько пересечений (случай из UI) ===");
{
  // линия пересекается тремя стенками -> 4 куска, без огрызков
  const target = "M 0 10 L 100 10";
  const walls = ["M 25 0 L 25 100", "M 50 0 L 50 100", "M 75 0 L 75 100"];
  const pieces = splitAtIntersections(target, walls);
  check("3 пересечения -> ровно 4 куска", pieces.length === 4, JSON.stringify(pieces));
  const lens = pieces.map(d => info(d).len);
  check("все куски по 25, нулевых нет", lens.every(l => near(l, 25)), JSON.stringify(lens));

  // ГЛАВНОЕ: подрезка убирает только кликнутый участок, остальное НЕ дробится
  const kept = trimAt(target, walls, { x: 12, y: 10 });   // хвост слева
  check("хвост слева -> ОДИН кусок 25..100", kept?.length === 1 && near(info(kept[0]).x0, 25) && near(info(kept[0]).x1, 100), JSON.stringify(kept));

  const kept2 = trimAt(target, walls, { x: 90, y: 10 });  // хвост справа
  check("хвост справа -> ОДИН кусок 0..75", kept2?.length === 1 && near(info(kept2[0]).x0, 0) && near(info(kept2[0]).x1, 75), JSON.stringify(kept2));

  const mid = trimAt(target, walls, { x: 60, y: 10 });    // вырезать середину
  check("середина -> два куска", mid?.length === 2, JSON.stringify(mid));
  check("середина: 0..50 и 75..100",
        mid && near(info(mid[0]).x1, 50) && near(info(mid[1]).x0, 75), JSON.stringify(mid));
}
console.log("\n=== ПОДРЕЗКА: два пересечения почти в одной точке (случай из UI) ===");
{
  // контур и край резинки пересекают строчку в 0.18 друг от друга — огрызка быть не должно
  const target = "M 53.38 110.63 L 72.38 110.63";
  const walls = ["M 58.26 90 L 58.26 130", "M 58.44 90 L 58.44 130", "M 67.23 90 L 67.23 130"];
  const kept = trimAt(target, walls, { x: 55, y: 110.63 });
  check("остался ОДИН кусок, без огрызков", kept?.length === 1, JSON.stringify(kept));
  check("кусок идёт до конца линии", kept && near(info(kept[0]).x1, 72.38), JSON.stringify(kept));
  check("нет кусков короче 1", kept && kept.every(d => info(d).len > 1), JSON.stringify(kept?.map(d => info(d).len)));
}
console.log("\n=== ПОДРЕЗКА: пересечение ровно в конце ===");
{
  // стенка касается конца линии — это не повод плодить нулевой кусок
  const pieces = splitAtIntersections("M 0 10 L 100 10", ["M 100 0 L 100 100"]);
  check("касание конца не режет", pieces.length === 1, JSON.stringify(pieces));
}
console.log("\n=== ПРОДЛЕНИЕ ===");
{
  const out = extendToMeet("M 0 10 L 40 10", ["M 50 0 L 50 100"], "end");
  const o = out && info(out);
  check("дотянулась до стены", o && near(o.x1, 50), o && `x1=${o.x1}`);
  check("некуда -> null", extendToMeet("M 0 0 L 10 0", ["M 0 50 L 10 50"], "end") === null);
}
console.log("\n=== СОЕДИНЕНИЕ (явное) ===");
{
  const j = joinPaths("M 0 0 L 50 0", "M 50.4 0 L 100 0", 2);
  check("близкие концы склеились", j && near(info(j).x1, 100));
  check("далёкие ОТКЛОНЕНЫ", joinPaths("M 0 0 L 50 0", "M 80 0 L 100 0", 2) === null);
}
console.log("\n=== РАЗРЕЗ / СДВИГ / ПРИТЯЖКА ===");
{
  const h = splitAtPoint("M 0 0 L 100 0", { x: 30, y: 4 });
  check("разрез 30/70", h && near(info(h[0]).len, 30) && near(info(h[1]).len, 70));
  const m = moveVertex("M 0 0 L 50 0 L 100 0", 1, { x: 50, y: 25 });
  check("точка сдвинулась", m && near(info(m).y1, 25));
  const s = snapPoint({ x: 49, y: 1 }, ["M 50 0 L 100 0"], 5);
  check("притяжка к концу", s && near(s.x, 50) && s.kind === "endpoint");
  check("далеко -> нет притяжки", snapPoint({ x: 10, y: 90 }, ["M 50 0 L 100 0"], 5) === null);
  check("узлов 3", segmentsOf("M 0 0 L 50 0 L 100 0").length === 3);
  check("расстояние", near(distanceToPath("M 0 0 L 100 0", { x: 50, y: 7 }), 7));
}
console.log(`\n${fail === 0 ? "ВСЁ ЗЕЛЁНОЕ" : "ЕСТЬ ПАДЕНИЯ"}: ${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
