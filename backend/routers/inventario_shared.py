"""
Helpers compartidos inventario (artículos y movimientos).
"""

import logging
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ROLES_LECTURA = ["director", "admin", "almacen", "cocina"]
ROLES_ESCRITURA_ART = ["director", "admin", "almacen"]
ROLES_MOVIMIENTOS = ["director", "admin", "almacen"]


def _serialize_stock_qty(value: Any) -> float:
    """Serialización JSON de cantidades de stock (4 decimales)."""
    d = Decimal(str(value if value is not None else 0))
    return round(float(d), 4)


def _serialize_coste_json(value: Any) -> Optional[float]:
    """Coste en respuesta: Decimal internamente vía str, float solo para JSON."""
    if value is None:
        return None
    return float(Decimal(str(value)))


async def _fetch_usuario(conn, user_id: str) -> Any | None:
    return await conn.fetchrow(
        """
        SELECT id, tenant_id, outlet_id, nombre, rol
        FROM usuarios WHERE id = $1
        """,
        UUID(user_id),
    )


def _articulo_to_dict(r: Any) -> dict:
    sa = Decimal(str(r["stock_actual"] if r["stock_actual"] is not None else 0))
    sm = Decimal(str(r["stock_minimo"] if r["stock_minimo"] is not None else 0))
    alerta = sa <= sm
    ca = r.get("created_at")
    created_iso = ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None
    smax = None
    if r.get("stock_maximo") is not None:
        smax = _serialize_stock_qty(r["stock_maximo"])
    return {
        "id": str(r["id"]),
        "nombre": r["nombre"],
        "sku": r["sku"],
        "unidad_medida": r["unidad_medida"],
        "stock_actual": _serialize_stock_qty(sa),
        "stock_minimo": _serialize_stock_qty(sm),
        "stock_maximo": smax,
        "coste_unitario": _serialize_coste_json(r.get("coste_unitario")),
        "categoria_almacen": r.get("categoria_almacen"),
        "created_at": created_iso,
        "alerta_stock": alerta,
    }


async def _insert_movimiento(
    conn,
    articulo_id: UUID,
    outlet_id: Optional[UUID],
    usuario_id: UUID,
    tipo: str,
    cantidad: Decimal,
    coste_unitario: Optional[Decimal],
    motivo: Optional[str],
    ticket_id: Optional[UUID],
) -> UUID:
    row = await conn.fetchrow(
        """
        INSERT INTO movimientos_stock (
            articulo_id, outlet_id, tipo, cantidad, coste_unitario,
            motivo, usuario_id, ticket_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        """,
        articulo_id,
        outlet_id,
        tipo,
        cantidad,
        coste_unitario,
        motivo,
        usuario_id,
        ticket_id,
    )
    return row["id"]
