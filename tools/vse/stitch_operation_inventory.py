"""Inventory stitch operation codes written as text in original SVG files.

This is the safe first layer for Sportmaster stitch codes:
we trust explicit labels such as F4, Bt, Bc, O4 in *_orig.svg.
Geometry-only recognition is intentionally left for a later pass.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

from stitch_logic import find_stitch_operation_codes, load_stitch_operation_codes


ROOT = Path(__file__).resolve().parents[2]
PUBLIC_VSE = ROOT / "public" / "vse"
REPORTS = ROOT / "tools" / "vse" / "reports"
NODE_SUFFIX = "_orig.svg"


def strip_ns(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def float_attr(elem: ET.Element, name: str) -> float | None:
    raw = elem.attrib.get(name)
    if raw is None:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", str(raw))
    if not match:
        return None
    return float(match.group(0))


def parse_svg_texts(path: Path) -> list[dict]:
    try:
        root = ET.fromstring(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [{"error": str(exc)}]

    rows = []
    for elem in root.iter():
        if strip_ns(elem.tag) not in {"text", "tspan"}:
            continue
        text = " ".join("".join(elem.itertext()).split())
        if not text:
            continue
        rows.append(
            {
                "text": text,
                "x": float_attr(elem, "x"),
                "y": float_attr(elem, "y"),
                "font_size": float_attr(elem, "font-size"),
            }
        )
    return rows


def inventory_node(svg_path: Path, code_ref: dict) -> list[dict]:
    node_id = svg_path.name[: -len(NODE_SUFFIX)]
    rows = []
    for text_row in parse_svg_texts(svg_path):
        if "error" in text_row:
            rows.append(
                {
                    "node_id": node_id,
                    "file": svg_path.name,
                    "code": "",
                    "text": "",
                    "confidence": "error",
                    "error": text_row["error"],
                }
            )
            continue
        for code in find_stitch_operation_codes(text_row["text"]):
            meta = code_ref.get(code, {})
            rows.append(
                {
                    "node_id": node_id,
                    "file": svg_path.name,
                    "code": code,
                    "text": text_row["text"],
                    "x": text_row.get("x"),
                    "y": text_row.get("y"),
                    "font_size": text_row.get("font_size"),
                    "family": meta.get("family", ""),
                    "label_ru": meta.get("label_ru", ""),
                    "label_en": meta.get("label_en", ""),
                    "default_role": meta.get("default_role", ""),
                    "confidence": "high_text_label",
                    "relation": "explicit_text_in_original",
                    "visual_description": meta.get("visual_description", ""),
                    "notes": meta.get("notes", ""),
                    "error": "",
                }
            )
    return rows


def build_payload(rows: list[dict]) -> dict:
    code_counts = Counter(row["code"] for row in rows if row.get("code"))
    code_nodes = defaultdict(set)
    family_counts = Counter()
    examples = defaultdict(list)

    for row in rows:
        code = row.get("code")
        if not code:
            continue
        code_nodes[code].add(row["node_id"])
        family_counts[row.get("family") or "unknown"] += 1
        if len(examples[code]) < 8:
            examples[code].append(
                {
                    "node_id": row["node_id"],
                    "text": row["text"],
                    "x": row.get("x"),
                    "y": row.get("y"),
                }
            )

    summary_by_code = []
    for code, count in code_counts.most_common():
        summary_by_code.append(
            {
                "code": code,
                "occurrences": count,
                "nodes_count": len(code_nodes[code]),
                "examples": examples[code],
            }
        )

    return {
        "version": 1,
        "mode": "explicit_text_labels_only",
        "summary": {
            "occurrences_total": sum(code_counts.values()),
            "nodes_with_codes": len({row["node_id"] for row in rows if row.get("code")}),
            "codes_count": len(code_counts),
            "by_family": dict(family_counts),
            "by_code": summary_by_code,
        },
        "rows": rows,
    }


def write_reports(payload: dict) -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    json_path = REPORTS / "stitch_operation_code_inventory.json"
    csv_path = REPORTS / "stitch_operation_code_inventory.csv"
    summary_path = REPORTS / "stitch_operation_code_summary.csv"

    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    fieldnames = [
        "node_id",
        "file",
        "code",
        "text",
        "x",
        "y",
        "font_size",
        "family",
        "label_ru",
        "label_en",
        "default_role",
        "confidence",
        "relation",
        "visual_description",
        "notes",
        "error",
    ]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(payload["rows"])

    with summary_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["code", "occurrences", "nodes_count", "examples"])
        writer.writeheader()
        for row in payload["summary"]["by_code"]:
            writer.writerow(
                {
                    "code": row["code"],
                    "occurrences": row["occurrences"],
                    "nodes_count": row["nodes_count"],
                    "examples": " ".join(ex["node_id"] for ex in row["examples"]),
                }
            )

    print(f"Wrote {json_path}")
    print(f"Wrote {csv_path}")
    print(f"Wrote {summary_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Find explicit stitch operation codes in VSE original SVG files.")
    parser.add_argument("--node", help="Single node id, e.g. bn00071")
    parser.add_argument("--all", action="store_true", help="Scan all *_orig.svg files")
    args = parser.parse_args()

    if not args.all and not args.node:
        parser.error("Use --all or --node <node_id>")

    if args.node:
        paths = [PUBLIC_VSE / f"{args.node}{NODE_SUFFIX}"]
    else:
        paths = sorted(PUBLIC_VSE.glob(f"*{NODE_SUFFIX}"))

    code_ref = load_stitch_operation_codes()
    rows = []
    for path in paths:
        if not path.exists():
            rows.append(
                {
                    "node_id": args.node or path.name[: -len(NODE_SUFFIX)],
                    "file": path.name,
                    "code": "",
                    "text": "",
                    "confidence": "missing",
                    "error": "orig.svg not found",
                }
            )
            continue
        rows.extend(inventory_node(path, code_ref))

    payload = build_payload(rows)
    write_reports(payload)
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
