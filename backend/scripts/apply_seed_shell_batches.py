"""Apply backend/sql/_shell_out*.json via Supabase Management API (requires SUPABASE_ACCESS_TOKEN)."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_REF = "ldkagdnnpjgqycxqhhtr"
API = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
ROOT = Path(__file__).resolve().parents[1] / "sql"


def main() -> None:
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print("SUPABASE_ACCESS_TOKEN is not set", file=sys.stderr)
        sys.exit(1)

    for i in range(1, 5):
        path = ROOT / f"_shell_out{i}.json"
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            sys.exit(1)
        payload = json.loads(path.read_text(encoding="utf-8"))
        body = json.dumps({"query": payload["query"]}).encode("utf-8")
        req = urllib.request.Request(
            API,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "User-Agent": "HorecaSO-seed-script/1.0",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                print(f"batch {i}: HTTP {resp.status} {raw[:500]}")
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", errors="replace")
            print(f"batch {i}: HTTP {e.code} {err}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
