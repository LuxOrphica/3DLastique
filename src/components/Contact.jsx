const TALLY_URL = "https://tally.so/r/eqAp80";

export default function Contact({ t }) {
  const c = t.contact;

  return (
    <section id="contact" style={{ borderBottom: "none" }}>
      <div className="container">
        <div className="section-label">3D Lastique</div>
        <div className="section-title">{c.title}</div>
        <div className="section-sub">{c.sub}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="contact-grid">
          <div style={{
            background: "var(--bg3)", border: "1px solid var(--accent)30",
            borderRadius: 10, padding: "32px 28px",
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            <div style={{ fontSize: 15, color: "var(--text3)", lineHeight: 1.7 }}>{c.sub}</div>
            <a href={TALLY_URL} target="_blank" rel="noopener noreferrer" className="contact-cta">
              {c.cta} →
            </a>
          </div>

          <div style={{
            background: "var(--bg2)", border: "1px solid var(--border2)",
            borderRadius: 10, padding: "32px 28px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div className="section-label" style={{ marginBottom: 4 }}>{c.or}</div>
            {c.socials.map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                className="social-link">
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>{s.label}</span>
                <span style={{ fontSize: 13, color: "var(--text4)" }}>{s.handle}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .contact-cta {
          background: var(--accent); color: var(--accent-text);
          font-weight: 700; font-size: 15px; padding: 16px 28px;
          border-radius: 5px; letter-spacing: 0.05em; text-align: center;
          display: block; transition: opacity 0.15s; font-family: var(--font);
        }
        .contact-cta:hover { opacity: 0.85; }
        .social-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-radius: 6px;
          border: 1px solid var(--border2); background: var(--bg4);
          transition: border-color 0.15s;
        }
        .social-link:hover { border-color: var(--accent); }
      `}</style>
    </section>
  );
}
