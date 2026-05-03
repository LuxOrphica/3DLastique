const CLIENT_VARS = ["--svc-1", "--svc-2", "--svc-3", "--svc-4", "--svc-5"];
const FORMAT_VARS = ["--fmt-1", "--fmt-2", "--fmt-3", "--fmt-4"];

export default function ForWhom({ t }) {
  const f = t.forWhom;

  return (
    <section id="for-whom">
      <div className="container">
        <div className="section-label">3D Lastique</div>
        <div className="section-title">{f.title}</div>
        <div className="section-sub">{f.sub}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 40 }}>
          {f.clients.map((c, i) => (
            <div key={c.name} style={{
              background: "var(--bg2)",
              border: "1px solid var(--border2)",
              borderTop: `3px solid var(${CLIENT_VARS[i]})`,
              borderRadius: 8, padding: "14px 12px", position: "relative",
            }}>
              {c.hot && (
                <div style={{
                  position: "absolute", top: -1, right: 10,
                  background: `var(${CLIENT_VARS[i]})`, color: "var(--svc-text)",
                  fontSize: 9, padding: "2px 7px",
                  borderRadius: "0 0 4px 4px", fontWeight: 700, letterSpacing: "0.1em",
                }}>HOT</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: `var(${CLIENT_VARS[i]})`, marginBottom: 6 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "var(--text4)", marginBottom: 10, lineHeight: 1.4 }}>{c.pain}</div>
              {c.services.map(s => (
                <div key={s} style={{
                  fontSize: 11, color: "var(--text3)",
                  borderTop: "1px solid var(--border)", paddingTop: 5, marginTop: 5,
                }}>{s}</div>
              ))}
            </div>
          ))}
        </div>

        <div className="section-label" style={{ marginBottom: 14 }}>Formats</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {f.formats.map((fm, i) => (
            <div key={fm.title} style={{
              background: "var(--bg2)", border: "1px solid var(--border2)",
              borderRadius: 8, padding: "16px",
            }}>
              <div style={{ fontSize: 22, color: `var(${FORMAT_VARS[i]})`, marginBottom: 8 }}>{fm.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{fm.title}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.5 }}>{fm.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
