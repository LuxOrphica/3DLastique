import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path
from time import gmtime, strftime

import fitz

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REPORTS_DIR = HERE / "reports"
MATRIX_PATH = REPORTS_DIR / "contract_role_mismatch_matrix.json"
NODES_PATH = HERE / "nodes.json"

sys.path.insert(0, str(HERE))
import api_server  # noqa: E402
import engine  # noqa: E402

SAMPLES_DIR = os.environ.get(
    "VSE_SAMPLES_DIR",
    "F:/Projects/lekala-site/INFO/unzip/1.Узлы and Workmanship",
).replace("\\", "/")
_AI_PATH_CACHE = {}


def resolve_ai_path(cfg):
    rel = cfg.get("file") or ""
    if rel:
        candidate = Path(SAMPLES_DIR) / rel
        if candidate.exists():
            return candidate
    basename = str(cfg.get("sourceFile") or "").strip()
    if not basename:
        return None
    if basename in _AI_PATH_CACHE:
        return _AI_PATH_CACHE[basename]
    search_roots = [
        Path(SAMPLES_DIR),
        ROOT / "INFO" / "unzip",
    ]
    for base in search_roots:
        if not base.exists():
            continue
        hits = list(base.rglob(basename))
        if hits:
            _AI_PATH_CACHE[basename] = hits[0]
            return hits[0]
    _AI_PATH_CACHE[basename] = None
    return None


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def trace_key_list(p, singular_key, plural_key):
    values = p.get(plural_key) or p.get(singular_key) or []
    if isinstance(values, str):
        values = [values] if values.strip() else []
    return [str(v).strip() for v in values if str(v).strip()]


def find_stage_entry(stage, elem_key):
    for role, p in stage:
        elem_keys = trace_key_list(p, "_vse_elem_key", "_vse_elem_keys")
        if elem_key and elem_key in elem_keys:
            return {"role": role, "path": p}
    return None


def build_node_pipeline(node_id):
    manifest = api_server._load_manifest_index()  # noqa: SLF001
    node_id, item = api_server._canonical_node_id(node_id, manifest)  # noqa: SLF001
    nodes_cfg = {str(row.get("id")): row for row in load_json(NODES_PATH)}
    cfg = nodes_cfg.get(node_id)
    if not cfg:
        raise RuntimeError(f"nodes.json config not found for {node_id}")
    ai_path = resolve_ai_path(cfg)
    if not ai_path or not ai_path.exists():
        raise RuntimeError(f"AI source missing for {node_id}: {ai_path}")

    doc = fitz.open(str(ai_path))
    page = doc[0]
    paths = page.get_drawings()
    text_words = page.get_text("words")
    registry_lookup = engine._build_registry_lookup()  # noqa: SLF001
    node_style_overrides = engine._load_node_style_overrides()  # noqa: SLF001
    node_annotations = engine._load_node_annotations()  # noqa: SLF001
    std_path = api_server._local_svg_path(item.get("stdSvg"))  # noqa: SLF001

    node_name = os.path.basename(str(ai_path)).lower()
    out_name = os.path.basename(str(std_path)).lower() if std_path else ""
    if out_name.endswith("_std.svg"):
        canonical_node_id = out_name[:-8]
    else:
        canonical_node_id = os.path.splitext(node_name)[0].replace(" ", "_")
    orig_identity_buckets = engine._load_orig_identity_buckets(canonical_node_id, str(std_path))  # noqa: SLF001

    classified_meta = []
    use_legacy_group_overrides = not engine._has_node_group_overrides(canonical_node_id, node_annotations)  # noqa: SLF001
    for p in paths:
        role_registry = engine.classify_with_registry(p, text_words, registry_lookup)
        style_key = engine._path_style_key(p, text_words)  # noqa: SLF001
        role_after_style_registry = role_registry
        if use_legacy_group_overrides:
            role_after_style_registry = engine.apply_node_style_override(  # noqa: SLF001
                canonical_node_id, style_key, role_after_style_registry, node_style_overrides
            )
        detected_role = role_after_style_registry
        group_key = engine._group_key_for_role_and_path(detected_role, p)  # noqa: SLF001
        elem_key, prefix = engine._element_key_for_path(canonical_node_id, p, detected_role)  # noqa: SLF001

        orig_identity = None
        bucket = orig_identity_buckets.get(group_key) or []
        if bucket:
            orig_identity = bucket.pop(0)
        if orig_identity:
            elem_key = orig_identity.get("elem_key") or elem_key
            prefix = orig_identity.get("path_d_prefix") or prefix
            group_key = orig_identity.get("group_key") or group_key

        p = dict(p)
        p["_vse_detected_role"] = detected_role
        p["_vse_group_key"] = group_key
        p["_vse_group_keys"] = [group_key] if group_key else []
        p["_vse_elem_key"] = elem_key
        p["_vse_elem_keys"] = [elem_key] if elem_key else []
        p["_vse_path_d_prefix"] = prefix

        role_after_group_override = engine.apply_node_annotation_group_override(  # noqa: SLF001
            canonical_node_id, group_key, role_after_style_registry, node_annotations
        )
        role_after_element_override = engine.apply_node_annotation_element_override(  # noqa: SLF001
            canonical_node_id, p, role_after_group_override, node_annotations
        )
        role_before_render = engine.apply_node_role_override(str(ai_path), p, role_after_element_override)  # noqa: SLF001
        p["_vse_final_role"] = role_before_render

        classified_meta.append({
            "role_registry": role_registry,
            "role_after_style_registry": role_after_style_registry,
            "detected_role": detected_role,
            "group_key": group_key,
            "elem_key": elem_key,
            "path_d_prefix": prefix,
            "role_after_group_override": role_after_group_override,
            "role_after_element_override": role_after_element_override,
            "role_before_render": role_before_render,
            "path": p,
        })

    classified = [(row["role_before_render"], row["path"]) for row in classified_meta]
    normalized = engine.normalize_fragmented_stitches(classified)
    sanitized = engine.sanitize_color_role_conflicts(normalized)
    scaled = engine.scale_stitch_bt_height(sanitized)
    merged = engine.merge_stitch_thru_rows_for_render(scaled)
    final_render = engine.add_buckle_fills_for_render(merged)

    state = api_server._build_node_state(canonical_node_id)  # noqa: SLF001
    state_elements = {row.get("elem_key"): row for row in state.get("elements", [])}
    state_groups = {row.get("group_key"): row for row in state.get("groups", [])}
    std_entities = api_server._svg_entities(std_path) if std_path and std_path.exists() else []  # noqa: SLF001

    rendered_by_elem = defaultdict(list)
    for ent in std_entities:
        if ent.get("trace_ignore"):
            continue
        elem_keys = ent.get("elem_keys") or ([ent.get("elem_key")] if ent.get("elem_key") else [])
        for key in elem_keys:
            rendered_by_elem[key].append(ent)

    return {
        "node_id": canonical_node_id,
        "ai_path": str(ai_path),
        "classified_meta": {row["elem_key"]: row for row in classified_meta if row["elem_key"]},
        "normalized": normalized,
        "sanitized": sanitized,
        "scaled": scaled,
        "merged": merged,
        "final_render": final_render,
        "state_elements": state_elements,
        "state_groups": state_groups,
        "rendered_by_elem": rendered_by_elem,
    }


def stage_role(stage, elem_key):
    entry = find_stage_entry(stage, elem_key)
    return entry["role"] if entry else None


def rendered_info(rendered_entities):
    if not rendered_entities:
        return {
            "rendered_data_role": None,
            "rendered_style_signature": "",
            "is_dashed": None,
            "has_data_group_key": False,
            "has_data_elem_key": False,
        }
    ent = rendered_entities[0]
    width = ent.get("width")
    style = "|".join([
        ent.get("stroke") or "none",
        ent.get("fill") or "none",
        "" if width is None else str(round(float(width), 3)),
        "dashed" if ent.get("dashed") else "solid",
    ])
    return {
        "rendered_data_role": ent.get("role"),
        "rendered_style_signature": style,
        "is_dashed": bool(ent.get("dashed")),
        "has_data_group_key": bool(ent.get("group_key") or ent.get("group_keys")),
        "has_data_elem_key": bool(ent.get("elem_key") or ent.get("elem_keys")),
    }


def source_of_role_change(trace_row):
    final_role = trace_row["final_role_from_node_state"]
    role_before_render = trace_row["role_before_render"]
    role_after_normalize = trace_row["role_after_normalize_fragmented_stitches"]
    role_after_sanitize = trace_row["role_after_sanitize_color_conflicts"]
    role_after_merge = trace_row["role_after_merge_stitch_rows"]
    rendered_role = trace_row["rendered_data_role"]

    if final_role != role_before_render:
        return "A/C/E: node-state vs engine pre-render disagree"
    if role_before_render != role_after_normalize:
        return "F: normalize_fragmented_stitches"
    if role_after_normalize != role_after_sanitize:
        return "E/F: sanitize_color_role_conflicts"
    if role_after_sanitize != role_after_merge:
        return "F: merge_stitch_thru_rows_for_render"
    if role_after_merge != rendered_role:
        return "C/D: data-role written from different role than render stage"
    return "unknown"


def build_audit():
    matrix = load_json(MATRIX_PATH)
    detail_rows = matrix.get("detail_rows", [])
    target_rows = [
        row for row in detail_rows
        if row.get("expected_final_role") == "stitch_edge" and row.get("rendered_role") == "stitch_thru"
    ]

    node_cache = {}
    audit_rows = []
    source_counts = Counter()
    rendered_dash_counts = Counter()
    manual_override_counts = Counter()
    source_role_counts = Counter()
    skipped_nodes = {}

    for row in target_rows:
        node_id = row["node_id"]
        elem_key = row.get("elem_key") or ""
        group_key = row.get("group_key") or ""
        if not elem_key:
            continue
        if node_id not in node_cache:
            try:
                node_cache[node_id] = build_node_pipeline(node_id)
            except Exception as exc:  # noqa: BLE001
                skipped_nodes[node_id] = str(exc)
                node_cache[node_id] = None
        if node_cache[node_id] is None:
            continue
        node_trace = node_cache[node_id]
        classified_meta = node_trace["classified_meta"].get(elem_key)
        if not classified_meta:
            continue
        state_el = node_trace["state_elements"].get(elem_key, {})
        state_group = node_trace["state_groups"].get(group_key, {})
        rendered_entities = node_trace["rendered_by_elem"].get(elem_key, [])
        render_meta = rendered_info(rendered_entities)

        trace_row = {
            "node_id": node_id,
            "elem_key": elem_key,
            "group_key": group_key,
            "path_d_prefix": classified_meta.get("path_d_prefix") or "",
            "detected_role": classified_meta.get("detected_role") or "",
            "style_registry_role": classified_meta.get("role_after_style_registry") or "",
            "group_override_role": state_group.get("override_role"),
            "element_override_role": state_el.get("override_role"),
            "final_role_from_node_state": state_el.get("final_role") or "",
            "role_before_render": classified_meta.get("role_before_render") or "",
            "role_after_normalize_fragmented_stitches": stage_role(node_trace["normalized"], elem_key),
            "role_after_sanitize_color_conflicts": stage_role(node_trace["sanitized"], elem_key),
            "role_after_merge_stitch_rows": stage_role(node_trace["merged"], elem_key),
            "rendered_data_role": render_meta["rendered_data_role"],
            "rendered_style_signature": render_meta["rendered_style_signature"],
            "is_dashed": render_meta["is_dashed"],
            "has_data_group_key": render_meta["has_data_group_key"],
            "has_data_elem_key": render_meta["has_data_elem_key"],
        }
        trace_row["source_of_role_change"] = source_of_role_change(trace_row)
        trace_row["role_style_conflict"] = bool(
            trace_row["final_role_from_node_state"] == "stitch_edge" and trace_row["is_dashed"] is True
        )
        trace_row["has_manual_override"] = bool(trace_row["group_override_role"] or trace_row["element_override_role"])
        audit_rows.append(trace_row)

        source_counts[trace_row["source_of_role_change"]] += 1
        rendered_dash_counts["dashed" if trace_row["is_dashed"] else "solid_or_missing"] += 1
        manual_override_counts["with_manual_override" if trace_row["has_manual_override"] else "without_manual_override"] += 1
        source_role_counts[trace_row["style_registry_role"] or ""] += 1

    sample_rows = []
    seen_nodes = set()
    for row in sorted(audit_rows, key=lambda r: (r["source_of_role_change"], r["node_id"], r["elem_key"])):
        if row["node_id"] in seen_nodes:
            continue
        sample_rows.append(row)
        seen_nodes.add(row["node_id"])
        if len(sample_rows) >= 10:
            break

    summary = {
        "target_transition": "stitch_edge -> stitch_thru",
        "rows_total": len(audit_rows),
        "nodes_total": len({row["node_id"] for row in audit_rows}),
        "rendered_dash_counts": dict(rendered_dash_counts),
        "manual_override_counts": dict(manual_override_counts),
        "style_registry_role_counts_top20": [
            {"style_registry_role": role, "count": count}
            for role, count in source_role_counts.most_common(20)
        ],
        "source_of_role_change_counts": dict(source_counts),
        "role_style_conflict_count": sum(1 for row in audit_rows if row["role_style_conflict"]),
        "skipped_nodes": [{"node_id": node_id, "error": error} for node_id, error in sorted(skipped_nodes.items())],
        "sample_rows": sample_rows,
    }
    return {
        "generated_at": strftime("%Y-%m-%dT%H:%M:%SZ", gmtime()),
        "summary": summary,
        "rows": audit_rows,
    }


def main():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    payload = build_audit()
    out_path = REPORTS_DIR / "stitch_pipeline_audit.json"
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "status": "ok",
        "report": str(out_path),
        "summary": payload["summary"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
