"""
Router RRHH: empleados, fichajes (turnos), cuadrantes y ausencias.

Tabla empleados: incluye nombre_completo VARCHAR(255).
Nombre mostrado: COALESCE(u.nombre, e.nombre_completo) (LEFT JOIN usuarios).
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo
from typing import Any, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_RRHH = ["admin", "director"]
ROLES_JEFE = ["admin", "director", "jefe_sala"]
ROLES_EMPLEADO = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "almacen",
]

router = APIRouter(
    tags=["EmpleadosRRHH"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

r_empleados = APIRouter(prefix="/empleados")
r_turnos = APIRouter(prefix="/turnos")
r_cuadrantes = APIRouter(prefix="/cuadrantes")
r_ausencias = APIRouter(prefix="/ausencias")


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


# --- GET /empleados ---
@r_empleados.get("")
async def list_empleados(
    buscar: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    cargo: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            conditions = ["e.tenant_id = $1"]
            params: list[Any] = [tenant_id]
            n = 2

            if buscar:
                conditions.append(
                    f"(u.nombre ILIKE ${n} OR u.email ILIKE ${n})"
                )
                params.append(f"%{buscar}%")
                n += 1
            if activo is not None:
                conditions.append(f"e.activo = ${n}")
                params.append(activo)
                n += 1
            if cargo:
                conditions.append(f"e.cargo ILIKE ${n}")
                params.append(f"%{cargo}%")
                n += 1

            where_sql = " AND ".join(conditions)
            rows = await conn.fetch(
                f"""
                SELECT
                    e.id,
                    COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado,
                    u.email AS email,
                    e.dni,
                    e.cargo,
                    e.contrato,
                    e.jornada_horas,
                    e.salario_bruto_mensual,
                    e.activo,
                    e.fecha_inicio,
                    e.usuario_id
                FROM empleados e
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE {where_sql}
                ORDER BY nombre_empleado NULLS LAST, e.id
                """,
                *params,
            )
            return [_serialize_empleado_list_row(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_empleados: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateEmpleadoBody(BaseModel):
    nombre_completo: Optional[str] = None
    dni: Optional[str] = None
    nss: Optional[str] = None
    cargo: Optional[str] = None
    categoria_profesional: Optional[str] = None
    contrato: Optional[str] = None
    jornada_horas: Optional[Decimal] = None
    salario_bruto_mensual: Optional[Decimal] = None
    irpf_porcentaje: Optional[Decimal] = None
    fecha_inicio: Optional[date] = None
    iban: Optional[str] = None
    usuario_id: Optional[str] = None


@r_empleados.post("", status_code=status.HTTP_201_CREATED)
async def create_empleado(
    body: CreateEmpleadoBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    uid_link = UUID(body.usuario_id) if body.usuario_id else None
    try:
        async with get_db() as conn:
            if uid_link:
                urow = await conn.fetchrow(
                    "SELECT id FROM usuarios WHERE id = $1 AND tenant_id = $2",
                    uid_link,
                    tenant_id,
                )
                if not urow:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="usuario_id no válido para este tenant",
                    )
            unset = body.model_dump(exclude_unset=True)
            cols = ["tenant_id", "usuario_id"]
            params_ins: list[Any] = [tenant_id, uid_link]
            if "nombre_completo" in unset:
                cols.append("nombre_completo")
                nv = unset["nombre_completo"]
                if isinstance(nv, str):
                    nv = nv.strip() or None
                params_ins.append(nv)
            cols.extend(
                [
                    "dni",
                    "nss",
                    "cargo",
                    "contrato",
                    "jornada_horas",
                    "salario_bruto_mensual",
                    "irpf_porcentaje",
                    "fecha_inicio",
                    "iban",
                    "activo",
                ]
            )
            params_ins.extend(
                [
                    body.dni,
                    body.nss,
                    body.cargo,
                    body.contrato,
                    body.jornada_horas,
                    body.salario_bruto_mensual,
                    body.irpf_porcentaje,
                    body.fecha_inicio,
                    body.iban,
                ]
            )
            ph = [f"${k}" for k in range(1, len(params_ins) + 1)]
            ph.append("TRUE")
            sql_ins = (
                f"INSERT INTO empleados ({', '.join(cols)}) "
                f"VALUES ({', '.join(ph)}) RETURNING id"
            )
            row = await conn.fetchrow(sql_ins, *params_ins)
            detail = await _fetch_empleado_con_usuario(conn, row["id"], tenant_id)
            return _serialize_empleado_full(detail)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_empleado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@r_empleados.get("/{empleado_id}")
async def get_empleado(
    empleado_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            row = await _fetch_empleado_con_usuario(conn, empleado_id, tenant_id)
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            return _serialize_empleado_full(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_empleado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class UpdateEmpleadoBody(BaseModel):
    nombre_completo: Optional[str] = None
    dni: Optional[str] = None
    nss: Optional[str] = None
    cargo: Optional[str] = None
    categoria_profesional: Optional[str] = None
    contrato: Optional[str] = None
    jornada_horas: Optional[Decimal] = None
    salario_bruto_mensual: Optional[Decimal] = None
    irpf_porcentaje: Optional[Decimal] = None
    fecha_inicio: Optional[date] = None
    iban: Optional[str] = None
    activo: Optional[bool] = None
    usuario_id: Optional[str] = None

    @model_validator(mode="after")
    def at_least_one(self):
        data = self.model_dump(exclude_unset=True)
        if not data:
            raise ValueError("Al menos un campo es requerido")
        return self


@r_empleados.put("/{empleado_id}")
async def update_empleado(
    empleado_id: UUID,
    body: UpdateEmpleadoBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    data = body.model_dump(exclude_unset=True)
    if "nombre_completo" in data and isinstance(data["nombre_completo"], str):
        data["nombre_completo"] = data["nombre_completo"].strip() or None
    if "usuario_id" in data and data["usuario_id"]:
        data["usuario_id"] = UUID(data["usuario_id"])
    elif "usuario_id" in data and not data["usuario_id"]:
        data["usuario_id"] = None

    cols_map = {
        "nombre_completo": "nombre_completo",
        "dni": "dni",
        "nss": "nss",
        "cargo": "cargo",
        "contrato": "contrato",
        "jornada_horas": "jornada_horas",
        "salario_bruto_mensual": "salario_bruto_mensual",
        "irpf_porcentaje": "irpf_porcentaje",
        "fecha_inicio": "fecha_inicio",
        "iban": "iban",
        "activo": "activo",
        "usuario_id": "usuario_id",
    }

    try:
        async with get_db() as conn:
            exists = await conn.fetchval(
                "SELECT 1 FROM empleados WHERE id = $1 AND tenant_id = $2",
                empleado_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            if data.get("usuario_id"):
                urow = await conn.fetchrow(
                    "SELECT id FROM usuarios WHERE id = $1 AND tenant_id = $2",
                    data["usuario_id"],
                    tenant_id,
                )
                if not urow:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="usuario_id no válido para este tenant",
                    )

            sets: list[str] = []
            vals: list[Any] = []
            i = 1
            for key, col in cols_map.items():
                if key not in data:
                    continue
                sets.append(f"{col} = ${i}")
                vals.append(data[key])
                i += 1
            if not sets:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Al menos un campo es requerido",
                )
            vals.extend([empleado_id, tenant_id])
            sql = (
                "UPDATE empleados SET "
                + ", ".join(sets)
                + f" WHERE id = ${i} AND tenant_id = ${i + 1} RETURNING *"
            )
            await conn.fetchrow(sql, *vals)
            detail = await _fetch_empleado_con_usuario(conn, empleado_id, tenant_id)
            return _serialize_empleado_full(detail)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_empleado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


# --- Turnos / fichajes ---
class FichajeBody(BaseModel):
    empleado_id: str


@r_turnos.post("/fichaje-entrada")
async def fichaje_entrada(
    body: FichajeBody,
    current_user: dict = Depends(require_roles(ROLES_EMPLEADO)),
):
    tenant_id = _tenant_id(current_user)
    user_uuid = _uid(current_user)
    emp_id = UUID(body.empleado_id)
    try:
        async with get_db() as conn:
            _, outlet_id = await _usuario_tenant_outlet(conn, user_uuid)
            if not outlet_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuario sin outlet asignado",
                )
            await _ensure_empleado_tenant(conn, emp_id, tenant_id)

            open_t = await conn.fetchrow(
                """
                SELECT id FROM turnos
                WHERE empleado_id = $1
                  AND fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date
                  AND hora_entrada IS NOT NULL
                  AND hora_salida IS NULL
                """,
                emp_id,
            )
            if open_t:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya hay un fichaje de entrada activo",
                )

            row = await conn.fetchrow(
                """
                INSERT INTO turnos (
                    empleado_id, outlet_id, fecha, hora_entrada, tipo
                )
                VALUES (
                    $1, $2,
                    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date,
                    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::time,
                    'normal'
                )
                RETURNING id, empleado_id, hora_entrada, fecha
                """,
                emp_id,
                outlet_id,
            )
            he = row["hora_entrada"]
            return {
                "turno_id": str(row["id"]),
                "empleado_id": str(row["empleado_id"]),
                "hora_entrada": he.isoformat() if hasattr(he, "isoformat") else str(he),
                "fecha": row["fecha"].isoformat(),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("fichaje_entrada: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


def _jornada_diaria_esperada(jornada_semanal: Any) -> Decimal:
    if jornada_semanal is None:
        return Decimal("8")
    j = Decimal(str(jornada_semanal))
    if j <= Decimal("0"):
        return Decimal("8")
    return (j / Decimal("5")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@r_turnos.post("/fichaje-salida")
async def fichaje_salida(
    body: FichajeBody,
    current_user: dict = Depends(require_roles(ROLES_EMPLEADO)),
):
    tenant_id = _tenant_id(current_user)
    emp_id = UUID(body.empleado_id)
    tz_mad = ZoneInfo("Europe/Madrid")
    try:
        async with get_db() as conn:
            await _ensure_empleado_tenant(conn, emp_id, tenant_id)

            row = await conn.fetchrow(
                """
                SELECT t.id, t.hora_entrada, t.fecha, e.jornada_horas
                FROM turnos t
                JOIN empleados e ON e.id = t.empleado_id
                WHERE t.empleado_id = $1
                  AND t.fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date
                  AND t.hora_entrada IS NOT NULL
                  AND t.hora_salida IS NULL
                FOR UPDATE OF t
                """,
                emp_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No hay fichaje de entrada activo",
                )

            jornada_dia = _jornada_diaria_esperada(row["jornada_horas"])
            now_local = datetime.now(tz_mad)
            salida_time: time = now_local.time()
            fecha_d: date = row["fecha"]
            entrada_t = row["hora_entrada"]

            e_dt = datetime.combine(fecha_d, entrada_t, tzinfo=tz_mad)
            s_dt = datetime.combine(fecha_d, salida_time, tzinfo=tz_mad)
            if s_dt <= e_dt:
                s_dt += timedelta(days=1)

            horas_trabajadas = (
                Decimal(str((s_dt - e_dt).total_seconds() / 3600.0))
                .quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            )
            horas_extra = (
                (horas_trabajadas - jornada_dia)
                if horas_trabajadas > jornada_dia
                else Decimal("0")
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            updated = await conn.fetchrow(
                """
                UPDATE turnos SET
                    hora_salida = $2,
                    horas_trabajadas = $3,
                    horas_extra = $4
                WHERE id = $1
                RETURNING id, hora_entrada, hora_salida, horas_trabajadas, horas_extra
                """,
                row["id"],
                salida_time,
                horas_trabajadas,
                horas_extra,
            )

            he = updated["hora_entrada"]
            hs = updated["hora_salida"]
            return {
                "turno_id": str(updated["id"]),
                "hora_entrada": he.isoformat()
                if hasattr(he, "isoformat")
                else str(he),
                "hora_salida": hs.isoformat()
                if hasattr(hs, "isoformat")
                else str(hs),
                "horas_trabajadas": float(updated["horas_trabajadas"]),
                "horas_extra": float(updated["horas_extra"]),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("fichaje_salida: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


def _serialize_turno_row(r: Any) -> dict:
    fe = r["fecha"]
    he = r["hora_entrada"]
    hs = r["hora_salida"]
    return {
        "id": str(r["id"]),
        "empleado_id": str(r["empleado_id"]),
        "nombre_empleado": r.get("nombre_empleado"),
        "outlet_id": str(r["outlet_id"]) if r.get("outlet_id") else None,
        "fecha": fe.isoformat() if fe else None,
        "hora_entrada": he.isoformat() if he and hasattr(he, "isoformat") else None,
        "hora_salida": hs.isoformat() if hs and hasattr(hs, "isoformat") else None,
        "horas_trabajadas": float(r["horas_trabajadas"])
        if r.get("horas_trabajadas") is not None
        else None,
        "horas_extra": float(r["horas_extra"])
        if r.get("horas_extra") is not None
        else None,
        "tipo": r.get("tipo"),
    }


@r_turnos.get("/horas-extra/{empleado_id}")
async def turnos_horas_extra(
    empleado_id: UUID,
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            await _ensure_empleado_tenant(conn, empleado_id, tenant_id)
            rows = await conn.fetch(
                """
                SELECT
                    t.id,
                    t.fecha,
                    t.horas_extra,
                    t.hora_entrada,
                    t.hora_salida,
                    COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM turnos t
                JOIN empleados e ON e.id = t.empleado_id AND e.tenant_id = $4
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE t.empleado_id = $1
                  AND EXTRACT(MONTH FROM t.fecha)::int = $2
                  AND EXTRACT(YEAR FROM t.fecha)::int = $3
                ORDER BY t.fecha DESC
                """,
                empleado_id,
                mes,
                anio,
                tenant_id,
            )
            total = Decimal("0")
            turnos_out: list[dict] = []
            for r in rows:
                hx = r["horas_extra"]
                if hx is not None:
                    total += Decimal(str(hx))
                turnos_out.append(
                    {
                        "id": str(r["id"]),
                        "fecha": r["fecha"].isoformat(),
                        "horas_extra": float(r["horas_extra"])
                        if r["horas_extra"] is not None
                        else 0.0,
                    }
                )
            return {
                "empleado_id": str(empleado_id),
                "mes": mes,
                "anio": anio,
                "total_horas_extra": float(
                    total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                ),
                "turnos": turnos_out,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("turnos_horas_extra: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@r_turnos.get("")
async def list_turnos(
    empleado_id: Optional[str] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    fecha: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_JEFE)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            cond = ["e.tenant_id = $1"]
            params: list[Any] = [tenant_id]
            n = 2
            if empleado_id:
                cond.append(f"t.empleado_id = ${n}")
                params.append(UUID(empleado_id))
                n += 1
            if desde:
                cond.append(f"t.fecha >= ${n}")
                params.append(desde)
                n += 1
            if hasta:
                cond.append(f"t.fecha <= ${n}")
                params.append(hasta)
                n += 1
            if fecha:
                cond.append(f"t.fecha = ${n}")
                params.append(fecha)
                n += 1
            w = " AND ".join(cond)
            rows = await conn.fetch(
                f"""
                SELECT
                    t.id,
                    t.empleado_id,
                    t.outlet_id,
                    t.fecha,
                    t.hora_entrada,
                    t.hora_salida,
                    t.horas_trabajadas,
                    t.horas_extra,
                    t.tipo,
                    COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM turnos t
                JOIN empleados e ON e.id = t.empleado_id
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE {w}
                ORDER BY t.fecha DESC, t.hora_entrada DESC NULLS LAST
                """,
                *params,
            )
            return [_serialize_turno_row(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_turnos: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CuadranteAsignacionIn(BaseModel):
    empleado_id: str
    fecha: date
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    puesto: Optional[str] = None


class CreateCuadranteBody(BaseModel):
    semana_inicio: date
    semana_fin: date
    asignaciones: list[CuadranteAsignacionIn] = Field(default_factory=list)


def _parse_time_optional(s: Optional[str]) -> Any:
    if not s:
        return None
    parts = s.split(":")
    h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    sec = int(parts[2]) if len(parts) > 2 else 0
    return time(h, m, sec)


@r_cuadrantes.get("")
async def get_cuadrantes(
    semana_inicio: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_JEFE)),
):
    tenant_id = _tenant_id(current_user)
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            _, outlet_id = await _usuario_tenant_outlet(conn, user_uuid)
            if not outlet_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuario sin outlet asignado",
                )
            if semana_inicio:
                crow = await conn.fetchrow(
                    """
                    SELECT c.id, c.outlet_id, c.semana_inicio, c.semana_fin,
                           c.publicado, c.created_by, c.created_at
                    FROM cuadrantes c
                    WHERE c.outlet_id = $1 AND c.semana_inicio = $2
                    """,
                    outlet_id,
                    semana_inicio,
                )
            else:
                crow = await conn.fetchrow(
                    """
                    SELECT c.id, c.outlet_id, c.semana_inicio, c.semana_fin,
                           c.publicado, c.created_by, c.created_at
                    FROM cuadrantes c
                    WHERE c.outlet_id = $1
                    ORDER BY c.semana_inicio DESC
                    LIMIT 1
                    """,
                    outlet_id,
                )
            if not crow:
                return None
            asigs = await conn.fetch(
                """
                SELECT a.id, a.empleado_id, a.fecha, a.hora_inicio, a.hora_fin,
                       a.puesto,
                       COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM cuadrante_asignaciones a
                JOIN empleados e ON e.id = a.empleado_id
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE a.cuadrante_id = $1 AND e.tenant_id = $2
                ORDER BY a.fecha, a.hora_inicio
                """,
                crow["id"],
                tenant_id,
            )
            ca = crow["created_at"]
            out_asig = []
            for a in asigs:
                hi = a["hora_inicio"]
                hf = a["hora_fin"]
                out_asig.append(
                    {
                        "id": str(a["id"]),
                        "empleado_id": str(a["empleado_id"]),
                        "nombre_empleado": a["nombre_empleado"],
                        "fecha": a["fecha"].isoformat(),
                        "hora_inicio": hi.isoformat()
                        if hi and hasattr(hi, "isoformat")
                        else None,
                        "hora_fin": hf.isoformat()
                        if hf and hasattr(hf, "isoformat")
                        else None,
                        "puesto": a["puesto"],
                    }
                )
            return {
                "id": str(crow["id"]),
                "outlet_id": str(crow["outlet_id"]),
                "semana_inicio": crow["semana_inicio"].isoformat(),
                "semana_fin": crow["semana_fin"].isoformat(),
                "publicado": crow["publicado"],
                "created_by": str(crow["created_by"])
                if crow["created_by"]
                else None,
                "created_at": ca.isoformat() if ca else None,
                "asignaciones": out_asig,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_cuadrantes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@r_cuadrantes.post("", status_code=status.HTTP_201_CREATED)
async def create_cuadrante(
    body: CreateCuadranteBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            async with conn.transaction():
                _, outlet_id = await _usuario_tenant_outlet(conn, user_uuid)
                if not outlet_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Usuario sin outlet asignado",
                    )
                crow = await conn.fetchrow(
                    """
                    INSERT INTO cuadrantes (
                        outlet_id, semana_inicio, semana_fin, publicado, created_by
                    )
                    VALUES ($1, $2, $3, FALSE, $4)
                    RETURNING id, outlet_id, semana_inicio, semana_fin,
                              publicado, created_by, created_at
                    """,
                    outlet_id,
                    body.semana_inicio,
                    body.semana_fin,
                    user_uuid,
                )
                cid = crow["id"]
                for item in body.asignaciones:
                    eid = UUID(item.empleado_id)
                    await _ensure_empleado_tenant(conn, eid, tenant_id)
                    hi = _parse_time_optional(item.hora_inicio)
                    hf = _parse_time_optional(item.hora_fin)
                    await conn.execute(
                        """
                        INSERT INTO cuadrante_asignaciones (
                            cuadrante_id, empleado_id, fecha,
                            hora_inicio, hora_fin, puesto
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                        cid,
                        eid,
                        item.fecha,
                        hi,
                        hf,
                        item.puesto,
                    )
                asigs = await conn.fetch(
                    """
                    SELECT a.id, a.empleado_id, a.fecha, a.hora_inicio, a.hora_fin,
                           a.puesto,
                           COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                    FROM cuadrante_asignaciones a
                    JOIN empleados e ON e.id = a.empleado_id
                    LEFT JOIN usuarios u ON u.id = e.usuario_id
                    WHERE a.cuadrante_id = $1
                    ORDER BY a.fecha, a.hora_inicio
                    """,
                    cid,
                )
            out_asig = []
            for a in asigs:
                hi = a["hora_inicio"]
                hf = a["hora_fin"]
                out_asig.append(
                    {
                        "id": str(a["id"]),
                        "empleado_id": str(a["empleado_id"]),
                        "nombre_empleado": a["nombre_empleado"],
                        "fecha": a["fecha"].isoformat(),
                        "hora_inicio": hi.isoformat()
                        if hi and hasattr(hi, "isoformat")
                        else None,
                        "hora_fin": hf.isoformat()
                        if hf and hasattr(hf, "isoformat")
                        else None,
                        "puesto": a["puesto"],
                    }
                )
            ca = crow["created_at"]
            return {
                "id": str(crow["id"]),
                "outlet_id": str(crow["outlet_id"]),
                "semana_inicio": crow["semana_inicio"].isoformat(),
                "semana_fin": crow["semana_fin"].isoformat(),
                "publicado": crow["publicado"],
                "created_by": str(crow["created_by"])
                if crow["created_by"]
                else None,
                "created_at": ca.isoformat() if ca else None,
                "asignaciones": out_asig,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_cuadrante: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@r_ausencias.get("")
async def list_ausencias(
    empleado_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_JEFE)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            cond = ["e.tenant_id = $1"]
            params: list[Any] = [tenant_id]
            n = 2
            if empleado_id:
                cond.append(f"s.empleado_id = ${n}")
                params.append(UUID(empleado_id))
                n += 1
            if estado:
                cond.append(f"s.estado = ${n}")
                params.append(estado)
                n += 1
            w = " AND ".join(cond)
            rows = await conn.fetch(
                f"""
                SELECT s.id, s.empleado_id, s.tipo, s.fecha_inicio, s.fecha_fin,
                       s.estado, s.motivo, s.aprobada_por, s.created_at,
                       COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM solicitudes_ausencia s
                JOIN empleados e ON e.id = s.empleado_id
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE {w}
                ORDER BY s.created_at DESC
                """,
                *params,
            )
            out = []
            for r in rows:
                ca = r["created_at"]
                out.append(
                    {
                        "id": str(r["id"]),
                        "empleado_id": str(r["empleado_id"]),
                        "nombre_empleado": r["nombre_empleado"],
                        "tipo": r["tipo"],
                        "fecha_inicio": r["fecha_inicio"].isoformat(),
                        "fecha_fin": r["fecha_fin"].isoformat(),
                        "estado": r["estado"],
                        "motivo": r["motivo"],
                        "aprobada_por": str(r["aprobada_por"])
                        if r["aprobada_por"]
                        else None,
                        "created_at": ca.isoformat() if ca else None,
                    }
                )
            return out
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_ausencias: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateAusenciaBody(BaseModel):
    empleado_id: str
    tipo: Literal["vacaciones", "enfermedad", "personal", "maternidad"]
    fecha_inicio: date
    fecha_fin: date
    motivo: Optional[str] = None


@r_ausencias.post("", status_code=status.HTTP_201_CREATED)
async def create_ausencia(
    body: CreateAusenciaBody,
    current_user: dict = Depends(require_roles(ROLES_EMPLEADO)),
):
    tenant_id = _tenant_id(current_user)
    emp_id = UUID(body.empleado_id)
    if body.fecha_fin < body.fecha_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_fin debe ser >= fecha_inicio",
        )
    try:
        async with get_db() as conn:
            await _ensure_empleado_tenant(conn, emp_id, tenant_id)
            row = await conn.fetchrow(
                """
                INSERT INTO solicitudes_ausencia (
                    empleado_id, tipo, fecha_inicio, fecha_fin, estado, motivo
                )
                VALUES ($1, $2, $3, $4, 'pendiente', $5)
                RETURNING id, empleado_id, tipo, fecha_inicio, fecha_fin,
                          estado, motivo, aprobada_por, created_at
                """,
                emp_id,
                body.tipo,
                body.fecha_inicio,
                body.fecha_fin,
                body.motivo,
            )
            ca = row["created_at"]
            return {
                "id": str(row["id"]),
                "empleado_id": str(row["empleado_id"]),
                "tipo": row["tipo"],
                "fecha_inicio": row["fecha_inicio"].isoformat(),
                "fecha_fin": row["fecha_fin"].isoformat(),
                "estado": row["estado"],
                "motivo": row["motivo"],
                "aprobada_por": None,
                "created_at": ca.isoformat() if ca else None,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_ausencia: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class PatchAusenciaEstadoBody(BaseModel):
    estado: Literal["aprobada", "rechazada"]


@r_ausencias.patch("/{ausencia_id}/estado")
async def patch_ausencia_estado(
    ausencia_id: UUID,
    body: PatchAusenciaEstadoBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    approver = _uid(current_user)
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT s.id
                FROM solicitudes_ausencia s
                JOIN empleados e ON e.id = s.empleado_id
                WHERE s.id = $1 AND e.tenant_id = $2
                """,
                ausencia_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            upd = await conn.fetchrow(
                """
                UPDATE solicitudes_ausencia SET
                    estado = $2,
                    aprobada_por = $3
                WHERE id = $1
                RETURNING id, empleado_id, tipo, fecha_inicio, fecha_fin,
                          estado, motivo, aprobada_por, created_at
                """,
                ausencia_id,
                body.estado,
                approver,
            )
            ca = upd["created_at"]
            return {
                "id": str(upd["id"]),
                "empleado_id": str(upd["empleado_id"]),
                "tipo": upd["tipo"],
                "fecha_inicio": upd["fecha_inicio"].isoformat(),
                "fecha_fin": upd["fecha_fin"].isoformat(),
                "estado": upd["estado"],
                "motivo": upd["motivo"],
                "aprobada_por": str(upd["aprobada_por"])
                if upd["aprobada_por"]
                else None,
                "created_at": ca.isoformat() if ca else None,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("patch_ausencia_estado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


router.include_router(r_empleados)
router.include_router(r_turnos)
router.include_router(r_cuadrantes)
router.include_router(r_ausencias)
