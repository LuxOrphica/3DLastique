import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import nodeLibrary from "./node-library.json";
import { exportTechPackExcel } from "./exportTechPack";
import { EditableTable } from "./EditableTable";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PomPdfDocument } from "./pdf/PomPdf";
import {
  GARMENTS, SIZES_DEFAULT, BASE_SIZE_DEFAULT, COAT_SIZES_DEFAULT, COAT_BASE_SIZE_DEFAULT,
  getPoms,
} from "./data";
import { POM_REFERENCE } from "./pom-reference";
import { POM_REFERENCE_ACC } from "./pom-reference-acc";
import { POM_REFERENCE_SWIM_MEN } from "./pom-reference-swim-men";
import { POM_REFERENCE_SWIM_WOMEN } from "./pom-reference-swim-women";
import { GARMENT_PRESETS, getSectionStatus } from "./garment-presets";
import trousersFront from "./assets/trousers-front.png";
import trousersBack from "./assets/trousers-back.png";
import trousersDiagram from "./assets/trousers-pom-diagram.png";
import coatSingleDiagram from "./assets/coat-single-diagram.png";
import coatSingleSketch from "./assets/coat-single-sketch.png";
import coatDoubleDiagram from "./assets/coat-double-diagram.png";
import coatDoubleSketch from "./assets/coat-double-sketch.png";
import LeftNav from "./LeftNav";
import "./PomBuilder.css";

const REF_CATEGORIES = [
  { id: "apparel",    ref: POM_REFERENCE },
  { id: "acc",        ref: POM_REFERENCE_ACC },
  { id: "swim-men",   ref: POM_REFERENCE_SWIM_MEN },
  { id: "swim-women", ref: POM_REFERENCE_SWIM_WOMEN },
];

const SKETCHES = {
  "coat_single":      { diagram: coatSingleDiagram, sketch: coatSingleSketch },
  "coat_double":      { diagram: coatDoubleDiagram, sketch: coatDoubleSketch },
  "trousers_classic": { diagram: trousersDiagram, front: trousersFront, back: trousersBack },
};

const GARMENT_DEFAULTS = {
  "coat_single":      { sizes: COAT_SIZES_DEFAULT, baseSize: COAT_BASE_SIZE_DEFAULT },
  "coat_double":      { sizes: COAT_SIZES_DEFAULT, baseSize: COAT_BASE_SIZE_DEFAULT },
  "jacket_blazer":    { sizes: COAT_SIZES_DEFAULT, baseSize: COAT_BASE_SIZE_DEFAULT },
  "trousers_classic": { sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
  "trousers_casual":  { sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
  "skirt":            { sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
  "tshirt_polo":      { sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
  "knitwear":         { sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
  "hoodie_sweatshirt":{ sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
  "swimsuit":         { sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
  "swim_shorts":      { sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
  "swimwear_set":     { sizes: SIZES_DEFAULT,      baseSize: BASE_SIZE_DEFAULT },
};

// Tab groups: each tab may cover one or more preset section IDs
// A tab is visible when at least one of its sections is "always" or "optional" for the garment
const TAB_GROUPS = [
  {
    id: "cover",
    labelRU: "01 Паспорт",        labelEN: "01 Cover",
    sections: ["style_info"],
  },
  {
    id: "sketch",
    labelRU: "02 Эскиз",      labelEN: "02 Sketch",
    sections: ["callouts"],
  },
  {
    id: "bom",
    labelRU: "03 BOM",          labelEN: "03 BOM",
    sections: ["bom"],
  },
  {
    id: "pom",
    labelRU: "04 Размерная",    labelEN: "04 POM",
    sections: ["measurements"],
  },
  {
    id: "construction",
    labelRU: "05 Конструкция",  labelEN: "05 Construction",
    sections: ["fusing", "lining", "swimwear_lining", "elastic", "seam_allowances", "stitch_spec", "yarn_spec", "denim_wash", "swimwear_performance"],
  },
  {
    id: "stitches",
    labelRU: "06 Строчки",         labelEN: "06 Stitches",
    sections: ["stitch_spec"],
  },
  {
    id: "labels",
    labelRU: "07 Маркировка",   labelEN: "07 Labels",
    sections: ["labels_packing"],
  },
  {
    id: "packaging",
    labelRU: "08 Упаковка",        labelEN: "08 Packaging",
    sections: ["labels_packing"],
  },
  {
    id: "testing",
    labelRU: "09 Тесты",         labelEN: "09 Testing",
    sections: [],
  },
];

function tabVisible(garmentId, tab) {
  if (tab.id === "nodes") return true;
  return tab.sections.some(s => {
    const st = getSectionStatus(garmentId, s);
    return st === "always" || st === "optional";
  });
}

const CATEGORY_LABELS = {
  outerwear: { ru: "Верхняя одежда", en: "Outerwear" },
  bottoms:   { ru: "Низ",            en: "Bottoms"   },
  tops:      { ru: "Верх",           en: "Tops"      },
  swimwear:  { ru: "Купальники",     en: "Swimwear"  },
};

export default function TechPackBuilder({ lang: siteLang = "ru" }) {
  const ru = siteLang !== "en";

  // Language-dependent option lists
  const OPT = {
    status:      ru ? ["Заполнить","Черновик","Подтверждено","Согласовано"] : ["To fill","Draft","Confirmed","Approved"],
    statusShort: ru ? ["Заполнить","Подтверждено"] : ["To fill","Confirmed"],
    statusBom:   ru ? ["Заполнить","Уточняется","Подтверждено","Согласовано"] : ["To fill","TBC","Confirmed","Approved"],
    statusFile:  ru ? ["Заполнить","Отправлен","Ожидает","Н/П"] : ["To fill","Sent","Pending","N/A"],
    required:    ru ? ["Да","Рекомендуется","При наличии","Нет"] : ["Yes","Recommended","If available","No"],
    yesNo:       ru ? ["Да","Нет","Опционально"] : ["Yes","No","Optional"],
    unit:        ["m","pcs","kg","set","roll",""],
    bomType:     ru ? ["Ткань","Подкладка","Карманная","Дублерин","Фурнитура","Этикетка","Упаковка","Прочее"]
                    : ["Fabric","Lining","Pocketing","Interlining","Trim","Label","Packing","Other"],
    qty:         ["1+0","1+1","2+0","2+2",""],
    attach:      ru ? ["Вшитая","В кулиске","Клеевая"] : ["Sewn in","Sewn in casing","Adhesive"],
    labelAttach: ru ? ["Вшитая","Пришивная","Клеевая","Навесная"] : ["Sewn","Sewn on","Adhesive","Hang tag"],
    approval:    ru ? "По согласованию" : "Buyer approval",
    toFill:      ru ? "Заполнить" : "To fill",
    stitchCode: [
      "301 — Lockstitch",
      "401 — Chain stitch",
      "404 — Double chain stitch",
      "406 — Coverstitch (bottom)",
      "407 — Coverstitch (top+bottom)",
      "501 — Overlock 2-thread",
      "503 — Overlock 3-thread",
      "504 — Overlock 4-thread",
      "512 — Safety stitch (2+3)",
      "514 — Safety stitch (2+4)",
      "516 — Flatlock / flatseam",
      "602 — Cover stitch 3-needle",
      "605 — Cover stitch 5-thread",
      "101 — Chain stitch single",
      "209 — Blind stitch",
    ],
  };

  const [garmentId, setGarmentId] = useState("coat_single");
  const [sizes,     setSizes]     = useState(COAT_SIZES_DEFAULT);
  const [baseSize,  setBaseSize]  = useState(COAT_BASE_SIZE_DEFAULT);
  const [refCatId,  setRefCatId]  = useState("apparel");

  const [sectionTab, setSectionTab] = useState("cover");
  const [navCollapsed, setNavCollapsed] = useState(false);

  // Track which optional sections are enabled per tab
  const [optionalEnabled, setOptionalEnabled] = useState({});
  const toggleOptional = (sectionId) =>
    setOptionalEnabled(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  const isEnabled = (sectionId) => {
    const st = getSectionStatus(garmentId, sectionId);
    if (st === "always") return true;
    if (st === "optional") return !!optionalEnabled[sectionId];
    return false;
  };

  // Aggregate techpack data for LeftNav status dots
  const techpackData = useMemo(() => ({
    styleInfo,
    sketchFront,
    sketchBack,
    bomItems,
    pomMeasurements: [], // Will be populated when POM tab is integrated
    fusingItems,
    liningItems,
    seamItems,
    stitchItems,
    selectedNodes,
    labelItems,
    packingItems,
    projectTests: [], // Will be populated when Testing tab is added
  }), [styleInfo, sketchFront, sketchBack, bomItems, fusingItems, liningItems, seamItems, stitchItems, selectedNodes, labelItems, packingItems]);

  const [styleInfo, setStyleInfo] = useState({
    brand:       "3D Lastique",
    styleCode:   "",
    nameRU:      "",
    nameEN:      "",
    season:      "",
    gender:      "Men",
    specStage:   "Tech pack",
    factory:     "",
    date:        new Date().toLocaleDateString("ru-RU"),
    description: "",
  });
  const updateStyle = (field, value) =>
    setStyleInfo(prev => ({ ...prev, [field]: value }));

  const [sketchFront, setSketchFront] = useState(null);
  const [sketchBack,  setSketchBack]  = useState(null);
  const loadSketch = (setter) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setter(URL.createObjectURL(file));
  };

  // Section data states
  const [callouts,      setCallouts]      = useState([]);
  const [bomItems,      setBomItems]      = useState([]);
  const [fusingItems,   setFusingItems]   = useState([]);
  const [liningItems,   setLiningItems]   = useState([]);
  const [swimLiningItems, setSwimLiningItems] = useState([]);
  const [elasticItems,  setElasticItems]  = useState([]);
  const [seamItems,     setSeamItems]     = useState([]);
  const [stitchItems,   setStitchItems]   = useState([]);
  const [colorwayItems, setColorwayItems] = useState([]);
  const [washItems,     setWashItems]     = useState([]);
  const [patternPieces, setPatternPieces] = useState([]);
  const [labelItems,    setLabelItems]    = useState([]);
  const [packingItems,  setPackingItems]  = useState([]);
  const [fileItems,     setFileItems]     = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]); // [{code, jpgId, nameRU, nameEN, bomRef, notes}]
  const [nodeSearch,    setNodeSearch]    = useState("");

  const [yarnSpec, setYarnSpec] = useState({
    yarnCount: "", gauge: "", ply: "2-ply", twist: "S",
    dyeMethod: "yarn-dyed", coursesPerCm: "", walesPerCm: "",
    shrinkagePre: "", shrinkagePost: "", notes: "",
  });
  const updateYarn = (f, v) => setYarnSpec(p => ({ ...p, [f]: v }));

  const [denimWash, setDenimWash] = useState({
    washType: "raw/dry", recipe: "", distressingNotes: "",
    hardwareFinish: "antique brass", shrinkagePre: "", shrinkagePost: "", notes: "",
  });
  const updateDenim = (f, v) => setDenimWash(p => ({ ...p, [f]: v }));

  const [swimPerf, setSwimPerf] = useState({
    stretch4wayW: "", stretch4wayF: "", chlorineResistance: "",
    upfRating: "UPF 50+", seamType: "flatlock",
    colourFastness: "", notes: "",
  });
  const updateSwimPerf = (f, v) => setSwimPerf(p => ({ ...p, [f]: v }));

  const garment = GARMENTS.find(g => g.id === garmentId);

  // Tabs to show for current garment
  const visibleTabs = useMemo(
    () => TAB_GROUPS.filter(t => tabVisible(garmentId, t)),
    [garmentId]
  );

  // If current sectionTab is no longer visible, reset to first
  const activeTab = visibleTabs.find(t => t.id === sectionTab)
    ? sectionTab
    : visibleTabs[0]?.id;

  const exportPayload = (lng) => ({
    lang: lng,
    styleInfo: {
      ...styleInfo,
      baseSize, sizes,
      nameRU: styleInfo.nameRU || garment?.labelRU || "",
      nameEN: styleInfo.nameEN || garment?.labelEN || "",
      styleCode: styleInfo.styleCode || garment?.id?.toUpperCase() || "",
    },
    poms:     getPoms(garmentId, "all"),
    sizes, baseSize,
    pomRef:   (REF_CATEGORIES.find(c => c.id === refCatId) || REF_CATEGORIES[0]).ref,
    callouts, bomItems, patternPieces,
    fusingItems, seamItems, labelItems, packingItems,
    files: fileItems,
  });

  // --- Section renderers ---

  function renderOptionalBadge(sectionId, labelRU, labelEN) {
    const st = getSectionStatus(garmentId, sectionId);
    if (st !== "optional") return null;
    return (
      <label className="optional-toggle">
        <input
          type="checkbox"
          checked={!!optionalEnabled[sectionId]}
          onChange={() => toggleOptional(sectionId)}
        />
        {ru ? labelRU : labelEN}
      </label>
    );
  }

  // Groups garments by category for the select
  const garmentsByCategory = useMemo(() => {
    const cats = {};
    for (const g of GARMENTS) {
      if (!cats[g.category]) cats[g.category] = [];
      cats[g.category].push(g);
    }
    return cats;
  }, []);

  return (
    <div className="pom-wrap techpack-layout">
      <div className="pom-header">
        <div className="pom-label">3D Lastique · Tech Pack</div>
        <h1 className="pom-title">Tech Pack Builder</h1>
        <div className="techpack-garment-bar">
          <div className="techpack-garment-selectors">
            <label className="techpack-garment-field">
              <span>{ru ? "Изделие" : "Garment"}</span>
              <select value={garmentId} onChange={e => {
                const id = e.target.value;
                setGarmentId(id);
                const d = GARMENT_DEFAULTS[id] || { sizes: SIZES_DEFAULT, baseSize: BASE_SIZE_DEFAULT };
                setSizes(d.sizes);
                setBaseSize(d.baseSize);
                setSectionTab("cover");
                setOptionalEnabled({});
              }}>
                {Object.entries(garmentsByCategory).map(([cat, items]) => (
                  <optgroup key={cat} label={ru ? CATEGORY_LABELS[cat]?.ru : CATEGORY_LABELS[cat]?.en}>
                    {items.map(g => (
                      <option key={g.id} value={g.id}>{ru ? g.labelRU : g.labelEN}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="techpack-garment-field">
              <span>{ru ? "Базовый размер" : "Base size"}</span>
              <select value={baseSize} onChange={e => setBaseSize(+e.target.value)}>
                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="techpack-export-btns">
            {["ru", "en"].map(lng => (
              <button key={lng}
                className={`pom-btn ${lng === "ru" ? "primary" : "secondary"}`}
                onClick={() => exportTechPackExcel(exportPayload(lng))}
              >
                ↓ Excel {lng.toUpperCase()}
              </button>
            ))}
            <PDFDownloadLink
              document={
                <PomPdfDocument
                  styleInfo={{
                    ...styleInfo,
                    nameRU: styleInfo.nameRU || garment?.labelRU || "",
                    nameEN: styleInfo.nameEN || garment?.labelEN || "",
                    styleCode: styleInfo.styleCode || garment?.id?.toUpperCase() || "",
                  }}
                  poms={getPoms(garmentId, "all")}
                  sizes={sizes}
                  baseSize={baseSize}
                  sketchFront={sketchFront || SKETCHES[garmentId]?.sketch || SKETCHES[garmentId]?.front || null}
                  sketchBack={sketchBack || SKETCHES[garmentId]?.back || null}
                  sketchDiagram={SKETCHES[garmentId]?.diagram || null}
                  callouts={callouts.length ? callouts : null}
                  bomItems={bomItems.length ? bomItems : null}
                  fusingItems={fusingItems.length ? fusingItems : null}
                  seamItems={seamItems.length ? seamItems : null}
                  constructionNotes={null}
                  patternPieces={patternPieces.length ? patternPieces : null}
                  labelItems={labelItems.length ? labelItems : null}
                  packingItems={packingItems.length ? packingItems : null}
                  files={fileItems.length ? fileItems : null}
                />
              }
              fileName={`techpack_${styleInfo.styleCode || garmentId}_${baseSize}.pdf`}
              className="pom-btn secondary"
            >
              {({ loading }) => loading ? "..." : "↓ PDF"}
            </PDFDownloadLink>
          </div>
        </div>
      </div>

      <div className="techpack-main">
        <LeftNav
          activeSection={sectionTab}
          onSectionChange={setSectionTab}
          techpackData={techpackData}
          ru={ru}
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed(c => !c)}
        />

        <main className="techpack-content" role="main">
          {visibleTabs.map(t => (
            <section key={t.id} className={`techpack-section${sectionTab === t.id ? " active" : ""}`} id={t.id}>
              {sectionTab === t.id && renderSection(t.id)}
            </section>
          ))}
        </main>
      </div>
    </div>
  );

        {/* 01 STYLE */}
        {activeTab === "style" && (
          <div className="style-info-form">
            <div className="style-info-group-label">{ru ? "Идентификация" : "Identification"}</div>
            {[
              ["brand",       ru ? "Бренд"           : "Brand"],
              ["styleCode",   "Style No."],
              ["nameEN",      "Name EN"],
              ["nameRU",      ru ? "Название RU"     : "Name RU"],
              ["designer",    ru ? "Дизайнер"        : "Designer"],
              ["specStage",   ru ? "Стадия"          : "Stage"],
              ["factory",     ru ? "Фабрика"         : "Factory"],
              ["countryOfOrigin", ru ? "Страна производства" : "Country of origin"],
            ].map(([field, label]) => (
              <label key={field} className="style-info-field">
                <span>{label}</span>
                <input type="text" value={styleInfo[field] || ""} onChange={e => updateStyle(field, e.target.value)} />
              </label>
            ))}
            <label className="style-info-field">
              <span>{ru ? "Сезон" : "Season"}</span>
              <select value={styleInfo.season} onChange={e => updateStyle("season", e.target.value)}>
                <option value="">—</option>
                <option value="SS">SS — {ru ? "Весна-лето" : "Spring-Summer"}</option>
                <option value="AW">AW — {ru ? "Осень-зима" : "Autumn-Winter"}</option>
                <option value="Resort">Resort / Cruise</option>
                <option value="Pre-Fall">Pre-Fall</option>
                <option value="Evergreen">{ru ? "Базовая / без сезона" : "Evergreen / All-season"}</option>
              </select>
            </label>
            <label className="style-info-field">
              <span>{ru ? "Год" : "Year"}</span>
              <input type="text" value={styleInfo.year || ""} onChange={e => updateStyle("year", e.target.value)} placeholder={new Date().getFullYear().toString()} />
            </label>
            <label className="style-info-field">
              <span>{ru ? "Пол" : "Gender"}</span>
              <select value={styleInfo.gender} onChange={e => updateStyle("gender", e.target.value)}>
                <option value="Women">{ru ? "Женский" : "Women"}</option>
                <option value="Men">{ru ? "Мужской" : "Men"}</option>
                <option value="Unisex">{ru ? "Унисекс" : "Unisex"}</option>
              </select>
            </label>

            <div className="style-info-group-label" style={{ marginTop: 16 }}>{ru ? "Коммерческие данные" : "Commercial"}</div>
            {[
              ["targetFOB",    ru ? "Target FOB (USD)" : "Target FOB (USD)"],
              ["targetRetail", ru ? "Target retail (USD)" : "Target retail (USD)"],
              ["fabricContent",ru ? "Состав ткани (верх)" : "Shell fabric content"],
              ["fabricWeight", ru ? "Плотность (GSM)" : "Fabric weight (GSM)"],
            ].map(([field, label]) => (
              <label key={field} className="style-info-field">
                <span>{label}</span>
                <input type="text" value={styleInfo[field] || ""} onChange={e => updateStyle(field, e.target.value)} />
              </label>
            ))}

            <div className="style-info-group-label" style={{ marginTop: 16 }}>{ru ? "Описание / примечания" : "Description / Notes"}</div>
            <label className="style-info-field style-info-field--full">
              <span>{ru ? "Описание" : "Description"}</span>
              <textarea value={styleInfo.description || ""} onChange={e => updateStyle("description", e.target.value)} rows={2} />
            </label>
          </div>
        )}

        {/* 02 CALLOUTS */}
        {activeTab === "callouts" && (
          <>
            <div className="sketch-upload-row">
              {[
                { key: "front", label: ru ? "Эскиз спереди" : "Front sketch", val: sketchFront, set: setSketchFront },
                { key: "back",  label: ru ? "Эскиз сзади"   : "Back sketch",  val: sketchBack,  set: setSketchBack  },
              ].map(({ key, label, val, set }) => (
                <div key={key} className="sketch-upload-slot">
                  <div className="sketch-upload-label">{label}</div>
                  {val ? (
                    <div className="sketch-preview-wrap">
                      <img src={val} alt={label} className="sketch-preview-img" />
                      <button className="sketch-remove-btn" onClick={() => set(null)}>✕</button>
                    </div>
                  ) : (
                    <label className="sketch-upload-btn">
                      <input type="file" accept="image/*,.svg,.pdf" style={{ display: "none" }} onChange={loadSketch(set)} />
                      {ru ? "+ Загрузить" : "+ Upload"}
                    </label>
                  )}
                </div>
              ))}
            </div>
            <p className="section-hint">
              {ru
                ? "Номера выносок должны совпадать с метками на эскизе (C01, C02...)"
                : "Callout IDs should match labels on the technical sketch (C01, C02...)"}
            </p>
            <EditableTable lang={siteLang}
              columns={[
                { key: "id",        label: "ID",                                        width: 60,  mono: true },
                { key: "ru",        label: ru ? "Выноска RU" : "Detail RU",             width: 200 },
                { key: "en",        label: "Detail EN",                                 width: 200 },
                { key: "placement", label: ru ? "Расположение" : "Placement",           width: 160 },
                { key: "bomRef",    label: "BOM ref",                                   width: 100 },
                { key: "status",    label: ru ? "Статус" : "Status",                    width: 90, type: "select", options: OPT.status.slice(0,3) },
                { key: "remarks",   label: ru ? "Примечания" : "Remarks",               width: 180 },
              ]}
              rows={callouts}
              onChange={setCallouts}
              defaultRow={{ id: `C0${callouts.length + 1}`, ru: "", en: "", placement: "", bomRef: "", status: OPT.toFill, remarks: "" }}
              emptyLabel={ru ? "Нет выносок — добавьте ключевые детали эскиза" : "No callouts yet"}
            />
          </>
        )}

        {/* 03 BOM */}
        {activeTab === "bom" && (
          <>
            <p className="section-hint">
              {ru ? "Ведомость материалов — ткани, подкладки, фурнитура, этикетки, упаковка" : "Bill of Materials — fabrics, linings, trims, labels, packing"}
            </p>
            <EditableTable lang={siteLang}
              columns={[
                { key: "type",        label: ru ? "Тип" : "Type",                   width: 90, type: "select", options: OPT.bomType },
                { key: "nameRU",      label: "Наименование RU",                     width: 150 },
                { key: "nameEN",      label: "Item EN",                             width: 150 },
                { key: "article",     label: ru ? "Артикул" : "Article / Ref",      width: 100 },
                { key: "colorRef",    label: "Pantone / RAL",                       width: 100, mono: true },
                { key: "content",     label: ru ? "Состав %" : "Content %",         width: 110 },
                { key: "gsm",         label: "GSM",                                 width: 60,  mono: true },
                { key: "width",       label: ru ? "Ширина" : "Width",               width: 70 },
                { key: "moq",         label: "MOQ",                                 width: 70 },
                { key: "supplier",    label: ru ? "Поставщик" : "Supplier",         width: 120 },
                { key: "placement",   label: ru ? "Расположение" : "Placement",     width: 110 },
                { key: "qty",         label: ru ? "Кол." : "Qty",                   width: 65 },
                { key: "unit",        label: ru ? "Ед." : "Unit",                   width: 55, type: "select", options: OPT.unit },
                { key: "status",      label: ru ? "Статус" : "Status",              width: 80, type: "select", options: OPT.statusBom },
                { key: "remarks",     label: ru ? "Примечания" : "Remarks",         width: 150, type: "textarea" },
              ]}
              rows={bomItems}
              onChange={setBomItems}
              defaultRow={{ type: OPT.bomType[0], nameRU: "", nameEN: "", article: "", colorRef: "", content: "", gsm: "", width: "", moq: "", supplier: "", placement: "", qty: "TBD", unit: "m", status: OPT.toFill, remarks: "" }}
              emptyLabel={ru ? "Нет материалов" : "No BOM items"}
            />
          </>
        )}

        {/* 04 CONSTRUCTION */}
        {activeTab === "construction" && (
          <>
            {/* Fusing */}
            {getSectionStatus(garmentId, "fusing") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Дублерин / проклейка" : "Fusing"}</h3>
                  {renderOptionalBadge("fusing", "Включить", "Enable")}
                </div>
                {isEnabled("fusing") && (
                  <EditableTable lang={siteLang}
                    columns={[
                      { key: "zoneRU",      label: "Зона RU",                                width: 180 },
                      { key: "zoneEN",      label: "Zone EN",                                width: 180 },
                      { key: "type",        label: ru ? "Тип дублерина" : "Fusible type",    width: 130 },
                      { key: "application", label: ru ? "Нанесение" : "Application",         width: 150 },
                      { key: "approval",    label: ru ? "Согласование" : "Approval",         width: 110 },
                      { key: "status",      label: ru ? "Статус" : "Status",                 width: 80, type: "select", options: OPT.statusShort },
                      { key: "remarks",     label: ru ? "Примечания" : "Remarks",            width: 180 },
                    ]}
                    rows={fusingItems}
                    onChange={setFusingItems}
                    defaultRow={{ zoneRU: "", zoneEN: "", type: OPT.approval, application: "", approval: OPT.approval, status: OPT.toFill, remarks: "" }}
                    emptyLabel={ru ? "Нет зон проклейки" : "No fusing zones"}
                  />
                )}
              </div>
            )}

            {/* Lining */}
            {getSectionStatus(garmentId, "lining") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Подкладка" : "Lining"}</h3>
                  {renderOptionalBadge("lining", "Включить", "Enable")}
                </div>
                {isEnabled("lining") && (
                  <EditableTable lang={siteLang}
                    columns={[
                      { key: "zoneRU",   label: "Зона RU",                            width: 180 },
                      { key: "zoneEN",   label: "Zone EN",                            width: 180 },
                      { key: "material", label: ru ? "Материал" : "Material",         width: 160 },
                      { key: "coverage", label: ru ? "Покрытие" : "Coverage",         width: 130 },
                      { key: "attach",   label: ru ? "Крепление" : "Attachment",      width: 130 },
                      { key: "status",   label: ru ? "Статус" : "Status",             width: 80, type: "select", options: OPT.statusShort },
                      { key: "remarks",  label: ru ? "Примечания" : "Remarks",        width: 180 },
                    ]}
                    rows={liningItems}
                    onChange={setLiningItems}
                    defaultRow={{ zoneRU: "", zoneEN: "", material: "", coverage: ru ? "Полная подкладка" : "Full lining", attach: OPT.attach[0], status: OPT.toFill, remarks: "" }}
                    emptyLabel={ru ? "Нет зон подкладки" : "No lining zones"}
                  />
                )}
              </div>
            )}

            {/* Swimwear lining */}
            {getSectionStatus(garmentId, "swimwear_lining") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Купальный вкладыш / подкладка" : "Swimwear lining / gusset"}</h3>
                  {renderOptionalBadge("swimwear_lining", "Включить", "Enable")}
                </div>
                {isEnabled("swimwear_lining") && (
                  <EditableTable lang={siteLang}
                    columns={[
                      { key: "part",     label: ru ? "Деталь" : "Part",              width: 160 },
                      { key: "material", label: ru ? "Материал" : "Material",        width: 180 },
                      { key: "layersRU", label: "Слои RU",                           width: 140 },
                      { key: "layersEN", label: "Layers EN",                         width: 140 },
                      { key: "gusset",   label: ru ? "Вкладыш" : "Gusset",          width: 90, type: "select", options: OPT.yesNo },
                      { key: "status",   label: ru ? "Статус" : "Status",            width: 80, type: "select", options: OPT.statusShort },
                      { key: "remarks",  label: ru ? "Примечания" : "Remarks",       width: 180 },
                    ]}
                    rows={swimLiningItems}
                    onChange={setSwimLiningItems}
                    defaultRow={{ part: ru ? "Вкладыш" : "Gusset", material: "", layersRU: "2 слоя", layersEN: "2 layers", gusset: OPT.yesNo[0], status: OPT.toFill, remarks: "" }}
                    emptyLabel={ru ? "Нет данных о вкладыше" : "No lining data"}
                  />
                )}
              </div>
            )}

            {/* Elastic */}
            {getSectionStatus(garmentId, "elastic") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Резинка / эластик" : "Elastic"}</h3>
                  {renderOptionalBadge("elastic", "Включить", "Enable")}
                </div>
                {isEnabled("elastic") && (
                  <EditableTable lang={siteLang}
                    columns={[
                      { key: "zoneRU",   label: "Зона RU",                             width: 160 },
                      { key: "zoneEN",   label: "Zone EN",                             width: 160 },
                      { key: "widthMm",  label: ru ? "Ширина, мм" : "Width mm",        width: 90,  mono: true },
                      { key: "stretch",  label: ru ? "Растяжение %" : "Stretch %",     width: 90,  mono: true },
                      { key: "attach",   label: ru ? "Крепление" : "Attachment",       width: 130 },
                      { key: "approval", label: ru ? "Согласование" : "Approval",      width: 110 },
                      { key: "status",   label: ru ? "Статус" : "Status",              width: 80, type: "select", options: OPT.statusShort },
                      { key: "remarks",  label: ru ? "Примечания" : "Remarks",         width: 180 },
                    ]}
                    rows={elasticItems}
                    onChange={setElasticItems}
                    defaultRow={{ zoneRU: "", zoneEN: "", widthMm: "25", stretch: "80", attach: OPT.attach[1], approval: OPT.approval, status: OPT.toFill, remarks: "" }}
                    emptyLabel={ru ? "Нет зон резинки" : "No elastic zones"}
                  />
                )}
              </div>
            )}

            {/* Seam allowances */}
            {getSectionStatus(garmentId, "seam_allowances") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Припуски на швы" : "Seam allowances"}</h3>
                </div>
                <EditableTable lang={siteLang}
                  columns={[
                    { key: "zoneRU",  label: "Зона / Шов RU",  width: 200 },
                    { key: "zoneEN",  label: "Zone / Seam EN", width: 200 },
                    { key: "seam",    label: "SA cm",          width: 70,  mono: true },
                    { key: "finish",  label: ru ? "Обработка" : "Finish",  width: 180 },
                    { key: "remarks", label: ru ? "Примечания" : "Remarks", width: 200 },
                  ]}
                  rows={seamItems}
                  onChange={setSeamItems}
                  defaultRow={{ zoneRU: "", zoneEN: "", seam: "1.5", finish: "", remarks: "" }}
                  emptyLabel={ru ? "Нет припусков" : "No seam allowances"}
                />
              </div>
            )}

            {/* Stitch spec */}
            {getSectionStatus(garmentId, "stitch_spec") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Параметры строчек" : "Stitch specification"}</h3>
                </div>
                <EditableTable lang={siteLang}
                  columns={[
                    { key: "isoCode",    label: "ISO / ASTM",                             width: 220, type: "select", options: OPT.stitchCode },
                    { key: "spi",        label: ru ? "Стеж/дюйм" : "SPI",                width: 70,  mono: true },
                    { key: "zoneRU",     label: "Зона RU",                                width: 160 },
                    { key: "zoneEN",     label: "Zone EN",                                width: 160 },
                    { key: "thread",     label: ru ? "Нитки" : "Thread",                  width: 140 },
                    { key: "tension",    label: ru ? "Натяжение" : "Tension",             width: 100 },
                    { key: "remarks",    label: ru ? "Примечания" : "Remarks",            width: 180 },
                  ]}
                  rows={stitchItems}
                  onChange={setStitchItems}
                  defaultRow={{ isoCode: "301 — Lockstitch", spi: "12", zoneRU: "", zoneEN: "", thread: "Polyester 40/2", tension: ru ? "Стандартное" : "Standard", remarks: "" }}
                  emptyLabel={ru ? "Нет строчек" : "No stitch specs"}
                />
              </div>
            )}

            {/* Yarn spec (knitwear) */}
            {getSectionStatus(garmentId, "yarn_spec") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Пряжа / вязальная спецификация" : "Yarn specification"}</h3>
                </div>
                <div className="style-info-form">
                  <div className="style-info-group-label">{ru ? "Параметры пряжи" : "Yarn parameters"}</div>
                  <label className="style-info-field">
                    <span>{ru ? "Счёт пряжи (Nm)" : "Yarn count (Nm)"}</span>
                    <input type="text" value={yarnSpec.yarnCount} onChange={e => updateYarn("yarnCount", e.target.value)} placeholder="2/48" />
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "Класс машины (GG)" : "Machine gauge (GG)"}</span>
                    <input type="text" value={yarnSpec.gauge} onChange={e => updateYarn("gauge", e.target.value)} placeholder="12" />
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "Кратность" : "Ply"}</span>
                    <select value={yarnSpec.ply} onChange={e => updateYarn("ply", e.target.value)}>
                      {["single","2-ply","3-ply","4-ply","cable"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "Крутка" : "Twist direction"}</span>
                    <select value={yarnSpec.twist} onChange={e => updateYarn("twist", e.target.value)}>
                      <option value="S">S</option>
                      <option value="Z">Z</option>
                      <option value="—">—</option>
                    </select>
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "Метод крашения" : "Dye method"}</span>
                    <select value={yarnSpec.dyeMethod} onChange={e => updateYarn("dyeMethod", e.target.value)}>
                      {["yarn-dyed","piece-dyed","space-dyed","jacquard","natural/undyed"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                  <div className="style-info-group-label" style={{ marginTop: 12 }}>{ru ? "Плотность петель" : "Stitch density"}</div>
                  <label className="style-info-field">
                    <span>{ru ? "Петельных рядов / см" : "Courses / cm"}</span>
                    <input type="text" value={yarnSpec.coursesPerCm} onChange={e => updateYarn("coursesPerCm", e.target.value)} placeholder="8" />
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "Петельных столбцов / см" : "Wales / cm"}</span>
                    <input type="text" value={yarnSpec.walesPerCm} onChange={e => updateYarn("walesPerCm", e.target.value)} placeholder="6" />
                  </label>
                  <div className="style-info-group-label" style={{ marginTop: 12 }}>{ru ? "Усадка" : "Shrinkage targets"}</div>
                  <label className="style-info-field">
                    <span>{ru ? "До стирки %" : "Pre-wash %"}</span>
                    <input type="text" value={yarnSpec.shrinkagePre} onChange={e => updateYarn("shrinkagePre", e.target.value)} placeholder="0" />
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "После стирки %" : "Post-wash %"}</span>
                    <input type="text" value={yarnSpec.shrinkagePost} onChange={e => updateYarn("shrinkagePost", e.target.value)} placeholder="≤5" />
                  </label>
                  <label className="style-info-field style-info-field--full">
                    <span>{ru ? "Примечания" : "Notes"}</span>
                    <textarea value={yarnSpec.notes} onChange={e => updateYarn("notes", e.target.value)} rows={2} />
                  </label>
                </div>
              </div>
            )}

            {/* Denim wash (denim_jeans) */}
            {getSectionStatus(garmentId, "denim_wash") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Варка / отделка денима" : "Denim wash & finish"}</h3>
                </div>
                <div className="style-info-form">
                  <div className="style-info-group-label">{ru ? "Тип обработки" : "Wash type"}</div>
                  <label className="style-info-field">
                    <span>{ru ? "Вид варки" : "Wash type"}</span>
                    <select value={denimWash.washType} onChange={e => updateDenim("washType", e.target.value)}>
                      {["raw/dry","stone wash","enzyme wash","acid wash","bleach wash","overdye","sand blast","laser","custom"].map(v =>
                        <option key={v} value={v}>{v}</option>
                      )}
                    </select>
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "Отделка фурнитуры" : "Hardware finish"}</span>
                    <select value={denimWash.hardwareFinish} onChange={e => updateDenim("hardwareFinish", e.target.value)}>
                      {["antique brass","silver","gunmetal","copper","black oxide","custom"].map(v =>
                        <option key={v} value={v}>{v}</option>
                      )}
                    </select>
                  </label>
                  <label className="style-info-field style-info-field--full">
                    <span>{ru ? "Рецептура (enzyme/stone/bleach)" : "Recipe (enzyme/stone/bleach)"}</span>
                    <textarea value={denimWash.recipe} onChange={e => updateDenim("recipe", e.target.value)} rows={3} placeholder={ru ? "Описание химии и процессов..." : "Describe chemicals and process..."} />
                  </label>
                  <label className="style-info-field style-info-field--full">
                    <span>{ru ? "Карта потертостей / distressing" : "Distressing map notes"}</span>
                    <textarea value={denimWash.distressingNotes} onChange={e => updateDenim("distressingNotes", e.target.value)} rows={2} placeholder={ru ? "Положение и степень потертостей..." : "Location and intensity of distressing..."} />
                  </label>
                  <div className="style-info-group-label" style={{ marginTop: 12 }}>{ru ? "Усадка" : "Shrinkage"}</div>
                  <label className="style-info-field">
                    <span>{ru ? "До варки %" : "Pre-wash %"}</span>
                    <input type="text" value={denimWash.shrinkagePre} onChange={e => updateDenim("shrinkagePre", e.target.value)} placeholder="0" />
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "После варки %" : "Post-wash %"}</span>
                    <input type="text" value={denimWash.shrinkagePost} onChange={e => updateDenim("shrinkagePost", e.target.value)} placeholder="≤3" />
                  </label>
                  <label className="style-info-field style-info-field--full">
                    <span>{ru ? "Примечания" : "Notes"}</span>
                    <textarea value={denimWash.notes} onChange={e => updateDenim("notes", e.target.value)} rows={2} />
                  </label>
                </div>
              </div>
            )}

            {/* Swimwear performance (swimwear) */}
            {getSectionStatus(garmentId, "swimwear_performance") !== "n/a" && (
              <div className="construction-block">
                <div className="construction-block-header">
                  <h3 className="construction-block-title">{ru ? "Техн. характеристики купальника" : "Swimwear performance"}</h3>
                </div>
                <div className="style-info-form">
                  <div className="style-info-group-label">{ru ? "Растяжение 4-way" : "4-way stretch"}</div>
                  <label className="style-info-field">
                    <span>{ru ? "По основе %" : "Warp stretch %"}</span>
                    <input type="text" value={swimPerf.stretch4wayW} onChange={e => updateSwimPerf("stretch4wayW", e.target.value)} placeholder="≥80" />
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "По утку %" : "Fill stretch %"}</span>
                    <input type="text" value={swimPerf.stretch4wayF} onChange={e => updateSwimPerf("stretch4wayF", e.target.value)} placeholder="≥80" />
                  </label>
                  <div className="style-info-group-label" style={{ marginTop: 12 }}>{ru ? "Стойкость" : "Durability"}</div>
                  <label className="style-info-field">
                    <span>{ru ? "Стойкость к хлору, ч (AATCC 162)" : "Chlorine resistance hrs (AATCC 162)"}</span>
                    <input type="text" value={swimPerf.chlorineResistance} onChange={e => updateSwimPerf("chlorineResistance", e.target.value)} placeholder="≥100" />
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "UPF защита" : "UPF rating"}</span>
                    <select value={swimPerf.upfRating} onChange={e => updateSwimPerf("upfRating", e.target.value)}>
                      <option value="UPF 50+">UPF 50+</option>
                      <option value="UPF 30+">UPF 30+</option>
                      <option value="не требуется">{ru ? "Не требуется" : "Not required"}</option>
                    </select>
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "Тип шва" : "Seam type"}</span>
                    <select value={swimPerf.seamType} onChange={e => updateSwimPerf("seamType", e.target.value)}>
                      {["flatlock","flatseam","overlock + cover","bonded","flatlock + cover tape"].map(v =>
                        <option key={v} value={v}>{v}</option>
                      )}
                    </select>
                  </label>
                  <label className="style-info-field">
                    <span>{ru ? "Устойчивость окраски" : "Colour fastness (wash/light/perspiration)"}</span>
                    <input type="text" value={swimPerf.colourFastness} onChange={e => updateSwimPerf("colourFastness", e.target.value)} placeholder="4/5/4" />
                  </label>
                  <label className="style-info-field style-info-field--full">
                    <span>{ru ? "Примечания" : "Notes"}</span>
                    <textarea value={swimPerf.notes} onChange={e => updateSwimPerf("notes", e.target.value)} rows={2} />
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {/* 05 MEASUREMENTS */}
        {activeTab === "measurements" && (
          <div className="measurements-link-block">
            <p className="section-hint">
              {ru
                ? "Размерная таблица ведётся в отдельном инструменте."
                : "Measurements are maintained in a separate tool."}
            </p>
            <Link to="/tools/pom" className="pom-btn secondary" style={{ display: "inline-block", marginTop: 8 }}>
              {ru ? "Открыть Табель мер →" : "Open Measurements →"}
            </Link>
          </div>
        )}

        {/* 06 PATTERN PIECES */}
        {activeTab === "patterns" && (
          <>
            <p className="section-hint">
              {ru ? "Детали кроя — DXF-имена должны точно совпадать с именами файлов лекал" : "Pattern pieces — DXF names must match pattern files exactly"}
            </p>
            <EditableTable lang={siteLang}
              columns={[
                { key: "dxfName", label: "DXF",                                     width: 60,  mono: true },
                { key: "section", label: ru ? "Секция" : "Section",                 width: 130 },
                { key: "nameRU",  label: "Название RU",                             width: 180 },
                { key: "shortRU", label: ru ? "Кратко RU" : "Short RU",             width: 110 },
                { key: "nameEN",  label: "Full name EN",                            width: 180 },
                { key: "shortEN", label: "Short EN",                                width: 110 },
                { key: "qty",     label: ru ? "Кол." : "Qty",                       width: 60, type: "select", options: ["1+0","1+1","2+0","2+2",""] },
                { key: "matRU",   label: "Material RU",                             width: 130 },
                { key: "matEN",   label: "Material EN",                             width: 130 },
                { key: "remarks", label: ru ? "Примечания" : "Remarks",             width: 180 },
              ]}
              rows={patternPieces}
              onChange={setPatternPieces}
              defaultRow={{ dxfName: "", section: ru ? "Верх" : "Shell", nameRU: "", shortRU: "", nameEN: "", shortEN: "", qty: "1+0", matRU: ru ? "Ткань верха" : "Shell fabric", matEN: "Shell fabric", remarks: "" }}
              emptyLabel={ru ? "Нет деталей кроя" : "No pattern pieces"}
            />
          </>
        )}

        {/* 07 COLORWAY */}
        {activeTab === "colorway" && (
          <>
            <p className="section-hint">
              {ru ? "Цветовая карта — все цветовые варианты изделия" : "Colorway — all colour options for this style"}
            </p>
            <EditableTable lang={siteLang}
              columns={[
                { key: "colorwayName", label: ru ? "Название" : "Name",             width: 160 },
                { key: "colorCode",    label: ru ? "Код цвета" : "Colour code",      width: 100, mono: true },
                { key: "pantone",      label: "Pantone / RAL",                       width: 110, mono: true },
                { key: "placement",    label: ru ? "Расположение" : "Placement",     width: 160 },
                { key: "material",     label: ru ? "Материал" : "Material",          width: 140 },
                { key: "approval",     label: ru ? "Согласование" : "Approval",      width: 120 },
                { key: "status",       label: ru ? "Статус" : "Status",              width: 80, type: "select", options: [OPT.toFill, ru ? "Уточняется" : "TBC", OPT.status[3]] },
                { key: "remarks",      label: ru ? "Примечания" : "Remarks",         width: 180 },
              ]}
              rows={colorwayItems}
              onChange={setColorwayItems}
              defaultRow={{ colorwayName: "", colorCode: "", pantone: "", placement: ru ? "По всему изделию" : "All over", material: ru ? "Верх" : "Shell", approval: OPT.approval, status: OPT.toFill, remarks: "" }}
              emptyLabel={ru ? "Нет цветовых вариантов" : "No colorways"}
            />
          </>
        )}

        {/* 08 WASH & CARE */}
        {activeTab === "wash_care" && (
          <>
            <p className="section-hint">
              {ru ? "Инструкции по уходу — ISO 3758 символы" : "Wash & care instructions — ISO 3758 symbols"}
            </p>
            <EditableTable lang={siteLang}
              columns={[
                { key: "symbol",      label: ru ? "Символ" : "Symbol",              width: 80,  mono: true },
                { key: "instructRU",  label: "Инструкция RU",                       width: 220 },
                { key: "instructEN",  label: "Instruction EN",                      width: 220 },
                { key: "mandatory",   label: ru ? "Обязателен" : "Mandatory",       width: 90, type: "select", options: OPT.yesNo.slice(0,2) },
                { key: "remarks",     label: ru ? "Примечания" : "Remarks",         width: 180 },
              ]}
              rows={washItems}
              onChange={setWashItems}
              defaultRow={{ symbol: "", instructRU: "", instructEN: "", mandatory: OPT.yesNo[0], remarks: "" }}
              emptyLabel={ru ? "Нет инструкций по уходу" : "No care instructions"}
            />
          </>
        )}

        {/* 09 LABELS & PACKING */}
        {activeTab === "labels" && (
          <>
            <p className="section-hint">{ru ? "Расположение этикеток" : "Label placement"}</p>
            <EditableTable lang={siteLang}
              columns={[
                { key: "itemRU",     label: "Наименование RU",                        width: 160 },
                { key: "itemEN",     label: "Item EN",                                width: 160 },
                { key: "placement",  label: ru ? "Расположение" : "Placement",        width: 180 },
                { key: "qty",        label: ru ? "Кол." : "Qty",                      width: 55 },
                { key: "attachment", label: ru ? "Крепление" : "Attachment",          width: 100 },
                { key: "approval",   label: ru ? "Согласование" : "Approval",         width: 110 },
                { key: "status",     label: ru ? "Статус" : "Status",                 width: 80, type: "select", options: OPT.status.filter((_,i)=>i!==1) },
                { key: "remarks",    label: ru ? "Примечания" : "Remarks",            width: 180 },
              ]}
              rows={labelItems}
              onChange={setLabelItems}
              defaultRow={{ itemRU: "", itemEN: "", placement: "", qty: "1", attachment: OPT.labelAttach[0], approval: OPT.approval, status: OPT.toFill, remarks: "" }}
              emptyLabel={ru ? "Нет этикеток" : "No labels"}
            />
            <p className="section-hint" style={{ marginTop: 20 }}>{ru ? "Упаковка" : "Packing"}</p>
            <EditableTable lang={siteLang}
              columns={[
                { key: "item",    label: ru ? "Наименование" : "Item",                width: 160 },
                { key: "spec",    label: ru ? "Спецификация" : "Specification",        width: 260 },
                { key: "qty",     label: ru ? "Кол." : "Qty",                          width: 90 },
                { key: "unit",    label: ru ? "Ед." : "Unit",                          width: 60 },
                { key: "status",  label: ru ? "Статус" : "Status",                     width: 80, type: "select", options: OPT.status.filter((_,i)=>i!==1) },
                { key: "remarks", label: ru ? "Примечания" : "Remarks",                width: 180 },
              ]}
              rows={packingItems}
              onChange={setPackingItems}
              defaultRow={{ item: "", spec: "", qty: ru ? "1 шт." : "1 per pcs", unit: ru ? "шт." : "pcs", status: OPT.toFill, remarks: "" }}
              emptyLabel={ru ? "Нет позиций упаковки" : "No packing items"}
            />
          </>
        )}

        {/* 11 NODES / DETAILS */}
        {activeTab === "nodes" && (() => {
          const q = nodeSearch.trim().toLowerCase();
          const filtered = q
            ? nodeLibrary.filter(n =>
                n.code.toLowerCase().includes(q) ||
                (n.nameRU || "").toLowerCase().includes(q) ||
                (n.nameEN || "").toLowerCase().includes(q) ||
                (n.subcategoryRU || "").toLowerCase().includes(q)
              ).slice(0, 60)
            : [];
          const addNode = (node) => {
            if (selectedNodes.find(n => n.code === node.code)) return;
            setSelectedNodes(prev => [...prev, {
              code: node.code, jpgId: node.jpgId || "",
              nameRU: node.nameRU || node.subcategoryRU || "",
              nameEN: node.nameEN || node.subcategoryEN || "",
              bomRef: "", notes: "",
            }]);
            setNodeSearch("");
          };
          const removeNode = (code) => setSelectedNodes(prev => prev.filter(n => n.code !== code));
          const updateNode = (code, field, val) =>
            setSelectedNodes(prev => prev.map(n => n.code === code ? { ...n, [field]: val } : n));
          const imgSrc = (jpgId, code) =>
            jpgId ? `https://drive.google.com/thumbnail?id=${jpgId}&sz=w300` : `/nodes/${code}.jpg`;

          return (
            <>
              <p className="section-hint">
                {ru ? "Детальные чертежи узлов конструкции. Найди узел и добавь в техпак." : "Detailed construction drawings. Search and add nodes to the tech pack."}
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <input
                  type="text"
                  value={nodeSearch}
                  onChange={e => setNodeSearch(e.target.value)}
                  placeholder={ru ? "Поиск узла по коду или названию..." : "Search node by code or name..."}
                  style={{ flex: 1, maxWidth: 400, padding: "6px 10px", border: "1px solid #C8A84B", borderRadius: 4, fontFamily: "inherit", fontSize: 13 }}
                  autoFocus
                />
                {q && <span style={{ fontSize: 12, color: "#888" }}>{filtered.length} {ru ? "результатов" : "results"}</span>}
              </div>

              {/* Search results */}
              {q.length > 0 && filtered.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, padding: 12, background: "#faf8f5", border: "1px solid #e0d8cc", borderRadius: 4 }}>
                  {filtered.map(node => (
                    <div key={node.code} onClick={() => addNode(node)}
                      style={{ cursor: "pointer", width: 90, textAlign: "center", padding: "6px 4px", borderRadius: 4, border: "1px solid #e0d8cc", background: "#fff", opacity: selectedNodes.find(n => n.code === node.code) ? 0.4 : 1 }}
                      title={node.subcategoryRU}
                    >
                      <img src={imgSrc(node.jpgId, node.code)} alt={node.code}
                        style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 2 }}
                        onError={e => { e.target.style.display = "none"; }}
                      />
                      <div style={{ fontSize: 10, color: "#666", marginTop: 3, lineHeight: 1.2 }}>{node.code}</div>
                    </div>
                  ))}
                </div>
              )}
              {q.length > 0 && filtered.length === 0 && (
                <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>{ru ? "Ничего не найдено" : "No results"}</p>
              )}

              {/* Selected nodes */}
              {selectedNodes.length === 0 && !q && (
                <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", padding: "32px 0" }}>
                  {ru ? "Нет узлов. Начни поиск выше чтобы добавить." : "No nodes added. Search above to add."}
                </p>
              )}
              {selectedNodes.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                  {selectedNodes.map(node => (
                    <div key={node.code} style={{ border: "1px solid #e0d8cc", borderRadius: 4, padding: 10, background: "#fff", position: "relative" }}>
                      <button onClick={() => removeNode(node.code)}
                        style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 16, lineHeight: 1 }}
                        title={ru ? "Удалить" : "Remove"}
                      >×</button>
                      <img src={imgSrc(node.jpgId, node.code)} alt={node.code}
                        style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 3, marginBottom: 6 }}
                        onError={e => { e.target.style.display = "none"; }}
                      />
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 2 }}>{node.code}</div>
                      <div style={{ fontSize: 12, color: "#333", marginBottom: 6, lineHeight: 1.3 }}>{ru ? node.nameRU : node.nameEN}</div>
                      <input type="text" value={node.bomRef} onChange={e => updateNode(node.code, "bomRef", e.target.value)}
                        placeholder="BOM ref"
                        style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #ddd", borderRadius: 3, marginBottom: 4, fontFamily: "monospace" }}
                      />
                      <input type="text" value={node.notes} onChange={e => updateNode(node.code, "notes", e.target.value)}
                        placeholder={ru ? "Примечание..." : "Notes..."}
                        style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: "1px solid #ddd", borderRadius: 3, fontFamily: "inherit" }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}

        {/* 10 FILES */}
        {activeTab === "files" && (
          <>
            <p className="section-hint">
              {ru ? "Файлы для передачи на производство вместе с техпаком" : "Files to send with this tech pack to the factory"}
            </p>
            <EditableTable lang={siteLang}
              columns={[
                { key: "type",     label: ru ? "Тип файла" : "File type",            width: 140 },
                { key: "name",     label: ru ? "Имя / описание" : "Name / description", width: 180 },
                { key: "file",     label: ru ? "Файл" : "File",                      width: 200, type: "file" },
                { key: "required", label: ru ? "Обязателен" : "Required",            width: 90, type: "select", options: OPT.required },
                { key: "status",   label: ru ? "Статус" : "Status",                  width: 90, type: "select", options: OPT.statusFile },
                { key: "owner",    label: ru ? "Ответственный" : "Owner",            width: 120 },
                { key: "notes",    label: ru ? "Примечания" : "Notes",               width: 200 },
              ]}
              rows={fileItems}
              onChange={setFileItems}
              defaultRow={{ type: "", name: "", file: null, required: OPT.required[0], status: OPT.toFill, owner: "", notes: "" }}
              emptyLabel={ru ? "Нет файлов" : "No files listed"}
            />
          </>
        )}

      </div>

      {/* Export */}
    </div>
  );
}
