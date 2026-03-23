"""One-off: generate proveedores_shared from proveedores.py (do not run in production)."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = root / "routers" / "proveedores.py"
lines = p.read_text(encoding="utf-8").splitlines(keepends=True)

imp = """from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, model_validator

from config import settings

"""

doc = '"""\nHelpers compartidos: proveedores y facturas de proveedor.\n"""\n\n'
roles = "".join(lines[24:29])  # logger + ROLES (sin router)
# GROQ.._groq_api_key [37:55], _tenant.._factura_linea [56:127], skip proveedor models, factura models+groq [164:256]
body = "".join(lines[37:55] + lines[56:127] + lines[164:256])
shared = doc + imp + roles + body
(root / "routers" / "proveedores_shared.py").write_text(shared, encoding="utf-8")
print("Wrote proveedores_shared.py", len(shared.splitlines()), "lines")
