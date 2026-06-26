"""
Local VSE API server.

POST /api/save-unknown-roles { assignments: [...] }
  Saves tools/vse/unknown_roles_assigned.json and rebuilds the static workbench.

POST /api/save-registry { registry: [...] }
  Saves tools/vse/style_registry.json.
"""
import hashlib
import json
import os
import subprocess
import sys
import threading
import time
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path
import tempfile

from flask import Flask, jsonify, request
from flask_cors import CORS
from role_cleanup import normalize_active_role
from stitch_logic import find_stitch_operation_codes, load_stitch_operation_codes, normalize_stitch_role
from visual_standard import ROLE_STYLES
from vse_keys import compute_group_key, compute_elem_key

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ASSIGNED_PATH = HERE / "unknown_roles_assigned.json"
REGISTRY_PATH = HERE / "style_registry.json"
ROLE_CATALOG_PATH = HERE / "role_catalog.json"
NODE_STYLE_OVERRIDES_PATH = HERE / "node_style_overrides.json"
NODE_ANNOTATIONS_PATH = HERE / "node_annotations.json"
ELEM_OVERRIDES_PATH = HERE / "elem_overrides.json"
BUILD_UNKNOWN_SCRIPT = HERE / "build_unknown_roles_page.py"
SYNC_UNKNOWN_SCRIPT = HERE / "sync_unknown_roles_to_registry.py"
EXPORT_SCRIPT = HERE / "export_static.py"
MANIFEST_PATH = ROOT / "public" / "vse" / "manifest.json"
APPROVED_PATH = HERE / "approved_nodes.json"
IDENTITY_VERSION = 1
EXTRACTION_VERSION = 1

app = Flask(__name__)
CORS(app)

last_status = {"state": "idle", "message": "", "ts": 0}
EXPORT_LOCK = threading.Lock()


def _write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_name, path)
    finally:
        try:
            if os.path.exists(tmp_name):
                os.remove(tmp_name)
        except OSError:
            pass


def _read_json(path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


def _load_role_catalog():
    data = _read_json(ROLE_CATALOG_PATH, {})
    if not isinstance(data, dict):
        return {}
    roles = data.get("roles")
    if not isinstance(roles, dict):
        data["roles"] = {}
    return data


def _normalize_registry_payload(registry):
    if (
        isinstance(registry, list)
        and len(registry) == 1
        and isinstance(registry[0], dict)
        and isinstance(registry[0].get("value"), list)
    ):
        registry = registry[0]["value"]
    if not isinstance(registry, list):
        return None
    return [item for item in registry if isinstance(item, dict)]


def _load_node_annotations():
    data = _read_json(NODE_ANNOTATIONS_PATH, {"version": 1, "nodes": {}})
    if not isinstance(data, dict):
        return {"version": 1, "nodes": {}}
    nodes = data.get("nodes")
    if not isinstance(nodes, dict):
        data["nodes"] = {}
    if "version" not in data:
        data["version"] = 1
    return data


def _save_node_annotations(data):
    _write_json(NODE_ANNOTATIONS_PATH, data)


def _ensure_node_bucket(data, node_id):
    nodes = data.setdefault("nodes", {})
    node = nodes.setdefault(node_id, {})
    if not isinstance(node, dict):
        node = {}
        nodes[node_id] = node
    node.setdefault("group_overrides", {})
    node.setdefault("element_overrides", {})
    return node


def _load_review_status_data():
    data = _read_json(APPROVED_PATH, {"approved": [], "complex": []})
    if not isinstance(data, dict):
        return {"approved": [], "complex": []}
    data.setdefault("approved", [])
    data.setdefault("complex", [])
    return data


def _legacy_review_status(node_id):
    data = _load_review_status_data()
    if node_id in data.get("approved", []):
        return "approved"
    if node_id in data.get("complex", []):
        return "complex"
    return "pending"


def _upsert_review_status(node_id, review_status):
    if review_status not in ("approved", "complex", "pending"):
        review_status = "pending"
    data = _load_node_annotations()
    node = _ensure_node_bucket(data, node_id)
    node["review_status"] = review_status
    _save_node_annotations(data)


def _upsert_group_overrides(node_id, cleaned_overrides):
    data = _load_node_annotations()
    node = _ensure_node_bucket(data, node_id)
    group_overrides = {}
    for item in cleaned_overrides:
        key_strs = item.get("key_strs") or []
        from_role = item.get("from_role") or ""
        new_role = item.get("new_role") or ""
        signature = "|".join(sorted(key_strs)) if key_strs else f"{from_role}->{new_role}"
        group_key = hashlib.sha1(f"{node_id}|{signature}".encode("utf-8")).hexdigest()[:16]
        group_overrides[group_key] = {
            "role": new_role,
            "from_role": from_role,
            "key_strs": sorted(set(key_strs)),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    node["group_overrides"] = group_overrides
    _save_node_annotations(data)


def _upsert_element_override(node_id, path_d, new_role):
    data = _load_node_annotations()
    node = _ensure_node_bucket(data, node_id)
    prefix = (path_d or "")[:80]
    elem_key, prefix = compute_elem_key(node_id, prefix)
    if not elem_key:
        return
    node["element_overrides"][elem_key] = {
        "role": new_role,
        "path_d_prefix": prefix,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _save_node_annotations(data)


def _load_manifest_index():
    manifest = _read_json(MANIFEST_PATH, [])
    index = {}
    if isinstance(manifest, list):
        for item in manifest:
            if isinstance(item, dict) and item.get("id"):
                aliases = set()
                item_id = str(item.get("id") or "").strip()
                item_code = str(item.get("code") or "").strip()
                source_file = str(item.get("sourceFile") or "").strip()
                orig_svg = str(item.get("origSvg") or "").strip()
                if item_id:
                    aliases.add(item_id)
                    aliases.add(item_id.lower())
                if item_code:
                    aliases.add(item_code)
                    aliases.add(item_code.lower())
                if source_file:
                    stem = os.path.splitext(source_file)[0]
                    if stem:
                        aliases.add(stem)
                        aliases.add(stem.lower())
                if orig_svg:
                    stem = os.path.basename(orig_svg)
                    if stem.lower().endswith("_orig.svg"):
                        stem = stem[:-9]
                    elif stem.lower().endswith(".svg"):
                        stem = os.path.splitext(stem)[0]
                    if stem:
                        aliases.add(stem)
                        aliases.add(stem.lower())
                for alias in aliases:
                    index[alias] = item
    return index


def _public_role_styles():
    payload = {}
    for role, raw in ROLE_STYLES.items():
        if not isinstance(raw, dict):
            continue
        payload[role] = {k: v for k, v in raw.items() if not str(k).startswith("_")}
    return payload


def _canonical_node_id(node_id, manifest_index=None):
    manifest_index = manifest_index or _load_manifest_index()
    raw = str(node_id or "").strip()
    if not raw:
        return raw, {}
    item = manifest_index.get(raw)
    if not item:
        raw_lower = raw.lower()
        for key, value in manifest_index.items():
            if str(key).lower() == raw_lower:
                item = value
                break
    if not item:
        return raw.lower(), {}
    orig_svg = str(item.get("origSvg") or "")
    if orig_svg:
        stem = os.path.basename(orig_svg)
        if stem.lower().endswith("_orig.svg"):
            return stem[:-9].lower(), item
    source_file = str(item.get("sourceFile") or "")
    if source_file:
        return os.path.splitext(source_file)[0].lower(), item
    item_id = str(item.get("id") or raw)
    return item_id.lower(), item


def _local_svg_path(web_path):
    if not web_path:
        return None
    rel = str(web_path).lstrip("/").replace("/", os.sep)
    path = ROOT / "public" / rel
    return path if path.exists() else None


def _file_sha1(path):
    if not path or not path.exists():
        return ""
    return hashlib.sha1(path.read_bytes()).hexdigest()


def _node_source_hash(orig_entities):
    normalized = [
        {
            "tag": ent.get("tag", ""),
            "stroke": ent.get("stroke", "none"),
            "fill": ent.get("fill", "none"),
            "width": round(float(ent.get("width", 0) or 0), 2),
            "dashed": bool(ent.get("dashed")),
            "path_d_prefix": ent.get("path_d_prefix", ""),
            "data_sk": ent.get("data_sk", ""),
        }
        for ent in orig_entities
    ]
    payload = {
        "extraction_version": EXTRACTION_VERSION,
        "entities": normalized,
    }
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()


def _strip_ns(tag):
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _normalize_attr_hex(value):
    value = (value or "").strip()
    return value.lower() if value else "none"


def _parse_width(value):
    try:
        return round(float(value or 0), 2)
    except Exception:
        return 0.0


def _parse_style_attr(style_text):
    out = {}
    for chunk in (style_text or "").split(";"):
        if ":" not in chunk:
            continue
        k, v = chunk.split(":", 1)
        out[k.strip().lower()] = v.strip()
    return out


# Phase 2.2: _is_blackish_hex / _is_redish_hex removed — they were only used
# by the old _normalize_state_entities, which is now a thin passthrough.


def _svg_entities(svg_path):
    if not svg_path or not svg_path.exists():
        return []
    try:
        root = ET.fromstring(svg_path.read_text(encoding="utf-8"))
    except Exception:
        return []
    out = []
    parent_map = {child: parent for parent in root.iter() for child in parent}
    for idx, el in enumerate(root.iter()):
        tag = _strip_ns(el.tag)
        style_map = _parse_style_attr(el.attrib.get("style", ""))
        has_trace_attrs = any(
            str(el.attrib.get(name, "")).strip()
            for name in ("data-elem-key", "data-elem-keys", "data-group-key", "data-group-keys", "data-source-elem-keys", "data-source-group-keys", "data-render-kind")
        )
        if tag not in {"path", "line", "polyline", "polygon", "rect", "circle", "ellipse", "g"}:
            continue
        if tag == "g" and not has_trace_attrs:
            continue
        cur = el
        trace_ignore = False
        while cur is not None:
            if str(cur.attrib.get("data-trace-ignore", "")).strip() == "1":
                trace_ignore = True
                break
            cur = parent_map.get(cur)
        role = el.attrib.get("data-role", "") or "unknown"
        sk = el.attrib.get("data-sk", "")
        stroke = _normalize_attr_hex(el.attrib.get("stroke") or style_map.get("stroke"))
        fill = _normalize_attr_hex(el.attrib.get("fill") or style_map.get("fill"))
        width = _parse_width(el.attrib.get("stroke-width") or style_map.get("stroke-width"))
        dash = (el.attrib.get("stroke-dasharray") or style_map.get("stroke-dasharray") or "").strip()
        dashed = dash not in ("", "none", "0")
        render_kind = el.attrib.get("data-render-kind", "") or ""
        d_like = (
            el.attrib.get("d")
            or el.attrib.get("points")
            or (f"rect:{el.attrib.get('x','')}:{el.attrib.get('y','')}:{el.attrib.get('width','')}:{el.attrib.get('height','')}" if tag == "rect" else "")
            or (f"circle:{el.attrib.get('cx','')}:{el.attrib.get('cy','')}:{el.attrib.get('r','')}" if tag in {"circle", "ellipse"} else "")
            or (f"group:{render_kind}:{el.attrib.get('data-group-key','') or el.attrib.get('data-group-keys','')}:{role}" if tag == "g" else "")
        )
        elem_key = el.attrib.get("data-elem-key", "") or ""
        group_key = el.attrib.get("data-group-key", "") or ""
        elem_keys_attr = el.attrib.get("data-elem-keys", "") or el.attrib.get("data-source-elem-keys", "") or ""
        group_keys_attr = el.attrib.get("data-group-keys", "") or el.attrib.get("data-source-group-keys", "") or ""
        elem_keys = [s.strip() for s in elem_keys_attr.split(",") if s.strip()]
        group_keys = [s.strip() for s in group_keys_attr.split(",") if s.strip()]
        if elem_key and elem_key not in elem_keys:
            elem_keys.insert(0, elem_key)
        if group_key and group_key not in group_keys:
            group_keys.insert(0, group_key)
        out.append({
            "idx": idx,
            "tag": tag,
            "role": role,
            "data_sk": sk,
            "elem_key": elem_key,
            "group_key": group_key,
            "elem_keys": elem_keys,
            "group_keys": group_keys,
            "trace_ignore": trace_ignore,
            "render_kind": render_kind,
            "stroke": stroke or "none",
            "fill": fill or "none",
            "width": width,
            "dashed": dashed,
            "path_d_prefix": str(d_like)[:80],
        })
    return out


def _float_attr(elem, name):
    raw = elem.attrib.get(name)
    if raw is None:
        return None
    import re
    match = re.search(r"-?\d+(?:\.\d+)?", str(raw))
    return float(match.group(0)) if match else None


def _svg_operation_codes(svg_path):
    if not svg_path or not svg_path.exists():
        return []
    try:
        root = ET.fromstring(svg_path.read_text(encoding="utf-8"))
    except Exception:
        return []
    code_ref = load_stitch_operation_codes()
    rows = []
    for el in root.iter():
        if _strip_ns(el.tag) not in {"text", "tspan"}:
            continue
        text = " ".join("".join(el.itertext()).split())
        if not text:
            continue
        for code in find_stitch_operation_codes(text):
            meta = code_ref.get(code, {})
            rows.append({
                "code": code,
                "text": text,
                "x": _float_attr(el, "x"),
                "y": _float_attr(el, "y"),
                "font_size": _float_attr(el, "font-size"),
                "family": meta.get("family", ""),
                "label_ru": meta.get("label_ru", ""),
                "label_en": meta.get("label_en", ""),
                "default_role": meta.get("default_role", ""),
                "confidence": "high_text_label",
                "relation": "explicit_text_in_original",
                "visual_description": meta.get("visual_description", ""),
                "notes": meta.get("notes", ""),
            })
    return rows


def _entity_group_key(ent):
    data_sk = str(ent.get("data_sk") or "").strip()
    if data_sk:
        parts = data_sk.split("|")
        if len(parts) >= 4:
            stroke, fill, width, dashed = parts[0], parts[1], parts[2], parts[3]
            return compute_group_key(ent["role"], stroke, fill, width, dashed)
    return compute_group_key(ent["role"], ent["stroke"], ent["fill"], ent["width"], ent["dashed"])


def _parse_simple_line(prefix):
    import re
    m = re.match(r"^M\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+L\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)", str(prefix or "").strip())
    if not m:
        return None
    x1, y1, x2, y2 = map(float, m.groups())
    return (x1, y1, x2, y2)


def _normalize_state_entities(orig_entities):
    # Phase 2.2: orig.svg already contains post-processed roles in data-role
    # attributes (see export_static.build_annotated_orig_svg lines 146-148:
    # reclassify_thin_contours + sanitize_color_role_conflicts +
    # normalize_fragmented_stitches are applied there). Re-running those rules
    # here with a different implementation caused the UI to show different
    # roles than what was actually rendered in std.svg.
    #
    # Now we only apply normalize_active_role to collapse any deprecated role
    # names that may still appear in older orig.svg files written before the
    # role_cleanup migration. Everything else is taken verbatim from orig.svg,
    # which guarantees UI ↔ render consistency by construction.
    normalized = []
    for ent in orig_entities:
        role = ent.get("role") or "unknown"
        normalized_role = normalize_active_role(role)
        if normalized_role != role:
            ent = dict(ent)
            ent["role"] = normalized_role
        normalized.append(ent)
    return normalized


def _segment_contains(outer, inner, tol=1.5):
    if not outer or not inner:
        return False
    ox1, oy1, ox2, oy2 = outer
    ix1, iy1, ix2, iy2 = inner
    if abs(ox1 - ox2) <= tol and abs(ix1 - ix2) <= tol and abs(ox1 - ix1) <= tol:
        o0, o1 = sorted((oy1, oy2))
        i0, i1 = sorted((iy1, iy2))
        return i0 >= o0 - tol and i1 <= o1 + tol
    if abs(oy1 - oy2) <= tol and abs(iy1 - iy2) <= tol and abs(oy1 - iy1) <= tol:
        o0, o1 = sorted((ox1, ox2))
        i0, i1 = sorted((ix1, ix2))
        return i0 >= o0 - tol and i1 <= o1 + tol
    return False


def _build_node_state(node_id):
    manifest = _load_manifest_index()
    node_id, item = _canonical_node_id(node_id, manifest)
    orig_path = _local_svg_path(item.get("origSvg"))
    orig_entities = _svg_entities(orig_path)
    orig_entities = _normalize_state_entities(orig_entities)
    operation_codes = _svg_operation_codes(orig_path)

    orig_keys_by_style = {}
    for ent in orig_entities:
        map_key = _entity_group_key(ent)
        if ent["data_sk"]:
            orig_keys_by_style.setdefault(map_key, [])
            if ent["data_sk"] not in orig_keys_by_style[map_key]:
                orig_keys_by_style[map_key].append(ent["data_sk"])

    grouped = {}
    for ent in orig_entities:
        map_key = _entity_group_key(ent)
        bucket = grouped.setdefault(map_key, {
            "group_key": map_key,
            "key_strs": [],
            "detected_role": ent["role"],
            "override_role": None,
            "final_role": ent["role"],
            "count": 0,
            "match_status": "matched",
            "warnings": [],
        })
        bucket["count"] += 1
        if ent["data_sk"] and ent["data_sk"] not in bucket["key_strs"]:
            bucket["key_strs"].append(ent["data_sk"])
    for bucket in grouped.values():
        bucket["key_strs"] = sorted(bucket["key_strs"] or list(orig_keys_by_style.get(bucket["group_key"], [])))

    annotations = _load_node_annotations()
    node_ann = annotations.get("nodes", {}).get(node_id, {}) if isinstance(annotations, dict) else {}
    top_warnings = []
    review_status = node_ann.get("review_status") if isinstance(node_ann, dict) else None
    if review_status not in ("approved", "complex", "pending"):
        review_status = _legacy_review_status(node_id)
    legacy_group_overrides = _read_json(NODE_STYLE_OVERRIDES_PATH, {}).get(node_id, [])
    legacy_elem_overrides = _read_json(ELEM_OVERRIDES_PATH, {}).get(node_id, [])
    group_overrides = node_ann.get("group_overrides", {}) if isinstance(node_ann, dict) else {}
    if not group_overrides and isinstance(legacy_group_overrides, list):
        tmp = {}
        for item in legacy_group_overrides:
            key_strs = item.get("key_strs") or []
            from_role = item.get("from_role") or ""
            new_role = item.get("new_role") or ""
            signature = "|".join(sorted(key_strs)) if key_strs else f"{from_role}->{new_role}"
            group_key = hashlib.sha1(f"{node_id}|{signature}".encode("utf-8")).hexdigest()[:16]
            tmp[group_key] = {
                "role": new_role,
                "from_role": from_role,
                "key_strs": sorted(set(key_strs)),
            }
        group_overrides = tmp
    matched_group_keys = set()
    groups_list = list(grouped.values())

    # Pass 1: exact group_key matches only.
    for group in groups_list:
        payload = group_overrides.get(group["group_key"])
        if not payload:
            continue
        group["override_role"] = normalize_active_role(payload.get("role"))
        group["final_role"] = normalize_active_role(payload.get("role") or group["detected_role"])
        group["match_status"] = "matched"
        matched_group_keys.add(group["group_key"])

    # Pass 2: fallback only for still-unmatched groups and still-unused overrides.
    for group in groups_list:
        if group.get("override_role"):
            continue
        group_key_strs = set(group.get("key_strs") or [])
        group_from_role = group.get("detected_role") or ""
        for gk, payload in group_overrides.items():
            if gk in matched_group_keys:
                continue
            saved_keys = set(payload.get("key_strs") or [])
            saved_from_role = str(payload.get("from_role") or "")
            if saved_from_role and saved_from_role != group_from_role:
                continue
            if saved_keys and group_key_strs and saved_keys & group_key_strs:
                group["override_role"] = normalize_active_role(payload.get("role"))
                group["final_role"] = normalize_active_role(payload.get("role") or group["detected_role"])
                group["match_status"] = "fallback_matched"
                matched_group_keys.add(gk)
                break
    for gk in group_overrides.keys():
        if gk not in matched_group_keys:
            top_warnings.append({
                "kind": "unmatched_group_override",
                "group_key": gk,
            })

    element_overrides = node_ann.get("element_overrides", {}) if isinstance(node_ann, dict) else {}
    if not element_overrides and isinstance(legacy_elem_overrides, list):
        tmp = {}
        for item in legacy_elem_overrides:
            prefix = str(item.get("path_d") or "")[:80]
            role = item.get("new_role") or ""
            if not prefix or not role:
                continue
            elem_key, _ = compute_elem_key(node_id, prefix)
            tmp[elem_key] = {"role": role, "path_d_prefix": prefix}
        element_overrides = tmp
    elements = []
    matched_element_keys = set()
    for ent in orig_entities:
        prefix = ent["path_d_prefix"]
        elem_key, _ = compute_elem_key(node_id, prefix)
        saved = element_overrides.get(elem_key)
        match_status = "matched"
        if not saved:
            for _, payload in element_overrides.items():
                saved_prefix = str(payload.get("path_d_prefix") or "")
                if saved_prefix and (prefix.startswith(saved_prefix[:40]) or saved_prefix.startswith(prefix[:40])):
                    saved = payload
                    match_status = "fallback_matched"
                    break
        else:
            matched_element_keys.add(elem_key)
        override_role = normalize_active_role(saved.get("role")) if isinstance(saved, dict) else None
        if saved and match_status == "fallback_matched":
            for k, payload in element_overrides.items():
                if payload is saved:
                    matched_element_keys.add(k)
                    break
        elements.append({
            "elem_key": elem_key,
            "group_key": _entity_group_key(ent),
            "path_d_prefix": prefix,
            "detected_role": ent["role"],
            "override_role": override_role,
            "final_role": normalize_active_role(override_role or ent["role"]),
            "match_status": match_status,
            "warnings": [],
        })
    for ek in element_overrides.keys():
        if ek not in matched_element_keys:
            top_warnings.append({
                "kind": "unmatched_element_override",
                "elem_key": ek,
            })

    return {
        "node_id": node_id,
        "source_hash": _node_source_hash(orig_entities),
        "identity_version": IDENTITY_VERSION,
        "extraction_version": EXTRACTION_VERSION,
        "review_status": review_status,
        "groups": list(grouped.values()),
        "elements": elements,
        "operation_codes": operation_codes,
        "warnings": top_warnings,
    }


def _trace_status(changed, saved, rendered, ok_match, warnings, std_exists):
    if changed and not saved:
        return "DRAFT"
    if ok_match and rendered:
        return "OK"
    if warnings:
        if changed and saved and not rendered and not std_exists:
            return "SAVED"
        return "WARN"
    if changed and saved and rendered:
        return "RENDERED"
    if changed and saved:
        return "SAVED"
    if rendered:
        return "RENDERED"
    return "FAIL" if std_exists else "WARN"


def _build_contract_trace(node_id):
    manifest = _load_manifest_index()
    node_id, item = _canonical_node_id(node_id, manifest)
    state = _build_node_state(node_id)
    std_path = _local_svg_path(item.get("stdSvg"))
    std_exists = bool(std_path and std_path.exists())
    std_entities = _svg_entities(std_path) if std_exists else []

    annotations = _load_node_annotations()
    node_ann = annotations.get("nodes", {}).get(node_id, {}) if isinstance(annotations, dict) else {}
    saved_group_overrides = node_ann.get("group_overrides", {}) if isinstance(node_ann, dict) else {}
    saved_element_overrides = node_ann.get("element_overrides", {}) if isinstance(node_ann, dict) else {}

    render_by_group = defaultdict(list)
    render_by_elem = defaultdict(list)
    top_warnings = list(state.get("warnings") or [])

    for ent in std_entities:
        if ent.get("trace_ignore"):
            continue
        group_keys = ent.get("group_keys") or ([ent["group_key"]] if ent.get("group_key") else [])
        elem_keys = ent.get("elem_keys") or ([ent["elem_key"]] if ent.get("elem_key") else [])
        if group_keys:
            for gk in group_keys:
                render_by_group[gk].append(ent)
        elif std_exists:
            top_warnings.append({
                "kind": "std_svg_group_key_missing",
                "idx": ent.get("idx"),
                "role": ent.get("role"),
            })
        if elem_keys:
            for ek in elem_keys:
                render_by_elem[ek].append(ent)
        elif std_exists:
            top_warnings.append({
                "kind": "std_svg_elem_key_missing",
                "idx": ent.get("idx"),
                "role": ent.get("role"),
                "group_key": ent.get("group_key", ""),
            })

    group_final_by_key = {g["group_key"]: g.get("final_role") or g.get("detected_role") or "unknown" for g in state.get("groups", [])}
    element_final_by_key = {e["elem_key"]: e.get("final_role") or e.get("detected_role") or "unknown" for e in state.get("elements", [])}
    group_elements = defaultdict(list)
    for el in state.get("elements", []):
        group_elements[el.get("group_key", "")].append(el)

    groups_trace = []
    for group in state.get("groups", []):
        group_key = group.get("group_key", "")
        rendered_entities = render_by_group.get(group_key, [])
        rendered_summary = Counter(ent.get("role") or "unknown" for ent in rendered_entities)
        expected_roles = {group.get("final_role") or group.get("detected_role") or "unknown"}
        for el in group_elements.get(group_key, []):
            expected_roles.add(el.get("final_role") or el.get("detected_role") or "unknown")
        warnings = list(group.get("warnings") or [])
        if std_exists and not rendered_entities:
            warnings.append("std.svg paths cannot be mapped to group_key")
        bad_roles = [role for role in rendered_summary.keys() if role not in expected_roles]
        if bad_roles:
            warnings.append(f"unexpected rendered roles: {', '.join(sorted(set(bad_roles)))}")
        changed = bool(group.get("override_role"))
        saved = changed and group_key in saved_group_overrides
        rendered = bool(rendered_entities)
        ok_match = rendered and not bad_roles
        if std_exists and rendered and not saved and changed:
            warnings.append("override visible in node-state but missing in node_annotations")
        groups_trace.append({
            "status": _trace_status(changed, saved, rendered, ok_match, warnings, std_exists),
            "group_key": group_key,
            "name": group_key,
            "key_strs": group.get("key_strs") or [],
            "detected_role": group.get("detected_role") or "unknown",
            "override_role": group.get("override_role"),
            "final_role": group.get("final_role") or group.get("detected_role") or "unknown",
            "rendered_roles_summary": dict(rendered_summary),
            "count": group.get("count", 0),
            "match_status": group.get("match_status") or "matched",
            "changed": changed,
            "saved": saved,
            "rendered": rendered,
            "warnings": warnings,
        })

    elements_trace = []
    for element in state.get("elements", []):
        elem_key = element.get("elem_key", "")
        group_key = element.get("group_key", "")
        rendered_entities = render_by_elem.get(elem_key, [])
        if std_exists and not rendered_entities:
            prefix = str(element.get("path_d_prefix") or "").strip()
            if prefix:
                short_prefix = prefix[:60]
                for candidate in std_entities:
                    candidate_prefix = str(candidate.get("path_d_prefix") or "").strip()
                    if candidate_prefix and (
                        candidate_prefix.startswith(short_prefix) or short_prefix.startswith(candidate_prefix[:60])
                    ):
                        rendered_entities = [candidate]
                        break
        if std_exists and not rendered_entities:
            inner_seg = _parse_simple_line(element.get("path_d_prefix") or "")
            if inner_seg:
                for candidate in render_by_group.get(group_key, []):
                    outer_seg = _parse_simple_line(candidate.get("path_d_prefix") or "")
                    if _segment_contains(outer_seg, inner_seg):
                        rendered_entities = [candidate]
                        break
        rendered_roles = Counter(ent.get("role") or "unknown" for ent in rendered_entities)
        rendered_role = rendered_roles.most_common(1)[0][0] if rendered_roles else None
        warnings = list(element.get("warnings") or [])
        if std_exists and not rendered_entities:
            warnings.append("std.svg path cannot be mapped to elem_key")
        if rendered_entities and len(rendered_roles) > 1:
            warnings.append(f"multiple rendered roles: {', '.join(sorted(rendered_roles.keys()))}")
        final_role = element.get("final_role") or element.get("detected_role") or "unknown"
        if rendered_role and rendered_role != final_role:
            warnings.append(f"node-state final_role = {final_role}, rendered data-role = {rendered_role}")
        changed = bool(element.get("override_role"))
        saved = changed and elem_key in saved_element_overrides
        rendered = bool(rendered_entities)
        ok_match = rendered and rendered_role == final_role
        if std_exists and rendered and not saved and changed:
            warnings.append("override visible in node-state but missing in node_annotations")
        elements_trace.append({
            "status": _trace_status(changed, saved, rendered, ok_match, warnings, std_exists),
            "elem_key": elem_key,
            "group_key": group_key,
            "name": (element.get("path_d_prefix") or "")[:80],
            "path_d_prefix": element.get("path_d_prefix") or "",
            "detected_role": element.get("detected_role") or "unknown",
            "group_final_role": group_final_by_key.get(group_key, "unknown"),
            "override_role": element.get("override_role"),
            "final_role": final_role,
            "rendered_role": rendered_role,
            "match_status": element.get("match_status") or "matched",
            "changed": changed,
            "saved": saved,
            "rendered": rendered,
            "warnings": warnings,
        })

    failed_groups = sum(1 for row in groups_trace if row["status"] == "FAIL")
    failed_elements = sum(1 for row in elements_trace if row["status"] == "FAIL")
    changed_groups = sum(1 for row in groups_trace if row["changed"])
    changed_elements = sum(1 for row in elements_trace if row["changed"])
    warning_count = len([w for row in groups_trace for w in row["warnings"]]) + len([w for row in elements_trace for w in row["warnings"]]) + len(top_warnings)

    return {
        "node_id": node_id,
        "ok": True,
        "source_hash": state.get("source_hash", ""),
        "identity_version": state.get("identity_version", IDENTITY_VERSION),
        "extraction_version": state.get("extraction_version", EXTRACTION_VERSION),
        "summary": {
            "groups_total": len(groups_trace),
            "elements_total": len(elements_trace),
            "changed_groups": changed_groups,
            "changed_elements": changed_elements,
            "failed_groups": failed_groups,
            "failed_elements": failed_elements,
            "warnings": warning_count,
        },
        "groups": groups_trace,
        "elements": elements_trace,
        "warnings": top_warnings,
    }


def _export_node(node_id):
    env = dict(os.environ)
    env["VSE_NODE_ID_FILTER"] = node_id
    with EXPORT_LOCK:
        result = subprocess.run(
            [sys.executable, str(EXPORT_SCRIPT)],
            capture_output=True, text=True, timeout=120, env=env, cwd=str(ROOT)
        )
    out = (result.stdout or "").strip()
    err = (result.stderr or "").strip()
    if result.returncode != 0:
        raise RuntimeError((err or out)[-1500:])
    return out.splitlines()[-1] if out else f"Node {node_id} export complete"


def _merge_assignments(existing, incoming):
    merged = {}
    for item in existing:
        if isinstance(item, dict) and item.get("key_str") and item.get("_role"):
            merged[item["key_str"]] = item
    for item in incoming:
        if isinstance(item, dict) and item.get("key_str") and item.get("_role"):
            merged[item["key_str"]] = item
    return list(merged.values())


def _rebuild_unknown_page():
    result = subprocess.run(
        ["python", str(BUILD_UNKNOWN_SCRIPT)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError((result.stderr or result.stdout)[-1000:])
    return result.stdout.strip().splitlines()[-1] if result.stdout.strip() else "rebuilt"


def _samples_dir():
    env_path = ROOT / "INFO" / "unzip"
    if env_path.exists():
        for item in env_path.iterdir():
            if item.is_dir() and item.name.endswith("Workmanship"):
                return str(item)
    return str(ROOT / "INFO" / "unzip" / "1.Узлы and Workmanship")


def _run_script(script, timeout=180):
    env = dict(**__import__("os").environ)
    env["VSE_SAMPLES_DIR"] = _samples_dir()
    lock = EXPORT_LOCK if Path(script).resolve() == EXPORT_SCRIPT.resolve() else threading.Lock()
    with lock:
        result = subprocess.run(
            ["python", str(script)],
            cwd=str(ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    if result.returncode != 0:
        raise RuntimeError((result.stderr or result.stdout)[-1500:])
    return result.stdout.strip()


def _export_static_background():
    global last_status
    last_status = {"state": "building", "message": "Пересборка стандартизированных SVG...", "ts": time.time()}
    try:
        output = _run_script(EXPORT_SCRIPT, timeout=1200)
        message = output.splitlines()[-1] if output else "export complete"
        last_status = {"state": "ok", "message": message, "ts": time.time()}
    except Exception as exc:
        last_status = {"state": "error", "message": str(exc), "ts": time.time()}


@app.route("/api/save-unknown-roles", methods=["POST"])
def save_unknown_roles():
    global last_status
    data = request.get_json(silent=True) or {}
    assignments = data.get("assignments")
    if not isinstance(assignments, list):
        return jsonify({"ok": False, "error": "assignments must be a list"}), 400

    cleaned = [item for item in assignments if isinstance(item, dict) and item.get("_role")]
    existing = _read_json(ASSIGNED_PATH, [])
    merged = _merge_assignments(existing, cleaned)
    _write_json(ASSIGNED_PATH, merged)

    try:
        rebuild_message = _rebuild_unknown_page()
        last_status = {
            "state": "ok",
            "message": f"saved {len(cleaned)} assignments; total {len(merged)}; {rebuild_message}",
            "ts": time.time(),
        }
    except Exception as exc:
        last_status = {
            "state": "error",
            "message": f"saved {len(cleaned)} assignments, total {len(merged)}, rebuild failed: {exc}",
            "ts": time.time(),
        }
        return jsonify({"ok": False, **last_status}), 500

    return jsonify({"ok": True, "saved": len(cleaned), "total": len(merged), **last_status})


@app.route("/api/save-registry", methods=["POST"])
def save_registry():
    global last_status
    data = request.get_json(silent=True) or {}
    registry = _normalize_registry_payload(data.get("registry"))
    node_id = data.get("node_id", "")  # if provided, export only this node
    node_style_overrides = data.get("node_style_overrides")
    if registry is None:
        return jsonify({"ok": False, "error": "registry must be a list"}), 400

    _write_json(REGISTRY_PATH, registry)

    # Phase 1: node_annotations.json is the single source of truth for group overrides.
    # Legacy node_style_overrides.json is now read-only bridge (see _build_node_state fallback).
    if node_id and isinstance(node_style_overrides, list):
        cleaned = []
        for item in node_style_overrides:
            if not isinstance(item, dict):
                continue
            key_strs = [str(k) for k in (item.get("key_strs") or []) if str(k).strip()]
            new_role = str(item.get("new_role") or "").strip()
            from_role = str(item.get("from_role") or "").strip()
            if not key_strs or not new_role or new_role == "?":
                continue
            cleaned.append({
                "key_strs": sorted(set(key_strs)),
                "from_role": from_role,
                "new_role": new_role,
            })
        _upsert_group_overrides(node_id, cleaned)

    if node_id:
        last_status = {"state": "building", "message": f"Реестр сохранён, обновляем нод {node_id}...", "ts": time.time()}
        try:
            message = _export_node(node_id)
            last_status = {"state": "ok", "message": message, "ts": time.time()}
            return jsonify({"ok": True, "saved": len(registry), "state": "ok", "message": message})
        except Exception as exc:
            last_status = {"state": "error", "message": str(exc), "ts": time.time()}
            return jsonify({"ok": False, "saved": len(registry), "state": "error", "error": str(exc), "message": str(exc)}), 500
    else:
        last_status = {"state": "building", "message": "Реестр сохранён, пересборка всех SVG...", "ts": time.time()}
        threading.Thread(target=_export_static_background, daemon=True).start()
        return jsonify({"ok": True, "saved": len(registry), "state": "building", "message": last_status["message"]})


@app.route("/api/apply-unknown-roles", methods=["POST"])
def apply_unknown_roles():
    global last_status
    try:
        sync_output = _run_script(SYNC_UNKNOWN_SCRIPT, timeout=60)
    except Exception as exc:
        last_status = {"state": "error", "message": f"sync failed: {exc}", "ts": time.time()}
        return jsonify({"ok": False, **last_status}), 500

    last_status = {"state": "building", "message": "Назначения применены к реестру, запущена пересборка SVG...", "ts": time.time()}

    def apply_and_export():
        global last_status
        try:
            _run_script(SYNC_UNKNOWN_SCRIPT, timeout=60)
            # The dry-run above only validates the plan; now write and export.
            result = subprocess.run(
                ["python", str(SYNC_UNKNOWN_SCRIPT), "--write"],
                cwd=str(ROOT),
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode != 0:
                raise RuntimeError((result.stderr or result.stdout)[-1500:])
            output = _run_script(EXPORT_SCRIPT, timeout=1200)
            message = output.splitlines()[-1] if output else "export complete"
            last_status = {"state": "ok", "message": message, "ts": time.time()}
        except Exception as exc:
            last_status = {"state": "error", "message": str(exc), "ts": time.time()}

    threading.Thread(target=apply_and_export, daemon=True).start()
    return jsonify({"ok": True, "message": last_status["message"], "sync": sync_output})


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify(last_status)


@app.route("/api/node-status", methods=["GET"])
def get_node_status():
    # Phase 1: collect review statuses from node_annotations.json (source of truth)
    # and backfill from legacy approved_nodes.json for nodes not yet migrated.
    # Output shape kept identical to legacy: { approved: [...], complex: [...] }
    # for backwards compatibility with existing UI.
    annotations = _load_node_annotations()
    nodes = annotations.get("nodes", {}) if isinstance(annotations, dict) else {}

    approved = set()
    complex_ = set()

    # 1. New source of truth: node_annotations.json
    for node_id, node in nodes.items():
        if not isinstance(node, dict):
            continue
        status = node.get("review_status")
        if status == "approved":
            approved.add(node_id)
        elif status == "complex":
            complex_.add(node_id)

    # 2. Legacy backfill: approved_nodes.json (read-only bridge).
    #    Only add node_ids that are NOT in node_annotations.json,
    #    so a node that was "approved" in legacy but later set to "complex"
    #    (or "pending") in node_annotations.json keeps its new status.
    legacy = _load_review_status_data()
    for node_id in legacy.get("approved", []):
        if node_id not in nodes:
            approved.add(node_id)
    for node_id in legacy.get("complex", []):
        if node_id not in nodes:
            complex_.add(node_id)

    return jsonify({
        "approved": sorted(approved),
        "complex": sorted(complex_),
    })


@app.route("/api/elem-override", methods=["GET"])
def get_elem_overrides():
    try:
        data = json.loads(ELEM_OVERRIDES_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = {}
    return jsonify(data)

@app.route("/api/node-style-overrides", methods=["GET"])
def get_node_style_overrides():
    try:
        data = json.loads(NODE_STYLE_OVERRIDES_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = {}
    return jsonify(data)


@app.route("/api/role-styles", methods=["GET"])
def get_role_styles():
    return jsonify({
        "ok": True,
        "styles": _public_role_styles(),
    })


@app.route("/api/role-catalog", methods=["GET"])
def get_role_catalog():
    return jsonify({
        "ok": True,
        "catalog": _load_role_catalog(),
    })


@app.route("/api/node-state/<node_id>", methods=["GET"])
def get_node_state(node_id):
    manifest = _load_manifest_index()
    canonical_node_id, _ = _canonical_node_id(node_id, manifest)
    return jsonify({"ok": True, **_build_node_state(canonical_node_id)})


@app.route("/api/node-contract-trace/<node_id>", methods=["GET"])
def get_node_contract_trace(node_id):
    manifest = _load_manifest_index()
    canonical_node_id, _ = _canonical_node_id(node_id, manifest)
    return jsonify(_build_contract_trace(canonical_node_id))


@app.route("/api/node-annotations/<node_id>", methods=["PUT"])
def put_node_annotations(node_id):
    manifest = _load_manifest_index()
    node_id, _ = _canonical_node_id(node_id, manifest)
    body = request.get_json(force=True) or {}
    group_overrides = body.get("group_overrides") or {}
    element_overrides = body.get("element_overrides") or {}
    review_status = body.get("review_status")
    if not isinstance(group_overrides, dict) or not isinstance(element_overrides, dict):
        return jsonify({"ok": False, "error": "group_overrides and element_overrides must be objects"}), 400
    if review_status is not None and review_status not in ("approved", "complex", "pending"):
        return jsonify({"ok": False, "error": "review_status must be approved, complex, or pending"}), 400
    current_state = _build_node_state(node_id)
    data = _load_node_annotations()
    node = _ensure_node_bucket(data, node_id)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    normalized_groups = {}
    for group_key, payload in group_overrides.items():
        if not isinstance(payload, dict):
            continue
        role = payload.get("role")
        if role in (None, ""):
            continue
        normalized_groups[str(group_key)] = {
            "role": role,
            "key_strs": sorted(set(str(k) for k in (payload.get("key_strs") or []) if str(k).strip())),
            "updated_at": payload.get("updated_at") or timestamp,
            **({"from_role": payload.get("from_role")} if payload.get("from_role") else {}),
        }
    normalized_elements = {}
    for elem_key, payload in element_overrides.items():
        if not isinstance(payload, dict):
            continue
        role = payload.get("role")
        if role in (None, ""):
            continue
        prefix = str(payload.get("path_d_prefix") or "")[:80]
        normalized_elements[str(elem_key)] = {
            "role": role,
            "path_d_prefix": prefix,
            "updated_at": payload.get("updated_at") or timestamp,
            **({"from_role": payload.get("from_role")} if payload.get("from_role") else {}),
        }
    node["source_hash"] = current_state.get("source_hash", "")
    node["identity_version"] = IDENTITY_VERSION
    node["extraction_version"] = EXTRACTION_VERSION
    node["group_overrides"] = normalized_groups
    node["element_overrides"] = normalized_elements
    if review_status is not None:
        node["review_status"] = review_status
    node["updated_at"] = timestamp
    _save_node_annotations(data)
    return jsonify({"ok": True, "node_id": node_id, "node_state": _build_node_state(node_id)})


@app.route("/api/regenerate-node/<node_id>", methods=["POST"])
def regenerate_node(node_id):
    global last_status
    manifest = _load_manifest_index()
    node_id, _ = _canonical_node_id(node_id, manifest)
    last_status = {"state": "building", "message": f"Обновляем нод {node_id}...", "ts": time.time()}
    try:
        message = _export_node(node_id)
        last_status = {"state": "ok", "message": message, "ts": time.time()}
        return jsonify({"ok": True, "node_id": node_id, "message": message, "state": "ok"})
    except Exception as exc:
        last_status = {"state": "error", "message": str(exc), "ts": time.time()}
        return jsonify({"ok": False, "node_id": node_id, "error": str(exc), "state": "error"}), 500

@app.route("/api/elem-override", methods=["POST"])
def set_elem_override():
    # Phase 1: writes only to node_annotations.json via _upsert_element_override.
    # Legacy elem_overrides.json is now read-only bridge (see _build_node_state fallback).
    body = request.get_json(force=True) or {}
    node_id  = body.get("node_id", "")
    path_d   = body.get("path_d", "")   # first ~40 chars of d attribute
    new_role = body.get("new_role", "")
    if not node_id or not path_d or not new_role:
        return jsonify({"ok": False, "error": "node_id, path_d, new_role required"}), 400
    _upsert_element_override(node_id, path_d, new_role)
    return jsonify({"ok": True})


@app.route("/api/node-status", methods=["POST"])
def set_node_status():
    # Phase 1: writes only to node_annotations.json via _upsert_review_status.
    # Legacy approved_nodes.json is now read-only bridge (see get_node_status / _legacy_review_status).
    body = request.get_json(force=True) or {}
    node_id = body.get("node_id", "")
    new_status = body.get("status", "")  # "approved" | "complex" | "pending"
    if not node_id:
        return jsonify({"ok": False, "error": "node_id required"}), 400
    _upsert_review_status(node_id, new_status or "pending")
    return jsonify({"ok": True, "status": new_status, "node_id": node_id})


if __name__ == "__main__":
    print("VSE API server")
    print("  POST http://localhost:7070/api/save-unknown-roles")
    print("  POST http://localhost:7070/api/save-registry")
    print("  GET  http://localhost:7070/api/status")
    app.run(host="0.0.0.0", port=7070, debug=False)
