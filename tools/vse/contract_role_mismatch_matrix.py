import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from time import gmtime, strftime

HERE = Path(__file__).resolve().parent
REPORTS_DIR = HERE / "reports"
TAXONOMY_PATH = REPORTS_DIR / "contract_fail_taxonomy.json"

sys.path.insert(0, str(HERE))
import api_server  # noqa: E402


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def style_signature(ent):
    if not ent:
        return ""
    width = ent.get("width")
    width_part = "" if width is None else str(round(float(width), 3))
    return "|".join([
        ent.get("stroke") or "none",
        ent.get("fill") or "none",
        width_part,
        "dashed" if ent.get("dashed") else "solid",
    ])


def pick_entity(std_entities, row):
    elem_key = row.get("elem_key") or ""
    group_key = row.get("group_key") or ""
    rendered_role = row.get("rendered_role") or ""
    if elem_key:
        exact = [
            ent for ent in std_entities
            if elem_key == ent.get("elem_key") or elem_key in (ent.get("elem_keys") or [])
        ]
        if rendered_role:
            rendered_exact = [ent for ent in exact if ent.get("role") == rendered_role]
            if rendered_exact:
                return rendered_exact[0]
        if exact:
            return exact[0]
    if group_key:
        exact = [
            ent for ent in std_entities
            if group_key == ent.get("group_key") or group_key in (ent.get("group_keys") or [])
        ]
        if rendered_role:
            rendered_exact = [ent for ent in exact if ent.get("role") == rendered_role]
            if rendered_exact:
                return rendered_exact[0]
        if exact:
            return exact[0]
    if group_key and rendered_role:
        rendered_same_role = [ent for ent in std_entities if ent.get("role") == rendered_role]
        if rendered_same_role:
            return rendered_same_role[0]
    return None


def top_nodes(rows, limit=10):
    counts = Counter(row["node_id"] for row in rows)
    return [{"node_id": node_id, "count": count} for node_id, count in counts.most_common(limit)]


def build_matrix():
    taxonomy = load_json(TAXONOMY_PATH)
    mismatch_rows = [row for row in taxonomy.get("rows", []) if row.get("error_type") == "rendered_role_mismatch"]

    per_node_entities = {}
    enriched = []
    for row in mismatch_rows:
        node_id = row.get("node_id") or ""
        if node_id not in per_node_entities:
            canonical_id, item = api_server._canonical_node_id(node_id)  # noqa: SLF001
            std_path = api_server._local_svg_path(item.get("stdSvg")) if item else None  # noqa: SLF001
            per_node_entities[node_id] = api_server._svg_entities(std_path) if std_path and std_path.exists() else []  # noqa: SLF001
        ent = pick_entity(per_node_entities[node_id], row)
        enriched_row = dict(row)
        enriched_row["role_source"] = "element" if row.get("elem_key") else "group"
        enriched_row["style_signature"] = style_signature(ent)
        enriched_row["rendered_stroke"] = (ent or {}).get("stroke") or ""
        enriched_row["rendered_fill"] = (ent or {}).get("fill") or ""
        enriched_row["rendered_width"] = (ent or {}).get("width")
        enriched_row["rendered_dashed"] = bool((ent or {}).get("dashed"))
        enriched_row["example_path_d_prefix"] = (ent or {}).get("path_d_prefix") or ""
        enriched.append(enriched_row)

    grouped = defaultdict(list)
    for row in enriched:
        key = (
            row.get("expected_final_role") or "",
            row.get("rendered_role") or "",
            row.get("role_source") or "",
            row.get("render_kind") or "unknown",
        )
        grouped[key].append(row)

    matrix_rows = []
    for key, rows in grouped.items():
        final_role, rendered_role, role_source, render_kind = key
        example = rows[0]
        matrix_rows.append({
            "final_role": final_role,
            "rendered_role": rendered_role,
            "count": len(rows),
            "nodes_count": len({row["node_id"] for row in rows}),
            "top_nodes": top_nodes(rows, limit=10),
            "role_source": role_source,
            "render_kind": render_kind,
            "has_data_group_key": any(bool(row.get("has_data_group_key")) for row in rows),
            "has_data_elem_key": any(bool(row.get("has_data_elem_key")) for row in rows),
            "example_node_id": example.get("node_id") or "",
            "example_group_key": example.get("group_key") or "",
            "example_elem_key": example.get("elem_key") or "",
            "example_path_d_prefix": example.get("example_path_d_prefix") or "",
            "example_style_signature": example.get("style_signature") or "",
            "example_rendered_stroke": example.get("rendered_stroke") or "",
            "example_rendered_fill": example.get("rendered_fill") or "",
            "example_rendered_width": example.get("rendered_width"),
            "example_rendered_dashed": bool(example.get("rendered_dashed")),
        })

    matrix_rows.sort(key=lambda row: (row["count"], row["nodes_count"]), reverse=True)

    by_final_role = defaultdict(Counter)
    by_rendered_role = defaultdict(Counter)
    by_role_source = Counter()
    by_render_kind = Counter()
    for row in matrix_rows:
        by_final_role[row["final_role"]][row["rendered_role"]] += row["count"]
        by_rendered_role[row["rendered_role"]][row["final_role"]] += row["count"]
        by_role_source[row["role_source"]] += row["count"]
        by_render_kind[row["render_kind"]] += row["count"]

    summary = {
        "mismatch_rows": len(enriched),
        "matrix_rows": len(matrix_rows),
        "top_transitions": matrix_rows[:20],
        "by_final_role": {
            final_role: [
                {"rendered_role": rendered_role, "count": count}
                for rendered_role, count in counts.most_common(20)
            ]
            for final_role, counts in sorted(by_final_role.items())
        },
        "by_rendered_role": {
            rendered_role: [
                {"final_role": final_role, "count": count}
                for final_role, count in counts.most_common(20)
            ]
            for rendered_role, counts in sorted(by_rendered_role.items())
        },
        "by_role_source": dict(by_role_source),
        "by_render_kind": dict(by_render_kind),
    }
    return {
        "generated_at": strftime("%Y-%m-%dT%H:%M:%SZ", gmtime()),
        "summary": summary,
        "rows": matrix_rows,
        "detail_rows": enriched,
    }


def write_csv(rows, path):
    fieldnames = [
        "final_role",
        "rendered_role",
        "count",
        "nodes_count",
        "top_nodes",
        "role_source",
        "render_kind",
        "has_data_group_key",
        "has_data_elem_key",
        "example_node_id",
        "example_group_key",
        "example_elem_key",
        "example_path_d_prefix",
        "example_style_signature",
        "example_rendered_stroke",
        "example_rendered_fill",
        "example_rendered_width",
        "example_rendered_dashed",
    ]
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            out = {k: row.get(k) for k in fieldnames}
            out["top_nodes"] = json.dumps(row.get("top_nodes") or [], ensure_ascii=False)
            writer.writerow(out)


def main():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    payload = build_matrix()
    json_path = REPORTS_DIR / "contract_role_mismatch_matrix.json"
    csv_path = REPORTS_DIR / "contract_role_mismatch_matrix.csv"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(payload["rows"], csv_path)
    print(json.dumps({
        "status": "ok",
        "json_report": str(json_path),
        "csv_report": str(csv_path),
        "summary": payload["summary"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
