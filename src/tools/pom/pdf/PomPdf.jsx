import {
  Document, Page, Text, View, Image, StyleSheet, Font,
} from "@react-pdf/renderer";

Font.register({
  family: "PTSans",
  fonts: [
    { src: "/fonts/PTSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/PTSans-Bold.ttf",    fontWeight: 700 },
  ],
});

// в"Ђв"Ђ palette в"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђ
const C = {
  black:  "#111111",
  gray8:  "#4A4A4A",
  gray6:  "#737373",
  gray3:  "#D4D4D4",
  gray1:  "#F5F5F5",
  white:  "#FFFFFF",
  accent: "#111111",
  gold:   "#C8A84B",
  goldBg: "#FFFBEA",
};

const FONT      = "PTSans";
const FONT_BOLD = "PTSans";
const ALL_SIZES = [44, 46, 48, 50, 52, 54, 56, 58, 60];

function fmt(v) {
  if (v === null || v === undefined) return "-";
  return typeof v === "number" ? v.toFixed(1) : String(v);
}

// в"Ђв"Ђ column widths (landscape A4 в‰€ 778 pt usable) в"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђ
const COL = {
  num: 18, code: 28, nameRU: 120, nameEN: 120, tol: 32, size: 34,
};
const BOM_COL = {
  num: 18, type: 55, nameRU: 100, nameEN: 100, placement: 78,
  requirement: 78, parameter: 52, qty: 32, unit: 28,
  approval: 52, status: 36,
};
const PP_COL = {
  num: 20, dxf: 34, section: 78, nameRU: 118, shortRU: 68,
  nameEN: 108, shortEN: 68, qty: 28, matRU: 76, matEN: 76,
};

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// STYLES
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
const s = StyleSheet.create({
  pageLandscape: {
    fontFamily: FONT, fontSize: 8, color: C.black, backgroundColor: C.white,
    paddingBottom: 32,
  },
  // band
  band: {
    backgroundColor: C.accent, paddingHorizontal: 32, paddingVertical: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  bandBrand: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 13, color: C.white, letterSpacing: 2 },
  bandRight: { flexDirection: "column", alignItems: "flex-end", gap: 2 },
  bandStyleCode: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 9, color: C.gold, letterSpacing: 1 },
  bandMeta: { fontSize: 7, color: "#AAAAAA", letterSpacing: 0.3 },
  // inner content area
  inner: { paddingHorizontal: 32, paddingTop: 18 },
  // section title
  sectionTitle: {
    fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 7, letterSpacing: 1, color: C.gray6,
    textTransform: "uppercase", marginBottom: 8,
  },
  // table primitives
  table: { width: "100%" },
  tHeadRow: { flexDirection: "row", backgroundColor: C.accent },
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.gray3 },
  tRowAlt: {
    flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.gray3,
    backgroundColor: C.gray1,
  },
  tRowGroup: { flexDirection: "row", backgroundColor: "#E2E2E2", borderBottomWidth: 0.5, borderBottomColor: C.gray3 },
  th: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 6.5, color: C.white, paddingVertical: 4, paddingHorizontal: 4, letterSpacing: 0.3 },
  thBase: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 6.5, color: C.gold, paddingVertical: 4, paddingHorizontal: 4, textAlign: "center" },
  thSize: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 6.5, color: C.white, paddingVertical: 4, paddingHorizontal: 4, textAlign: "center" },
  td: { fontSize: 7, color: C.black, paddingVertical: 3.5, paddingHorizontal: 4 },
  tdCode: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 7, color: C.black, paddingVertical: 3.5, paddingHorizontal: 4 },
  tdBase: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 7, color: C.black, paddingVertical: 3.5, paddingHorizontal: 4, textAlign: "center", backgroundColor: C.goldBg },
  tdNum: { fontSize: 7, color: C.black, paddingVertical: 3.5, paddingHorizontal: 4, textAlign: "center" },
  tdTol: { fontSize: 7, color: C.gray6, paddingVertical: 3.5, paddingHorizontal: 4, textAlign: "center" },
  tdGroup: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 6.5, color: C.gray6, letterSpacing: 0.8, textTransform: "uppercase", paddingVertical: 3, paddingHorizontal: 4 },
  // footer
  footer: {
    position: "absolute", bottom: 14, left: 32, right: 32,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 0.5, borderTopColor: C.gray3, paddingTop: 5,
  },
  footerText: { fontSize: 6.5, color: C.gray6 },
  // cover
  coverBody: { flexDirection: "row", paddingHorizontal: 32, paddingTop: 20, paddingBottom: 40, gap: 28 },
  coverLeft: { flex: 1.1, flexDirection: "column", gap: 12 },
  coverRight: { flex: 0.9, flexDirection: "column", gap: 16 },
  sketchBox: {
    flexDirection: "row", gap: 8, backgroundColor: C.gray1, borderRadius: 3,
    padding: 10, alignItems: "center", justifyContent: "center", flex: 1,
  },
  sketchImg: { height: 240, objectFit: "contain" },
  sketchPlaceholder: {
    flex: 1, height: 240, backgroundColor: "#E8E8E8", borderRadius: 2,
    alignItems: "center", justifyContent: "center",
  },
  sketchPlaceholderText: { fontSize: 7, color: C.gray6, letterSpacing: 0.5 },
  // info table
  infoTable: { borderWidth: 0.5, borderColor: C.gray3, borderRadius: 3, overflow: "hidden" },
  infoRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.gray3 },
  infoRowLast: { flexDirection: "row" },
  infoLabel: { width: 90, backgroundColor: C.gray1, paddingVertical: 4.5, paddingHorizontal: 7, fontSize: 6.5, color: C.gray6, fontFamily: FONT_BOLD, fontWeight: 700, letterSpacing: 0.4 },
  infoValue: { flex: 1, paddingVertical: 4.5, paddingHorizontal: 7, fontSize: 7.5, color: C.black },
  infoValueBold: { flex: 1, paddingVertical: 4.5, paddingHorizontal: 7, fontSize: 7.5, color: C.black, fontFamily: FONT_BOLD },
  // toc
  tocTitle: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 7, letterSpacing: 1.2, color: C.gray6, textTransform: "uppercase", marginBottom: 5 },
  tocRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: C.gray3 },
  tocItem: { fontSize: 7.5, color: C.black },
  tocNum: { fontSize: 7, color: C.gray6, fontFamily: FONT_BOLD, fontWeight: 700, marginRight: 6 },
  tocPage: { fontSize: 7.5, color: C.gray6, fontFamily: FONT_BOLD },
  // placeholder page
  placeholderBox: {
    flex: 1, alignItems: "center", justifyContent: "center",
    marginHorizontal: 32, marginTop: 40,
    borderWidth: 0.5, borderColor: C.gray3, borderRadius: 4,
    borderStyle: "dashed",
  },
  placeholderTitle: { fontFamily: FONT_BOLD, fontWeight: 700, fontSize: 14, color: C.gray3, letterSpacing: 1 },
  placeholderSub: { fontSize: 8, color: C.gray3, marginTop: 6 },
});

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// SHARED
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

function TopBand({ styleInfo }) {
  const meta = [
    styleInfo.gender,
    styleInfo.season,
    styleInfo.specStage && `Stage: ${styleInfo.specStage}`,
    styleInfo.factory && `Factory: ${styleInfo.factory}`,
  ].filter(Boolean).join("  В·  ");
  return (
    <View style={s.band}>
      <Text style={s.bandBrand}>{(styleInfo.brand || "BRAND").toUpperCase()}</Text>
      <View style={s.bandRight}>
        <Text style={s.bandStyleCode}>{styleInfo.styleCode || ""}</Text>
        <Text style={s.bandMeta}>{styleInfo.nameEN || styleInfo.nameRU || ""}</Text>
        {meta ? <Text style={s.bandMeta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

function Footer({ label, styleInfo }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        {[styleInfo.brand, styleInfo.styleCode].filter(Boolean).join("  В·  ")}
      </Text>
      <Text style={s.footerText}>{label}</Text>
      <Text style={s.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function GroupRow({ label, totalWidth }) {
  return (
    <View style={s.tRowGroup}>
      <Text style={[s.tdGroup, { width: totalWidth || "100%" }]}>{label}</Text>
    </View>
  );
}

// в"Ђв"Ђ placeholder for sections not yet filled в"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђв"Ђ
function PlaceholderPage({ styleInfo, label, sublabel }) {
  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={s.placeholderBox}>
        <Text style={s.placeholderTitle}>{label.toUpperCase()}</Text>
        <Text style={s.placeholderSub}>{sublabel || "To be filled"}</Text>
      </View>
      <Footer label={label} styleInfo={styleInfo} />
    </Page>
  );
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// PAGE 1 вЂ" COVER
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

const TOC_ITEMS = [
  { num: "01", label: "Cover",                              page: 1  },
  { num: "02", label: "Technical Sketch / Callouts",        page: 2  },
  { num: "03", label: "Material BOM",                       page: 3  },
  { num: "04", label: "Fusing & Seams / Construction",      page: 4  },
  { num: "05", label: "Measurement Set",                    page: 5  },
  { num: "06", label: "Pattern Pieces",                     page: 6  },
  { num: "07", label: "Technical Details",                  page: 7  },
  { num: "08", label: "Labels & Packing",                   page: 8  },
  { num: "09", label: "File Handoff",                       page: 9  },
];

function InfoRow({ label, value, bold, last }) {
  return (
    <View style={last ? s.infoRowLast : s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={bold ? s.infoValueBold : s.infoValue}>{value || "-"}</Text>
    </View>
  );
}

function CoverPage({ styleInfo, sketchFront, sketchBack }) {
  const sizeRange = styleInfo.sizeRange ||
    (styleInfo.sizes?.length
      ? `${styleInfo.sizes[0]}вЂ"${styleInfo.sizes[styleInfo.sizes.length - 1]}`
      : "-");

  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={s.coverBody}>
        {/* LEFT вЂ" sketches */}
        <View style={s.coverLeft}>
          <View style={s.sketchBox}>
            {sketchFront
              ? <Image src={sketchFront} style={s.sketchImg} />
              : <View style={s.sketchPlaceholder}><Text style={s.sketchPlaceholderText}>FRONT VIEW</Text></View>
            }
            {sketchBack
              ? <Image src={sketchBack} style={s.sketchImg} />
              : <View style={s.sketchPlaceholder}><Text style={s.sketchPlaceholderText}>BACK VIEW</Text></View>
            }
          </View>
          {styleInfo.description ? (
            <View>
              <Text style={[s.sectionTitle, { marginBottom: 4 }]}>Model Description</Text>
              <Text style={{ fontSize: 7.5, color: C.black, lineHeight: 1.5 }}>{styleInfo.description}</Text>
            </View>
          ) : null}
        </View>

        {/* RIGHT вЂ" style info + TOC */}
        <View style={s.coverRight}>
          <View style={s.infoTable}>
            <InfoRow label="Style No."    value={styleInfo.styleCode} bold />
            <InfoRow label="Name EN"      value={styleInfo.nameEN} />
            <InfoRow label="РќР°Р·РІР°РЅРёРµ RU"  value={styleInfo.nameRU} />
            <InfoRow label="Season"       value={styleInfo.season} />
            <InfoRow label="Gender"       value={styleInfo.gender} />
            <InfoRow label="Sample size"  value={styleInfo.baseSize ? String(styleInfo.baseSize) : "-"} />
            <InfoRow label="Size range"   value={sizeRange} />
            <InfoRow label="Spec stage"   value={styleInfo.specStage} />
            <InfoRow label="Factory"      value={styleInfo.factory} />
            <InfoRow label="Date"         value={styleInfo.date} last />
          </View>

          {/* TOC */}
          <View style={{ marginTop: 14 }}>
            <Text style={s.tocTitle}>Table of Contents</Text>
            {TOC_ITEMS.map(item => (
              <View key={item.num} style={s.tocRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={s.tocNum}>{item.num}</Text>
                  <Text style={s.tocItem}>{item.label}</Text>
                </View>
                <Text style={s.tocPage}>{item.page}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <Footer label="Cover" styleInfo={styleInfo} />
    </Page>
  );
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// PAGE 2 вЂ" SKETCH
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

const CALLOUT_COL = { id: 28, ru: 130, en: 130, placement: 90, bom: 72, constr: 72, status: 40 };

function SketchPage({ styleInfo, sketchFront, sketchBack, sketchDiagram, callouts }) {
  const rows = callouts && callouts.length > 0
    ? callouts
    : [
        { id: "C01", ru: "", en: "", placement: "", bomRef: "", constrRef: "", status: "" },
        { id: "C02", ru: "", en: "", placement: "", bomRef: "", constrRef: "", status: "" },
        { id: "C03", ru: "", en: "", placement: "", bomRef: "", constrRef: "", status: "" },
      ];

  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={[s.inner, { flexDirection: "row", gap: 14, flex: 1 }]}>
        {/* LEFT: 3 sketch panels */}
        <View style={{ flex: 1.1, flexDirection: "row", gap: 8, marginTop: 4 }}>
          {[
            { label: "FRONT VIEW", src: sketchFront },
            { label: "BACK VIEW",  src: sketchBack },
            { label: "POM DIAGRAM", src: sketchDiagram },
          ].map(({ label, src }) => (
            <View key={label} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 6, color: C.gray6, marginBottom: 4, letterSpacing: 0.5, fontFamily: FONT_BOLD }}>{label}</Text>
              {src
                ? <Image src={src} style={{ height: 270, objectFit: "contain" }} />
                : <View style={{ flex: 1, width: "100%", backgroundColor: C.gray1, borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 6.5, color: C.gray3 }}>{label}</Text>
                  </View>
              }
            </View>
          ))}
        </View>

        {/* RIGHT: callout table */}
        <View style={{ flex: 0.9, flexDirection: "column" }}>
          <Text style={[s.sectionTitle, { marginBottom: 6 }]}>Key Style Details / Callouts</Text>
          <View style={s.table}>
            <View style={s.tHeadRow}>
              <Text style={[s.th, { width: CALLOUT_COL.id }]}>ID</Text>
              <Text style={[s.th, { width: CALLOUT_COL.ru }]}>RU detail</Text>
              <Text style={[s.th, { width: CALLOUT_COL.en }]}>EN detail</Text>
              <Text style={[s.th, { width: CALLOUT_COL.placement }]}>Placement</Text>
              <Text style={[s.th, { width: CALLOUT_COL.bom }]}>BOM ref</Text>
              <Text style={[s.th, { width: CALLOUT_COL.constr }]}>Constr. ref</Text>
              <Text style={[s.th, { flex: 1 }]}>Status</Text>
            </View>
            {rows.map((row, i) => (
              <View key={row.id || i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
                <Text style={[s.tdCode, { width: CALLOUT_COL.id }]}>{row.id || ""}</Text>
                <Text style={[s.td,     { width: CALLOUT_COL.ru }]}>{row.ru || ""}</Text>
                <Text style={[s.td,     { width: CALLOUT_COL.en }]}>{row.en || ""}</Text>
                <Text style={[s.td,     { width: CALLOUT_COL.placement }]}>{row.placement || ""}</Text>
                <Text style={[s.td,     { width: CALLOUT_COL.bom }]}>{row.bomRef || ""}</Text>
                <Text style={[s.td,     { width: CALLOUT_COL.constr }]}>{row.constrRef || ""}</Text>
                <Text style={[s.td,     { flex: 1 }]}>{row.status || ""}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 6, color: C.gray6, marginTop: 6 }}>
            Callout IDs must match labels on technical sketch.
          </Text>
        </View>
      </View>
      <Footer label="Technical Sketch" styleInfo={styleInfo} />
    </Page>
  );
}

// PAGE 4 - FUSING & SEAMS

const FUSING_COL = { num: 18, zoneRU: 110, zoneEN: 110, type: 80, app: 100, approval: 70, status: 42 };
const SEAM_COL   = { num: 18, zoneRU: 120, seam: 50, finish: 100, remarks: 120 };

function FusingPage({ styleInfo, fusingItems, seamItems, constructionNotes }) {
  const fusings = fusingItems && fusingItems.length > 0 ? fusingItems : [
    { zoneRU: "Полочка / борт / лацкан", zoneEN: "Front / front edge / lapel", type: "As per buyer approval", application: "Full or partial as per pattern", approval: "Buyer approval", status: "To fill" },
    { zoneRU: "Подборт", zoneEN: "Front facing", type: "As per buyer approval", application: "Full piece", approval: "Buyer approval", status: "To fill" },
    { zoneRU: "Воротник и стойка", zoneEN: "Collar and stand", type: "As per buyer approval", application: "As per pattern", approval: "Buyer approval", status: "To fill" },
    { zoneRU: "Пройма", zoneEN: "Armhole", type: "As per buyer approval", application: "Stay fusing / tape", approval: "Buyer approval", status: "To fill" },
  ];

  const seams = seamItems && seamItems.length > 0 ? seamItems : [
    { zoneRU: "Боковые швы / Side seams",       seam: "1.5 cm", finish: "Overlocker / pressed open", remarks: "" },
    { zoneRU: "Плечевые швы / Shoulder seams",   seam: "1.2 cm", finish: "Overlocker / pressed to back", remarks: "" },
    { zoneRU: "Рукавный шов / Sleeve seam",      seam: "1.5 cm", finish: "Overlocker / pressed open", remarks: "" },
    { zoneRU: "Низ / Hem",                        seam: "4.0 cm", finish: "Hand stitch / blind hem", remarks: "" },
  ];

  const notes = constructionNotes || [];

  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={s.inner}>
        {/* FUSING MAP */}
        <Text style={s.sectionTitle}>Fusing Map / Карта проклейки</Text>
        <View style={[s.table, { marginBottom: 14 }]}>
          <View style={s.tHeadRow}>
            <Text style={[s.th, { width: FUSING_COL.num }]}>#</Text>
            <Text style={[s.th, { width: FUSING_COL.zoneRU }]}>Zone RU</Text>
            <Text style={[s.th, { width: FUSING_COL.zoneEN }]}>Zone EN</Text>
            <Text style={[s.th, { width: FUSING_COL.type }]}>Fusible type</Text>
            <Text style={[s.th, { width: FUSING_COL.app }]}>Application</Text>
            <Text style={[s.th, { width: FUSING_COL.approval }]}>Approval</Text>
            <Text style={[s.th, { width: FUSING_COL.status }]}>Status</Text>
            <Text style={[s.th, { flex: 1 }]}>Remarks</Text>
          </View>
          {fusings.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
              <Text style={[s.td, { width: FUSING_COL.num }]}>{i + 1}</Text>
              <Text style={[s.td, { width: FUSING_COL.zoneRU }]}>{row.zoneRU || ""}</Text>
              <Text style={[s.td, { width: FUSING_COL.zoneEN }]}>{row.zoneEN || ""}</Text>
              <Text style={[s.td, { width: FUSING_COL.type }]}>{row.type || ""}</Text>
              <Text style={[s.td, { width: FUSING_COL.app }]}>{row.application || ""}</Text>
              <Text style={[s.td, { width: FUSING_COL.approval }]}>{row.approval || ""}</Text>
              <Text style={[s.td, { width: FUSING_COL.status }]}>{row.status || ""}</Text>
              <Text style={[s.td, { flex: 1 }]}>{row.remarks || ""}</Text>
            </View>
          ))}
        </View>

        {/* SEAM ALLOWANCES + CONSTRUCTION NOTES side by side */}
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View style={{ flex: 1.2 }}>
            <Text style={s.sectionTitle}>Seam Allowances / Припуски на швы</Text>
            <View style={s.table}>
              <View style={s.tHeadRow}>
                <Text style={[s.th, { width: SEAM_COL.num }]}>#</Text>
                <Text style={[s.th, { width: SEAM_COL.zoneRU }]}>Zone / Шов</Text>
                <Text style={[s.th, { width: SEAM_COL.seam }]}>SA cm</Text>
                <Text style={[s.th, { width: SEAM_COL.finish }]}>Finish</Text>
                <Text style={[s.th, { flex: 1 }]}>Remarks</Text>
              </View>
              {seams.map((row, i) => (
                <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
                  <Text style={[s.td, { width: SEAM_COL.num }]}>{i + 1}</Text>
                  <Text style={[s.td, { width: SEAM_COL.zoneRU }]}>{row.zoneRU || ""}</Text>
                  <Text style={[s.tdCode, { width: SEAM_COL.seam }]}>{row.seam || ""}</Text>
                  <Text style={[s.td, { width: SEAM_COL.finish }]}>{row.finish || ""}</Text>
                  <Text style={[s.td, { flex: 1 }]}>{row.remarks || ""}</Text>
                </View>
              ))}
            </View>
          </View>

          {notes.length > 0 && (
            <View style={{ flex: 0.8 }}>
              <Text style={s.sectionTitle}>Key Construction Notes</Text>
              {notes.map((n, i) => (
                <View key={i} style={{ flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.gray3 }}>
                  <Text style={{ fontSize: 6.5, color: C.gold, fontFamily: FONT_BOLD, width: 16 }}>{i + 1}</Text>
                  <Text style={{ fontSize: 7, color: C.black, flex: 1 }}>{n}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <Footer label="Fusing & Seams" styleInfo={styleInfo} />
    </Page>
  );
}

// PAGE 8 - LABELS & PACKING

const LABEL_COL = { num: 18, itemRU: 110, itemEN: 110, placement: 110, qty: 30, attach: 70, approval: 80, status: 42 };
const PACK_COL  = { num: 18, itemEN: 140, spec: 200, qty: 60, unit: 40, status: 42 };

function LabelsPackingPage({ styleInfo, labelItems, packingItems }) {
  const labels = labelItems && labelItems.length > 0 ? labelItems : [
    { itemRU: "Основная этикетка", itemEN: "Main label", placement: "Back neck / inside", qty: "1", attachment: "Sewn", approval: "Buyer artwork", status: "To fill" },
    { itemRU: "Размерник", itemEN: "Size label", placement: "With main / care label", qty: "1", attachment: "Sewn", approval: "Buyer artwork", status: "To fill" },
    { itemRU: "Составник / уходник", itemEN: "Care / content label", placement: "Inside seam or as per buyer", qty: "1", attachment: "Sewn", approval: "Buyer artwork", status: "To fill" },
    { itemRU: "Вешалка", itemEN: "Hanger loop", placement: "Back neck inside", qty: "1", attachment: "Sewn", approval: "Buyer approval", status: "To fill" },
    { itemRU: "Штрих-код / ярлык", itemEN: "Barcode / price tag", placement: "As per buyer", qty: "1", attachment: "Hang tag pin", approval: "Buyer artwork", status: "To fill" },
  ];

  const packings = packingItems && packingItems.length > 0 ? packingItems : [
    { itemEN: "Polybag", spec: "Individual polybag, size as per garment", qty: "1 per pcs", unit: "pcs", status: "To fill" },
    { itemEN: "Carton box", spec: "As per buyer spec — qty per carton TBC", qty: "TBC", unit: "pcs", status: "To fill" },
    { itemEN: "Hang tag", spec: "Brand hang tag — artwork by buyer", qty: "1 per pcs", unit: "pcs", status: "To fill" },
    { itemEN: "Tissue paper", spec: "If required by buyer", qty: "TBC", unit: "sheets", status: "To fill" },
  ];

  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={s.inner}>
        {/* LABEL PLACEMENT */}
        <Text style={s.sectionTitle}>Label Placement / Размещение маркировки</Text>
        <View style={[s.table, { marginBottom: 16 }]}>
          <View style={s.tHeadRow}>
            <Text style={[s.th, { width: LABEL_COL.num }]}>#</Text>
            <Text style={[s.th, { width: LABEL_COL.itemRU }]}>Item RU</Text>
            <Text style={[s.th, { width: LABEL_COL.itemEN }]}>Item EN</Text>
            <Text style={[s.th, { width: LABEL_COL.placement }]}>Placement</Text>
            <Text style={[s.th, { width: LABEL_COL.qty, textAlign: "center" }]}>Qty</Text>
            <Text style={[s.th, { width: LABEL_COL.attach }]}>Attachment</Text>
            <Text style={[s.th, { width: LABEL_COL.approval }]}>Approval</Text>
            <Text style={[s.th, { width: LABEL_COL.status }]}>Status</Text>
            <Text style={[s.th, { flex: 1 }]}>Remarks</Text>
          </View>
          {labels.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
              <Text style={[s.td, { width: LABEL_COL.num }]}>{i + 1}</Text>
              <Text style={[s.td, { width: LABEL_COL.itemRU }]}>{row.itemRU || ""}</Text>
              <Text style={[s.td, { width: LABEL_COL.itemEN }]}>{row.itemEN || ""}</Text>
              <Text style={[s.td, { width: LABEL_COL.placement }]}>{row.placement || ""}</Text>
              <Text style={[s.tdNum, { width: LABEL_COL.qty }]}>{row.qty || ""}</Text>
              <Text style={[s.td, { width: LABEL_COL.attach }]}>{row.attachment || ""}</Text>
              <Text style={[s.td, { width: LABEL_COL.approval }]}>{row.approval || ""}</Text>
              <Text style={[s.td, { width: LABEL_COL.status }]}>{row.status || ""}</Text>
              <Text style={[s.td, { flex: 1 }]}>{row.remarks || ""}</Text>
            </View>
          ))}
        </View>

        {/* PACKING */}
        <Text style={s.sectionTitle}>Packing / Упаковка</Text>
        <View style={s.table}>
          <View style={s.tHeadRow}>
            <Text style={[s.th, { width: PACK_COL.num }]}>#</Text>
            <Text style={[s.th, { width: PACK_COL.itemEN }]}>Item</Text>
            <Text style={[s.th, { width: PACK_COL.spec }]}>Specification</Text>
            <Text style={[s.th, { width: PACK_COL.qty }]}>Qty</Text>
            <Text style={[s.th, { width: PACK_COL.unit }]}>Unit</Text>
            <Text style={[s.th, { width: PACK_COL.status }]}>Status</Text>
            <Text style={[s.th, { flex: 1 }]}>Remarks</Text>
          </View>
          {packings.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
              <Text style={[s.td, { width: PACK_COL.num }]}>{i + 1}</Text>
              <Text style={[s.td, { width: PACK_COL.itemEN }]}>{row.itemEN || ""}</Text>
              <Text style={[s.td, { width: PACK_COL.spec }]}>{row.spec || ""}</Text>
              <Text style={[s.td, { width: PACK_COL.qty }]}>{row.qty || ""}</Text>
              <Text style={[s.td, { width: PACK_COL.unit }]}>{row.unit || ""}</Text>
              <Text style={[s.td, { width: PACK_COL.status }]}>{row.status || ""}</Text>
              <Text style={[s.td, { flex: 1 }]}>{row.remarks || ""}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 6, color: C.gray6, marginTop: 8 }}>
          Artwork and exact label placement confirmed by buyer. Packing spec subject to buyer approval.
        </Text>
      </View>
      <Footer label="Labels & Packing" styleInfo={styleInfo} />
    </Page>
  );
}

// PAGE 9 - FILE HANDOFF

const FH_COL = { num: 18, type: 110, name: 160, required: 50, status: 50, owner: 72, date: 60 };

function FileHandoffPage({ styleInfo, files }) {
  const rows = files && files.length > 0 ? files : [
    { type: "Technical sketch", name: "drawing.png", required: "Yes", status: "Sent", owner: "Designer", date: "", notes: "Front/back view. Add side/inside if needed" },
    { type: "DXF pattern / Лекала DXF", name: "[style]_[size].dxf", required: "Yes", status: "To fill", owner: "Pattern maker", date: "", notes: "Confirm DXF units and seam allowance" },
    { type: "RUL grading / Градация", name: "[style]_[size].rul", required: "Yes", status: "To fill", owner: "Pattern maker", date: "", notes: "Rule file for grading" },
    { type: "PDF pattern check", name: "[style]_check.pdf", required: "Recommended", status: "To fill", owner: "Pattern maker", date: "", notes: "Recommended for checking DXF import" },
    { type: "Measurement chart", name: "This workbook / tech pack", required: "Yes", status: "To fill", owner: "Technologist", date: "", notes: "Fill all sizes before sending" },
    { type: "Approved sample photos", name: "sample_photos.zip", required: "If available", status: "To fill", owner: "Designer", date: "", notes: "All angles, details, inside view" },
  ];

  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={s.inner}>
        <Text style={s.sectionTitle}>File Handoff / Передаваемые файлы</Text>
        <View style={s.table}>
          <View style={s.tHeadRow}>
            <Text style={[s.th, { width: FH_COL.num }]}>#</Text>
            <Text style={[s.th, { width: FH_COL.type }]}>File type</Text>
            <Text style={[s.th, { width: FH_COL.name }]}>File name</Text>
            <Text style={[s.th, { width: FH_COL.required }]}>Required</Text>
            <Text style={[s.th, { width: FH_COL.status }]}>Status</Text>
            <Text style={[s.th, { width: FH_COL.owner }]}>Owner</Text>
            <Text style={[s.th, { width: FH_COL.date }]}>Date</Text>
            <Text style={[s.th, { flex: 1 }]}>Notes</Text>
          </View>
          {rows.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
              <Text style={[s.td, { width: FH_COL.num }]}>{i + 1}</Text>
              <Text style={[s.td, { width: FH_COL.type }]}>{row.type || ""}</Text>
              <Text style={[s.tdCode, { width: FH_COL.name }]}>{row.name || ""}</Text>
              <Text style={[s.td, { width: FH_COL.required }]}>{row.required || ""}</Text>
              <Text style={[s.td, { width: FH_COL.status }]}>{row.status || ""}</Text>
              <Text style={[s.td, { width: FH_COL.owner }]}>{row.owner || ""}</Text>
              <Text style={[s.td, { width: FH_COL.date }]}>{row.date || ""}</Text>
              <Text style={[s.td, { flex: 1 }]}>{row.notes || ""}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 6, color: C.gray6, marginTop: 8 }}>
          All files to be sent together with this tech pack. DXF units: mm. Confirm seam allowance included/excluded before cutting.
        </Text>
      </View>
      <Footer label="File Handoff" styleInfo={styleInfo} />
    </Page>
  );
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// PAGE 3 вЂ" BOM
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

function BomPage({ styleInfo, bomItems }) {
  const items = bomItems || [];
  const types = [...new Set(items.map(i => i.type).filter(Boolean))];
  const FALLBACK_TYPES = ["Fabric", "Lining", "Pocketing", "Interlining", "Trim", "Label", "Packing"];
  const groupKeys = types.length > 0 ? types : FALLBACK_TYPES;
  const grouped = groupKeys.map(t => ({
    label: t,
    items: items.length > 0
      ? items.filter(i => i.type === t)
      : [{ nameRU: "-", nameEN: "As per buyer approval", placement: "", requirement: "", parameter: "", qty: "", unit: "", approval: "", status: "", remarks: "" }],
  })).filter(g => g.items.length > 0);

  let idx = 0;
  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={s.inner}>
        <Text style={s.sectionTitle}>Material BOM В· Bill of Materials / РњР°С‚РµСЂРёР°Р»С‹ Рё С„СѓСЂРЅРёС‚СѓСЂР°</Text>
        <View style={s.table}>
          <View style={s.tHeadRow}>
            <Text style={[s.th, { width: BOM_COL.num }]}>#</Text>
            <Text style={[s.th, { width: BOM_COL.type }]}>Type</Text>
            <Text style={[s.th, { width: BOM_COL.nameRU }]}>Наименование RU</Text>
            <Text style={[s.th, { width: BOM_COL.nameEN }]}>Item EN</Text>
            <Text style={[s.th, { width: BOM_COL.placement }]}>Placement</Text>
            <Text style={[s.th, { width: BOM_COL.requirement }]}>Requirement</Text>
            <Text style={[s.th, { width: BOM_COL.parameter }]}>Parameter</Text>
            <Text style={[s.th, { width: BOM_COL.qty, textAlign: "center" }]}>Qty</Text>
            <Text style={[s.th, { width: BOM_COL.unit, textAlign: "center" }]}>Unit</Text>
            <Text style={[s.th, { width: BOM_COL.approval }]}>Approval</Text>
            <Text style={[s.th, { width: BOM_COL.status }]}>Status</Text>
            <Text style={[s.th, { flex: 1 }]}>Remarks</Text>
          </View>
          {grouped.map(sec => (
            <View key={sec.label}>
              <GroupRow label={sec.label} />
              {sec.items.map(item => {
                const row = idx % 2 === 0 ? s.tRow : s.tRowAlt;
                const el = (
                  <View key={idx} style={row}>
                    <Text style={[s.td, { width: BOM_COL.num }]}>{idx + 1}</Text>
                    <Text style={[s.td, { width: BOM_COL.type }]}>{item.type || ""}</Text>
                    <Text style={[s.td, { width: BOM_COL.nameRU }]}>{item.nameRU || ""}</Text>
                    <Text style={[s.td, { width: BOM_COL.nameEN }]}>{item.nameEN || ""}</Text>
                    <Text style={[s.td, { width: BOM_COL.placement }]}>{item.placement || ""}</Text>
                    <Text style={[s.td, { width: BOM_COL.requirement }]}>{item.requirement || ""}</Text>
                    <Text style={[s.td, { width: BOM_COL.parameter }]}>{item.parameter || ""}</Text>
                    <Text style={[s.tdNum, { width: BOM_COL.qty }]}>{item.qty || "-"}</Text>
                    <Text style={[s.tdNum, { width: BOM_COL.unit }]}>{item.unit || "-"}</Text>
                    <Text style={[s.td, { width: BOM_COL.approval }]}>{item.approval || ""}</Text>
                    <Text style={[s.td, { width: BOM_COL.status }]}>{item.status || ""}</Text>
                    <Text style={[s.td, { flex: 1 }]}>{item.remarks || ""}</Text>
                  </View>
                );
                idx++;
                return el;
              })}
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 6.5, color: C.gray6, marginTop: 8 }}>
          Color, supplier and article number confirmed by buyer unless otherwise specified.
        </Text>
      </View>
      <Footer label="Material BOM" styleInfo={styleInfo} />
    </Page>
  );
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// PAGE 5 вЂ" MEASUREMENT SET
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

function MeasurementPage({ styleInfo, poms, sizes, baseSize }) {
  const mainPoms   = poms.filter(p => p.group === "main");
  const detailPoms = poms.filter(p => p.group === "detail");
  const totalWidth = COL.num + COL.code + COL.nameRU + COL.nameEN + sizes.length * COL.size + COL.tol;

  function HeadRow() {
    return (
      <View style={s.tHeadRow}>
        <Text style={[s.th,     { width: COL.num }]}>#</Text>
        <Text style={[s.th,     { width: COL.code }]}>Code</Text>
        <Text style={[s.th,     { width: COL.nameRU }]}>РќР°РёРјРµРЅРѕРІР°РЅРёРµ RU</Text>
        <Text style={[s.th,     { width: COL.nameEN }]}>Measure point EN</Text>
        {sizes.map(sz => (
          <Text key={sz} style={[sz === baseSize ? s.thBase : s.thSize, { width: COL.size }]}>{sz}</Text>
        ))}
        <Text style={[s.th, { width: COL.tol, textAlign: "center" }]}>Tol В±</Text>
      </View>
    );
  }

  function DataRow({ pom, idx }) {
    return (
      <View style={idx % 2 === 0 ? s.tRow : s.tRowAlt}>
        <Text style={[s.td,     { width: COL.num }]}>{idx + 1}</Text>
        <Text style={[s.tdCode, { width: COL.code }]}>{pom.code}</Text>
        <Text style={[s.td,     { width: COL.nameRU }]}>{pom.nameRU}</Text>
        <Text style={[s.td,     { width: COL.nameEN }]}>{pom.nameEN}</Text>
        {sizes.map(sz => {
          const i = ALL_SIZES.indexOf(sz);
          return (
            <Text key={sz} style={[sz === baseSize ? s.tdBase : s.tdNum, { width: COL.size }]}>
              {fmt(i !== -1 ? pom.values?.[i] : null)}
            </Text>
          );
        })}
        <Text style={[s.tdTol, { width: COL.tol }]}>
          {pom.tolPlus != null ? `В±${pom.tolPlus}` : "-"}
        </Text>
      </View>
    );
  }

  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={s.inner}>
        <Text style={s.sectionTitle}>Measurement Set / РўР°Р±Р»РёС†Р° РёР·РјРµСЂРµРЅРёР№</Text>
        <View style={s.table}>
          <HeadRow />
          {mainPoms.length > 0 && <GroupRow label="Main measurements" totalWidth={totalWidth} />}
          {mainPoms.map((p, i) => <DataRow key={p.code} pom={p} idx={i} />)}
          {detailPoms.length > 0 && <GroupRow label="Detail measurements" totalWidth={totalWidth} />}
          {detailPoms.map((p, i) => <DataRow key={p.code} pom={p} idx={i} />)}
        </View>
        <Text style={{ fontSize: 6.5, color: C.gray6, marginTop: 8 }}>
          UOM: cm В· Flat finished garment measurements В· Base size: {baseSize}
        </Text>
      </View>
      <Footer label="Measurement Set" styleInfo={styleInfo} />
    </Page>
  );
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// PAGE 6 вЂ" PATTERN PIECES
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

function PatternPage({ styleInfo, patternPieces }) {
  const pieces = patternPieces || [];
  const sectionKeys = [...new Set(pieces.map(p => p.section).filter(Boolean))];
  const FALLBACK = ["Shell / Верх", "Lining / Подкладка", "Fusing / Проклейка"];
  const groupKeys = sectionKeys.length > 0 ? sectionKeys : FALLBACK;

  const grouped = groupKeys.map(sec => ({
    label: sec,
    items: pieces.length > 0
      ? pieces.filter(p => p.section === sec)
      : [{ dxfName: "-", section: sec, nameRU: "To be filled", shortRU: "", nameEN: "To be filled", shortEN: "", qty: "1+0", matRU: "", matEN: "", remarks: "" }],
  })).filter(g => g.items.length > 0);

  let idx = 0;
  return (
    <Page size="A4" orientation="landscape" style={s.pageLandscape}>
      <TopBand styleInfo={styleInfo} />
      <View style={s.inner}>
        <Text style={s.sectionTitle}>Pattern Pieces / Детали лекал</Text>
        <View style={s.table}>
          <View style={s.tHeadRow}>
            <Text style={[s.th, { width: PP_COL.num }]}>#</Text>
            <Text style={[s.th, { width: PP_COL.dxf }]}>DXF</Text>
            <Text style={[s.th, { width: PP_COL.section }]}>Section / Раздел</Text>
            <Text style={[s.th, { width: PP_COL.nameRU }]}>Полное название RU</Text>
            <Text style={[s.th, { width: PP_COL.shortRU }]}>Кратко RU</Text>
            <Text style={[s.th, { width: PP_COL.nameEN }]}>Full name EN</Text>
            <Text style={[s.th, { width: PP_COL.shortEN }]}>Short EN</Text>
            <Text style={[s.th, { width: PP_COL.qty, textAlign: "center" }]}>Qty</Text>
            <Text style={[s.th, { width: PP_COL.matRU }]}>Material RU</Text>
            <Text style={[s.th, { flex: 1 }]}>Material EN</Text>
          </View>
          {grouped.map(sec => (
            <View key={sec.label}>
              <GroupRow label={sec.label} />
              {sec.items.map(item => {
                const el = (
                  <View key={idx} style={idx % 2 === 0 ? s.tRow : s.tRowAlt}>
                    <Text style={[s.td, { width: PP_COL.num }]}>{idx + 1}</Text>
                    <Text style={[s.tdCode, { width: PP_COL.dxf }]}>{item.dxfName || ""}</Text>
                    <Text style={[s.td, { width: PP_COL.section }]}>{item.section || ""}</Text>
                    <Text style={[s.td, { width: PP_COL.nameRU }]}>{item.nameRU || ""}</Text>
                    <Text style={[s.td, { width: PP_COL.shortRU }]}>{item.shortRU || ""}</Text>
                    <Text style={[s.td, { width: PP_COL.nameEN }]}>{item.nameEN || ""}</Text>
                    <Text style={[s.td, { width: PP_COL.shortEN }]}>{item.shortEN || ""}</Text>
                    <Text style={[s.tdNum, { width: PP_COL.qty }]}>{item.qty || "-"}</Text>
                    <Text style={[s.td, { width: PP_COL.matRU }]}>{item.matRU || item.material || ""}</Text>
                    <Text style={[s.td, { flex: 1 }]}>{item.matEN || ""}</Text>
                  </View>
                );
                idx++;
                return el;
              })}
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 6.5, color: C.gray6, marginTop: 8 }}>
          Names must match pattern piece names in DXF/PDF files. · DXF-AAMA format. · Qty: 1+0 = single, 1+1 = mirrored pair.
        </Text>
      </View>
      <Footer label="Pattern Pieces" styleInfo={styleInfo} />
    </Page>
  );
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// MAIN DOCUMENT EXPORT
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

export function PomPdfDocument({
  styleInfo, poms, sizes, baseSize,
  sketchFront, sketchBack, sketchDiagram, callouts,
  bomItems, fusingItems, seamItems, constructionNotes,
  patternPieces, labelItems, packingItems, files,
}) {
  const info = { ...styleInfo, baseSize, sizes };

  return (
    <Document>
      {/* 01 Cover */}
      <CoverPage styleInfo={info} sketchFront={sketchFront} sketchBack={sketchBack} />

      {/* 02 Technical Sketch + Callouts */}
      <SketchPage
        styleInfo={info}
        sketchFront={sketchFront}
        sketchBack={sketchBack}
        sketchDiagram={sketchDiagram}
        callouts={callouts}
      />

      {/* 03 Material BOM */}
      <BomPage styleInfo={info} bomItems={bomItems} />

      {/* 04 Fusing & Seams */}
      <FusingPage
        styleInfo={info}
        fusingItems={fusingItems}
        seamItems={seamItems}
        constructionNotes={constructionNotes}
      />

      {/* 05 Measurement Set */}
      <MeasurementPage styleInfo={info} poms={poms} sizes={sizes} baseSize={baseSize} />

      {/* 06 Pattern Pieces */}
      <PatternPage styleInfo={info} patternPieces={patternPieces} />

      {/* 07 Technical Details - placeholder */}
      <PlaceholderPage
        styleInfo={info}
        label="Technical Details"
        sublabel="Stitch types / SPI / Special operations / Construction diagrams"
      />

      {/* 08 Labels & Packing */}
      <LabelsPackingPage styleInfo={info} labelItems={labelItems} packingItems={packingItems} />

      {/* 09 File Handoff */}
      <FileHandoffPage styleInfo={info} files={files} />
    </Document>
  );
}

