import { useState } from "react";
import "./EditableTable.css";

/**
 * columns: [{ key, label, width?, type?: 'text'|'select'|'textarea', options?: [] }]
 * rows: array of objects
 * onChange: (newRows) => void
 * defaultRow: object with empty values
 */
export function EditableTable({ columns, rows, onChange, defaultRow, emptyLabel, lang = "ru" }) {
  const [editIdx, setEditIdx] = useState(null);
  const [draft, setDraft] = useState(null);

  const startEdit = (idx) => {
    setEditIdx(idx);
    setDraft({ ...rows[idx] });
  };

  const startAdd = () => {
    const newRow = { ...defaultRow, _id: Date.now() };
    const newRows = [...rows, newRow];
    onChange(newRows);
    setEditIdx(newRows.length - 1);
    setDraft({ ...newRow });
  };

  const commitEdit = () => {
    if (editIdx === null) return;
    const newRows = rows.map((r, i) => i === editIdx ? { ...draft } : r);
    onChange(newRows);
    setEditIdx(null);
    setDraft(null);
  };

  const cancelEdit = () => {
    // if it was a brand-new empty row, remove it
    const row = rows[editIdx];
    const isEmpty = row && columns.every(c => !row[c.key]);
    if (isEmpty) {
      onChange(rows.filter((_, i) => i !== editIdx));
    }
    setEditIdx(null);
    setDraft(null);
  };

  const deleteRow = (idx) => {
    if (editIdx === idx) { setEditIdx(null); setDraft(null); }
    onChange(rows.filter((_, i) => i !== idx));
  };

  const moveRow = (idx, dir) => {
    const newRows = [...rows];
    const target = idx + dir;
    if (target < 0 || target >= newRows.length) return;
    [newRows[idx], newRows[target]] = [newRows[target], newRows[idx]];
    if (editIdx === idx) setEditIdx(target);
    else if (editIdx === target) setEditIdx(idx);
    onChange(newRows);
  };

  return (
    <div className="et-wrap">
      <table className="et-table">
        <thead>
          <tr>
            <th className="et-th et-num">#</th>
            {columns.map(c => (
              <th key={c.key} className="et-th" style={c.width ? { width: c.width } : {}}>
                {c.label}
              </th>
            ))}
            <th className="et-th et-actions-head"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 2} className="et-empty">
                {emptyLabel || "No rows yet — click + Add to start"}
              </td>
            </tr>
          )}
          {rows.map((row, idx) => (
            editIdx === idx ? (
              <tr key={row._id ?? idx} className="et-row et-row-editing">
                <td className="et-td et-num">{idx + 1}</td>
                {columns.map(c => (
                  <td key={c.key} className="et-td">
                    {c.type === "select" ? (
                      <select
                        className="et-input"
                        value={draft[c.key] ?? ""}
                        onChange={e => setDraft(d => ({ ...d, [c.key]: e.target.value }))}
                      >
                        <option value="">—</option>
                        {(c.options || []).map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : c.type === "textarea" ? (
                      <textarea
                        className="et-input et-textarea"
                        value={draft[c.key] ?? ""}
                        onChange={e => setDraft(d => ({ ...d, [c.key]: e.target.value }))}
                        rows={2}
                      />
                    ) : c.type === "file" ? (
                      <label className="et-file-btn">
                        <input
                          type="file"
                          style={{ display: "none" }}
                          onChange={e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const url = URL.createObjectURL(file);
                            setDraft(d => ({ ...d, [c.key]: { name: file.name, url } }));
                          }}
                        />
                        {draft[c.key]?.name
                          ? <span className="et-file-name">📎 {draft[c.key].name}</span>
                          : <span className="et-file-placeholder">{lang === "en" ? "Choose file…" : "Выбрать файл…"}</span>
                        }
                      </label>
                    ) : (
                      <input
                        className="et-input"
                        value={draft[c.key] ?? ""}
                        onChange={e => setDraft(d => ({ ...d, [c.key]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                      />
                    )}
                  </td>
                ))}
                <td className="et-td et-actions">
                  <button className="et-btn et-save" onClick={commitEdit} title="Save">✓</button>
                  <button className="et-btn et-cancel" onClick={cancelEdit} title="Cancel">✕</button>
                </td>
              </tr>
            ) : (
              <tr key={row._id ?? idx} className={`et-row ${idx % 2 === 1 ? "et-row-alt" : ""}`}>
                <td className="et-td et-num">{idx + 1}</td>
                {columns.map(c => (
                  <td
                    key={c.key}
                    className={`et-td${c.mono ? " et-mono" : ""}`}
                    onClick={() => startEdit(idx)}
                    title="Click to edit"
                  >
                    {c.type === "file"
                    ? row[c.key]?.url
                      ? <a className="et-file-link" href={row[c.key].url} download={row[c.key].name} onClick={e => e.stopPropagation()}>📎 {row[c.key].name}</a>
                      : <span className="et-placeholder">—</span>
                    : row[c.key] || <span className="et-placeholder">—</span>
                  }
                  </td>
                ))}
                <td className="et-td et-actions">
                  <button className="et-btn et-edit" onClick={() => startEdit(idx)} title="Edit">✎</button>
                  <button className="et-btn et-up" onClick={() => moveRow(idx, -1)} title="Move up" disabled={idx === 0}>↑</button>
                  <button className="et-btn et-down" onClick={() => moveRow(idx, 1)} title="Move down" disabled={idx === rows.length - 1}>↓</button>
                  <button className="et-btn et-del" onClick={() => deleteRow(idx)} title="Delete">✕</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
      <button className="et-add-btn" onClick={startAdd}>{lang === "en" ? "+ Add row" : "+ Добавить строку"}</button>
    </div>
  );
}
