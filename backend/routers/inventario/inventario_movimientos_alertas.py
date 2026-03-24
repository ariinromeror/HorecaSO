"""
Inventario: alertas de stock.
"""

import logging
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import require_roles
from database import get_db

from .inventario_shared import (
    ROLES_LECTURA,
    _fetch_usuario,
    _serialize_stock_qty,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/stock-alertas")
async def list_stock_alertas(
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    """Artículos con stock_actual <= stock_minimo, más crítico primero."""
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            rows = await conn.fetch(
                """
                SELECT id, nombre, unidad_medida, stock_actual, stock_minimo
                FROM articulos
                WHERE tenant_id = $1 AND stock_actual <= stock_minimo
                ORDER BY (stock_actual - stock_minimo) ASC
                """,
                UUID(str(urow["tenant_id"])),
            )

        out = []
        for r in rows:
            sa = Decimal(str(r["stock_actual"] or 0))
            sm = Decimal(str(r["stock_minimo"] or 0))
            deficit = sm - sa
            out.append(
                {
                    "id": str(r["id"]),
                    "nombre": r["nombre"],
                    "unidad_medida": r["unidad_medida"],
                    "stock_actual": _serialize_stock_qty(sa),
                    "stock_minimo": _serialize_stock_qty(sm),
                    "deficit": _serialize_stock_qty(deficit),
                }
            )
        return out
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_stock_alertas: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
