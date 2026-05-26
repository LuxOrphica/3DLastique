import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import nodeLibrary from "../pom/node-library.json";
import "./NodeCatalog.css";

const IMG_URL = (jpgId, code) =>
  jpgId ? `https://drive.google.com/thumbnail?id=${jpgId}&sz=w300`
        : `/nodes/${code}.jpg`;

const IMG_LARGE = (jpgId, code) =>
  jpgId ? `https://drive.google.com/thumbnail?id=${jpgId}&sz=w1200`
        : `/nodes/${code}.jpg`;

function buildCategories() {
  const map = new Map();
  for (const node of nodeLibrary) {
    if (!map.has(node.categoryRU)) {
      map.set(node.categoryRU, { labelRU: node.categoryRU, labelEN: node.categoryEN, count: 0 });
    }
    map.get(node.categoryRU).count++;
  }
  return Array.from(map.values());
}

const ALL_CATEGORIES = buildCategories();

function buildSubcategories(categoryRU) {
  const map = new Map();
  for (const node of nodeLibrary) {
    if (node.categoryRU !== categoryRU) continue;
    if (!map.has(node.subcategoryEN)) {
      map.set(node.subcategoryEN, { labelEN: node.subcategoryEN, labelRU: node.subcategoryRU, count: 0 });
    }
    map.get(node.subcategoryEN).count++;
  }
  return Array.from(map.values());
}

function NodeCard({ node, onClick, selected, viewMode }) {
  const [imgError, setImgError] = useState(false);
  if (viewMode === "list") {
    return (
      <div
        className={`nc-list-row${selected ? " nc-card-selected" : ""}`}
        onClick={() => onClick(node)}
      >
        <div className="nc-list-thumb-wrap">
          {!imgError
            ? <img src={IMG_URL(node.jpgId, node.code)} alt={node.code} className="nc-list-thumb" onError={() => setImgError(true)} />
            : <div className="nc-card-img-fallback">{node.code}</div>
          }
        </div>
        <span className="nc-list-code">{node.code}</span>
        <span className="nc-list-sub">{node.subcategoryRU}</span>
      </div>
    );
  }
  return (
    <div
      className={`nc-card${selected ? " nc-card-selected" : ""}`}
      onClick={() => onClick(node)}
      title={node.subcategoryRU}
    >
      <div className="nc-card-img-wrap">
        {!imgError
          ? <img
              src={IMG_URL(node.jpgId, node.code)}
              alt={node.code}
              className="nc-card-img"
              onError={() => setImgError(true)}
            />
          : <div className="nc-card-img-fallback">{node.code}</div>
        }
      </div>
      <div className="nc-card-code">{node.code}</div>
      <div className="nc-card-name">{node.subcategoryRU}</div>
    </div>
  );
}

function ZoomableImage({ src }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const ref = useRef(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const clamp = (ox, oy, sc) => {
    const m = sc <= 1 ? 0 : (sc - 1) * 200;
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
    const el = ref.current;
    if (!el) return;
    const handler = (e) => { e.preventDefault(); applyZoom(e.deltaY < 0 ? 0.25 : -0.25); };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyZoom]);

  // reset on src change
  useEffect(() => {
    setScale(1); setOffset({ x: 0, y: 0 });
    scaleRef.current = 1; offsetRef.current = { x: 0, y: 0 };
  }, [src]);

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
  const reset = () => { setScale(1); scaleRef.current = 1; setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; };

  return (
    <div
      ref={ref}
      className="nc-zoom-wrap"
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
    >
      <img
        src={src} alt=""
        className="nc-zoom-img"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        draggable={false}
      />
      {scale > 1 && <button className="nc-zoom-reset" onClick={reset}>↺</button>}
    </div>
  );
}

function NodeDetail({ node, onClose }) {
  const [imgError, setImgError] = useState(false);
  if (!node) return null;
  return (
    <div className="nc-detail">
      <button className="nc-detail-close" onClick={onClose}>✕</button>
      <div className="nc-detail-img-wrap">
        {!imgError
          ? <ZoomableImage src={IMG_LARGE(node.jpgId, node.code)} onError={() => setImgError(true)} />
          : <div className="nc-card-img-fallback large">{node.code}</div>
        }
      </div>
      <div className="nc-detail-code">{node.code}</div>
      <div className="nc-detail-names">
        <div className="nc-detail-name-ru">{node.nameRU}</div>
        <div className="nc-detail-name-en">{node.nameEN}</div>
      </div>
      <div className="nc-detail-meta">
        <span>{node.categoryRU}</span>
        <span className="nc-detail-sep">·</span>
        <span>{node.subcategoryRU}</span>
      </div>
    </div>
  );
}

export default function NodeCatalog({ lang = "ru" }) {
  const [activeCat, setActiveCat] = useState(ALL_CATEGORIES[0]?.labelRU ?? "");
  const [activeSub, setActiveSub] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "large" | "list"

  const subcategories = useMemo(() => buildSubcategories(activeCat), [activeCat]);

  const nodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nodeLibrary.filter(n => {
      if (!q && n.categoryRU !== activeCat) return false;
      if (!q && activeSub && n.subcategoryEN !== activeSub) return false;
      if (q) {
        return n.code.toLowerCase().includes(q)
          || n.nameRU.toLowerCase().includes(q)
          || n.nameEN.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeCat, activeSub, search]);

  const totalInCat = nodeLibrary.filter(n => n.categoryRU === activeCat).length;

  const handleCatChange = (catRU) => {
    setActiveCat(catRU);
    setActiveSub(null);
    setSearch("");
    setSelected(null);
  };

  return (
    <div className="nc-wrap">
      <div className="nc-header">
        <div className="pom-label">Конструктивные узлы</div>
        <div className="pom-title">Справочник узлов</div>
        <div className="pom-sub">Node Library — {nodeLibrary.length} узлов</div>
      </div>

      {/* Category tabs */}
      <div className="ref-cat-tabs nc-cat-tabs">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat.labelRU}
            className={`ref-cat-btn${activeCat === cat.labelRU ? " active" : ""}`}
            onClick={() => handleCatChange(cat.labelRU)}
          >
            {cat.labelRU}
            <span className="pom-tab-count">{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Subcategory filter */}
      {subcategories.length > 1 && (
        <div className="nc-sub-tabs">
          <button
            className={`nc-sub-btn${activeSub === null ? " active" : ""}`}
            onClick={() => setActiveSub(null)}
          >
            Все <span className="pom-tab-count">{totalInCat}</span>
          </button>
          {subcategories.map(sub => (
            <button
              key={sub.labelEN}
              className={`nc-sub-btn${activeSub === sub.labelEN ? " active" : ""}`}
              onClick={() => setActiveSub(sub.labelEN)}
            >
              {sub.labelRU}
              <span className="pom-tab-count">{sub.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search + view toggle */}
      <div className="ref-search-row">
        <input
          className="ref-search"
          placeholder="Поиск по коду или названию…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="ref-count">{nodes.length} / {totalInCat}</span>
        <div className="nc-view-toggle">
          <button className={`nc-view-btn${viewMode === "list" ? " active" : ""}`} onClick={() => setViewMode("list")} title="Список">☰</button>
          <button className={`nc-view-btn${viewMode === "grid" ? " active" : ""}`} onClick={() => setViewMode("grid")} title="Сетка">⊞</button>
          <button className={`nc-view-btn${viewMode === "large" ? " active" : ""}`} onClick={() => setViewMode("large")} title="Крупные">⬛</button>
        </div>
      </div>

      {/* Main: grid + detail */}
      <div className="nc-main">
        <div className={`nc-grid nc-grid-${viewMode}`}>
          {nodes.map(node => (
            <NodeCard
              key={node.code + node.jpgId}
              node={node}
              onClick={setSelected}
              selected={selected?.jpgId === node.jpgId}
              viewMode={viewMode}
            />
          ))}
          {nodes.length === 0 && (
            <div className="nc-empty">Ничего не найдено</div>
          )}
        </div>
        {selected && (
          <NodeDetail node={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
