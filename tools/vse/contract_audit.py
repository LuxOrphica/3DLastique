import argparse
import csv
import json
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REPORTS_DIR = HERE / "reports"
MANIFEST_PATH = ROOT / "public" / "vse" / "manifest.json"
CANARY_PATH = HERE / "contract_canary_nodes.json"

sys.path.insert(0, str(HERE))
import api_server  # noqa: E402


def node_category(item):
    label = str(item.get("label") or "").strip()
    first = label.split("/")[0].strip()
    return first or "Без раздела"


def load_manifest():
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, list):
      raise RuntimeError("manifest.json is not a list")
    return data


def severity_rank(status):
    return {"FAIL": 4, "MISSING": 3, "WARN": 2, "SKIP": 1, "OK": 0}.get(status, 0)


def first_warning(trace):
    if not isinstance(trace, dict):
        return ""
    for warning in trace.get("warnings") or []:
        if isinstance(warning, dict):
            kind = warning.get("kind")
            if kind:
                return kind
        elif warning:
            return str(warning)
    for row in (trace.get("groups") or []):
        warnings = row.get("warnings") or []
        if warnings:
            return str(warnings[0])
    for row in (trace.get("elements") or []):
        warnings = row.get("warnings") or []
        if warnings:
            return str(warnings[0])
    return ""


def audit_node(item, readonly=True):
    node_id = str(item.get("id") or "").strip()
    label = str(item.get("label") or "")
    category = node_category(item)
    result = {
        "node_id": node_id,
        "label": label,
        "category": category,
        "groups_count": 0,
        "elements_count": 0,
        "std_exists": False,
        "keyed_group_paths": 0,
        "keyed_element_paths": 0,
        "unmapped_groups": 0,
        "unmapped_elements": 0,
        "render_mismatches": 0,
        "warnings_count": 0,
        "fails_count": 0,
        "status": "OK",
        "main_error": "",
        "generated_symbols_without_keyed_trace": 0,
        "orig_exists": False,
    }
    try:
        canonical_id, canonical_item = api_server._canonical_node_id(node_id)  # noqa: SLF001
        item = canonical_item or item
        orig_path = api_server._local_svg_path(item.get("origSvg"))  # noqa: SLF001
        std_path = api_server._local_svg_path(item.get("stdSvg"))  # noqa: SLF001
        result["orig_exists"] = bool(orig_path and orig_path.exists())
        result["std_exists"] = bool(std_path and std_path.exists())
        if not result["orig_exists"]:
            result["status"] = "MISSING"
            result["main_error"] = "orig.svg missing"
            return result

        trace = api_server._build_contract_trace(canonical_id)  # noqa: SLF001
        groups = trace.get("groups") or []
        elements = trace.get("elements") or []
        std_entities = api_server._svg_entities(std_path) if result["std_exists"] else []  # noqa: SLF001

        result["groups_count"] = len(groups)
        result["elements_count"] = len(elements)
        result["keyed_group_paths"] = sum(1 for ent in std_entities if not ent.get("trace_ignore") and (ent.get("group_key") or ent.get("group_keys")))
        result["keyed_element_paths"] = sum(1 for ent in std_entities if not ent.get("trace_ignore") and (ent.get("elem_key") or ent.get("elem_keys")))
        result["unmapped_groups"] = sum(1 for row in groups if any("std.svg paths cannot be mapped to group_key" == str(w) for w in (row.get("warnings") or [])))
        result["unmapped_elements"] = sum(1 for row in elements if any("std.svg path cannot be mapped to elem_key" == str(w) for w in (row.get("warnings") or [])))
        result["render_mismatches"] = sum(
            1
            for row in elements
            if any(str(w).startswith("node-state final_role = ") for w in (row.get("warnings") or []))
        ) + sum(
            1
            for row in groups
            if any(str(w).startswith("unexpected rendered roles:") for w in (row.get("warnings") or []))
        )
        result["warnings_count"] = int((trace.get("summary") or {}).get("warnings") or 0)
        result["fails_count"] = int((trace.get("summary") or {}).get("failed_groups") or 0) + int((trace.get("summary") or {}).get("failed_elements") or 0)
        result["generated_symbols_without_keyed_trace"] = sum(
            1
            for ent in std_entities
            if ent.get("render_kind") == "generated_symbol" and not (ent.get("group_key") or ent.get("group_keys"))
        )

        if not result["std_exists"]:
            result["status"] = "MISSING"
            result["main_error"] = "std.svg missing"
        elif result["fails_count"] > 0 or result["render_mismatches"] > 0:
            result["status"] = "FAIL"
            result["main_error"] = first_warning(trace) or "render mismatch"
        elif result["unmapped_groups"] > 0 or result["unmapped_elements"] > 0 or result["warnings_count"] > 0 or result["generated_symbols_without_keyed_trace"] > 0:
            result["status"] = "WARN"
            result["main_error"] = first_warning(trace) or "warnings present"
        else:
            result["status"] = "OK"
            result["main_error"] = ""

        if not groups or not elements:
            result["status"] = "MISSING"
            result["main_error"] = "node-state empty"
        return result
    except Exception as exc:  # noqa: BLE001
        result["status"] = "MISSING"
        result["main_error"] = str(exc)
        return result


def write_csv(rows, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "node_id",
        "label",
        "category",
        "groups_count",
        "elements_count",
        "std_exists",
        "keyed_group_paths",
        "keyed_element_paths",
        "unmapped_groups",
        "unmapped_elements",
        "render_mismatches",
        "warnings_count",
        "fails_count",
        "status",
        "main_error",
    ]
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key) for key in fieldnames})


def summarize(rows):
    summary = {
        "total_nodes": len(rows),
        "ok_nodes": 0,
        "warn_nodes": 0,
        "fail_nodes": 0,
        "missing_nodes": 0,
        "skip_nodes": 0,
        "nodes_without_std": 0,
        "nodes_without_keyed_trace": 0,
        "nodes_with_unmapped_groups": 0,
        "nodes_with_unmapped_elements": 0,
        "nodes_with_render_mismatch": 0,
        "top_50_problem_nodes": [],
        "status_counts": dict(Counter(row.get("status", "UNKNOWN") for row in rows)),
    }
    for row in rows:
        status = row.get("status")
        if status == "OK":
            summary["ok_nodes"] += 1
        elif status == "WARN":
            summary["warn_nodes"] += 1
        elif status == "FAIL":
            summary["fail_nodes"] += 1
        elif status == "MISSING":
            summary["missing_nodes"] += 1
        elif status == "SKIP":
            summary["skip_nodes"] += 1
        if not row.get("std_exists"):
            summary["nodes_without_std"] += 1
        if row.get("std_exists") and (row.get("keyed_group_paths", 0) == 0 or row.get("keyed_element_paths", 0) == 0):
            summary["nodes_without_keyed_trace"] += 1
        if row.get("unmapped_groups", 0) > 0:
            summary["nodes_with_unmapped_groups"] += 1
        if row.get("unmapped_elements", 0) > 0:
            summary["nodes_with_unmapped_elements"] += 1
        if row.get("render_mismatches", 0) > 0:
            summary["nodes_with_render_mismatch"] += 1

    sorted_rows = sorted(
        rows,
        key=lambda r: (
            severity_rank(r.get("status")),
            r.get("fails_count", 0),
            r.get("warnings_count", 0),
            r.get("unmapped_elements", 0) + r.get("unmapped_groups", 0),
        ),
        reverse=True,
    )
    summary["top_50_problem_nodes"] = [
        {
            "node_id": row.get("node_id"),
            "label": row.get("label"),
            "status": row.get("status"),
            "fails_count": row.get("fails_count"),
            "warnings_count": row.get("warnings_count"),
            "unmapped_groups": row.get("unmapped_groups"),
            "unmapped_elements": row.get("unmapped_elements"),
            "render_mismatches": row.get("render_mismatches"),
            "main_error": row.get("main_error"),
        }
        for row in sorted_rows[:50]
        if row.get("status") != "OK"
    ]
    return summary


def write_report(rows, mode, json_name, csv_name):
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    summary = summarize(rows)
    json_path = REPORTS_DIR / json_name
    csv_path = REPORTS_DIR / csv_name
    payload = {
        "mode": mode,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": summary,
        "rows": rows,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(rows, csv_path)
    return payload, json_path, csv_path


def run_readonly(nodes):
    rows = [audit_node(item, readonly=True) for item in nodes]
    return write_report(rows, "readonly", "contract_audit_all.json", "contract_audit_all.csv")


def load_canary_nodes():
    if CANARY_PATH.exists():
        data = json.loads(CANARY_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            vals = data.get("canary_nodes") or []
            return [str(v).strip() for v in vals if str(v).strip()]
    return []


def run_destructive(nodes, restore=False):
    rows = []
    for node_id in nodes:
        if node_id.lower() != "sr00001":
            rows.append({
                "node_id": node_id,
                "status": "SKIP",
                "main_error": "no dedicated destructive script for this canary yet",
            })
            continue
        cmd = ["node", str(HERE / "contract_playwright_check.mjs")]
        completed = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=900)
        report_path = REPORTS_DIR / "contract_playwright_sr00001_report.json"
        report = {}
        if report_path.exists():
            report = json.loads(report_path.read_text(encoding="utf-8"))
        rows.append({
            "node_id": node_id,
            "status": report.get("status", "FAIL") if completed.returncode in (0, 1) else "FAIL",
            "main_error": (report.get("failure") or {}).get("message", ""),
            "playwright_report": str(report_path.relative_to(ROOT)) if report_path.exists() else "",
            "restore": bool(restore),
        })
    return {
        "mode": "destructive",
        "rows": rows,
        "summary": dict(Counter(row.get("status", "UNKNOWN") for row in rows)),
    }


def std_has_keyed_trace(item):
    std_path = api_server._local_svg_path(item.get("stdSvg"))  # noqa: SLF001
    if not std_path or not std_path.exists():
        return False, {"std_exists": False, "has_group_key": False, "has_elem_key": False, "has_role": False}
    try:
        text = std_path.read_text(encoding="utf-8")
    except Exception:
        return False, {"std_exists": True, "has_group_key": False, "has_elem_key": False, "has_role": False}
    has_group_key = 'data-group-key="' in text or 'data-group-keys="' in text
    has_elem_key = 'data-elem-key="' in text or 'data-elem-keys="' in text or 'data-source-elem-keys="' in text
    has_role = 'data-role="' in text
    return has_group_key and has_elem_key and has_role, {
        "std_exists": True,
        "has_group_key": has_group_key,
        "has_elem_key": has_elem_key,
        "has_role": has_role,
    }


def run_upgrade_keyed_trace(nodes):
    rows = []
    for idx, item in enumerate(nodes, 1):
        node_id = str(item.get("id") or "").strip()
        label = str(item.get("label") or "")
        category = node_category(item)
        ok, flags = std_has_keyed_trace(item)
        entry = {
            "node_id": node_id,
            "label": label,
            "category": category,
            "index": idx,
            "action": "skipped" if ok else "regenerated",
            "std_exists": flags["std_exists"],
            "has_group_key": flags["has_group_key"],
            "has_elem_key": flags["has_elem_key"],
            "has_role": flags["has_role"],
            "ok": True,
            "message": "",
        }
        if ok:
            rows.append(entry)
            continue
        try:
            canonical_id, _ = api_server._canonical_node_id(node_id)  # noqa: SLF001
            message = api_server._export_node(canonical_id)  # noqa: SLF001
            ok_after, flags_after = std_has_keyed_trace(item)
            entry.update({
                "message": message,
                "ok": bool(ok_after),
                "has_group_key_after": flags_after["has_group_key"],
                "has_elem_key_after": flags_after["has_elem_key"],
                "has_role_after": flags_after["has_role"],
            })
            if not ok_after:
                entry["action"] = "failed"
                entry["message"] = "regenerated but keyed trace still missing"
                entry["ok"] = False
        except Exception as exc:  # noqa: BLE001
            entry["action"] = "failed"
            entry["message"] = str(exc)
            entry["ok"] = False
        rows.append(entry)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REPORTS_DIR / "contract_keyed_trace_upgrade.json"
    payload = {
        "mode": "upgrade-keyed-trace",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": dict(Counter(row["action"] for row in rows)),
        "rows": rows,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload, out_path


def snapshot_baseline():
    src_json = REPORTS_DIR / "contract_audit_all.json"
    src_csv = REPORTS_DIR / "contract_audit_all.csv"
    dst_json = REPORTS_DIR / "contract_audit_all_before_keyed_upgrade.json"
    dst_csv = REPORTS_DIR / "contract_audit_all_before_keyed_upgrade.csv"
    if src_json.exists():
        shutil.copy2(src_json, dst_json)
    if src_csv.exists():
        shutil.copy2(src_csv, dst_csv)
    return dst_json, dst_csv


def compare_summaries(before_summary, after_summary):
    keys = [
        "ok_nodes",
        "warn_nodes",
        "fail_nodes",
        "missing_nodes",
        "skip_nodes",
        "nodes_without_keyed_trace",
        "nodes_with_unmapped_groups",
        "nodes_with_unmapped_elements",
        "nodes_with_render_mismatch",
    ]
    return {
        key: {"before": before_summary.get(key, 0), "after": after_summary.get(key, 0)}
        for key in keys
    }


def parse_args():
    parser = argparse.ArgumentParser(description="Batch contract audit for VSE")
    parser.add_argument("--all", action="store_true", help="audit all nodes from manifest")
    parser.add_argument("--nodes", type=str, default="", help="comma-separated explicit node ids")
    parser.add_argument("--mode", choices=["readonly", "destructive", "upgrade-keyed-trace"], default="readonly")
    parser.add_argument("--restore", action="store_true", help="used with destructive canary checks")
    return parser.parse_args()


def main():
    args = parse_args()
    manifest = load_manifest()
    manifest_map = {str(item.get("id")): item for item in manifest}
    selected = []
    if args.all:
        selected = manifest
    elif args.nodes:
        ids = [part.strip() for part in args.nodes.split(",") if part.strip()]
        for node_id in ids:
            item = manifest_map.get(node_id) or manifest_map.get(node_id.lower())
            if item:
                selected.append(item)
            else:
                selected.append({"id": node_id, "label": node_id, "code": "", "origSvg": "", "stdSvg": ""})
    else:
        raise SystemExit("Use --all or --nodes")

    if args.mode == "readonly":
        payload, json_path, csv_path = run_readonly(selected)
        print(json.dumps({
            "status": "ok",
            "mode": "readonly",
            "json_report": str(json_path),
            "csv_report": str(csv_path),
            "summary": payload["summary"],
        }, ensure_ascii=False, indent=2))
    elif args.mode == "destructive":
        node_ids = [str(item.get("id")) for item in selected]
        payload = run_destructive(node_ids, restore=args.restore)
        out_path = REPORTS_DIR / "contract_audit_destructive.json"
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({
            "status": "ok",
            "mode": "destructive",
            "json_report": str(out_path),
            "summary": payload["summary"],
        }, ensure_ascii=False, indent=2))
    else:
        before_payload, before_json, before_csv = run_readonly(selected)
        snapshot_baseline()
        upgrade_payload, upgrade_json = run_upgrade_keyed_trace(selected)
        after_rows = [audit_node(item, readonly=True) for item in selected]
        after_payload, after_json, after_csv = write_report(
            after_rows,
            "readonly",
            "contract_audit_all_after_keyed_upgrade.json",
            "contract_audit_all_after_keyed_upgrade.csv",
        )
        comparison = compare_summaries(before_payload["summary"], after_payload["summary"])
        compare_path = REPORTS_DIR / "contract_audit_before_after_keyed_upgrade.json"
        compare_path.write_text(json.dumps({
            "before_json": str(before_json),
            "before_csv": str(before_csv),
            "after_json": str(after_json),
            "after_csv": str(after_csv),
            "upgrade_json": str(upgrade_json),
            "comparison": comparison,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({
            "status": "ok",
            "mode": "upgrade-keyed-trace",
            "baseline_json": str(REPORTS_DIR / "contract_audit_all_before_keyed_upgrade.json"),
            "baseline_csv": str(REPORTS_DIR / "contract_audit_all_before_keyed_upgrade.csv"),
            "upgrade_json": str(upgrade_json),
            "after_json": str(after_json),
            "after_csv": str(after_csv),
            "comparison_json": str(compare_path),
            "upgrade_summary": upgrade_payload["summary"],
            "comparison": comparison,
        }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
