from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOOK_PATH = ROOT / ".git" / "hooks" / "pre-commit"


HOOK_BODY = """#!/bin/sh
python tools/check_encoding.py
status=$?
if [ $status -ne 0 ]; then
  echo "pre-commit: encoding check failed"
  exit $status
fi
"""


def main() -> int:
    HOOK_PATH.parent.mkdir(parents=True, exist_ok=True)
    HOOK_PATH.write_text(HOOK_BODY, encoding="utf-8", newline="\n")
    try:
        HOOK_PATH.chmod(0o755)
    except OSError:
        pass
    print(f"Installed pre-commit hook: {HOOK_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
