"""
Helpers y constantes compartidos entre routers RRHH (empleados, fichajes, cuadrantes, ausencias).
"""

from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ROLES_RRHH = ["admin", "director"]
ROLES_JEFE = ["admin", "director", "jefe_sala"]
ROLES_EMPLEADO = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
    "almacen",
]


def _uid(current_user: dict) -> UUID:
    s = current_user.get("user_id") or current_user.get("sub")
    if not s:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return UUID(str(s))


def _tenant_id(current_user: dict) -> UUID:
    tid = current_user.get("negocio_id")
    if not tid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    return UUID(str(tid))


async def _usuario_tenant_outlet(conn, user_id: UUID) -> tuple[UUID, UUID | None]:
    row = await conn.fetchrow(
        "SELECT tenant_id, outlet_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    return row["tenant_id"], row["outlet_id"]


async def _fetch_empleado_con_usuario(
    conn, empleado_id: UUID, tenant_id: UUID
) -> Any | None:
    """Fila empleado + nombre_empleado (usuario o nombre_completo)."""
    return await conn.fetchrow(
        """
        SELECT e.*, COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
        FROM empleados e
        LEFT JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.id = $1 AND e.tenant_id = $2
        """,
        empleado_id,
        tenant_id,
    )


async def _ensure_empleado_tenant(
    conn, empleado_id: UUID, tenant_id: UUID
) -> Any:
    row = await conn.fetchrow(
        """
        SELECT * FROM empleados
        WHERE id = $1 AND tenant_id = $2
        """,
        empleado_id,
        tenant_id,
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado",
        )
    return row


def _q2(v: Any) -> Decimal:
    if v is None:
        return Decimal("0")
    return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _serialize_empleado_list_row(r: Any) -> dict:
    return {
        "id": str(r["id"]),
        "nombre_empleado": r["nombre_empleado"],
        "email": r["email"],
        "dni": r["dni"],
        "cargo": r["cargo"],
        "contrato": r["contrato"],
        "jornada_horas": float(r["jornada_horas"])
        if r["jornada_horas"] is not None
        else None,
        "salario_bruto_mensual": float(_q2(r["salario_bruto_mensual"]))
        if r["salario_bruto_mensual"] is not None
        else None,
        "activo": r["activo"],
        "fecha_inicio": r["fecha_inicio"].isoformat()
        if r.get("fecha_inicio")
        else None,
        "usuario_id": str(r["usuario_id"]) if r.get("usuario_id") else None,
    }


def _serialize_empleado_full(r: Any) -> dict:
    fi = r.get("fecha_inicio")
    return {
        "id": str(r["id"]),
        "tenant_id": str(r["tenant_id"]),
        "usuario_id": str(r["usuario_id"]) if r.get("usuario_id") else None,
        "nombre_empleado": r.get("nombre_empleado"),
        "dni": r["dni"],
        "nss": r["nss"],
        "cargo": r["cargo"],
        "contrato": r["contrato"],
        "jornada_horas": float(r["jornada_horas"])
        if r["jornada_horas"] is not None
        else None,
        "salario_bruto_mensual": float(_q2(r["salario_bruto_mensual"]))
        if r["salario_bruto_mensual"] is not None
        else None,
        "irpf_porcentaje": float(r["irpf_porcentaje"])
        if r.get("irpf_porcentaje") is not None
        else None,
        "fecha_inicio": fi.isoformat() if fi else None,
        "iban": r.get("iban"),
        "activo": r["activo"],
    }
