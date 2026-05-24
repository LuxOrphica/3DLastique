"""
Download all .ai files from Google Drive VSE folder.
Uses service account or oauth token from environment.

Usage:
    python download_drive.py

Requires: pip install google-auth google-auth-httplib2 google-api-python-client
Output: C:/temp/samples/{category}/{file}.ai
"""
import os
import io
import json
import sys

try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    import pickle
except ImportError:
    print("ERROR: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
    sys.exit(1)

ROOT_FOLDER_ID = "1jfr9hOJ6vdoC8vowZJ8V_wepfbtgO7NG"
OUT_DIR        = "C:/temp/samples"
SCOPES         = ["https://www.googleapis.com/auth/drive.readonly"]
TOKEN_FILE     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "drive_token.pickle")
CREDS_FILE     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "drive_credentials.json")


def get_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDS_FILE):
                print(f"ERROR: Place OAuth credentials file at:\n  {CREDS_FILE}")
                print("Get it from: console.cloud.google.com → APIs → Credentials → OAuth 2.0 Client IDs")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)
    return build("drive", "v3", credentials=creds)


def list_folder(service, folder_id):
    items = []
    page_token = None
    while True:
        resp = service.files().list(
            q=f"parentId = '{folder_id}' and trashed = false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token,
            pageSize=200,
        ).execute()
        items.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return items


def download_file(service, file_id, dest_path):
    request = service.files().get_media(fileId=file_id)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with io.FileIO(dest_path, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, request, chunksize=4*1024*1024)
        done = False
        while not done:
            _, done = downloader.next_chunk()


def slugify(name):
    """Convert folder name to safe directory name."""
    return name.replace("/", "_").replace("\\", "_").replace(" ", "_").strip("!").strip()


def process_folder(service, folder_id, category_name, stats):
    items = list_folder(service, folder_id)
    for item in items:
        if item["mimeType"] == "application/vnd.google-apps.folder":
            # Skip nested subfolders (Past, etc.) — we only go one level deep
            continue
        if not item["name"].lower().endswith(".ai"):
            continue

        dest = os.path.join(OUT_DIR, slugify(category_name), item["name"]).replace("\\", "/")
        if os.path.exists(dest):
            stats["skipped"] += 1
            continue

        print(f"  ↓ {item['name']}")
        try:
            download_file(service, item["id"], dest)
            stats["downloaded"] += 1
        except Exception as e:
            print(f"    ERROR: {e}")
            stats["errors"] += 1


def main():
    service = get_service()
    print(f"Connected to Google Drive.")
    print(f"Root folder: {ROOT_FOLDER_ID}")
    print(f"Output: {OUT_DIR}\n")

    categories = list_folder(service, ROOT_FOLDER_ID)
    folders = [c for c in categories if c["mimeType"] == "application/vnd.google-apps.folder"]
    print(f"Found {len(folders)} categories\n")

    stats = {"downloaded": 0, "skipped": 0, "errors": 0}

    for folder in sorted(folders, key=lambda x: x["name"]):
        print(f"[{folder['name']}]")
        process_folder(service, folder["id"], folder["name"], stats)

    print(f"\nDone: {stats['downloaded']} downloaded, {stats['skipped']} skipped, {stats['errors']} errors")


if __name__ == "__main__":
    main()
