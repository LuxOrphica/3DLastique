import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ─── style constants ──────────────────────────────────────────────────────────

const C = {
  black:      "FF111111",
  white:      "FFFFFFFF",
  headerBg:   "FFD9D9D9",   // column header fill
  pageBg:     "FFF2F2F2",   // info-block label bg
  borderClr:  "FFB0B0B0",   // thin border color
  accent:     "FF1F3864",   // dark navy for page header row
  accentText: "FFFFFFFF",
  gold:       "FFC8A84B",
  noteText:   "FF555555",
  groupBg:    "FFE8E8E8",
};

const FONTS = {
  base:    { name: "Segoe UI", size: 9,  color: { argb: C.black } },
  bold:    { name: "Segoe UI", size: 9,  color: { argb: C.black }, bold: true },
  header:  { name: "Segoe UI", size: 9,  color: { argb: C.black }, bold: true },
  page:    { name: "Segoe UI", size: 11, color: { argb: C.accentText }, bold: true },
  label:   { name: "Segoe UI", size: 8,  color: { argb: C.noteText }, bold: true },
  note:    { name: "Segoe UI", size: 8,  color: { argb: C.noteText }, italic: true },
  small:   { name: "Segoe UI", size: 8,  color: { argb: C.black } },
};

const thinBorder = {
  top:    { style: "thin", color: { argb: C.borderClr } },
  left:   { style: "thin", color: { argb: C.borderClr } },
  bottom: { style: "thin", color: { argb: C.borderClr } },
  right:  { style: "thin", color: { argb: C.borderClr } },
};

const outerBorder = {
  top:    { style: "medium", color: { argb: "FF888888" } },
  left:   { style: "medium", color: { argb: "FF888888" } },
  bottom: { style: "medium", color: { argb: "FF888888" } },
  right:  { style: "medium", color: { argb: "FF888888" } },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function applyHeader(cell, text) {
  cell.value = text;
  cell.font = FONTS.header;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
  cell.border = thinBorder;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function applyData(cell, text, opts = {}) {
  cell.value = text ?? "";
  cell.font = opts.bold ? FONTS.bold : opts.small ? FONTS.small : FONTS.base;
  cell.border = thinBorder;
  cell.alignment = {
    horizontal: opts.center ? "center" : opts.right ? "right" : "left",
    vertical: "middle",
    wrapText: true,
  };
  if (opts.bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } };
}

function applyGroup(cell, text, colSpan, ws, row) {
  cell.value = text;
  cell.font = { ...FONTS.bold, size: 8, color: { argb: "FF444444" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.groupBg } };
  cell.border = thinBorder;
  cell.alignment = { horizontal: "left", vertical: "middle" };
}

function pageHeaderRow(ws, rowNum, brand, styleCode, sectionTitle, lang) {
  const row = ws.getRow(rowNum);
  row.height = 22;
  const cell = ws.getCell(rowNum, 1);
  cell.value = `${brand || "BRAND"}  ·  ${styleCode || "STYLE"}  ·  ${sectionTitle}`;
  cell.font = FONTS.page;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.accent } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  // merge across all used columns
  const lastCol = ws.columnCount || 12;
  if (lastCol > 1) ws.mergeCells(rowNum, 1, rowNum, lastCol);
}

function infoBlock(ws, startRow, styleInfo, lang) {
  const L = lang === "ru";
  const fields = L ? [
    ["Бренд",     styleInfo.brand || ""],
    ["Style No.", styleInfo.styleCode || ""],
    ["Название",  styleInfo.nameRU || styleInfo.nameEN || ""],
    ["Сезон",     styleInfo.season || ""],
    ["Пол",       styleInfo.gender || ""],
    ["Базовый р.", styleInfo.baseSize ? String(styleInfo.baseSize) : ""],
    ["Стадия",    styleInfo.specStage || ""],
    ["Фабрика",   styleInfo.factory || ""],
    ["Дата",      styleInfo.date || ""],
  ] : [
    ["Brand",     styleInfo.brand || ""],
    ["Style No.", styleInfo.styleCode || ""],
    ["Name",      styleInfo.nameEN || styleInfo.nameRU || ""],
    ["Season",    styleInfo.season || ""],
    ["Gender",    styleInfo.gender || ""],
    ["Base size", styleInfo.baseSize ? String(styleInfo.baseSize) : ""],
    ["Spec stage",styleInfo.specStage || ""],
    ["Factory",   styleInfo.factory || ""],
    ["Date",      styleInfo.date || ""],
  ];

  // 3 columns of pairs: col1=label col2=value col3=label col4=value col5=label col6=value
  const perRow = 3;
  for (let i = 0; i < fields.length; i++) {
    const r = startRow + Math.floor(i / perRow);
    const col = (i % perRow) * 2 + 1;
    const [label, value] = fields[i];

    const lc = ws.getCell(r, col);
    lc.value = label;
    lc.font = FONTS.label;
    lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.pageBg } };
    lc.border = thinBorder;
    lc.alignment = { horizontal: "right", vertical: "middle" };

    const vc = ws.getCell(r, col + 1);
    vc.value = value;
    vc.font = FONTS.bold;
    vc.border = thinBorder;
    vc.alignment = { horizontal: "left", vertical: "middle" };
  }

  const infoRows = Math.ceil(fields.length / perRow);
  for (let r = startRow; r < startRow + infoRows; r++) {
    ws.getRow(r).height = 16;
  }
  return startRow + infoRows + 1; // next available row
}

function tableHeaders(ws, rowNum, columns) {
  const row = ws.getRow(rowNum);
  row.height = 18;
  columns.forEach((col, i) => {
    applyHeader(ws.getCell(rowNum, i + 1), col.header);
    ws.getColumn(i + 1).width = col.width || 14;
  });
}

function tableRow(ws, rowNum, values, opts = {}) {
  ws.getRow(rowNum).height = opts.height || 15;
  values.forEach((v, i) => {
    applyData(ws.getCell(rowNum, i + 1), v, {
      center: opts.center?.[i],
      bold: opts.bold,
      small: opts.small,
    });
  });
}

function groupRow(ws, rowNum, label, colCount) {
  const cell = ws.getCell(rowNum, 1);
  applyGroup(cell, label, colCount, ws, rowNum);
  if (colCount > 1) ws.mergeCells(rowNum, 1, rowNum, colCount);
  ws.getRow(rowNum).height = 14;
}

function noteRow(ws, rowNum, text, colCount) {
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = FONTS.note;
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  if (colCount > 1) ws.mergeCells(rowNum, 1, rowNum, colCount);
  ws.getRow(rowNum).height = 13;
}

function blankRow(ws, rowNum) {
  ws.getRow(rowNum).height = 6;
}

// ─── sheet builders ───────────────────────────────────────────────────────────

function buildStyleInfo(wb, styleInfo, lang) {
  const L = lang === "ru";
  const ws = wb.addWorksheet(L ? "00_Стиль" : "00_Style_Info");
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // page header
  ws.getRow(1).height = 22;
  const h = ws.getCell(1, 1);
  h.value = L ? "КАРТОЧКА СТИЛЯ" : "STYLE CARD";
  h.font = FONTS.page;
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.accent } };
  h.alignment = { horizontal: "left", vertical: "middle" };
  ws.mergeCells(1, 1, 1, 6);

  let r = 3;
  const fields = L ? [
    ["Бренд",         styleInfo.brand || ""],
    ["Style No.",     styleInfo.styleCode || ""],
    ["Название RU",   styleInfo.nameRU || ""],
    ["Название EN",   styleInfo.nameEN || ""],
    ["Сезон",         styleInfo.season || ""],
    ["Пол",           styleInfo.gender || ""],
    ["Базовый размер",styleInfo.baseSize ? String(styleInfo.baseSize) : ""],
    ["Размерный ряд", styleInfo.sizeRange || (styleInfo.sizes ? styleInfo.sizes.join(", ") : "")],
    ["Стадия",        styleInfo.specStage || ""],
    ["Фабрика",       styleInfo.factory || ""],
    ["Дата",          styleInfo.date || ""],
  ] : [
    ["Brand",         styleInfo.brand || ""],
    ["Style No.",     styleInfo.styleCode || ""],
    ["Name RU",       styleInfo.nameRU || ""],
    ["Name EN",       styleInfo.nameEN || ""],
    ["Season",        styleInfo.season || ""],
    ["Gender",        styleInfo.gender || ""],
    ["Base size",     styleInfo.baseSize ? String(styleInfo.baseSize) : ""],
    ["Size range",    styleInfo.sizeRange || (styleInfo.sizes ? styleInfo.sizes.join(", ") : "")],
    ["Spec stage",    styleInfo.specStage || ""],
    ["Factory",       styleInfo.factory || ""],
    ["Date",          styleInfo.date || ""],
  ];

  fields.forEach(([label, value]) => {
    ws.getRow(r).height = 17;
    const lc = ws.getCell(r, 1);
    lc.value = label;
    lc.font = FONTS.label;
    lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.pageBg } };
    lc.border = thinBorder;
    lc.alignment = { horizontal: "right", vertical: "middle" };
    ws.mergeCells(r, 1, r, 2);

    const vc = ws.getCell(r, 3);
    vc.value = value;
    vc.font = FONTS.bold;
    vc.border = thinBorder;
    vc.alignment = { horizontal: "left", vertical: "middle" };
    ws.mergeCells(r, 3, r, 6);
    r++;
  });

  if (styleInfo.description) {
    r++;
    const dc = ws.getCell(r, 1);
    dc.value = L ? "Описание" : "Description";
    dc.font = FONTS.label;
    dc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.pageBg } };
    dc.border = thinBorder;
    dc.alignment = { horizontal: "right", vertical: "top" };
    ws.mergeCells(r, 1, r + 2, 2);

    const descCell = ws.getCell(r, 3);
    descCell.value = styleInfo.description;
    descCell.font = FONTS.base;
    descCell.border = thinBorder;
    descCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    ws.mergeCells(r, 3, r + 2, 6);
    ws.getRow(r).height = 17;
  }

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
}

function buildCallouts(wb, callouts, styleInfo, lang) {
  const L = lang === "ru";
  const ws = wb.addWorksheet(L ? "01_Callouts" : "01_Tech_Sketch");
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const cols = L ? [
    { header: "ID",              width: 8  },
    { header: "Деталь RU",       width: 36 },
    { header: "Расположение",    width: 26 },
    { header: "Ссылка BOM",      width: 18 },
    { header: "Ссылка конструк.", width: 18 },
    { header: "Статус",          width: 14 },
    { header: "Примечание",      width: 30 },
  ] : [
    { header: "ID",              width: 8  },
    { header: "EN detail",       width: 36 },
    { header: "Placement",       width: 26 },
    { header: "BOM ref",         width: 18 },
    { header: "Construction ref",width: 18 },
    { header: "Status",          width: 14 },
    { header: "Remarks",         width: 30 },
  ];

  // info block
  let r = infoBlock(ws, 1, styleInfo, lang);

  tableHeaders(ws, r, cols); r++;

  const items = callouts && callouts.length > 0 ? callouts : [];
  items.forEach(c => {
    tableRow(ws, r, [
      c.id || "",
      L ? (c.ru || "") : (c.en || ""),
      c.placement || "",
      c.bomRef || "",
      c.constrRef || "",
      c.status || "",
      c.remarks || "",
    ], { center: [true, false, false, true, true, true, false] });
    r++;
  });

  if (!items.length) {
    noteRow(ws, r, L ? "Добавьте callout-записи в приложении" : "Add callout entries in the app", cols.length);
    r++;
  }

  r++;
  noteRow(ws, r, L
    ? "ID на эскизе должны совпадать с этой таблицей (C01, C02…)"
    : "Callout IDs on the sketch must match this table (C01, C02…)",
    cols.length);
}

function buildMeasurements(wb, poms, sizes, baseSize, styleInfo, pomRef, lang) {
  const L = lang === "ru";
  const ws = wb.addWorksheet(L ? "02_Табель_мер" : "02_Measurements");
  ws.views = [{ state: "frozen", ySplit: 4 }];

  const fixedCols = L ? [
    { header: "№",          width: 5  },
    { header: "Код",        width: 9  },
    { header: "Наименование",width: 34 },
    { header: "Метод",      width: 42 },
    { header: "Доп ±",      width: 7  },
  ] : [
    { header: "No.",        width: 5  },
    { header: "Code",       width: 9  },
    { header: "Measure point", width: 34 },
    { header: "Method",     width: 42 },
    { header: "Tol ±",      width: 7  },
  ];

  const sizeCols = sizes.map(s => ({ header: String(s), width: 7 }));
  const remarkCol = [{ header: L ? "Примечание" : "Remarks", width: 22 }];
  const allCols = [...fixedCols, ...sizeCols, ...remarkCol];

  let r = infoBlock(ws, 1, styleInfo, lang);

  // note row
  noteRow(ws, r, L
    ? `Единица: см  ·  Плоские замеры готового изделия  ·  Базовый размер: ${baseSize}`
    : `UOM: cm  ·  Flat finished garment measurements  ·  Base size: ${baseSize}`,
    allCols.length);
  r++;

  tableHeaders(ws, r, allCols);
  // highlight base size column header gold
  const baseSzIdx = sizes.indexOf(baseSize);
  if (baseSzIdx !== -1) {
    const bc = ws.getCell(r, fixedCols.length + baseSzIdx + 1);
    bc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.gold } };
    bc.font = { ...FONTS.header, color: { argb: C.white } };
  }
  r++;

  const mainPoms   = poms.filter(p => p.group === "main");
  const detailPoms = poms.filter(p => p.group === "detail");
  const ALL_SIZES_REF = [44,46,48,50,52,54,56,58,60];

  const renderGroup = (label, items, startIdx) => {
    if (items.length) {
      groupRow(ws, r, label, allCols.length);
      r++;
    }
    items.forEach((p, i) => {
      const ref = pomRef[p.code] || {};
      const name   = L ? (p.nameRU   || ref.nameRU   || "") : (p.nameEN   || ref.nameEN   || "");
      const method = L ? (p.methodRU || ref.methodRU || "") : (p.methodEN || ref.methodEN || "");
      const vals = sizes.map(s => {
        const idx = ALL_SIZES_REF.indexOf(s);
        const v = idx !== -1 ? p.values?.[idx] : null;
        return v != null ? +v.toFixed(1) : "";
      });
      const tol = p.tolPlus != null ? `±${p.tolPlus}` : "";
      const rowVals = [startIdx + i + 1, p.code, name, method, tol, ...vals, p.remarks || ""];
      ws.getRow(r).height = 15;
      rowVals.forEach((v, ci) => {
        const cell = ws.getCell(r, ci + 1);
        applyData(cell, v, {
          center: ci >= 4,
          bold: ci === 1,
          bg: (ci >= fixedCols.length && ci < fixedCols.length + sizes.length && sizes[ci - fixedCols.length] === baseSize)
            ? "FFFFFBEA" : undefined,
        });
      });
      r++;
    });
    return items.length;
  };

  renderGroup(L ? "Основные замеры" : "Main measurements", mainPoms, 0);
  renderGroup(L ? "Детальные замеры" : "Detail measurements", detailPoms, mainPoms.length);
}

function buildPatternPieces(wb, patternPieces, styleInfo, lang) {
  const L = lang === "ru";
  const ws = wb.addWorksheet(L ? "03_Детали_кроя" : "03_Pattern_Pieces");
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const cols = L ? [
    { header: "№",            width: 5  },
    { header: "DXF",          width: 10 },
    { header: "Раздел",       width: 20 },
    { header: "Полное название", width: 32 },
    { header: "Краткое",      width: 18 },
    { header: "Кол-во",       width: 8  },
    { header: "Материал",     width: 24 },
    { header: "Примечание",   width: 28 },
  ] : [
    { header: "No.",          width: 5  },
    { header: "DXF name",     width: 10 },
    { header: "Section",      width: 20 },
    { header: "Full name EN", width: 32 },
    { header: "Short EN",     width: 18 },
    { header: "Qty",          width: 8  },
    { header: "Material EN",  width: 24 },
    { header: "Remarks",      width: 28 },
  ];

  let r = infoBlock(ws, 1, styleInfo, lang);
  tableHeaders(ws, r, cols); r++;

  const items = patternPieces && patternPieces.length > 0 ? patternPieces : [];
  let lastSection = null;

  items.forEach((p, i) => {
    if (p.section && p.section !== lastSection) {
      groupRow(ws, r, p.section, cols.length); r++;
      lastSection = p.section;
    }
    tableRow(ws, r, [
      i + 1,
      p.dxfName || "",
      p.section || "",
      L ? (p.nameRU || "") : (p.nameEN || ""),
      L ? (p.shortRU || "") : (p.shortEN || ""),
      p.qty || "",
      L ? (p.matRU || p.material || "") : (p.matEN || p.material || ""),
      p.remarks || "",
    ], { center: [true, true, false, false, false, true, false, false] });
    r++;
  });

  if (!items.length) {
    noteRow(ws, r, L ? "Добавьте детали кроя в приложении" : "Add pattern pieces in the app", cols.length);
  }

  r++;
  noteRow(ws, r, L
    ? "Наименования должны точно совпадать с именами деталей в DXF/PDF-файлах  ·  Qty: 1+0 = одна деталь, 1+1 = зеркальная пара"
    : "Names must match pattern piece names in DXF/PDF files exactly  ·  Qty: 1+0 = single, 1+1 = mirrored pair",
    cols.length);
}

function buildBOM(wb, bomItems, styleInfo, lang) {
  const L = lang === "ru";
  const ws = wb.addWorksheet(L ? "04_BOM" : "04_BOM");
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const cols = L ? [
    { header: "№",            width: 5  },
    { header: "Тип",          width: 12 },
    { header: "Наименование", width: 22 },
    { header: "Артикул",      width: 14 },
    { header: "Pantone/RAL",  width: 13 },
    { header: "Состав %",     width: 14 },
    { header: "GSM",          width: 7  },
    { header: "Ширина",       width: 8  },
    { header: "MOQ",          width: 8  },
    { header: "Поставщик",    width: 18 },
    { header: "Расположение", width: 18 },
    { header: "Кол-во",       width: 8  },
    { header: "Ед.",          width: 6  },
    { header: "Статус",       width: 12 },
    { header: "Примечание",   width: 24 },
  ] : [
    { header: "No.",          width: 5  },
    { header: "Type",         width: 12 },
    { header: "Item EN",      width: 22 },
    { header: "Article / Ref",width: 14 },
    { header: "Pantone/RAL",  width: 13 },
    { header: "Content %",    width: 14 },
    { header: "GSM",          width: 7  },
    { header: "Width",        width: 8  },
    { header: "MOQ",          width: 8  },
    { header: "Supplier",     width: 18 },
    { header: "Placement",    width: 18 },
    { header: "Qty",          width: 8  },
    { header: "Unit",         width: 6  },
    { header: "Status",       width: 12 },
    { header: "Remarks",      width: 24 },
  ];

  let r = infoBlock(ws, 1, styleInfo, lang);
  tableHeaders(ws, r, cols); r++;

  const items = bomItems && bomItems.length > 0 ? bomItems : [];
  let lastType = null;
  let idx = 0;

  items.forEach(item => {
    if (item.type && item.type !== lastType) {
      groupRow(ws, r, item.type, cols.length); r++;
      lastType = item.type;
    }
    tableRow(ws, r, [
      ++idx,
      item.type || "",
      L ? (item.nameRU || "") : (item.nameEN || ""),
      item.article || "",
      item.colorRef || "",
      item.content || "",
      item.gsm || "",
      item.width || "",
      item.moq || "",
      item.supplier || "",
      item.placement || "",
      item.qty || "",
      item.unit || "",
      item.status || "",
      item.remarks || "",
    ], { center: [true, false, false, false, false, false, true, true, true, false, false, true, true, true, false] });
    r++;
  });

  if (!items.length) {
    noteRow(ws, r, L ? "Добавьте позиции BOM в приложении" : "Add BOM items in the app", cols.length);
  }

  r += 2;
  noteRow(ws, r, L
    ? "Цвет, поставщик и артикул подтверждаются заказчиком, если не зафиксировано иное."
    : "Color, supplier and article number confirmed by buyer unless otherwise specified.",
    cols.length);
}

function buildFusingSeams(wb, fusingItems, seamItems, styleInfo, lang) {
  const L = lang === "ru";
  const ws = wb.addWorksheet(L ? "05_Проклейка_швы" : "05_Fusing_Seams");
  ws.views = [{ state: "frozen", ySplit: 3 }];

  let r = infoBlock(ws, 1, styleInfo, lang);

  // ── Fusing ──
  const fusingCols = L ? [
    { header: "№",          width: 5  },
    { header: "Зона",       width: 28 },
    { header: "Тип клеевой",width: 22 },
    { header: "Применение", width: 28 },
    { header: "Согласование",width:18 },
    { header: "Статус",     width: 12 },
    { header: "Примечание", width: 28 },
  ] : [
    { header: "No.",        width: 5  },
    { header: "Zone EN",    width: 28 },
    { header: "Fusible type",width:22 },
    { header: "Application",width: 28 },
    { header: "Approval",   width: 18 },
    { header: "Status",     width: 12 },
    { header: "Remarks",    width: 28 },
  ];

  groupRow(ws, r, L ? "Карта проклейки" : "Fusing map", fusingCols.length); r++;
  tableHeaders(ws, r, fusingCols); r++;

  const fusings = fusingItems && fusingItems.length > 0 ? fusingItems : [];
  fusings.forEach((f, i) => {
    tableRow(ws, r, [
      i + 1,
      L ? (f.zoneRU || "") : (f.zoneEN || ""),
      f.type || "",
      f.application || "",
      f.approval || "",
      f.status || "",
      f.remarks || "",
    ], { center: [true] });
    r++;
  });
  if (!fusings.length) { noteRow(ws, r, L ? "Нет данных" : "No data", fusingCols.length); r++; }

  r++;

  // ── Seams ──
  const seamCols = L ? [
    { header: "№",          width: 5  },
    { header: "Зона / Шов", width: 30 },
    { header: "Припуск см", width: 12 },
    { header: "Обработка",  width: 28 },
    { header: "Примечание", width: 32 },
  ] : [
    { header: "No.",        width: 5  },
    { header: "Zone / Seam",width: 30 },
    { header: "SA cm",      width: 12 },
    { header: "Finish",     width: 28 },
    { header: "Remarks",    width: 32 },
  ];

  groupRow(ws, r, L ? "Припуски на швы" : "Seam allowances", seamCols.length); r++;
  tableHeaders(ws, r, seamCols); r++;

  const seams = seamItems && seamItems.length > 0 ? seamItems : [];
  seams.forEach((s, i) => {
    tableRow(ws, r, [
      i + 1,
      L ? (s.zoneRU || "") : (s.zoneEN || ""),
      s.seam || "",
      s.finish || "",
      s.remarks || "",
    ], { center: [true, false, true, false, false] });
    r++;
  });
  if (!seams.length) { noteRow(ws, r, L ? "Нет данных" : "No data", seamCols.length); r++; }
}

function buildLabels(wb, labelItems, packingItems, styleInfo, lang) {
  const L = lang === "ru";
  const ws = wb.addWorksheet(L ? "06_Маркировка" : "06_Labels_Packing");
  ws.views = [{ state: "frozen", ySplit: 3 }];

  let r = infoBlock(ws, 1, styleInfo, lang);

  const labelCols = L ? [
    { header: "№",           width: 5  },
    { header: "Наименование",width: 28 },
    { header: "Расположение",width: 28 },
    { header: "Кол-во",      width: 8  },
    { header: "Крепление",   width: 16 },
    { header: "Согласование",width: 18 },
    { header: "Статус",      width: 12 },
    { header: "Примечание",  width: 28 },
  ] : [
    { header: "No.",         width: 5  },
    { header: "Item EN",     width: 28 },
    { header: "Placement",   width: 28 },
    { header: "Qty",         width: 8  },
    { header: "Attachment",  width: 16 },
    { header: "Approval",    width: 18 },
    { header: "Status",      width: 12 },
    { header: "Remarks",     width: 28 },
  ];

  groupRow(ws, r, L ? "Маркировка" : "Label placement", labelCols.length); r++;
  tableHeaders(ws, r, labelCols); r++;

  const labels = labelItems && labelItems.length > 0 ? labelItems : [];
  labels.forEach((l, i) => {
    tableRow(ws, r, [
      i + 1,
      L ? (l.itemRU || "") : (l.itemEN || ""),
      l.placement || "",
      l.qty || "",
      l.attachment || "",
      l.approval || "",
      l.status || "",
      l.remarks || "",
    ], { center: [true, false, false, true, false, false, true, false] });
    r++;
  });
  if (!labels.length) { noteRow(ws, r, L ? "Нет данных" : "No data", labelCols.length); r++; }

  r++;

  const packCols = L ? [
    { header: "№",           width: 5  },
    { header: "Позиция",     width: 24 },
    { header: "Спецификация",width: 36 },
    { header: "Кол-во",      width: 12 },
    { header: "Ед.",         width: 7  },
    { header: "Статус",      width: 12 },
    { header: "Примечание",  width: 28 },
  ] : [
    { header: "No.",         width: 5  },
    { header: "Item",        width: 24 },
    { header: "Specification",width:36 },
    { header: "Qty",         width: 12 },
    { header: "Unit",        width: 7  },
    { header: "Status",      width: 12 },
    { header: "Remarks",     width: 28 },
  ];

  groupRow(ws, r, L ? "Упаковка" : "Packing", packCols.length); r++;
  tableHeaders(ws, r, packCols); r++;

  const packings = packingItems && packingItems.length > 0 ? packingItems : [];
  packings.forEach((p, i) => {
    tableRow(ws, r, [
      i + 1,
      p.item || (L ? (p.itemRU || "") : (p.itemEN || "")),
      p.spec || "",
      p.qty || "",
      p.unit || "",
      p.status || "",
      p.remarks || "",
    ], { center: [true, false, false, true, true, true, false] });
    r++;
  });
  if (!packings.length) { noteRow(ws, r, L ? "Нет данных" : "No data", packCols.length); r++; }
}

function buildFileHandoff(wb, files, styleInfo, lang) {
  const L = lang === "ru";
  const ws = wb.addWorksheet(L ? "07_Файлы" : "07_File_Handoff");
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const cols = L ? [
    { header: "№",            width: 5  },
    { header: "Тип файла",    width: 26 },
    { header: "Имя файла",    width: 30 },
    { header: "Обязательно",  width: 14 },
    { header: "Статус",       width: 12 },
    { header: "Ответственный",width: 18 },
    { header: "Дата",         width: 12 },
    { header: "Примечание",   width: 38 },
  ] : [
    { header: "No.",          width: 5  },
    { header: "File type",    width: 26 },
    { header: "File name",    width: 30 },
    { header: "Required",     width: 14 },
    { header: "Status",       width: 12 },
    { header: "Owner",        width: 18 },
    { header: "Date",         width: 12 },
    { header: "Notes",        width: 38 },
  ];

  let r = infoBlock(ws, 1, styleInfo, lang);
  tableHeaders(ws, r, cols); r++;

  const items = files && files.length > 0 ? files : [];
  items.forEach((f, i) => {
    tableRow(ws, r, [
      i + 1,
      f.type || "",
      f.name || "",
      f.required || "",
      f.status || "",
      f.owner || "",
      f.date || "",
      f.notes || "",
    ], { center: [true, false, false, true, true, false, true, false] });
    r++;
  });

  if (!items.length) {
    noteRow(ws, r, L ? "Добавьте файлы в приложении" : "Add files in the app", cols.length);
  }

  r += 2;
  noteRow(ws, r,
    L ? "DXF единицы: мм. Уточните включение припусков до передачи на производство."
      : "DXF units: mm. Confirm seam allowance included/excluded before sending to production.",
    cols.length);
}

// ─── main export ──────────────────────────────────────────────────────────────

export async function exportTechPackExcel({
  lang = "en",
  styleInfo,
  poms,
  sizes,
  baseSize,
  pomRef,
  callouts,
  patternPieces,
  bomItems,
  fusingItems,
  seamItems,
  labelItems,
  packingItems,
  files,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "3D Lastique · lekala.pro";
  wb.created = new Date();

  const si = { ...styleInfo, baseSize, sizes };

  buildStyleInfo(wb, si, lang);
  buildCallouts(wb, callouts, si, lang);
  buildMeasurements(wb, poms, sizes, baseSize, si, pomRef || {}, lang);
  buildPatternPieces(wb, patternPieces, si, lang);
  buildBOM(wb, bomItems, si, lang);
  buildFusingSeams(wb, fusingItems, seamItems, si, lang);
  buildLabels(wb, labelItems, packingItems, si, lang);
  buildFileHandoff(wb, files, si, lang);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const code   = si.styleCode || "style";
  const sz     = baseSize || "XX";
  const suffix = lang === "ru" ? "RU" : "EN";
  saveAs(blob, `techpack_${code}_${sz}_${suffix}.xlsx`);
}
