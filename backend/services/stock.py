"""
Servicio único de stock (HSO-11).

Fuente de verdad: lotes_inventario (por outlet).
articulos.stock_actual es una caché por tenant = SUM(lotes) de todos sus outlets.
Solo este módulo escribe lotes_inventario y stock_actual, siempre en la
transacción de quien llama y con la fila del artículo bloqueada (FOR UPDATE)
antes que los lotes, para que las operaciones sobre un artículo se serialicen.

- Entrada: crea un lote.
- Salida / merma: consume lotes FIFO (caducidad más próxima, luego el más
  antiguo) y devuelve el coste real consumido.
- Ajuste: registra la diferencia con lo que hay en el outlet; si sobra stock
  crea un lote de ajuste y si falta lo consume FIFO.
- Nunca deja stock negativo: si no hay bastante, StockInsuficiente.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

TIPOS_SALIDA = ("salida", "merma")


class StockError(Exception):
    pass


class ArticuloNoEncontrado(StockError):
    pass


class SinOutlet(StockError):
    pass


class StockInsuficiente(StockError):
    def __init__(self, disponible: Decimal):
        super().__init__(
            f"Stock insuficiente. Disponible: {q4(disponible)} unidades. "
            "Haz un recuento (inventario físico)."
        )
        self.disponible = disponible


class StockDescuadrado(StockError):
    """Los lotes cubren la salida pero la caché stock_actual no (datos previos a HSO-11)."""


def a_http(exc: StockError) -> HTTPException:
    if isinstance(exc, ArticuloNoEncontrado):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artículo no encontrado")
    if isinstance(exc, StockDescuadrado):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El stock del artículo no cuadra con sus lotes. Haz un recuento (inventario físico).",
        )
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def q4(d: Decimal) -> Decimal:
    return Decimal(d).quantize(Decimal("0.0001"), ROUND_HALF_UP)


def _dec(v: Any) -> Decimal:
    return Decimal(str(v if v is not None else 0))


@dataclass
class ResultadoStock:
    articulo_id: UUID
    nombre: str
    tipo: str
    delta: Decimal
    stock_anterior: Decimal
    stock_nuevo: Decimal
    coste_unitario: Optional[Decimal]
    movimiento_id: Optional[UUID]
    lote_id: Optional[UUID] = None
    lotes_afectados: list[dict] = field(default_factory=list)

    @property
    def cantidad(self) -> Decimal:
        return abs(self.delta)


async def outlet_operativo(conn, tenant_id: UUID, outlet_usuario: Any) -> UUID:
    """Outlet del usuario o, si no tiene, el principal (más antiguo) del tenant."""
    if outlet_usuario:
        return UUID(str(outlet_usuario))
    oid = await conn.fetchval(
        "SELECT id FROM outlets WHERE tenant_id = $1 ORDER BY created_at, id LIMIT 1",
        tenant_id,
    )
    if not oid:
        raise SinOutlet("El negocio no tiene ningún local (outlet) dado de alta")
    return oid


async def _bloquear_articulo(conn, tenant_id: UUID, articulo_id: UUID):
    art = await conn.fetchrow(
        """
        SELECT id, nombre, stock_actual, coste_unitario
        FROM articulos
        WHERE id = $1 AND tenant_id = $2
        FOR UPDATE
        """,
        articulo_id,
        tenant_id,
    )
    if not art:
        raise ArticuloNoEncontrado()
    return art


async def _insertar_movimiento(
    conn, articulo_id, outlet_id, usuario_id, tipo, delta, coste, motivo
) -> UUID:
    return await conn.fetchval(
        """
        INSERT INTO movimientos_stock (
            articulo_id, outlet_id, tipo, cantidad, delta, coste_unitario,
            motivo, usuario_id, ticket_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
        RETURNING id
        """,
        articulo_id,
        outlet_id,
        tipo,
        abs(delta),
        delta,
        coste,
        motivo,
        usuario_id,
    )


async def _crear_lote(
    conn, articulo_id, outlet_id, cantidad, coste, fecha_caducidad, numero_lote, origen
) -> tuple[UUID, Decimal]:
    lote_id = await conn.fetchval(
        """
        INSERT INTO lotes_inventario (
            articulo_id, outlet_id, cantidad, coste_unitario,
            fecha_caducidad, numero_lote, origen
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        """,
        articulo_id,
        outlet_id,
        cantidad,
        coste,
        fecha_caducidad,
        numero_lote,
        origen,
    )
    stock_nuevo = await conn.fetchval(
        """
        UPDATE articulos SET stock_actual = COALESCE(stock_actual, 0) + $1
        WHERE id = $2
        RETURNING stock_actual
        """,
        cantidad,
        articulo_id,
    )
    return lote_id, _dec(stock_nuevo)


async def _consumir_fifo(
    conn, articulo_id, outlet_id, cantidad
) -> tuple[Decimal, list[dict], Decimal]:
    """Descuenta `cantidad` de los lotes del outlet. Devuelve (coste_total, lotes, stock_nuevo)."""
    lotes = await conn.fetch(
        """
        SELECT id, cantidad, coste_unitario
        FROM lotes_inventario
        WHERE articulo_id = $1 AND outlet_id = $2 AND cantidad > 0
        ORDER BY fecha_caducidad ASC NULLS LAST, created_at ASC, id
        FOR UPDATE
        """,
        articulo_id,
        outlet_id,
    )
    disponible = sum((_dec(l["cantidad"]) for l in lotes), Decimal("0"))
    if disponible < cantidad:
        raise StockInsuficiente(disponible)

    pendiente = cantidad
    coste_total = Decimal("0")
    afectados: list[dict] = []
    for l in lotes:
        if pendiente <= 0:
            break
        l_cant = _dec(l["cantidad"])
        tomar = min(pendiente, l_cant)
        await conn.execute(
            "UPDATE lotes_inventario SET cantidad = $1 WHERE id = $2",
            l_cant - tomar,
            l["id"],
        )
        coste_total += tomar * _dec(l["coste_unitario"])
        afectados.append({"lote_id": str(l["id"]), "cantidad_consumida": str(q4(tomar))})
        pendiente -= tomar

    stock_nuevo = await conn.fetchval(
        """
        UPDATE articulos SET stock_actual = stock_actual - $1
        WHERE id = $2 AND stock_actual >= $1
        RETURNING stock_actual
        """,
        cantidad,
        articulo_id,
    )
    if stock_nuevo is None:
        logger.warning(
            "Stock descuadrado artículo=%s: lotes cubren %s pero stock_actual no "
            "(ejecutar scripts/reconciliar_stock.py)",
            articulo_id,
            cantidad,
        )
        raise StockDescuadrado()
    return coste_total, afectados, _dec(stock_nuevo)


async def registrar_entrada(
    conn,
    *,
    tenant_id: UUID,
    outlet_id: UUID,
    usuario_id: Optional[UUID],
    articulo_id: UUID,
    cantidad: Decimal,
    coste_unitario: Optional[Decimal] = None,
    fecha_caducidad: Optional[date] = None,
    numero_lote: Optional[str] = None,
    motivo: Optional[str] = None,
) -> ResultadoStock:
    """Entrada de mercancía: crea un lote. Si llega coste, pasa a ser el del artículo."""
    cant = q4(cantidad)
    if cant <= 0:
        raise StockError("La cantidad debe ser mayor que 0")
    art = await _bloquear_articulo(conn, tenant_id, articulo_id)
    if coste_unitario is not None:
        coste = q4(coste_unitario)
        await conn.execute(
            "UPDATE articulos SET coste_unitario = $1 WHERE id = $2",
            coste,
            articulo_id,
        )
    else:
        coste = q4(_dec(art["coste_unitario"]))

    lote_id, stock_nuevo = await _crear_lote(
        conn, articulo_id, outlet_id, cant, coste, fecha_caducidad,
        numero_lote.strip() if numero_lote and numero_lote.strip() else None,
        "compra",
    )
    mid = await _insertar_movimiento(
        conn, articulo_id, outlet_id, usuario_id, "entrada", cant, coste, motivo
    )
    return ResultadoStock(
        articulo_id=articulo_id, nombre=art["nombre"], tipo="entrada", delta=cant,
        stock_anterior=_dec(art["stock_actual"]), stock_nuevo=stock_nuevo,
        coste_unitario=coste, movimiento_id=mid, lote_id=lote_id,
    )


async def registrar_salida(
    conn,
    *,
    tenant_id: UUID,
    outlet_id: UUID,
    usuario_id: Optional[UUID],
    articulo_id: UUID,
    cantidad: Decimal,
    tipo: str = "salida",
    motivo: Optional[str] = None,
) -> ResultadoStock:
    """Salida o merma: consume FIFO; el movimiento lleva el coste medio real."""
    if tipo not in TIPOS_SALIDA:
        raise ValueError("tipo de salida no válido: " + tipo)
    cant = q4(cantidad)
    if cant <= 0:
        raise StockError("La cantidad debe ser mayor que 0")
    art = await _bloquear_articulo(conn, tenant_id, articulo_id)
    coste_total, afectados, stock_nuevo = await _consumir_fifo(conn, articulo_id, outlet_id, cant)
    coste_medio = q4(coste_total / cant)
    mid = await _insertar_movimiento(
        conn, articulo_id, outlet_id, usuario_id, tipo, -cant, coste_medio, motivo
    )
    return ResultadoStock(
        articulo_id=articulo_id, nombre=art["nombre"], tipo=tipo, delta=-cant,
        stock_anterior=_dec(art["stock_actual"]), stock_nuevo=stock_nuevo,
        coste_unitario=coste_medio, movimiento_id=mid, lotes_afectados=afectados,
    )


async def registrar_ajuste(
    conn,
    *,
    tenant_id: UUID,
    outlet_id: UUID,
    usuario_id: Optional[UUID],
    articulo_id: UUID,
    cantidad_real: Decimal,
    coste_unitario: Optional[Decimal] = None,
    motivo: Optional[str] = None,
) -> ResultadoStock:
    """
    Recuento: `cantidad_real` es lo que hay en el outlet. Se registra la diferencia
    con sus lotes; si no hay diferencia no se crea movimiento.
    """
    real = q4(cantidad_real)
    if real < 0:
        raise StockError("La cantidad real no puede ser negativa")
    art = await _bloquear_articulo(conn, tenant_id, articulo_id)
    stock_anterior = _dec(art["stock_actual"])
    en_outlet = _dec(await conn.fetchval(
        """
        SELECT COALESCE(SUM(cantidad), 0) FROM lotes_inventario
        WHERE articulo_id = $1 AND outlet_id = $2 AND cantidad > 0
        """,
        articulo_id,
        outlet_id,
    ))
    delta = q4(real - en_outlet)
    res = ResultadoStock(
        articulo_id=articulo_id, nombre=art["nombre"], tipo="ajuste", delta=delta,
        stock_anterior=stock_anterior, stock_nuevo=stock_anterior,
        coste_unitario=None, movimiento_id=None,
    )
    if delta == 0:
        return res

    if delta > 0:
        coste = q4(coste_unitario if coste_unitario is not None else _dec(art["coste_unitario"]))
        res.lote_id, res.stock_nuevo = await _crear_lote(
            conn, articulo_id, outlet_id, delta, coste, None, None, "ajuste"
        )
    else:
        coste_total, res.lotes_afectados, res.stock_nuevo = await _consumir_fifo(
            conn, articulo_id, outlet_id, -delta
        )
        coste = q4(coste_total / -delta)
    res.coste_unitario = coste
    res.movimiento_id = await _insertar_movimiento(
        conn, articulo_id, outlet_id, usuario_id, "ajuste", delta, coste, motivo
    )
    return res


# --- Reconciliación de la caché stock_actual ------------------------------------

_SQL_DIFERENCIAS = """
    SELECT a.id AS articulo_id, a.tenant_id, t.nombre AS tenant, a.nombre AS articulo,
           COALESCE(a.stock_actual, 0) AS stock_actual,
           COALESCE(SUM(l.cantidad), 0) AS suma_lotes
    FROM articulos a
    JOIN tenants t ON t.id = a.tenant_id
    LEFT JOIN lotes_inventario l ON l.articulo_id = a.id
    WHERE ($1::uuid IS NULL OR a.tenant_id = $1::uuid)
    GROUP BY a.id, t.nombre
    HAVING COALESCE(a.stock_actual, 0) <> COALESCE(SUM(l.cantidad), 0)
    ORDER BY t.nombre, a.nombre
"""


async def diferencias_stock(conn, tenant_id: Optional[UUID] = None) -> list[dict]:
    """Artículos cuyo stock_actual no coincide con la suma de sus lotes (solo lectura)."""
    rows = await conn.fetch(_SQL_DIFERENCIAS, tenant_id)
    return [
        {
            "articulo_id": r["articulo_id"],
            "tenant_id": r["tenant_id"],
            "tenant": r["tenant"],
            "articulo": r["articulo"],
            "stock_actual": _dec(r["stock_actual"]),
            "suma_lotes": _dec(r["suma_lotes"]),
            "diferencia": _dec(r["stock_actual"]) - _dec(r["suma_lotes"]),
        }
        for r in rows
    ]


async def reconciliar_stock_actual(conn, tenant_id: Optional[UUID] = None) -> list[dict]:
    """
    Iguala stock_actual a la suma de lotes en los artículos descuadrados.
    Llamar dentro de una transacción. Bloquea cada artículo antes de recalcular
    para no pisar una operación de stock en curso.
    """
    corregidos = []
    for d in await diferencias_stock(conn, tenant_id):
        await conn.execute("SELECT 1 FROM articulos WHERE id = $1 FOR UPDATE", d["articulo_id"])
        suma = _dec(await conn.fetchval(
            "SELECT COALESCE(SUM(cantidad), 0) FROM lotes_inventario WHERE articulo_id = $1",
            d["articulo_id"],
        ))
        await conn.execute(
            "UPDATE articulos SET stock_actual = $1 WHERE id = $2",
            suma,
            d["articulo_id"],
        )
        corregidos.append({**d, "suma_lotes": suma, "diferencia": d["stock_actual"] - suma})
    return corregidos
