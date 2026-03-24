"""Write proveedores.py (CRUD only) and facturas_proveedor.py from original proveedores.py."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = root / "routers" / "proveedores.py"
lines = p.read_text(encoding="utf-8").splitlines(keepends=True)

proveedores_py = '''"""
Router proveedores (CRUD) para HorecaSO.
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator

from auth.dependencies import require_roles
from database import get_db

from routers.proveedores.proveedores_shared import (
    ROLES_ADMIN_ALMACEN,
    ROLES_LECTURA,
    _factura_row_to_dict,
    _proveedor_row_to_dict,
    _tenant_id_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Proveedores"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

''' + "".join(lines[127:162]) + "\n" + "".join(lines[258:521])

facturas_py = '''"""
Router facturas de proveedor y escaneo IA.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from routers.proveedores.proveedores_shared import (
    ROLES_ADMIN_ALMACEN,
    ROLES_LECTURA,
    CreateFacturaProveedorRequest,
    EscanearFacturaIARequest,
    FacturaLineaIn,
    _factura_linea_to_dict,
    _factura_row_to_dict,
    _groq_escanear_sync,
    _strip_data_url,
    _tenant_id_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Proveedores"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

''' + "".join(lines[523:882])

(p.parent / "proveedores.py").write_text(proveedores_py, encoding="utf-8")
(p.parent / "facturas_proveedor.py").write_text(facturas_py, encoding="utf-8")
print("Wrote proveedores.py and facturas_proveedor.py")
