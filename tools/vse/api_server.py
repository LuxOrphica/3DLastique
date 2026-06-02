"""
Local VSE API server.

POST /api/save-unknown-roles { assignments: [...] }
  Saves tools/vse/unknown_roles_assigned.json and rebuilds the static workbench.

POST /api/save-registry { registry: [...] }
  Saves tools/vse/style_registry.json.
"""
import json
import subprocess
import threading
import time
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ASSIGNED_PATH = HERE / "unknown_roles_assigned.json"
REGISTRY_PATH = HERE / "style_registry.json"
BUILD_UNKNOWN_SCRIPT = HERE / "build_unknown_roles_page.py"
SYNC_UNKNOWN_SCRIPT = HERE / "sync_unknown_roles_to_registry.py"
EXPORT_SCRIPT = HERE / "export_static.py"

app = Flask(__name__)
CORS(app)

last_status = {"state": "idle", "message": "", "ts": 0}


def _write_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_json(path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


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
    registry = data.get("registry")
    if not isinstance(registry, list):
        return jsonify({"ok": False, "error": "registry must be a list"}), 400

    _write_json(REGISTRY_PATH, registry)
    last_status = {"state": "building", "message": "Реестр сохранен, запущена пересборка SVG...", "ts": time.time()}
    threading.Thread(target=_export_static_background, daemon=True).start()
    return jsonify({"ok": True, "saved": len(registry), "message": last_status["message"]})


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


APPROVED_PATH = HERE / "approved_nodes.json"

@app.route("/api/node-status", methods=["GET"])
def get_node_status():
    try:
        data = json.loads(APPROVED_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = {"approved": [], "complex": []}
    return jsonify(data)


@app.route("/api/node-status", methods=["POST"])
def set_node_status():
    body = request.get_json(force=True) or {}
    node_id = body.get("node_id", "")
    new_status = body.get("status", "")  # "approved" | "complex" | "pending"
    if not node_id:
        return jsonify({"ok": False, "error": "node_id required"}), 400
    try:
        data = json.loads(APPROVED_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = {"approved": [], "complex": []}
    for key in ("approved", "complex"):
        if node_id in data.get(key, []):
            data[key].remove(node_id)
    if new_status in ("approved", "complex"):
        data.setdefault(new_status, []).append(node_id)
    APPROVED_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return jsonify({"ok": True, "status": new_status, "node_id": node_id})


if __name__ == "__main__":
    print("VSE API server")
    print("  POST http://localhost:7070/api/save-unknown-roles")
    print("  POST http://localhost:7070/api/save-registry")
    print("  GET  http://localhost:7070/api/status")
    app.run(host="127.0.0.1", port=7070, debug=False)
