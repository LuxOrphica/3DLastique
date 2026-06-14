import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REPORTS_DIR = HERE / "reports"
CURRENT_AUDIT_PATH = REPORTS_DIR / "contract_audit_all.json"
AFTER_AUDIT_PATH = REPORTS_DIR / "contract_audit_all_after_keyed_upgrade.json"
UPGRADE_PATH = REPORTS_DIR / "contract_keyed_trace_upgrade.json"

sys.path.insert(0, str(HERE))
import api_server  # noqa: E402


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_audit_path():
    if CURRENT_AUDIT_PATH.exists():
        return CURRENT_AUDIT_PATH
    return AFTER_AUDIT_PATH


def render_kind_of(ent):
    if ent.get("render_kind"):
        return ent["render_kind"]
    if len(ent.get("group_keys") or []) > 1 or len(ent.get("elem_keys") or []) > 1:
        return "merged_path"
    if ent.get("tag") == "path":
        return "normal_path"
    return "unknown"


def choose_render_kind(entities):
    if not entities:
        return "unknown"
    kinds = Counter(render_kind_of(ent) for ent in entities)
    return kinds.most_common(1)[0][0]


def parse_warning_type(warning):
    text = str(warning or "")
    if text == "std.svg paths cannot be mapped to group_key":
        return "group_unmapped"
    if text == "std.svg path cannot be mapped to elem_key":
        return "element_unmapped"
    if text.startswith("node-state final_role ="):
        return "rendered_role_mismatch"
    if text.startswith("unexpected rendered roles:"):
        return "rendered_role_mismatch"
    if text.startswith("multiple rendered roles:"):
        return "rendered_role_mismatch"
    if text == "node-state empty":
        return "node_state_empty"
    if text == "std_svg_group_key_missing":
        return "std_svg_group_key_missing"
    return "unknown"


def classify_group_issue(group, std_entities):
    role = group.get("final_role") or group.get("detected_role") or "unknown"
    same_role = [ent for ent in std_entities if ent.get("role") == role and not ent.get("trace_ignore")]
    render_kind = choose_render_kind(same_role)
    has_group_key = any((ent.get("group_key") or ent.get("group_keys")) for ent in same_role)
    has_elem_key = any((ent.get("elem_key") or ent.get("elem_keys")) for ent in same_role)
    is_generated_symbol = any(ent.get("render_kind") == "generated_symbol" for ent in same_role)
    warnings = group.get("warnings") or []
    if any(str(w) == "std.svg paths cannot be mapped to group_key" for w in warnings):
        if is_generated_symbol and not has_group_key:
            error_type = "generated_symbol_without_trace"
            fix = "Class A: generated symbols lose group_key"
        elif same_role and not has_group_key:
            error_type = "std_svg_group_key_missing"
            fix = "Class B: normal paths lose group_key"
        elif not same_role:
            error_type = "suppressed_or_consumed_group"
            fix = "Class C: groups intentionally consumed by post-processing"
        else:
            error_type = "group_unmapped"
            fix = "Class B/C: keyed group present but trace mapping disagrees"
    elif any(str(w).startswith("unexpected rendered roles:") for w in warnings):
        error_type = "rendered_role_mismatch"
        fix = "Class D: rendered_role mismatch"
    else:
        error_type = "unknown"
        fix = "Class U: inspect manually"
    rendered_summary = group.get("rendered_roles_summary") or {}
    rendered_role = next(iter(rendered_summary.keys()), "")
    return {
        "role": role,
        "render_kind": render_kind,
        "has_data_group_key": bool(has_group_key),
        "has_data_elem_key": bool(has_elem_key),
        "is_generated_symbol": bool(is_generated_symbol),
        "is_suppressed_expected": error_type == "suppressed_or_consumed_group",
        "recommended_fix_class": fix,
        "error_type": error_type,
        "rendered_role": rendered_role,
    }


def classify_element_issue(element, std_entities):
    role = element.get("detected_role") or element.get("final_role") or "unknown"
    elem_key = element.get("elem_key") or ""
    same_elem = [
        ent for ent in std_entities
        if elem_key and (elem_key == ent.get("elem_key") or elem_key in (ent.get("elem_keys") or []))
    ]
    render_kind = choose_render_kind(same_elem)
    has_group_key = any((ent.get("group_key") or ent.get("group_keys")) for ent in same_elem)
    has_elem_key = any((ent.get("elem_key") or ent.get("elem_keys")) for ent in same_elem)
    is_generated_symbol = any(ent.get("render_kind") == "generated_symbol" for ent in same_elem)
    warnings = element.get("warnings") or []
    if any(str(w) == "std.svg path cannot be mapped to elem_key" for w in warnings):
        if is_generated_symbol and not has_elem_key:
            error_type = "generated_symbol_without_trace"
            fix = "Class A: generated symbols lose elem_key"
        elif not same_elem:
            error_type = "suppressed_or_consumed_group"
            fix = "Class C: groups intentionally consumed by post-processing"
        else:
            error_type = "element_unmapped"
            fix = "Class B: normal paths lose elem_key"
    elif any(str(w).startswith("node-state final_role =") for w in warnings) or any(str(w).startswith("multiple rendered roles:") for w in warnings):
        error_type = "rendered_role_mismatch"
        fix = "Class D: rendered_role mismatch"
    else:
        error_type = "unknown"
        fix = "Class U: inspect manually"
    rendered_role = element.get("rendered_role") or ""
    return {
        "role": role,
        "render_kind": render_kind,
        "has_data_group_key": bool(has_group_key),
        "has_data_elem_key": bool(has_elem_key),
        "is_generated_symbol": bool(is_generated_symbol),
        "is_suppressed_expected": error_type == "suppressed_or_consumed_group",
        "recommended_fix_class": fix,
        "error_type": error_type,
        "rendered_role": rendered_role,
    }


def build_taxonomy():
    after_path = resolve_audit_path()
    after = load_json(after_path)
    upgrade = load_json(UPGRADE_PATH)
    manifest = api_server._read_json(api_server.MANIFEST_PATH, [])  # noqa: SLF001
    manifest_map = {str(item.get("id")).lower(): item for item in manifest if isinstance(item, dict)}

    issue_rows = []
    role_unmapped_groups = Counter()
    role_render_mismatch = Counter()
    render_kind_counts = Counter()
    error_type_counts = Counter()
    fix_class_counts = Counter()
    role_by_error_type = defaultdict(Counter)
    render_kind_by_error_type = defaultdict(Counter)
    after_rows_map = {str(row.get("node_id") or ""): row for row in after.get("rows", [])}

    for node_row in after.get("rows", []):
        if node_row.get("status") not in {"FAIL", "MISSING"}:
            continue
        node_id = str(node_row.get("node_id") or "")
        label = node_row.get("label") or ""
        item = manifest_map.get(node_id.lower(), {})
        if node_row.get("status") == "MISSING":
            issue_rows.append({
                "node_id": node_id,
                "label": label,
                "status": node_row.get("status"),
                "main_error": node_row.get("main_error"),
                "role": "",
                "group_key": "",
                "elem_key": "",
                "render_kind": "unknown",
                "expected_final_role": "",
                "rendered_role": "",
                "has_data_group_key": False,
                "has_data_elem_key": False,
                "is_generated_symbol": False,
                "is_suppressed_expected": False,
                "recommended_fix_class": "Class E: node-state empty / missing source",
                "error_type": "node_state_empty",
            })
            error_type_counts["node_state_empty"] += 1
            fix_class_counts["Class E: node-state empty / missing source"] += 1
            role_by_error_type["node_state_empty"][""] += 1
            render_kind_by_error_type["node_state_empty"]["unknown"] += 1
            continue

        canonical_id, canonical_item = api_server._canonical_node_id(node_id)  # noqa: SLF001
        item = canonical_item or item
        std_path = api_server._local_svg_path(item.get("stdSvg"))  # noqa: SLF001
        std_entities = api_server._svg_entities(std_path) if std_path and std_path.exists() else []  # noqa: SLF001
        trace = api_server._build_contract_trace(canonical_id)  # noqa: SLF001

        for group in trace.get("groups", []):
            if not group.get("warnings"):
                continue
            meta = classify_group_issue(group, std_entities)
            row = {
                "node_id": canonical_id,
                "label": label,
                "status": node_row.get("status"),
                "main_error": node_row.get("main_error"),
                "role": meta["role"],
                "group_key": group.get("group_key") or "",
                "elem_key": "",
                "render_kind": meta["render_kind"],
                "expected_final_role": group.get("final_role") or "",
                "rendered_role": meta["rendered_role"],
                "has_data_group_key": meta["has_data_group_key"],
                "has_data_elem_key": meta["has_data_elem_key"],
                "is_generated_symbol": meta["is_generated_symbol"],
                "is_suppressed_expected": meta["is_suppressed_expected"],
                "recommended_fix_class": meta["recommended_fix_class"],
                "error_type": meta["error_type"],
            }
            issue_rows.append(row)
            error_type_counts[meta["error_type"]] += 1
            render_kind_counts[meta["render_kind"]] += 1
            fix_class_counts[meta["recommended_fix_class"]] += 1
            role_by_error_type[meta["error_type"]][meta["role"]] += 1
            render_kind_by_error_type[meta["error_type"]][meta["render_kind"]] += 1
            if meta["error_type"] in {"group_unmapped", "std_svg_group_key_missing", "generated_symbol_without_trace", "suppressed_or_consumed_group"}:
                role_unmapped_groups[meta["role"]] += 1
            if meta["error_type"] == "rendered_role_mismatch":
                role_render_mismatch[meta["role"]] += 1

        for element in trace.get("elements", []):
            if not element.get("warnings"):
                continue
            meta = classify_element_issue(element, std_entities)
            row = {
                "node_id": canonical_id,
                "label": label,
                "status": node_row.get("status"),
                "main_error": node_row.get("main_error"),
                "role": meta["role"],
                "group_key": element.get("group_key") or "",
                "elem_key": element.get("elem_key") or "",
                "render_kind": meta["render_kind"],
                "expected_final_role": element.get("final_role") or "",
                "rendered_role": meta["rendered_role"],
                "has_data_group_key": meta["has_data_group_key"],
                "has_data_elem_key": meta["has_data_elem_key"],
                "is_generated_symbol": meta["is_generated_symbol"],
                "is_suppressed_expected": meta["is_suppressed_expected"],
                "recommended_fix_class": meta["recommended_fix_class"],
                "error_type": meta["error_type"],
            }
            issue_rows.append(row)
            error_type_counts[meta["error_type"]] += 1
            render_kind_counts[meta["render_kind"]] += 1
            fix_class_counts[meta["recommended_fix_class"]] += 1
            role_by_error_type[meta["error_type"]][meta["role"]] += 1
            render_kind_by_error_type[meta["error_type"]][meta["render_kind"]] += 1
            if meta["error_type"] in {"element_unmapped", "generated_symbol_without_trace"}:
                role_unmapped_groups[meta["role"]] += 1
            if meta["error_type"] == "rendered_role_mismatch":
                role_render_mismatch[meta["role"]] += 1

    failed_upgrades = []
    for row in upgrade.get("rows", []):
        if row.get("action") != "failed":
            continue
        node_id = str(row.get("node_id") or "")
        item = manifest_map.get(node_id.lower(), {})
        orig_path = api_server._local_svg_path(item.get("origSvg"))  # noqa: SLF001
        std_path = api_server._local_svg_path(item.get("stdSvg"))  # noqa: SLF001
        try:
            state = api_server._build_node_state(node_id)  # noqa: SLF001
            node_state_ok = bool((state.get("groups") or []) or (state.get("elements") or []))
            node_state_counts = {
                "groups": len(state.get("groups") or []),
                "elements": len(state.get("elements") or []),
            }
        except Exception as exc:  # noqa: BLE001
            node_state_ok = False
            node_state_counts = {"groups": 0, "elements": 0}
            state = {"error": str(exc)}
        try:
            msg = api_server._export_node(node_id)  # noqa: SLF001
            regenerate_ok = True
            regenerate_error = ""
        except Exception as exc:  # noqa: BLE001
            msg = ""
            regenerate_ok = False
            regenerate_error = str(exc)
        std_entities = api_server._svg_entities(std_path) if std_path and std_path.exists() else []  # noqa: SLF001
        if any(ent.get("render_kind") == "generated_symbol" for ent in std_entities):
            renderer = "generated_symbol"
        elif std_entities:
            renderer = "normal_path"
        elif row.get("has_role_after"):
            renderer = "legacy_role_only_output"
        else:
            renderer = "unknown"
        failed_upgrades.append({
            "node_id": node_id,
            "label": row.get("label") or "",
            "orig_exists": bool(orig_path and orig_path.exists()),
            "std_exists": bool(std_path and std_path.exists()),
            "node_state_builds": node_state_ok,
            "node_state_groups": node_state_counts["groups"],
            "node_state_elements": node_state_counts["elements"],
            "regenerate_ok": regenerate_ok,
            "regenerate_message": msg,
            "regenerate_error": regenerate_error or row.get("message") or "",
            "renderer_involved": renderer,
        })

    top_50_problem_nodes = []
    for node_id, node_row in after_rows_map.items():
        if node_row.get("status") not in {"FAIL", "MISSING"}:
            continue
        node_issue_rows = [row for row in issue_rows if row["node_id"] == node_id]
        error_types = Counter(row["error_type"] for row in node_issue_rows)
        top_50_problem_nodes.append({
            "node_id": node_id,
            "label": node_row.get("label") or "",
            "status": node_row.get("status"),
            "main_error": node_row.get("main_error") or "",
            "warnings_count": int(node_row.get("warnings_count") or 0),
            "fails_count": int(node_row.get("fails_count") or 0),
            "unmapped_groups": int(node_row.get("unmapped_groups") or 0),
            "unmapped_elements": int(node_row.get("unmapped_elements") or 0),
            "render_mismatches": int(node_row.get("render_mismatches") or 0),
            "issue_rows": len(node_issue_rows),
            "top_error_types": [
                {"error_type": error_type, "count": count}
                for error_type, count in error_types.most_common(5)
            ],
        })
    top_50_problem_nodes.sort(
        key=lambda row: (
            row["status"] != "MISSING",
            row["warnings_count"],
            row["render_mismatches"],
            row["unmapped_groups"],
            row["unmapped_elements"],
            row["issue_rows"],
        ),
        reverse=True,
    )

    summary = {
        "issue_rows": len(issue_rows),
        "error_type_counts": dict(error_type_counts),
        "render_kind_counts": dict(render_kind_counts),
        "recommended_fix_class_counts": dict(fix_class_counts),
        "top_20_roles_by_unmapped_groups": [
            {"role": role, "count": count} for role, count in role_unmapped_groups.most_common(20)
        ],
        "top_20_roles_by_render_mismatch": [
            {"role": role, "count": count} for role, count in role_render_mismatch.most_common(20)
        ],
        "top_roles_by_error_type": {
            error_type: [
                {"role": role, "count": count}
                for role, count in counts.most_common(20)
            ]
            for error_type, counts in sorted(role_by_error_type.items())
        },
        "top_render_kinds_by_error_type": {
            error_type: [
                {"render_kind": render_kind, "count": count}
                for render_kind, count in counts.most_common(10)
            ]
            for error_type, counts in sorted(render_kind_by_error_type.items())
        },
        "top_50_problem_nodes": top_50_problem_nodes[:50],
        "failed_upgrade_nodes": len(failed_upgrades),
    }
    return {
        "source_audit_path": str(after_path),
        "generated_at": __import__("time").strftime("%Y-%m-%dT%H:%M:%SZ", __import__("time").gmtime()),
        "summary": summary,
        "rows": issue_rows,
        "failed_upgrade_nodes": failed_upgrades,
    }


def write_csv(rows, path):
    fieldnames = [
        "node_id",
        "label",
        "status",
        "main_error",
        "role",
        "group_key",
        "elem_key",
        "render_kind",
        "expected_final_role",
        "rendered_role",
        "has_data_group_key",
        "has_data_elem_key",
        "is_generated_symbol",
        "is_suppressed_expected",
        "recommended_fix_class",
        "error_type",
    ]
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k) for k in fieldnames})


def main():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    payload = build_taxonomy()
    json_path = REPORTS_DIR / "contract_fail_taxonomy.json"
    csv_path = REPORTS_DIR / "contract_fail_taxonomy.csv"
    failed_upgrade_path = REPORTS_DIR / "contract_failed_upgrade_nodes.json"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(payload["rows"], csv_path)
    failed_upgrade_path.write_text(json.dumps({
        "generated_at": payload["generated_at"],
        "rows": payload["failed_upgrade_nodes"],
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "status": "ok",
        "json_report": str(json_path),
        "csv_report": str(csv_path),
        "failed_upgrade_report": str(failed_upgrade_path),
        "summary": payload["summary"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
