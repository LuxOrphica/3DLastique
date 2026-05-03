export default function Hero({ t }) {
  const h = t.hero;
  return (
    <section id="hero" style={{
      minHeight: "90vh", display: "flex", alignItems: "center",
      borderBottom: "1px solid var(--border)", padding: "80px 0",
    }}>
      <div className="container">
        <div style={{ maxWidth: 700 }}>
          <div className="section-label" style={{ marginBottom: 20 }}>{h.label}</div>

          <h1 style={{
            fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700,
            color: "var(--accent2)", lineHeight: 1.15, marginBottom: 24,
            letterSpacing: "-0.02em",
          }}>{h.title}</h1>

          <p style={{ fontSize: 17, color: "var(--text3)", lineHeight: 1.7, marginBottom: 40, maxWidth: 560 }}>
            {h.sub}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <a href="#contact" className="hero-cta">{h.cta}</a>
            <span style={{ fontSize: 13, color: "var(--text4)" }}>{h.ctaSub}</span>
          </div>
        </div>
      </div>

      <style>{`
        .hero-cta {
          background: var(--accent);
          color: var(--accent-text);
          font-weight: 700;
          font-size: 15px;
          padding: 14px 28px;
          border-radius: 5px;
          letter-spacing: 0.05em;
          transition: opacity 0.15s;
          display: inline-block;
          font-family: var(--font);
        }
        .hero-cta:hover { opacity: 0.85; }
      `}</style>
    </section>
  );
}
