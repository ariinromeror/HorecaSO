"""
Router inventario: artículos, movimientos de stock, alertas e inventario físico.
"""

import logging
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/inventario",
    tags=["Inventario"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

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


class CreateArticuloRequest(BaseModel):
    nombre: str
    sku: Optional[str] = None
    unidad_medida: str
    stock_minimo: Optional[Decimal] = None
    stock_maximo: Optional[Decimal] = None
    coste_unitario: Optional[Decimal] = None
    categoria_almacen: Optional[str] = None


class UpdateArticuloRequest(BaseModel):
    nombre: Optional[str] = None
    sku: Optional[str] = None
    unidad_medida: Optional[str] = None
    stock_minimo: Optional[Decimal] = None
    stock_maximo: Optional[Decimal] = None
    coste_unitario: Optional[Decimal] = None
    categoria_almacen: Optional[str] = None


class MovimientoRequest(BaseModel):
    articulo_id: str
    tipo: Literal["entrada", "salida", "ajuste", "merma"]
    cantidad: Decimal = Field(ge=0)
    motivo: Optional[str] = None
    coste_unitario: Optional[Decimal] = None

    @model_validator(mode="after")
    def cantidad_segun_tipo(self):
        if self.tipo in ("entrada", "salida", "merma") and self.cantidad <= 0:
            raise ValueError("cantidad debe ser mayor que 0 para este tipo")
        return self


class InventarioFisicoItem(BaseModel):
    articulo_id: str
    cantidad_real: Decimal = Field(..., ge=0)


class InventarioFisicoRequest(BaseModel):
    articulos: list[InventarioFisicoItem]


@router.get("/articulos")
async def list_articulos(
    categoria: Optional[str] = Query(None, description="Filtrar por categoria_almacen"),
    buscar: Optional[str] = Query(None, description="Buscar en nombre"),
    alerta: Optional[bool] = Query(None, description="Solo stock bajo mínimo"),
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    """Lista artículos del tenant con filtros opcionales."""
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            where_clauses = ["tenant_id = $1"]
            args: list[Any] = [tenant_id]

            if categoria is not None and categoria.strip():
                args.append(categoria.strip())
                where_clauses.append(
                    "categoria_almacen ILIKE $" + str(len(args))
                )

            if buscar is not None and buscar.strip():
                args.append("%" + buscar.strip() + "%")
                where_clauses.append("nombre ILIKE $" + str(len(args)))

            if alerta is True:
                where_clauses.append("stock_actual <= stock_minimo")

            sql = (
                "SELECT id, nombre, sku, unidad_medida, stock_actual, stock_minimo, "
                "stock_maximo, coste_unitario, categoria_almacen, created_at "
                "FROM articulos WHERE "
                + " AND ".join(where_clauses)
                + " ORDER BY nombre"
            )
            rows = await conn.fetch(sql, *args)

        return [_articulo_to_dict(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_articulos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/articulos", status_code=status.HTTP_201_CREATED)
async def create_articulo(
    body: CreateArticuloRequest,
    current_user: dict = Depends(require_roles(ROLES_ESCRITURA_ART)),
):
    """Crea artículo; stock_actual inicia en 0."""
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))

            smin = body.stock_minimo if body.stock_minimo is not None else Decimal("0")
            smax = body.stock_maximo
            coste = body.coste_unitario

            row = await conn.fetchrow(
                """
                INSERT INTO articulos (
                    tenant_id, nombre, sku, unidad_medida, stock_actual,
                    stock_minimo, stock_maximo, coste_unitario,
                    categoria_almacen
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, nombre, sku, unidad_medida, stock_actual, stock_minimo,
                          stock_maximo, coste_unitario, categoria_almacen, created_at
                """,
                tenant_id,
                body.nombre.strip(),
                body.sku.strip() if body.sku else None,
                body.unidad_medida.strip(),
                Decimal("0"),
                smin,
                smax,
                coste,
                body.categoria_almacen.strip() if body.categoria_almacen else None,
            )

        logger.info("Artículo creado: %s tenant=%s", row["id"], tenant_id)
        return _articulo_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_articulo: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.put("/articulos/{articulo_id}")
async def update_articulo(
    articulo_id: UUID,
    body: UpdateArticuloRequest,
    current_user: dict = Depends(require_roles(ROLES_ESCRITURA_ART)),
):
    """Actualiza artículo (no modifica stock_actual)."""
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")

    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            exists = await conn.fetchrow(
                "SELECT id FROM articulos WHERE id = $1 AND tenant_id = $2",
                articulo_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(status_code=404, detail="Artículo no encontrado")

            updates: list[str] = []
            vals: list[Any] = []
            i = 1
            if "nombre" in data:
                updates.append("nombre = $" + str(i))
                vals.append(data["nombre"].strip())
                i += 1
            if "sku" in data:
                updates.append("sku = $" + str(i))
                vals.append(data["sku"].strip() if data["sku"] else None)
                i += 1
            if "unidad_medida" in data:
                updates.append("unidad_medida = $" + str(i))
                vals.append(data["unidad_medida"].strip())
                i += 1
            if "stock_minimo" in data:
                updates.append("stock_minimo = $" + str(i))
                vals.append(data["stock_minimo"])
                i += 1
            if "stock_maximo" in data:
                updates.append("stock_maximo = $" + str(i))
                vals.append(data["stock_maximo"])
                i += 1
            if "coste_unitario" in data:
                updates.append("coste_unitario = $" + str(i))
                vals.append(data["coste_unitario"])
                i += 1
            if "categoria_almacen" in data:
                updates.append("categoria_almacen = $" + str(i))
                vals.append(
                    data["categoria_almacen"].strip()
                    if data["categoria_almacen"]
                    else None
                )
                i += 1

            vals.extend([articulo_id, tenant_id])
            sql = (
                "UPDATE articulos SET "
                + ", ".join(updates)
                + " WHERE id = $"
                + str(i)
                + " AND tenant_id = $"
                + str(i + 1)
                + " RETURNING id, nombre, sku, unidad_medida, stock_actual, stock_minimo, "
                "stock_maximo, coste_unitario, categoria_almacen, created_at"
            )
            row = await conn.fetchrow(sql, *vals)

        if not row:
            raise HTTPException(status_code=404, detail="Artículo no encontrado")
        return _articulo_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_articulo: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


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


@router.post("/movimientos")
async def crear_movimiento(
    body: MovimientoRequest,
    current_user: dict = Depends(require_roles(ROLES_MOVIMIENTOS)),
):
    """
    Registra movimiento y actualiza stock en la misma transacción.
    """
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            usuario_id = UUID(current_user["sub"])
            outlet_id = UUID(str(urow["outlet_id"])) if urow["outlet_id"] else None

            art = await conn.fetchrow(
                """
                SELECT id, nombre, stock_actual, coste_unitario
                FROM articulos
                WHERE id = $1 AND tenant_id = $2
                FOR UPDATE
                """,
                UUID(body.articulo_id),
                tenant_id,
            )
            if not art:
                raise HTTPException(status_code=404, detail="Artículo no encontrado")

            stock_ant = Decimal(
                str(art["stock_actual"] if art["stock_actual"] is not None else 0)
            )
            tipo = body.tipo
            cant = body.cantidad
            stock_nuevo = stock_ant

            if tipo == "entrada":
                stock_nuevo = stock_ant + cant
                await conn.execute(
                    "UPDATE articulos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3",
                    stock_nuevo,
                    art["id"],
                    tenant_id,
                )
                if body.coste_unitario is not None:
                    await conn.execute(
                        """
                        UPDATE articulos SET coste_unitario = $1
                        WHERE id = $2 AND tenant_id = $3
                        """,
                        body.coste_unitario,
                        art["id"],
                        tenant_id,
                    )
                mov_coste = body.coste_unitario
            elif tipo in ("salida", "merma"):
                if stock_ant < cant:
                    raise HTTPException(status_code=400, detail="Stock insuficiente")
                stock_nuevo = stock_ant - cant
                await conn.execute(
                    "UPDATE articulos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3",
                    stock_nuevo,
                    art["id"],
                    tenant_id,
                )
                mov_coste = body.coste_unitario
            else:  # ajuste
                stock_nuevo = cant
                await conn.execute(
                    "UPDATE articulos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3",
                    stock_nuevo,
                    art["id"],
                    tenant_id,
                )
                mov_coste = body.coste_unitario

            mid = await _insert_movimiento(
                conn,
                art["id"],
                outlet_id,
                usuario_id,
                tipo,
                cant,
                mov_coste,
                body.motivo,
                None,
            )

        logger.info(
            "Movimiento stock %s artículo=%s tipo=%s cant=%s",
            mid,
            art["id"],
            tipo,
            cant,
        )

        return {
            "movimiento_id": str(mid),
            "articulo_id": str(art["id"]),
            "nombre_articulo": art["nombre"],
            "stock_anterior": _serialize_stock_qty(stock_ant),
            "stock_nuevo": _serialize_stock_qty(stock_nuevo),
            "tipo": tipo,
            "cantidad": _serialize_stock_qty(cant),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en crear_movimiento: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.get("/movimientos")
async def list_movimientos(
    articulo_id: Optional[UUID] = Query(None),
    tipo: Optional[str] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    """Historial de movimientos del tenant."""
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            where_clauses = ["a.tenant_id = $1"]
            args: list[Any] = [tenant_id]

            if articulo_id is not None:
                args.append(articulo_id)
                where_clauses.append("m.articulo_id = $" + str(len(args)))

            if tipo is not None and tipo.strip():
                args.append(tipo.strip())
                where_clauses.append("m.tipo = $" + str(len(args)))

            if desde is not None:
                dt_desde = datetime.combine(desde, time.min, tzinfo=timezone.utc)
                args.append(dt_desde)
                where_clauses.append("m.created_at >= $" + str(len(args)))

            if hasta is not None:
                dt_hasta = datetime.combine(
                    hasta, time(23, 59, 59, 999999), tzinfo=timezone.utc
                )
                args.append(dt_hasta)
                where_clauses.append("m.created_at <= $" + str(len(args)))

            args.append(limit)
            limit_ph = len(args)

            sql = (
                "SELECT m.id, m.articulo_id, m.tipo, m.cantidad, m.coste_unitario, "
                "m.motivo, m.created_at, a.nombre AS articulo_nombre, "
                "u.nombre AS usuario_nombre "
                "FROM movimientos_stock m "
                "JOIN articulos a ON m.articulo_id = a.id "
                "LEFT JOIN usuarios u ON m.usuario_id = u.id "
                "WHERE "
                + " AND ".join(where_clauses)
                + " ORDER BY m.created_at DESC LIMIT $"
                + str(limit_ph)
            )
            rows = await conn.fetch(sql, *args)

        return [
            {
                "id": str(r["id"]),
                "articulo_id": str(r["articulo_id"]),
                "articulo_nombre": r["articulo_nombre"],
                "tipo": r["tipo"],
                "cantidad": _serialize_stock_qty(r["cantidad"])
                if r["cantidad"] is not None
                else 0.0,
                "coste_unitario": _serialize_coste_json(r.get("coste_unitario")),
                "motivo": r["motivo"],
                "usuario_nombre": r["usuario_nombre"],
                "created_at": r["created_at"].isoformat()
                if r["created_at"]
                else None,
            }
            for r in rows
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_movimientos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/inventario-fisico")
async def inventario_fisico(
    body: InventarioFisicoRequest,
    current_user: dict = Depends(require_roles(ROLES_MOVIMIENTOS)),
):
    """Ajustes de stock por conteo físico en una sola transacción."""
    if not body.articulos:
        raise HTTPException(status_code=400, detail="Lista vacía")

    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            usuario_id = UUID(current_user["sub"])
            outlet_id = UUID(str(urow["outlet_id"])) if urow["outlet_id"] else None

            actualizados: list[dict] = []

            for item in body.articulos:
                aid = UUID(item.articulo_id)
                art = await conn.fetchrow(
                    """
                    SELECT id, nombre, stock_actual
                    FROM articulos
                    WHERE id = $1 AND tenant_id = $2
                    FOR UPDATE
                    """,
                    aid,
                    tenant_id,
                )
                if not art:
                    raise HTTPException(
                        status_code=404,
                        detail="Artículo no encontrado: " + str(item.articulo_id),
                    )

                stock_ant = Decimal(
                    str(art["stock_actual"] if art["stock_actual"] is not None else 0)
                )
                cant_real = item.cantidad_real
                stock_nuevo = cant_real

                await conn.execute(
                    "UPDATE articulos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3",
                    stock_nuevo,
                    aid,
                    tenant_id,
                )

                await _insert_movimiento(
                    conn,
                    aid,
                    outlet_id,
                    usuario_id,
                    "ajuste",
                    cant_real,
                    None,
                    "inventario_fisico",
                    None,
                )

                actualizados.append(
                    {
                        "articulo_id": str(aid),
                        "nombre": art["nombre"],
                        "stock_anterior": _serialize_stock_qty(stock_ant),
                        "stock_nuevo": _serialize_stock_qty(stock_nuevo),
                    }
                )

        logger.info(
            "Inventario físico: %s artículos usuario=%s",
            len(actualizados),
            usuario_id,
        )

        return {
            "procesados": len(actualizados),
            "articulos_actualizados": actualizados,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en inventario_fisico: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
