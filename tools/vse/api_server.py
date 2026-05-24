"""
VSE API server — accepts registry updates and regenerates SVGs.
POST /api/save-registry   { registry: [...] }  → saves JSON, runs export_static.py
GET  /api/status          → last build status
"""
import json, subprocess, threading, time
from flask import Flask, request, jsonify
from flask_cors import CORS

REGISTRY_PATH = "C:/temp/vse/style_registry.json"
PUBLIC_PATH   = "F:/Projects/lekala-site/public/vse"
EXPORT_SCRIPT = "C:/temp/vse/export_static.py"

app = Flask(__name__)
CORS(app)  # allow requests from localhost:5175

build_status = {"state": "idle", "message": "", "ts": 0}

def run_export():
    global build_status
    build_status = {"state": "building", "message": "Регенерация SVG...", "ts": time.time()}
    try:
        result = subprocess.run(
            ["python", EXPORT_SCRIPT],
            capture_output=True, text=True, timeout=120,
            cwd="C:/temp/vse"
        )
        if result.returncode == 0:
            build_status = {"state": "ok", "message": result.stdout.strip().splitlines()[-1], "ts": time.time()}
        else:
            build_status = {"state": "error", "message": result.stderr.strip()[-300:], "ts": time.time()}
    except Exception as e:
        build_status = {"state": "error", "message": str(e), "ts": time.time()}

@app.route("/api/save-registry", methods=["POST"])
def save_registry():
    data = request.get_json()
    registry = data.get("registry")
    if not registry:
        return jsonify({"error": "no registry"}), 400

    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)

    threading.Thread(target=run_export, daemon=True).start()
    return jsonify({"ok": True, "message": "Реестр сохранён, запущена регенерация..."})

@app.route("/api/status", methods=["GET"])
def status():
    return jsonify(build_status)

if __name__ == "__main__":
    print("VSE API server")
    print("  http://localhost:7070/api/save-registry")
    print("  http://localhost:7070/api/status")
    app.run(host="0.0.0.0", port=7070, debug=False)
