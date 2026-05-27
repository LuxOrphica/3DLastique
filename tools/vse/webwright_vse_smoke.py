"""
Webwright-style smoke check for the local VSE UI.

This script intentionally avoids an LLM backend. It uses Playwright directly and
writes reusable artifacts: screenshots plus a JSON report.

Usage:
  python tools/vse/webwright_vse_smoke.py
  python tools/vse/webwright_vse_smoke.py --base-url http://localhost:5176
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / ".webwright-runs" / "vse-direct-smoke"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:5176")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = Path(args.output_dir) / stamp
    shots_dir = out_dir / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    shots_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "base_url": args.base_url,
        "started_at": stamp,
        "checks": {},
        "console": [],
        "network_errors": [],
        "screenshots": {},
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})

        page.on("console", lambda msg: report["console"].append({"type": msg.type, "text": msg.text}))
        page.on(
            "requestfailed",
            lambda req: report["network_errors"].append(
                {"url": req.url, "method": req.method, "failure": req.failure}
            ),
        )

        manifest = page.request.get(f"{args.base_url}/vse/manifest.json").json()
        registry = page.request.get(f"{args.base_url}/vse/style_registry.json").json()
        unknown_html = page.request.get(f"{args.base_url}/vse-tools/unknown_roles.html").text()

        roles = {entry.get("role") for entry in registry if entry.get("role")}
        report["checks"]["manifest_count"] = len(manifest)
        report["checks"]["registry_count"] = len(registry)
        report["checks"]["role_line_elastic"] = "line_elastic" in roles
        report["checks"]["role_line_fur"] = "line_fur" in roles
        report["checks"]["role_callout_zoom"] = "callout_zoom" in roles
        report["checks"]["unknown_suggestion_buttons"] = unknown_html.count('class="use-suggestion"')

        page.goto(f"{args.base_url}/tools/vse", wait_until="domcontentloaded")
        page.wait_for_selector("body", timeout=15000)
        page.evaluate("document.fonts && document.fonts.ready.catch(() => {})")
        page.screenshot(path=shots_dir / "tools-vse.png", full_page=False, timeout=15000)
        report["screenshots"]["tools_vse"] = str(shots_dir / "tools-vse.png")
        report["checks"]["tools_vse_title"] = page.title()
        report["checks"]["tools_vse_body_text_sample"] = page.locator("body").inner_text(timeout=5000)[:500]

        page.goto(f"{args.base_url}/vse-tools/unknown_roles.html", wait_until="domcontentloaded")
        page.wait_for_selector("tbody tr", timeout=15000)
        page.add_style_tag(content="* { font-family: Arial, sans-serif !important; }")
        page.evaluate("document.fonts && document.fonts.ready.catch(() => {})")
        page.screenshot(path=shots_dir / "unknown-roles.png", full_page=False, timeout=15000)
        report["screenshots"]["unknown_roles"] = str(shots_dir / "unknown-roles.png")
        report["checks"]["unknown_page_title"] = page.title()
        report["checks"]["unknown_visible_rows"] = page.locator("tbody tr").count()
        report["checks"]["unknown_visible_suggestions"] = page.locator(".use-suggestion").count()

        browser.close()

    report["ok"] = (
        report["checks"]["manifest_count"] >= 4000
        and report["checks"]["registry_count"] >= 200
        and report["checks"]["role_line_elastic"]
        and report["checks"]["role_line_fur"]
        and report["checks"]["role_callout_zoom"]
        and report["checks"]["unknown_visible_suggestions"] > 0
        and not report["network_errors"]
    )

    report_path = out_dir / "report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"VSE direct smoke: {'OK' if report['ok'] else 'FAILED'}")
    print(f"  manifest: {report['checks']['manifest_count']}")
    print(f"  registry: {report['checks']['registry_count']}")
    print(f"  suggestions: {report['checks']['unknown_visible_suggestions']}")
    print(f"  report: {report_path}")


if __name__ == "__main__":
    main()
