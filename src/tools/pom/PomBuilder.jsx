import { useState, useRef, useCallback, useEffect } from "react";
import { utils, writeFile } from "xlsx";
import {
  GARMENTS, SIZES_DEFAULT, BASE_SIZE_DEFAULT, COAT_SIZES_DEFAULT, COAT_BASE_SIZE_DEFAULT, ALL_SIZES,
  getPoms, calcValue,
} from "./data";
import { POM_REFERENCE } from "./pom-reference";
import { POM_IMAGES } from "./pom-images";
import { POM_REFERENCE_ACC, POM_IMAGES_ACC } from "./pom-reference-acc";
import { POM_REFERENCE_SWIM_MEN, POM_IMAGES_SWIM_MEN } from "./pom-reference-swim-men";
import { POM_REFERENCE_SWIM_WOMEN, POM_IMAGES_SWIM_WOMEN } from "./pom-reference-swim-women";

const REF_CATEGORIES = [
  { id: "apparel",    labelRU: "Одежда",         ref: POM_REFERENCE,          images: POM_IMAGES,          imgBase: "/pom-ref/"           },
  { id: "acc",        labelRU: "Аксессуары",      ref: POM_REFERENCE_ACC,      images: POM_IMAGES_ACC,      imgBase: "/pom-ref-acc/"       },
  { id: "swim-men",   labelRU: "Купальники муж.", ref: POM_REFERENCE_SWIM_MEN, images: POM_IMAGES_SWIM_MEN, imgBase: "/pom-ref-swim-men/"  },
  { id: "swim-women", labelRU: "Купальники жен.", ref: POM_REFERENCE_SWIM_WOMEN, images: POM_IMAGES_SWIM_WOMEN, imgBase: "/pom-ref-swim-women/" },
];
import "./PomBuilder.css";
import trousersDiagram from "./assets/trousers-pom-diagram.png";
import trousersFront from "./assets/trousers-front.png";
import trousersBack from "./assets/trousers-back.png";
import coatSingleDiagram from "./assets/coat-single-diagram.png";
import coatSingleSketch from "./assets/coat-single-sketch.png";
import coatDoubleDiagram from "./assets/coat-double-diagram.png";
import coatDoubleSketch from "./assets/coat-double-sketch.png";

const SKETCHES = {
  "classic-trousers": { diagram: trousersDiagram, front: trousersFront, back: trousersBack },
  "coat-single": { diagram: coatSingleDiagram, sketch: coatSingleSketch },
  "coat-double": { diagram: coatDoubleDiagram, sketch: coatDoubleSketch },
};

const GARMENT_DEFAULTS = {
  "classic-trousers": { sizes: SIZES_DEFAULT, baseSize: BASE_SIZE_DEFAULT },
  "coat-single": { sizes: COAT_SIZES_DEFAULT, baseSize: COAT_BASE_SIZE_DEFAULT },
  "coat-double": { sizes: COAT_SIZES_DEFAULT, baseSize: COAT_BASE_SIZE_DEFAULT },
};

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;


function DiagramViewer({ src }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const canvasRef = useRef(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const clampOffset = (ox, oy, sc) => {
    const maxXY = sc <= 1 ? 0 : (sc - 1) * 200;
    return {
      x: Math.max(-maxXY, Math.min(maxXY, ox)),
      y: Math.max(-maxXY, Math.min(maxXY, oy)),
    };
  };

  const applyZoom = useCallback((delta) => {
    setScale(prev => {
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(prev + delta).toFixed(2)));
      scaleRef.current = next;
      if (next === ZOOM_MIN) {
        setOffset({ x: 0, y: 0 });
        offsetRef.current = { x: 0, y: 0 };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      applyZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyZoom]);

  const onMouseDown = (e) => {
    if (scaleRef.current <= 1) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    const next = clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, scaleRef.current);
    offsetRef.current = next;
    setOffset(next);
  };

  const onMouseUp = () => { dragging.current = false; };

  const reset = () => {
    setScale(1); scaleRef.current = 1;
    setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 };
  };

  return (
    <div className="diagram-viewer">
      <div
        ref={canvasRef}
        className="diagram-canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: scale > 1 ? "grab" : "default" }}
      >
        <img
          src={src}
          alt="POM diagram"
          className="diagram-img"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          draggable={false}
        />
      </div>
      <div className="diagram-zoom-controls">
        <button onClick={() => applyZoom(ZOOM_STEP)} disabled={scale >= ZOOM_MAX} title="Zoom in">+</button>
        <span className="diagram-zoom-label">{Math.round(scale * 100)}%</span>
        <button onClick={() => applyZoom(-ZOOM_STEP)} disabled={scale <= ZOOM_MIN} title="Zoom out">−</button>
        {scale > 1 && <button className="diagram-zoom-reset" onClick={reset} title="Reset">↺</button>}
      </div>
    </div>
  );
}


function CardImage({ src }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const canvasRef = useRef(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const clamp = (ox, oy, sc) => {
    const m = sc <= 1 ? 0 : (sc - 1) * 150;
    return { x: Math.max(-m, Math.min(m, ox)), y: Math.max(-m, Math.min(m, oy)) };
  };

  const applyZoom = useCallback((delta) => {
    setScale(prev => {
      const next = Math.max(1, Math.min(5, +(prev + delta).toFixed(2)));
      scaleRef.current = next;
      if (next === 1) { setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; }
      return next;
    });
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => { e.preventDefault(); applyZoom(e.deltaY < 0 ? 0.2 : -0.2); };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyZoom]);

  const onMouseDown = (e) => {
    if (scaleRef.current <= 1) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const next = clamp(dragStart.current.ox + e.clientX - dragStart.current.mx, dragStart.current.oy + e.clientY - dragStart.current.my, scaleRef.current);
    offsetRef.current = next; setOffset(next);
  };
  const onMouseUp = () => { dragging.current = false; };

  return (
    <div className="card-img-viewer" ref={canvasRef}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
    >
      <img
        src={src} alt="measurement"
        className="card-img-inner"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        draggable={false}
      />
      {scale > 1 && (
        <button className="card-img-reset" onClick={() => { setScale(1); scaleRef.current = 1; setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; }}>↺</button>
      )}
    </div>
  );
}

function PomCard({ code, entry, onClose, imgBase }) {
  if (!entry) return null;
  const cat = REF_CATEGORIES.find(c => c.imgBase === imgBase) || REF_CATEGORIES[0];
  const imgFile = cat.images[code];

  return (
    <div className="pom-card">
      <div className="pom-card-header">
        <span className="pom-card-code">{code}</span>
        <button className="pom-card-close" onClick={onClose}>✕</button>
      </div>
      <div className="pom-card-name">{entry.nameRU}</div>
      {entry.nameEN && <div className="pom-card-name-en">{entry.nameEN}</div>}
      {imgFile && (
        <div className="pom-card-img-wrap">
          <CardImage src={`${imgBase || '/pom-ref/'}${imgFile}`} />
        </div>
      )}
      {entry.methodRU && (
        <div className="pom-card-section">
          <div className="pom-card-section-label">Способ измерения</div>
          <div className="pom-card-method">{entry.methodRU}</div>
        </div>
      )}
      {entry.methodEN && (
        <div className="pom-card-section">
          <div className="pom-card-section-label">Method</div>
          <div className="pom-card-method pom-card-method-en">{entry.methodEN}</div>
        </div>
      )}
    </div>
  );
}

function ReferenceTable({ lang, onSelect, selectedCode, refCatId, onCatChange }) {
  const [search, setSearch] = useState("");
  const cat = REF_CATEGORIES.find(c => c.id === refCatId) || REF_CATEGORIES[0];
  const entries = Object.entries(cat.ref).sort((a, b) => a[0].localeCompare(b[0]));

  const filtered = search.trim()
    ? entries.filter(([code, e]) => {
        const q = search.toLowerCase();
        return code.toLowerCase().includes(q)
          || (e.nameRU || "").toLowerCase().includes(q)
          || (e.nameEN || "").toLowerCase().includes(q);
      })
    : entries;

  return (
    <div className="ref-wrap">
      <div className="ref-search-row">
        <div className="ref-cat-tabs">
          {REF_CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`ref-cat-btn${refCatId === c.id ? " active" : ""}`}
              onClick={() => { onCatChange(c.id); setSearch(""); }}
            >
              {c.labelRU}
              <span className="pom-tab-count">{Object.keys(c.ref).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="ref-search-row">
        <input
          className="ref-search"
          placeholder="Поиск по коду или названию…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="ref-count">{filtered.length} / {entries.length}</span>
      </div>
      <div className="pom-table-wrap">
        <table className="pom-table">
          <thead>
            <tr>
              <th className="col-code col-sticky">Код</th>
              {(lang === "ru" || lang === "both") && <th className="col-name col-sticky col-sticky-2">Название RU</th>}
              {(lang === "en" || lang === "both") && <th className="col-name">Name EN</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(([code, e], i) => (
              <tr
                key={code}
                className={`${i % 2 === 0 ? "row-even" : ""} ${selectedCode === code ? "row-selected" : ""}`}
                onClick={() => onSelect(code, e)}
                style={{ cursor: "pointer" }}
              >
                <td className="col-code col-sticky">{code}</td>
                {(lang === "ru" || lang === "both") && <td className="col-name col-sticky col-sticky-2">{e.nameRU}</td>}
                {(lang === "en" || lang === "both") && <td className="col-name">{e.nameEN}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PomBuilder({ lang: siteLang = "ru" }) {
  const [garmentId, setGarmentId] = useState("classic-trousers");
  const [sizes, setSizes] = useState(SIZES_DEFAULT);
  const [baseSize, setBaseSize] = useState(BASE_SIZE_DEFAULT);
  const [unit, setUnit] = useState("cm");
  const lang = siteLang === "en" ? "en" : "both";
  const [showMethod, setShowMethod] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState("spec"); // "spec" | "reference"
  const [selectedCode, setSelectedCode] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedImgBase, setSelectedImgBase] = useState("/pom-ref/");
  const [refCatId, setRefCatId] = useState("apparel");
  const [showStyleForm, setShowStyleForm] = useState(false);

  const poms = getPoms(garmentId, showDetail ? "all" : "main");
  const garment = GARMENTS.find(g => g.id === garmentId);

  const convert = (v) => unit === "mm" ? +(v * 10).toFixed(0) : v;

  const toggleSize = (s) => {
    setSizes(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s].sort((a, b) => a - b)
    );
  };

  const selectRow = (code, entry, imgBase) => {
    if (selectedCode === code) {
      setSelectedCode(null);
      setSelectedEntry(null);
    } else {
      setSelectedCode(code);
      setSelectedEntry(entry);
      if (imgBase) setSelectedImgBase(imgBase);
    }
  };

  const exportExcel = () => {
    const header = [
      "Code",
      lang === "en" ? "Name EN" : "Name RU",
      lang === "both" ? "Name EN" : null,
      showMethod ? "Method" : null,
      ...sizes.map(s => `${s}${s === baseSize ? " (base)" : ""}`),
      `TOL ±`,
    ].filter(Boolean);

    const rows = poms.map(p => {
      const ref = POM_REFERENCE[p.code];
      const name = lang === "en" ? (p.nameEN || ref?.nameEN || "") : (p.nameRU || ref?.nameRU || "");
      const nameEn = lang === "both" ? (p.nameEN || ref?.nameEN || "") : null;
      const method = showMethod ? (p.methodRU || ref?.methodRU || "") : null;
      const vals = sizes.map(s => convert(calcValue(p, s, baseSize)));
      const tol = unit === "mm" ? +(p.tolPlus * 10).toFixed(0) : p.tolPlus;
      return [p.code, name, nameEn, method, ...vals, tol].filter((_, i) => header[i] !== undefined);
    });

    const ws = utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((_, i) => ({ wch: i < 3 ? 24 : 8 }));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Measurement Sheet");

    const metaRows = [
      ["Garment", garment.labelEN],
      ["Base size", baseSize],
      ["Unit", unit],
      ["Date", new Date().toISOString().slice(0, 10)],
      ["Source", "3D Lastique · lekala.pro/tools/pom"],
    ];
    const wsMeta = utils.aoa_to_sheet(metaRows);
    wsMeta["!cols"] = [{ wch: 16 }, { wch: 32 }];
    utils.book_append_sheet(wb, wsMeta, "Info");
    writeFile(wb, `POM_${garmentId}_base${baseSize}.xlsx`);
  };

  return (
    <div className="pom-wrap">
      <div className="pom-header">
        <div className="pom-label">3D Lastique · Tools</div>
        <h1 className="pom-title">Garment Spec Builder</h1>
        <p className="pom-sub">Табель мер / Measurement Sheet — v0.1</p>
      </div>

      {/* Controls — only shown in spec tab */}
      {activeTab === "spec" && (
        <div className="pom-controls">
          <div className="pom-control-group">
            <label>Изделие</label>
            <select value={garmentId} onChange={e => {
              const id = e.target.value;
              setGarmentId(id);
              const d = GARMENT_DEFAULTS[id];
              setSizes(d.sizes);
              setBaseSize(d.baseSize);
            }}>
              {GARMENTS.map(g => (
                <option key={g.id} value={g.id}>{g.labelRU}</option>
              ))}
            </select>
          </div>

          <div className="pom-control-group">
            <label>Размеры</label>
            <div className="pom-size-toggles">
              {ALL_SIZES.map(s => (
                <button
                  key={s}
                  className={`pom-size-btn${sizes.includes(s) ? " active" : ""}${s === baseSize ? " base" : ""}`}
                  onClick={() => toggleSize(s)}
                  title={s === baseSize ? "Базовый размер" : ""}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pom-control-group">
            <label>Базовый размер</label>
            <select value={baseSize} onChange={e => setBaseSize(+e.target.value)}>
              {sizes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="pom-control-group">
            <label>Единицы</label>
            <div className="pom-radio-group">
              {["cm", "mm"].map(u => (
                <label key={u} className="pom-radio">
                  <input type="radio" name="unit" value={u} checked={unit === u} onChange={() => setUnit(u)} />
                  {u}
                </label>
              ))}
            </div>
          </div>

<div className="pom-control-group">
            <label>Способ измерения</label>
            <label className="pom-radio">
              <input type="checkbox" checked={showMethod} onChange={() => setShowMethod(m => !m)} />
              показать
            </label>
          </div>

          <div className="pom-control-group">
            <label>Детальные измерения</label>
            <label className="pom-radio">
              <input type="checkbox" checked={showDetail} onChange={() => setShowDetail(m => !m)} />
              показать
            </label>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="pom-tabs">
        <button
          className={`pom-tab${activeTab === "spec" ? " active" : ""}`}
          onClick={() => setActiveTab("spec")}
        >
          Табель мер
        </button>
        <button
          className={`pom-tab${activeTab === "reference" ? " active" : ""}`}
          onClick={() => setActiveTab("reference")}
        >
          Справочник POM
        </button>
      </div>

      {/* Main layout */}
      <div className="pom-main">
        <div className="pom-table-col">
          {activeTab === "spec" ? (
            <>
              <div className="pom-table-wrap">
                <table className="pom-table">
                  <thead>
                    <tr>
                      <th className="col-code col-sticky">Код</th>
                      {(lang === "ru" || lang === "both") && <th className="col-name col-sticky col-sticky-2">Название RU</th>}
                      {(lang === "en" || lang === "both") && <th className={`col-name${lang === "en" ? " col-sticky col-sticky-2" : ""}`}>Name EN</th>}
                      {showMethod && <th className="col-method">Способ измерения</th>}
                      {sizes.map(s => (
                        <th key={s} className={`col-size${s === baseSize ? " base-col" : ""}`}>
                          {s}{s === baseSize ? <span className="base-mark">●</span> : ""}
                        </th>
                      ))}
                      <th className="col-tol">TOL ±</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = [];
                      let lastGroup = null;
                      poms.forEach((p, i) => {
                        if (showDetail && p.group !== lastGroup && lastGroup !== null) {
                          rows.push(
                            <tr key={`sep-${p.code}`} className="row-group-sep">
                              <td colSpan={99} className="group-sep-cell">
                                {p.group === "detail" ? "Детальные измерения" : "Основные измерения"}
                              </td>
                            </tr>
                          );
                        }
                        lastGroup = p.group;
                        const ref = POM_REFERENCE[p.code];
                        const method = lang === "en"
                          ? (p.method || ref?.methodEN || "")
                          : (p.methodRU || ref?.methodRU || "");
                        const entry = ref || { nameRU: p.nameRU, nameEN: p.nameEN, methodRU: p.methodRU, methodEN: p.method };
                        rows.push(
                          <tr
                            key={p.code}
                            className={`${i % 2 === 0 ? "row-even" : ""} ${selectedCode === p.code ? "row-selected" : ""}`}
                            title={!showMethod ? method : undefined}
                            onClick={() => selectRow(p.code, entry, "/pom-ref/")}
                            style={{ cursor: "pointer" }}
                          >
                            <td className="col-code col-sticky">{p.code}</td>
                            {(lang === "ru" || lang === "both") && <td className="col-name col-sticky col-sticky-2">{p.nameRU || ref?.nameRU || ""}</td>}
                            {(lang === "en" || lang === "both") && <td className={`col-name${lang === "en" ? " col-sticky col-sticky-2" : ""}`}>{p.nameEN || ref?.nameEN || ""}</td>}
                            {showMethod && <td className="col-method">{method}</td>}
                            {sizes.map(s => (
                              <td key={s} className={`col-size${s === baseSize ? " base-col" : ""}`}>
                                {convert(calcValue(p, s, baseSize))}
                              </td>
                            ))}
                            <td className="col-tol">
                              {unit === "mm" ? +(p.tolPlus * 10).toFixed(0) : p.tolPlus}
                            </td>
                          </tr>
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="pom-note">
                * Все значения — плоские замеры (изделие сложено вдвое). Единицы: {unit}. Базовый размер: {baseSize}.
              </div>
            </>
          ) : (
            <ReferenceTable
              lang={lang}
              onSelect={(code, entry) => {
                const cat = REF_CATEGORIES.find(c => c.id === refCatId);
                const imgFile = cat.images[code];
                selectRow(code, entry, cat.imgBase);
              }}
              selectedCode={selectedCode}
              refCatId={refCatId}
              onCatChange={(id) => { setRefCatId(id); setSelectedCode(null); setSelectedEntry(null); }}
            />
          )}
        </div>

        <div className="pom-diagram-col">
          {activeTab === "spec" && SKETCHES[garmentId] && (
            <DiagramViewer src={SKETCHES[garmentId].diagram} />
          )}
          {selectedEntry && (
            <PomCard
              code={selectedCode}
              entry={selectedEntry}
              imgBase={selectedImgBase}
              onClose={() => { setSelectedCode(null); setSelectedEntry(null); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
