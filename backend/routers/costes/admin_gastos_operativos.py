"""
Gastos operativos fijos (alquiler, suministros, etc.) por tenant.
"""

import logging
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db
from routers.recetas.admin_recetas_shared import (
    ROLES_RECETAS_ADMIN,
    ROLES_RECETAS_COCINA,
    _require_tenant_id,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Costes"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Prohibido"}},
)

CATEGORIAS = frozenset(
    {"local", "servicios", "personal", "otros", "marketing", "impuestos"}
)


class GastoCreate(BaseModel):
    concepto: str = Field(..., min_length=1, max_length=200)
    categoria: str = Field(default="otros", max_length=40)
    importe_mensual: Decimal = Field(..., ge=0)


@router.get("/gastos-operativos")
async def list_gastos_operativos(
    current_user: dict = Depends(require_roles(ROLES_RECETAS_COCINA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])
            rows = await conn.fetch(
                """
                SELECT id, concepto, categoria, importe_mensual, created_at
                FROM gastos_operativos
                WHERE tenant_id = $1
                ORDER BY categoria, concepto
                """,
                UUID(tenant_id),
            )
        return [
            {
                "id": str(r["id"]),
                "concepto": r["concepto"],
                "categoria": r["categoria"],
                "importe_mensual": float(r["importe_mensual"] or 0),
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]
    except Exception as e:
        err = str(e).lower()
        if "gastos_operativos" in err and ("does not exist" in err or "undefined_table" in err):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Tabla gastos_operativos no instalada. Ejecuta en Supabase: "
                    "backend/sql/migration_gastos_operativos.sql"
                ),
            )
        logger.error("list_gastos_operativos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/gastos-operativos")
async def create_gasto_operativo(
    body: GastoCreate,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    cat = (body.categoria or "otros").strip().lower()
    if cat not in CATEGORIAS:
        cat = "otros"
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])
            row = await conn.fetchrow(
                """
                INSERT INTO gastos_operativos (tenant_id, concepto, categoria, importe_mensual)
                VALUES ($1, $2, $3, $4)
                RETURNING id, concepto, categoria, importe_mensual, created_at
                """,
                UUID(tenant_id),
                body.concepto.strip(),
                cat,
                body.importe_mensual,
            )
        return {
            "id": str(row["id"]),
            "concepto": row["concepto"],
            "categoria": row["categoria"],
            "importe_mensual": float(row["importe_mensual"]),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        if "gastos_operativos" in err and ("does not exist" in err or "undefined_table" in err):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Tabla gastos_operativos no instalada. Ejecuta "
                    "backend/sql/migration_gastos_operativos.sql"
                ),
            )
        logger.error("create_gasto_operativo: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.delete("/gastos-operativos/{gasto_id}")
async def delete_gasto_operativo(
    gasto_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])
            res = await conn.execute(
                """
                DELETE FROM gastos_operativos
                WHERE id = $1 AND tenant_id = $2
                """,
                gasto_id,
                UUID(tenant_id),
            )
        if "DELETE 0" in res:
            raise HTTPException(status_code=404, detail="Gasto no encontrado")
        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        if "gastos_operativos" in err and ("does not exist" in err or "undefined_table" in err):
            raise HTTPException(
                status_code=503,
                detail="Tabla gastos_operativos no instalada",
            )
        logger.error("delete_gasto_operativo: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
