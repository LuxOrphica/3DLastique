"""
Fetch Google Drive file IDs for all JPG files and update node-library.json.

Requires: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
Token reused from download_drive.py (drive_token.pickle).
"""
import os, re, json, sys, pickle

try:
    from googleapiclient.discovery import build
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    print("pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
    sys.exit(1)

HERE          = os.path.dirname(os.path.abspath(__file__))
ROOT_FOLDER   = "1jfr9hOJ6vdoC8vowZJ8V_wepfbtgO7NG"
LIBRARY_FILE  = os.path.join(HERE, "..", "..", "src", "tools", "pom", "node-library.json")
TOKEN_FILE    = os.path.join(HERE, "drive_token.pickle")
CREDS_FILE    = os.path.join(HERE, "drive_credentials.json")
SCOPES        = ["https://www.googleapis.com/auth/drive.readonly"]


def get_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)
    return build("drive", "v3", credentials=creds)


def list_all_files(service, folder_id, mime_filter=None):
    """Recursively list all files in folder."""
    results = []
    q = f"'{folder_id}' in parents and trashed = false"
    if mime_filter:
        q += f" and mimeType = '{mime_filter}'"

    page_token = None
    while True:
        resp = service.files().list(
            q=q,
            fields="nextPageToken, files(id, name, mimeType, parents)",
            pageToken=page_token,
            pageSize=500,
        ).execute()
        items = resp.get("files", [])
        for item in items:
            if item["mimeType"] == "application/vnd.google-apps.folder":
                results.extend(list_all_files(service, item["id"], mime_filter))
            else:
                results.append(item)
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return results


def main():
    service = get_service()
    print("Fetching all JPG file IDs from Drive...")

    all_files = list_all_files(service, ROOT_FOLDER)
    jpg_files = [f for f in all_files if f["name"].lower().endswith(".jpg")]
    print(f"Found {len(jpg_files)} JPG files")

    # Build code -> drive_id map
    code_to_jpg = {}
    for f in jpg_files:
        m = re.match(r"([A-Z]{2}\d{4,6})", f["name"])
        if m:
            code = m.group(1)
            if code not in code_to_jpg:
                code_to_jpg[code] = f["id"]

    print(f"Mapped {len(code_to_jpg)} unique codes to JPG IDs")

    # Update library
    with open(LIBRARY_FILE, encoding="utf-8-sig") as f:
        library = json.load(f)

    updated = 0
    for node in library:
        code = node.get("code", "")
        if code in code_to_jpg and not node.get("jpgId"):
            node["jpgId"] = code_to_jpg[code]
            updated += 1

    with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
        json.dump(library, f, ensure_ascii=False, indent=2)

    print(f"Updated {updated} nodes with jpgId")
    missing = sum(1 for n in library if not n.get("jpgId"))
    print(f"Still missing jpgId: {missing}")


if __name__ == "__main__":
    main()
