import { useState } from "react";

const SVC_VARS = ["--svc-1", "--svc-2", "--svc-3", "--svc-4", "--svc-5"];

export default function HowItWorks({ t }) {
  const h = t.howItWorks;
  const [active, setActive] = useState(0);
  const step = h.steps[active];
  const color = `var(${SVC_VARS[active]})`;

  return (
    <section id="how">
      <div className="container">
        <div className="section-label">3D Lastique</div>
        <div className="section-title">{h.title}</div>
        <div className="section-sub">{h.sub}</div>

        <div style={{ display: "flex", alignItems: "stretch", marginBottom: 32 }}>
          {h.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <button onClick={() => setActive(i)} className={`step-btn ${active === i ? "step-btn--active" : ""}`} data-idx={i}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{s.n}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>{s.label}</div>
              </button>
              {i < h.steps.length - 1 && (
                <div style={{ width: 24, height: 1, background: "var(--border2)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        <div style={{
          background: "var(--bg2)", border: `1px solid var(${SVC_VARS[active]})`,
          borderLeft: `3px solid var(${SVC_VARS[active]})`,
          borderRadius: 8, padding: "24px 28px",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 8 }}>
            {step.n} — {step.label}
          </div>
          <p style={{ fontSize: 16, color: "var(--text3)", lineHeight: 1.7 }}>{step.desc}</p>
        </div>
      </div>

      <style>{`
        .step-btn {
          flex: 1; border-radius: 6px; padding: 10px 8px;
          font-size: 12px; font-weight: 700; transition: all 0.15s;
          text-align: center; white-space: nowrap;
          font-family: var(--font); background: var(--bg2);
        }
        ${SVC_VARS.map((v, i) => `
          .step-btn[data-idx="${i}"] { border: 1px solid var(${v}); color: var(${v}); }
          .step-btn--active[data-idx="${i}"] { background: var(${v}); color: var(--svc-text); }
        `).join("")}
      `}</style>
    </section>
  );
}
