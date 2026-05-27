import { useState } from "react";
import { useLocation } from "react-router-dom";

const NAV_KEYS = ["services", "howItWorks", "forWhom", "products", "contact"];
const NAV_HREFS = { services: "#services", howItWorks: "#how", forWhom: "#for-whom", products: "#products", contact: "#contact" };
const TECHPACK_HREF = "/tools/techpack";
const TECHPACK_HUB_HREF = "/tools/techpack-hub";

export default function Header({ t, lang, setLang, theme, toggleTheme }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

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
          {pathname === "/" && NAV_KEYS.slice(0, -1).map(k => (
            <a key={k} href={NAV_HREFS[k]} className="nav-link">{t.nav[k]}</a>
          ))}
          <a href="/tools/pom" className={`nav-link${pathname === "/tools/pom" ? " nav-link-active" : ""}`}>Табель мер</a>
          <a href="/tools/nodes" className={`nav-link${pathname === "/tools/nodes" ? " nav-link-active" : ""}`}>Узлы</a>
          <a href="/tools/vse" className={`nav-link${pathname === "/tools/vse" ? " nav-link-active" : ""}`}>VSE</a>
          <a href={TECHPACK_HUB_HREF} className={`nav-link${pathname === TECHPACK_HUB_HREF ? " nav-link-active" : ""}`}>Tech Pack Hub</a>
          <a href={TECHPACK_HREF} className={`nav-link nav-link-techpack${pathname === "/tools/techpack" ? " nav-link-techpack-active" : ""}`}>Техпак</a>
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

          {/* CTA — only on landing */}
          {pathname === "/" && <a href="#contact" className="header-cta">{t.nav.contact}</a>}

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
          {pathname === "/" && NAV_KEYS.map(k => (
            <a key={k} href={NAV_HREFS[k]} onClick={() => setOpen(false)} style={{
              display: "block", padding: "10px 0", fontSize: 13, color: "var(--text2)",
              borderBottom: "1px solid var(--border)",
            }}>{t.nav[k]}</a>
          ))}
          <a href="/tools/pom" onClick={() => setOpen(false)} style={{
            display: "block", padding: "10px 0", fontSize: 13, color: "var(--text2)",
            borderBottom: "1px solid var(--border)",
          }}>Табель мер</a>
          <a href="/tools/nodes" onClick={() => setOpen(false)} style={{
            display: "block", padding: "10px 0", fontSize: 13, color: "var(--text2)",
            borderBottom: "1px solid var(--border)",
          }}>Узлы</a>
          <a href={TECHPACK_HUB_HREF} onClick={() => setOpen(false)} style={{
            display: "block", padding: "10px 0", fontSize: 13, color: "var(--text2)",
            borderBottom: "1px solid var(--border)",
          }}>Tech Pack Hub</a>
          <a href={TECHPACK_HREF} onClick={() => setOpen(false)} style={{
            display: "block", padding: "10px 0", fontSize: 13, color: "var(--accent)",
            borderBottom: "1px solid var(--border)", fontWeight: 600,
          }}>Техпак</a>
        </div>
      )}

      <style>{`
        .nav-link {
          font-size: 15px;
          color: var(--text3);
          transition: color 0.15s;
          font-family: var(--font);
        }
        .nav-link:hover { color: var(--accent); }
        .nav-link-active { color: var(--accent) !important; border-bottom: 2px solid var(--accent); padding-bottom: 2px; }
        .nav-link-techpack { color: var(--accent); font-weight: 600; border: 1px solid var(--accent); border-radius: 4px; padding: 5px 12px; }
        .nav-link-techpack:hover { opacity: 0.8; }
        .nav-link-techpack-active { background: var(--accent); color: var(--accent-text) !important; }
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
