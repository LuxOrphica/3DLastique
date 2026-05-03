import { useState } from "react";

const SVC_VARS = ["--svc-1", "--svc-2", "--svc-3", "--svc-4", "--svc-5"];

export default function Services({ t }) {
  const s = t.services;
  const [active, setActive] = useState(0);
  const item = s.items[active];
  const color = `var(${SVC_VARS[active]})`;

  return (
    <section id="services">
      <div className="container">
        <div className="section-label">3D Lastique</div>
        <div className="section-title">{s.title}</div>
        <div className="section-sub">{s.sub}</div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {s.items.map((sv, i) => (
            <button key={sv.num} onClick={() => setActive(i)}
              className={`svc-tab ${active === i ? "svc-tab--active" : ""}`}
              data-idx={i}>
              {sv.num} {sv.title}
            </button>
          ))}
        </div>

        {/* Detail */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 260px", gap: 16 }} className="service-grid">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 8 }}>
              {item.title}
              <span style={{ fontSize: 13, color: "var(--text4)", fontWeight: 400, marginLeft: 10 }}>— {item.en}</span>
            </div>
            <p style={{ fontSize: 15, color: "var(--text3)", lineHeight: 1.7, marginBottom: 20, maxWidth: 520 }}>
              {item.desc}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {item.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 12, color,
                  border: `1px solid ${color}`,
                  borderRadius: 3, padding: "3px 10px", opacity: 0.7,
                }}>{tag}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 7, padding: 14 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Result</div>
              <div style={{ fontSize: 14, color: "var(--text2)" }}>{item.result}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["PRICE", item.price], ["TIME", item.time]].map(([label, val]) => (
                <div key={label} style={{
                  background: "var(--bg3)", border: `1px solid var(${SVC_VARS[active]})`,
                  borderRadius: 7, padding: "12px 10px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: 10, color: "var(--text4)", marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Package banner */}
        <div style={{
          marginTop: 36,
          background: "var(--bg3)", border: "1px solid var(--border2)",
          borderRadius: 8, padding: "18px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <span style={{ fontSize: 15, color: "var(--text2)" }}>{s.package}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{s.packagePrice}</span>
            <a href="#contact" className="pkg-cta">{t.nav.contact}</a>
          </div>
        </div>
      </div>

      <style>{`
        .svc-tab {
          border-radius: 20px; padding: 6px 16px;
          font-size: 13px; font-family: var(--font);
          transition: all 0.15s; cursor: pointer;
        }
        ${SVC_VARS.map((v, i) => `
          .svc-tab[data-idx="${i}"] {
            border: 1px solid var(${v});
            color: var(${v});
            background: transparent;
          }
          .svc-tab--active[data-idx="${i}"] {
            background: var(${v});
            color: var(--svc-text);
            font-weight: 700;
          }
        `).join("")}
        .pkg-cta {
          background: var(--accent); color: var(--accent-text);
          font-weight: 700; font-size: 13px; padding: 10px 22px;
          border-radius: 4px; letter-spacing: 0.05em;
          transition: opacity 0.15s; font-family: var(--font);
        }
        .pkg-cta:hover { opacity: 0.85; }
      `}</style>
    </section>
  );
}
