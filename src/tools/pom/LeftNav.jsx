import { useState, useEffect, useRef } from "react";

const SECTIONS = [
  { id: "cover", labelRU: "01 Паспорт", labelEN: "01 Cover", icon: "📋" },
  { id: "sketch", labelRU: "02 Эскиз", labelEN: "02 Sketch", icon: "✏️" },
  { id: "bom", labelRU: "03 BOM", labelEN: "03 BOM", icon: "📦" },
  { id: "pom", labelRU: "04 Размерная", labelEN: "04 POM", icon: "📏" },
  { id: "construction", labelRU: "05 Конструкция", labelEN: "05 Construction", icon: "🔧" },
  { id: "stitches", labelRU: "06 Строчки", labelEN: "06 Stitches", icon: "🧵" },
  { id: "labels", labelRU: "07 Маркировка", labelEN: "07 Labels", icon: "🏷️" },
  { id: "packaging", labelRU: "08 Упаковка", labelEN: "08 Packaging", icon: "📦" },
  { id: "testing", labelRU: "09 Тесты", labelEN: "09 Testing", icon: "✅" },
];

const STATUS_COLORS = {
  empty: "var(--nav-status-empty, #888)",
  partial: "var(--nav-status-partial, #E8A838)",
  complete: "var(--nav-status-complete, #29B473)",
  error: "var(--nav-status-error, #C8102E)",
};

function getSectionStatus(sectionId, techpackData) {
  switch (sectionId) {
    case "cover":
      const cover = techpackData.styleInfo || {};
      const coverFields = ["brand", "styleCode", "nameRU", "nameEN", "season", "factory", "specStage"];
      const filled = coverFields.filter(f => cover[f]).length;
      if (filled === 0) return "empty";
      if (filled === coverFields.length) return "complete";
      return "partial";
    case "sketch":
      return techpackData.sketchFront || techpackData.sketchBack ? "complete" : "empty";
    case "bom":
      return techpackData.bomItems?.length ? "complete" : "empty";
    case "pom":
      return techpackData.pomMeasurements?.length ? "complete" : "empty";
    case "construction":
      const hasConstruction = techpackData.fusingItems?.length ||
        techpackData.liningItems?.length ||
        techpackData.seamItems?.length ||
        techpackData.stitchItems?.length ||
        techpackData.selectedNodes?.length;
      return hasConstruction ? "complete" : "empty";
    case "stitches":
      return techpackData.stitchItems?.length ? "complete" : "empty";
    case "labels":
      return techpackData.labelItems?.length ? "complete" : "empty";
    case "packaging":
      return techpackData.packingItems?.length ? "complete" : "empty";
    case "testing":
      return techpackData.projectTests?.length ? "complete" : "empty";
    default:
      return "empty";
  }
}

export default function LeftNav({
  activeSection,
  onSectionChange,
  techpackData,
  ru,
  collapsed,
  onToggleCollapse,
}) {
  const navRef = useRef(null);
  const [scrollPositions, setScrollPositions] = useState({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (SECTIONS[idx]) onSectionChange(SECTIONS[idx].id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSectionChange]);

  const saveScrollPosition = (sectionId) => {
    const contentArea = document.querySelector(".techpack-content");
    if (contentArea) {
      setScrollPositions(prev => ({
        ...prev,
        [sectionId]: contentArea.scrollTop,
      }));
    }
  };

  const restoreScrollPosition = (sectionId) => {
    const contentArea = document.querySelector(".techpack-content");
    if (contentArea && scrollPositions[sectionId] !== undefined) {
      requestAnimationFrame(() => {
        contentArea.scrollTop = scrollPositions[sectionId];
      });
    }
  };

  const handleSectionClick = (sectionId) => {
    if (activeSection !== sectionId) {
      saveScrollPosition(activeSection);
      onSectionChange(sectionId);
      setTimeout(() => restoreScrollPosition(sectionId), 0);
    }
  };

  return (
    <aside
      ref={navRef}
      className={`techpack-leftnav${collapsed ? " collapsed" : ""}`}
      role="navigation"
      aria-label={ru ? "Разделы техпака" : "Techpack sections"}
    >
      {!collapsed && (
        <div className="techpack-nav-header">
          <span className="techpack-nav-title">{ru ? "Техпак" : "Techpack"}</span>
          <button
            className="techpack-nav-collapse"
            onClick={onToggleCollapse}
            aria-label={ru ? "Свернуть" : "Collapse"}
            title={ru ? "Свернуть панель" : "Collapse panel"}
          >
            ◀
          </button>
        </div>
      )}

      <nav className="techpack-nav-list">
        {SECTIONS.map((section, idx) => {
          const status = getSectionStatus(section.id, techpackData);
          const isActive = activeSection === section.id;
          const shortcut = idx < 9 ? idx + 1 : null;

          return (
            <button
              key={section.id}
              className={`techpack-nav-item${isActive ? " active" : ""}${status === "error" ? " has-error" : ""}`}
              onClick={() => handleSectionClick(section.id)}
              title={`${ru ? section.labelRU : section.labelEN}${shortcut ? ` (Ctrl+${shortcut})` : ""}`}
              style={{ "--nav-status-color": STATUS_COLORS[status] }}
            >
              <span className="techpack-nav-icon" aria-hidden="true">{section.icon}</span>
              {!collapsed && (
                <>
                  <span className="techpack-nav-label">
                    {ru ? section.labelRU : section.labelEN}
                  </span>
                  <span
                    className="techpack-nav-status"
                    style={{ background: STATUS_COLORS[status] }}
                    aria-label={
                      status === "empty" ? (ru ? "Пусто" : "Empty") :
                      status === "partial" ? (ru ? "Частично" : "Partial") :
                      status === "complete" ? (ru ? "Готово" : "Complete") :
                      (ru ? "Ошибка" : "Error")
                    }
                  />
                  {shortcut && !collapsed && (
                    <span className="techpack-nav-shortcut">Ctrl+{shortcut}</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="techpack-nav-footer">
          <div className="techpack-nav-legend">
            <span className="techpack-legend-item">
              <span className="techpack-legend-dot" style={{ background: STATUS_COLORS.empty }} />
              {ru ? "Пусто" : "Empty"}
            </span>
            <span className="techpack-legend-item">
              <span className="techpack-legend-dot" style={{ background: STATUS_COLORS.partial }} />
              {ru ? "Частично" : "Partial"}
            </span>
            <span className="techpack-legend-item">
              <span className="techpack-legend-dot" style={{ background: STATUS_COLORS.complete }} />
              {ru ? "Готово" : "Complete"}
            </span>
          </div>
        </div>
      )}

      <style>{`
        .techpack-leftnav {
          width: 260px;
          min-width: 260px;
          background: var(--bg);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          transition: width 0.2s ease, min-width 0.2s ease;
          z-index: 50;
        }
        .techpack-leftnav.collapsed {
          width: 64px;
          min-width: 64px;
        }
        .techpack-nav-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }
        .techpack-nav-title {
          font-weight: 700;
          font-size: 14px;
          color: var(--text);
          letter-spacing: 0.05em;
        }
        .techpack-nav-collapse {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 4px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text2);
          font-size: 12px;
        }
        .techpack-nav-collapse:hover {
          background: var(--bg3);
          border-color: var(--accent);
          color: var(--accent);
        }
        .techpack-nav-list {
          flex: 1;
          padding: 8px;
          overflow-y: auto;
        }
        .techpack-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          color: var(--text2);
          font-size: 13px;
          font-family: var(--font);
          transition: background 0.15s, color 0.15s;
          position: relative;
          white-space: nowrap;
        }
        .techpack-nav-item:hover {
          background: var(--bg2);
          color: var(--text);
        }
        .techpack-nav-item.active {
          background: var(--accent-bg, rgba(var(--accent-rgb), 0.1));
          color: var(--accent);
          font-weight: 600;
        }
        .techpack-nav-item::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 18px;
          border-radius: 0 3px 3px 0;
          background: var(--nav-status-color);
          opacity: 0.5;
        }
        .techpack-nav-item.active::before {
          opacity: 1;
          height: 24px;
        }
        .techpack-nav-item.has-error::before {
          background: var(--nav-status-error);
        }
        .techpack-nav-icon {
          font-size: 16px;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }
        .techpack-nav-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .techpack-nav-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .techpack-nav-shortcut {
          font-size: 10px;
          color: var(--text4);
          font-family: monospace;
          background: var(--bg2);
          padding: 2px 6px;
          border-radius: 3px;
        }
        .techpack-nav-footer {
          padding: 16px;
          border-top: 1px solid var(--border);
        }
        .techpack-nav-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 11px;
          color: var(--text3);
        }
        .techpack-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .techpack-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        @media (max-width: 1024px) {
          .techpack-leftnav {
            position: fixed;
            left: 0;
            top: 56px;
            height: calc(100vh - 56px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .techpack-leftnav.open {
            transform: translateX(0);
          }
          .techpack-leftnav.collapsed {
            width: 260px;
            min-width: 260px;
          }
        }
      `}</style>
    </aside>
  );
}