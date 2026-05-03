import { useState } from "react";

const NAV_KEYS = ["services", "howItWorks", "forWhom", "products", "contact"];
const NAV_HREFS = { services: "#services", howItWorks: "#how", forWhom: "#for-whom", products: "#products", contact: "#contact" };

export default function Header({ t, lang, setLang, theme, toggleTheme }) {
  const [open, setOpen] = useState(false);

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "var(--header-bg)", backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        {/* Logo */}
        <a href="#" style={{ fontSize: 17, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em" }}>
          3D LASTIQUE
        </a>

        {/* Desktop nav */}
        <nav style={{ display: "flex", gap: 24, alignItems: "center" }} className="desktop-nav">
          {NAV_KEYS.slice(0, -1).map(k => (
            <a key={k} href={NAV_HREFS[k]} className="nav-link">{t.nav[k]}</a>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} title="Toggle theme" style={{
            background: "transparent", border: "1px solid var(--border2)", borderRadius: 4,
            color: "var(--text3)", fontSize: 15, padding: "4px 9px", lineHeight: 1,
            transition: "border-color 0.15s",
          }}>
            {theme === "dark" ? "☀" : "☾"}
          </button>

          {/* Lang toggle */}
          <button onClick={() => setLang(lang === "ru" ? "en" : "ru")} style={{
            background: "transparent", border: "1px solid var(--border2)", borderRadius: 4,
            color: "var(--text3)", fontSize: 12, padding: "4px 10px", letterSpacing: "0.1em",
            transition: "border-color 0.15s",
          }}>
            {lang === "ru" ? "EN" : "RU"}
          </button>

          {/* CTA */}
          <a href="#contact" className="header-cta">{t.nav.contact}</a>

          {/* Burger */}
          <button onClick={() => setOpen(o => !o)} className="burger" style={{
            background: "none", border: "none", color: "var(--text3)", fontSize: 20, lineHeight: 1,
            display: "none",
          }}>☰</button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", padding: "16px 24px" }}>
          {NAV_KEYS.map(k => (
            <a key={k} href={NAV_HREFS[k]} onClick={() => setOpen(false)} style={{
              display: "block", padding: "10px 0", fontSize: 13, color: "var(--text2)",
              borderBottom: "1px solid var(--border)",
            }}>{t.nav[k]}</a>
          ))}
        </div>
      )}

      <style>{`
        .nav-link {
          font-size: 13px;
          color: var(--text3);
          transition: color 0.15s;
          font-family: var(--font);
        }
        .nav-link:hover { color: var(--accent); }
        .header-cta {
          background: var(--accent);
          color: var(--accent-text);
          font-size: 12px;
          font-weight: 700;
          padding: 8px 18px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          transition: opacity 0.15s;
          font-family: var(--font);
        }
        .header-cta:hover { opacity: 0.85; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .burger { display: block !important; }
        }
      `}</style>
    </header>
  );
}
