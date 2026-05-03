const PROD_VARS = ["--fmt-1", "--fmt-2", "--fmt-4", "--svc-3"];

export default function Products({ t }) {
  const p = t.products;

  return (
    <section id="products">
      <div className="container">
        <div className="section-label">3D Lastique</div>
        <div className="section-title">{p.title}</div>
        <div className="section-sub">{p.sub}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {p.cats.map((cat, i) => (
            <div key={cat.name} style={{
              background: "var(--bg2)", border: "1px solid var(--border2)",
              borderTop: `3px solid var(${PROD_VARS[i]})`,
              borderRadius: 8, padding: 16, position: "relative",
            }}>
              <div style={{
                position: "absolute", top: 12, right: 12,
                fontSize: 10, color: "var(--text4)",
                border: "1px solid var(--border2)",
                borderRadius: 10, padding: "2px 8px", letterSpacing: "0.1em",
              }}>{p.comingSoon}</div>

              <div style={{ fontSize: 15, fontWeight: 700, color: `var(${PROD_VARS[i]})`, marginBottom: 4 }}>{cat.name}</div>
              <div style={{ fontSize: 11, color: "var(--text4)", marginBottom: 12 }}>{cat.where}</div>
              {cat.items.map(item => (
                <div key={item} style={{
                  fontSize: 13, color: "var(--text3)",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 5, marginBottom: 5,
                }}>{item}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
