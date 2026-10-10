"""
Afirmaciones falsas de Verifactu en README / STEP / PRD / REFERENCIA.
Falla si aparecen COMPLETO/Complete/nativo/implements/CSV AEAT en claims Verifactu.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    ROOT / "README.md",
    ROOT / "docs" / "STEP_HORECASO.md",
    ROOT / "docs" / "PRD_HorecaSO.md",
    ROOT / "docs" / "REFERENCIA_TECNICA.md",
]

CHECKS = [
    (re.compile(r"VERIFACTU[^\n]{0,40}COMPLETO|COMPLETO[^\n]{0,40}VERIFACTU", re.I), "COMPLETO+Verifactu"),
    (re.compile(r"Verifactu[^\n]{0,80}\bComplete\b|\bComplete\b[^\n]{0,80}Verifactu", re.I), "Complete+Verifactu"),
    (re.compile(r"Verifactu\s+nativo", re.I), "nativo"),
    (re.compile(r"implements\s+it\s+natively", re.I), "implements"),
    (re.compile(r"CSV\s+(para\s+)?AEAT", re.I), "CSV para AEAT"),
]


def main() -> None:
    hits: list[str] = []
    for path in FILES:
        text = path.read_text(encoding="utf-8")
        for i, line in enumerate(text.splitlines(), 1):
            for cre, label in CHECKS:
                if cre.search(line):
                    hits.append(f"{path.relative_to(ROOT)}:{i} [{label}]: {line.strip()}")
    if hits:
        print("FALLO — afirmaciones Verifactu a corregir:", file=sys.stderr)
        print("\n".join(hits), file=sys.stderr)
        sys.exit(1)
    print("OK: 0 claims Verifactu con COMPLETO/Complete/nativo/implements/CSV AEAT")


if __name__ == "__main__":
    main()
