from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCAN_GLOBS = [
    "src/**/*.js",
    "src/**/*.jsx",
    "src/**/*.ts",
    "src/**/*.tsx",
    "tools/**/*.py",
    "tools/**/*.json",
    "tools/**/*.md",
    "public/**/*.json",
]
ROOT_MD_GLOB = "*.md"
EXCLUDE_PARTS = {
    ".git",
    "node_modules",
    "dist",
    "dist-check",
    "dist-check2",
    "dist-check3",
    "dist-check-monitor-text",
    "dist-check-monitor-final",
    "dist-check-compare-fix",
    "dist-check-compare-fix2",
    "dist-check-compare-fix3",
}
MOJIBAKE_PATTERNS = [
    "Ð",
    "Ñ",
    "Рџ",
    "РЎ",
    "Рќ",
    "Рћ",
    "Р“",
    "Р”",
    "Рђ",
    "Р›",
    "Р§",
    "РЁ",
    "Р™",
    "Р°",
    "Рµ",
    "Рё",
    "Рѕ",
    "Рґ",
    "Рє",
    "Р»",
    "Рј",
    "РЅ",
    "Рї",
    "Рс",
    "СЃ",
    "С‚",
    "СЂ",
    "С‡",
    "С€",
    "С‹",
    "СЊ",
    "СЋ",
    "СЏ",
    "вЂ",
    "в†",
    "вњ",
    "вљ",
]
QUESTION_RE = re.compile(r"\?{3,}")


@dataclass
class Finding:
    path: Path
    line_no: int
    fragment: str
    reason: str


def iter_files() -> list[Path]:
    found: dict[Path, None] = {}
    for pattern in SCAN_GLOBS:
        for path in ROOT.glob(pattern):
            if path.is_file() and not any(part in EXCLUDE_PARTS for part in path.parts):
                found[path] = None
    for path in ROOT.glob(ROOT_MD_GLOB):
        if path.is_file():
            found[path] = None
    return sorted(found.keys())


def scan_file(path: Path) -> list[Finding]:
    findings: list[Finding] = []
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        findings.append(Finding(path, 1, "", f"file is not valid UTF-8: {exc}"))
        return findings

    mojibake_patterns = [] if path == Path(__file__).resolve() else MOJIBAKE_PATTERNS
    for idx, line in enumerate(text.splitlines(), start=1):
        if "\ufffd" in line:
            findings.append(Finding(path, idx, line.strip(), "contains replacement character U+FFFD"))
        qmatch = QUESTION_RE.search(line)
        if qmatch:
            findings.append(Finding(path, idx, line.strip(), "contains 3+ consecutive question marks"))
        for pattern in mojibake_patterns:
            if pattern in line:
                findings.append(Finding(path, idx, line.strip(), f"contains mojibake pattern '{pattern}'"))
                break
    return findings


def format_fragment(fragment: str) -> str:
    cleaned = fragment.strip()
    if not cleaned:
        return "<empty>"
    if len(cleaned) > 160:
        return cleaned[:157] + "..."
    return cleaned


def main() -> int:
    parser = argparse.ArgumentParser(description="Check repository text files for UTF-8 and mojibake issues.")
    parser.parse_args()
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    except Exception:
        pass

    files = iter_files()
    findings: list[Finding] = []
    for path in files:
        findings.extend(scan_file(path))

    if findings:
        print("ENCODING CHECK FAILED")
        for item in findings:
            rel = item.path.relative_to(ROOT)
            print(f"{rel}:{item.line_no}: {item.reason}")
            print(f"  {format_fragment(item.fragment)}")
        print(f"\nFound {len(findings)} issue(s) in {len({f.path for f in findings})} file(s).")
        return 1

    print(f"ENCODING CHECK PASS ({len(files)} files scanned)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
