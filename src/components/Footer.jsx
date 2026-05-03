export default function Footer({ t }) {
  const f = t.footer;
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      padding: "24px 0",
      background: "var(--bg2)",
    }}>
      <div className="container" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }}>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>{f.copy}</span>
        <span style={{ fontSize: 11, color: "var(--text4)" }}>{f.tagline}</span>
      </div>
    </footer>
  );
}
