"""
Build a VSE text inventory for bilingual glossary work.

Outputs:
  tools/vse/reports/text_inventory_occurrences.json
  tools/vse/reports/text_inventory_terms.csv
  tools/vse/reports/text_inventory_terms.json

The script is read-only: it does not modify node annotations, SVGs, or role data.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PUBLIC_VSE = ROOT / "public" / "vse"
REPORTS = HERE / "reports"


SUGGESTED_RU = {
    "elastic band": "резинка",
    "interlining": "флизелин",
    "shell fabric": "основная ткань",
    "shell": "основная ткань",
    "lining": "подкладка",
    "padding": "прокладка",
    "binding": "окантовка",
    "piping": "кант",
    "cord": "шнур",
    "zipper": "молния",
    "buckle": "пряжка",
    "ring": "кольцо",
    "loop": "петля",
    "velcro": "липучка",
    "velcro hook": "липучка: крючок",
    "velcro loop": "липучка: петля",
    "velcro /hook/": "липучка: крючок",
    "velcro /loop/": "липучка: петля",
    "velcro/hook/": "липучка: крючок",
    "velcro/loop/": "липучка: петля",
    "snap-button": "кнопка-застежка",
    "snap-button /upper part/": "кнопка-застежка: верхняя часть",
    "snap-button /bottom part/": "кнопка-застежка: нижняя часть",
    "upper part": "верхняя часть",
    "bottom part": "нижняя часть",
    "inside": "внутри",
    "outside": "снаружи",
    "left front": "левая полочка",
    "right front": "правая полочка",
    "front facing": "передняя обтачка",
    "inner placket": "внутренняя планка",
    "inner cuff": "внутренняя манжета",
    "sweat band": "впитывающая лента",
    "visor": "козырек",
    "half-belt": "полупояс",
    "stitch on stitch": "строчка по строчке",
    "hidden seam": "скрытый шов",
    "end of stitching": "конец строчки",
}


def clean_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    value = value.replace("\ufb00", "ff").replace("\ufb01", "fi").replace("\ufb02", "fl")
    return value


def normalize_text(value: str) -> str:
    value = clean_text(value)
    value = value.replace(" /", "/").replace("/ ", "/")
    value = re.sub(r"\s+", " ", value)
    return value


def lang_of(value: str) -> str:
    has_cyr = bool(re.search(r"[А-Яа-яЁё]", value))
    has_lat = bool(re.search(r"[A-Za-z]", value))
    if has_cyr and has_lat:
        return "mixed"
    if has_cyr:
        return "ru"
    if has_lat:
        return "latin"
    if re.search(r"\d", value):
        return "numeric_or_code"
    return "other"


def node_id_from_svg(path: Path) -> tuple[str, str]:
    stem = path.stem
    if stem.endswith("_orig"):
        return stem[:-5], "svg_orig"
    if stem.endswith("_std"):
        return stem[:-4], "svg_std"
    return stem, "svg"


def strip_ns(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def parse_float(value: str | None, default: float = 0.0) -> float:
    if not value:
        return default
    try:
        return float(str(value).split()[0])
    except ValueError:
        return default


def read_svg_texts(path: Path) -> list[dict]:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return []

    rows = []
    for elem in root.iter():
        if strip_ns(elem.tag) not in {"text", "tspan"}:
            continue
        text = clean_text("".join(elem.itertext()))
        if not text:
            continue
        rows.append(
            {
                "text": text,
                "x": parse_float(elem.attrib.get("x")),
                "y": parse_float(elem.attrib.get("y")),
                "font_size": parse_float(elem.attrib.get("font-size"), 10.0),
            }
        )
    return rows


def grouped_svg_phrases(texts: list[dict]) -> list[str]:
    if not texts:
        return []

    phrases = []
    used = set()
    ordered = sorted(enumerate(texts), key=lambda item: (item[1]["x"], item[1]["y"]))

    for idx, item in ordered:
        if idx in used:
            continue
        group = [(idx, item)]
        used.add(idx)
        last = item
        for next_idx, nxt in ordered:
            if next_idx in used:
                continue
            same_column = abs(nxt["x"] - item["x"]) <= max(3.0, item["font_size"] * 0.4)
            below = 0 < (nxt["y"] - last["y"]) <= max(18.0, last["font_size"] * 1.7)
            if same_column and below:
                group.append((next_idx, nxt))
                used.add(next_idx)
                last = nxt
        phrase = normalize_text(" ".join(part["text"] for _, part in group))
        if phrase:
            phrases.append(phrase)

    return phrases


def add_occurrence(rows: list[dict], *, source: str, node_id: str, file: str, text: str, kind: str) -> None:
    text = clean_text(text)
    if not text:
        return
    rows.append(
        {
            "source": source,
            "node_id": node_id,
            "file": file,
            "kind": kind,
            "text": text,
            "text_norm": normalize_text(text),
            "language": lang_of(text),
        }
    )


def collect_svg_occurrences(limit: int | None = None) -> list[dict]:
    rows = []
    svg_paths = sorted(PUBLIC_VSE.glob("*_orig.svg")) + sorted(PUBLIC_VSE.glob("*_std.svg"))
    if limit:
        svg_paths = svg_paths[:limit]
    for path in svg_paths:
        node_id, source = node_id_from_svg(path)
        texts = read_svg_texts(path)
        for item in texts:
            add_occurrence(rows, source=source, node_id=node_id, file=path.name, text=item["text"], kind="svg_text")
        for phrase in grouped_svg_phrases(texts):
            add_occurrence(rows, source=source, node_id=node_id, file=path.name, text=phrase, kind="svg_grouped_phrase")
    return rows


def collect_nodes_occurrences() -> list[dict]:
    path = HERE / "nodes.json"
    if not path.exists():
        return []
    rows = []
    with path.open(encoding="utf-8") as f:
        nodes = json.load(f)
    for node in nodes:
        node_id = node.get("id") or ""
        for key in ("label", "code", "file"):
            if node.get(key):
                add_occurrence(
                    rows,
                    source="nodes_json",
                    node_id=node_id,
                    file="nodes.json",
                    text=str(node[key]),
                    kind=f"nodes.{key}",
                )
    return rows


def collect_role_catalog_occurrences() -> list[dict]:
    path = HERE / "role_catalog.json"
    if not path.exists():
        return []
    rows = []
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    for key, value in (data.get("families") or {}).items():
        add_occurrence(rows, source="role_catalog", node_id="", file=path.name, text=value, kind=f"families.{key}")
    for key, value in (data.get("entity_types") or {}).items():
        add_occurrence(rows, source="role_catalog", node_id="", file=path.name, text=value, kind=f"entity_types.{key}")
    for key, obj in (data.get("object_roles") or {}).items():
        add_occurrence(rows, source="role_catalog", node_id="", file=path.name, text=obj.get("label_ru", ""), kind=f"object_roles.{key}")
    for key, obj in (data.get("roles") or {}).items():
        add_occurrence(rows, source="role_catalog", node_id="", file=path.name, text=obj.get("label_ru", ""), kind=f"roles.{key}")
    for choice in data.get("role_choices") or []:
        add_occurrence(rows, source="role_catalog", node_id="", file=path.name, text=choice.get("label_ru", ""), kind=f"role_choices.{choice.get('choice_key', '')}")
        add_occurrence(rows, source="role_catalog", node_id="", file=path.name, text=choice.get("group", ""), kind=f"role_choices_group.{choice.get('choice_key', '')}")
    return rows


def aggregate_terms(occurrences: list[dict]) -> list[dict]:
    counts = Counter(row["text_norm"] for row in occurrences if row["text_norm"])
    variants = defaultdict(Counter)
    sources = defaultdict(Counter)
    langs = defaultdict(Counter)
    nodes = defaultdict(set)
    examples = {}

    for row in occurrences:
        key = row["text_norm"]
        if not key:
            continue
        variants[key][row["text"]] += 1
        sources[key][row["source"]] += 1
        langs[key][row["language"]] += 1
        if row["node_id"]:
            nodes[key].add(row["node_id"])
        examples.setdefault(key, row)

    terms = []
    for key, count in counts.most_common():
        lang = langs[key].most_common(1)[0][0]
        suggested = SUGGESTED_RU.get(key.lower(), "")
        variant_list = [value for value, _ in variants[key].most_common(5)]
        source_list = [value for value, _ in sources[key].most_common()]
        node_list = sorted(nodes[key])[:8]
        terms.append(
            {
                "text_norm": key,
                "variants": " | ".join(variant_list),
                "language": lang,
                "count": count,
                "nodes_count": len(nodes[key]),
                "example_nodes": ", ".join(node_list),
                "sources": ", ".join(source_list),
                "suggested_ru": suggested,
                "approved_ru": "",
                "status": "todo" if lang in {"latin", "mixed"} else "reference",
                "example_file": examples[key].get("file", ""),
            }
        )
    return terms


def write_reports(occurrences: list[dict], terms: list[dict]) -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    occ_path = REPORTS / "text_inventory_occurrences.json"
    terms_json_path = REPORTS / "text_inventory_terms.json"
    terms_csv_path = REPORTS / "text_inventory_terms.csv"

    occ_path.write_text(json.dumps(occurrences, ensure_ascii=False, indent=2), encoding="utf-8")
    terms_json_path.write_text(json.dumps(terms, ensure_ascii=False, indent=2), encoding="utf-8")

    fieldnames = [
        "text_norm",
        "variants",
        "language",
        "count",
        "nodes_count",
        "example_nodes",
        "sources",
        "suggested_ru",
        "approved_ru",
        "status",
        "example_file",
    ]
    with terms_csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(terms)

    print(f"occurrences: {len(occurrences)} -> {occ_path}")
    print(f"terms:       {len(terms)} -> {terms_csv_path}")
    print(f"json:        {terms_json_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract VSE texts into a translation inventory.")
    parser.add_argument("--limit-svg", type=int, default=None, help="Debug limit for SVG files.")
    args = parser.parse_args()

    occurrences = []
    occurrences.extend(collect_svg_occurrences(limit=args.limit_svg))
    occurrences.extend(collect_nodes_occurrences())
    occurrences.extend(collect_role_catalog_occurrences())
    terms = aggregate_terms(occurrences)
    write_reports(occurrences, terms)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
