"""
Ejecuta schema_mcp_json_to_markdown sobre el dump MCP y falla si la salida
contiene «Verifactu (AEAT)».

Uso (desde backend/):
  python scripts/assert_schema_md_sin_verifactu_aeat.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON = ROOT / "sql" / "list_tables_mcp_20260327.json"
SCRIPT = ROOT / "scripts" / "schema_mcp_json_to_markdown.py"


def main() -> None:
    if not JSON.is_file():
        print(f"No existe {JSON}", file=sys.stderr)
        sys.exit(2)
    r = subprocess.run(
        [sys.executable, str(SCRIPT), str(JSON)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        sys.exit(r.returncode)
    out = r.stdout
    if "Verifactu (AEAT)" in out:
        print(
            'FALLO: la salida del script aún contiene "Verifactu (AEAT)"',
            file=sys.stderr,
        )
        for i, line in enumerate(out.splitlines(), 1):
            if "Verifactu (AEAT)" in line:
                print(f"  L{i}: {line}", file=sys.stderr)
        sys.exit(1)
    print("OK schema markdown sin «Verifactu (AEAT)»")


if __name__ == "__main__":
    main()
