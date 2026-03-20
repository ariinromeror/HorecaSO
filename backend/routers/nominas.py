"""
Nóminas — cálculo con cotizaciones SS fijas (España).
Tabla: nominas (empleado_id, mes, anio, importes NUMERIC).
"""

from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_RRHH = ["admin", "director"]

SS_EMPLEADO = Decimal("0.0635")
SS_EMPRESA = Decimal("0.299")

router = APIRouter(
    prefix="/nominas",
    tags=["Nominas"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


def _tenant_id(current_user: dict) -> UUID:
    tid = current_user.get("negocio_id")
    if not tid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    return UUID(str(tid))


def _q2(d: Decimal) -> Decimal:
    return d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _money_json(v: Any) -> float:
    if v is None:
        return 0.0
    return float(_q2(Decimal(str(v))))


def _nomina_row_dict(r: Any) -> dict:
    ca = r.get("created_at")
    return {
        "id": str(r["id"]),
        "empleado_id": str(r["empleado_id"]),
        "mes": r["mes"],
        "anio": r["anio"],
        "salario_bruto": _money_json(r["salario_bruto"]),
        "horas_extra_importe": _money_json(r.get("horas_extra_importe")),
        "plus_festivos": _money_json(r.get("plus_festivos")),
        "otros_devengos": _money_json(r.get("otros_devengos")),
        "total_devengos": _money_json(r["total_devengos"]),
        "ss_empleado": _money_json(r["ss_empleado"]),
        "irpf": _money_json(r["irpf"]),
        "otras_deducciones": _money_json(r.get("otras_deducciones")),
        "total_deducciones": _money_json(r["total_deducciones"]),
        "liquido": _money_json(r["liquido"]),
        "ss_empresa": _money_json(r["ss_empresa"]),
        "coste_total_empresa": _money_json(r["coste_total_empresa"]),
        "pagada": r.get("pagada", False),
        "pdf_url": r.get("pdf_url"),
        "created_at": ca.isoformat() if ca and hasattr(ca, "isoformat") else None,
    }


class CalcularNominaBody(BaseModel):
    empleado_id: str
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2000, le=2100)
    horas_extra_cantidad: Optional[Decimal] = None
    plus_festivos: Optional[Decimal] = None
    otros_devengos: Optional[Decimal] = None
    otras_deducciones: Optional[Decimal] = None


@router.post("/calcular", status_code=status.HTTP_201_CREATED)
async def calcular_nomina(
    body: CalcularNominaBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    emp_id = UUID(body.empleado_id)
    try:
        async with get_db() as conn:
            emp = await conn.fetchrow(
                """
                SELECT salario_bruto_mensual, irpf_porcentaje, jornada_horas
                FROM empleados
                WHERE id = $1 AND tenant_id = $2
                """,
                emp_id,
                tenant_id,
            )
            if not emp:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Empleado no encontrado",
                )
            salario_mensual = emp["salario_bruto_mensual"]
            if salario_mensual is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Empleado sin salario_bruto_mensual",
                )
            salario_bruto = _q2(Decimal(str(salario_mensual)))
            jornada = emp["jornada_horas"]
            if jornada is None or Decimal(str(jornada)) <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Empleado sin jornada_horas válida",
                )
            jornada_horas = Decimal(str(jornada))
            irpf_pct = (
                _q2(Decimal(str(emp["irpf_porcentaje"])))
                if emp["irpf_porcentaje"] is not None
                else Decimal("0")
            )

            existe = await conn.fetchval(
                """
                SELECT 1 FROM nominas n
                JOIN empleados e ON e.id = n.empleado_id
                WHERE n.empleado_id = $1 AND n.mes = $2 AND n.anio = $3
                  AND e.tenant_id = $4
                """,
                emp_id,
                body.mes,
                body.anio,
                tenant_id,
            )
            if existe:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe nómina para ese periodo",
                )

            horas_extra_qty = body.horas_extra_cantidad or Decimal("0")
            divisor = jornada_horas * Decimal("4.33")
            salario_hora = _q2(salario_bruto / divisor)
            horas_extra_importe = _q2(
                horas_extra_qty * salario_hora * Decimal("1.75")
            )
            plus_f = _q2(body.plus_festivos or Decimal("0"))
            otros_d = _q2(body.otros_devengos or Decimal("0"))
            total_devengos = _q2(
                salario_bruto + horas_extra_importe + plus_f + otros_d
            )
            ss_empleado = _q2(total_devengos * SS_EMPLEADO)
            irpf = _q2(total_devengos * (irpf_pct / Decimal("100")))
            otras_ded = _q2(body.otras_deducciones or Decimal("0"))
            total_deducciones = _q2(ss_empleado + irpf + otras_ded)
            liquido = _q2(total_devengos - total_deducciones)
            ss_empresa = _q2(total_devengos * SS_EMPRESA)
            coste_total_empresa = _q2(total_devengos + ss_empresa)

            row = await conn.fetchrow(
                """
                INSERT INTO nominas (
                    empleado_id, mes, anio, salario_bruto, horas_extra_importe,
                    plus_festivos, otros_devengos, total_devengos,
                    ss_empleado, irpf, otras_deducciones, total_deducciones,
                    liquido, ss_empresa, coste_total_empresa, pagada
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                    FALSE
                )
                RETURNING *
                """,
                emp_id,
                body.mes,
                body.anio,
                salario_bruto,
                horas_extra_importe,
                plus_f,
                otros_d,
                total_devengos,
                ss_empleado,
                irpf,
                otras_ded,
                total_deducciones,
                liquido,
                ss_empresa,
                coste_total_empresa,
            )

            desglose = {
                "salario_bruto_mensual_base": float(salario_bruto),
                "salario_hora": float(salario_hora),
                "horas_extra_cantidad": float(horas_extra_qty),
                "horas_extra_importe": float(horas_extra_importe),
                "plus_festivos": float(plus_f),
                "otros_devengos": float(otros_d),
                "total_devengos": float(total_devengos),
                "ss_empleado_pct": float(SS_EMPLEADO * Decimal("100")),
                "ss_empleado": float(ss_empleado),
                "irpf_porcentaje_aplicado": float(irpf_pct),
                "irpf": float(irpf),
                "otras_deducciones": float(otras_ded),
                "total_deducciones": float(total_deducciones),
                "liquido": float(liquido),
                "ss_empresa_pct": float(SS_EMPRESA * Decimal("100")),
                "ss_empresa": float(ss_empresa),
                "coste_total_empresa": float(coste_total_empresa),
            }
            out = _nomina_row_dict(row)
            out["desglose"] = desglose
            return out
    except HTTPException:
        raise
    except Exception as e:
        logger.error("calcular_nomina: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/{nomina_id}/detalle")
async def get_nomina_detalle(
    nomina_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT n.*,
                       e.dni, e.nss, e.cargo, e.iban,
                       e.fecha_inicio, e.usuario_id,
                       COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM nominas n
                JOIN empleados e ON e.id = n.empleado_id
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE n.id = $1 AND e.tenant_id = $2
                """,
                nomina_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Nómina no encontrada",
                )
            nomina = _nomina_row_dict(row)
            nomina["empleado"] = {
                "id": str(row["empleado_id"]),
                "nombre_empleado": row["nombre_empleado"],
                "dni": row["dni"],
                "nss": row["nss"],
                "cargo": row["cargo"],
                "iban": row["iban"],
                "fecha_inicio": row["fecha_inicio"].isoformat()
                if row.get("fecha_inicio")
                else None,
                "usuario_id": str(row["usuario_id"]) if row.get("usuario_id") else None,
            }
            return nomina
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_nomina_detalle: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/{empleado_id}")
async def list_nominas_empleado(
    empleado_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            ok = await conn.fetchval(
                "SELECT 1 FROM empleados WHERE id = $1 AND tenant_id = $2",
                empleado_id,
                tenant_id,
            )
            if not ok:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Empleado no encontrado",
                )
            rows = await conn.fetch(
                """
                SELECT * FROM nominas
                WHERE empleado_id = $1
                ORDER BY anio DESC, mes DESC
                """,
                empleado_id,
            )
            return [_nomina_row_dict(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_nominas_empleado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
