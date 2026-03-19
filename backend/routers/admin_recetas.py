"""
Router admin de recetas para HorecaSO.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import get_current_user
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Recetas"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


async def _get_user_tenant(conn, user_id: str) -> str | None:
    """Obtiene tenant_id del usuario."""
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        return None
    return str(row["tenant_id"])


async def _require_admin_tenant(conn, user_id: str) -> str:
    """Obtiene tenant_id y verifica admin/director."""
    row = await conn.fetchrow(
        "SELECT tenant_id, rol FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        raise HTTPException(status_code=403, detail="Usuario sin tenant")
    if row["rol"] not in ("admin", "director"):
        raise HTTPException(status_code=403, detail="Se requiere rol admin o director")
    return str(row["tenant_id"])


def _calcular_semaforo(margen: Decimal) -> str:
    """Verde >65%, amarillo 40-65%, rojo <40%."""
    if margen > Decimal("65"):
        return "verde"
    if margen >= Decimal("40"):
        return "amarillo"
    return "rojo"


# --- Schemas ---

class CreateRecetaRequest(BaseModel):
    producto_id: str
    rendimiento: Decimal = Decimal("1")
    tiempo_preparacion: int | None = None
    instrucciones: str | None = None


class UpdateRecetaRequest(BaseModel):
    rendimiento: Decimal | None = None
    tiempo_preparacion: int | None = None
    instrucciones: str | None = None


class AddIngredienteRequest(BaseModel):
    articulo_id: str
    cantidad_neta: Decimal
    porcentaje_merma: Decimal = Decimal("0")
    unidad: str


# --- Recetas ---

@router.get("/recetas")
async def list_recetas(current_user: dict = Depends(get_current_user)):
    """Lista recetas con semáforo calculado."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(status_code=403, detail="Usuario sin tenant")

        rows = await conn.fetch(
            """
            SELECT r.*, p.nombre as producto_nombre, p.precio as precio_venta
            FROM recetas r
            JOIN productos p ON r.producto_id = p.id
            WHERE p.tenant_id = $1
            ORDER BY p.nombre
            """,
            UUID(tenant_id),
        )

    return [
        {
            "id": str(r["id"]),
            "producto_id": str(r["producto_id"]),
            "producto_nombre": r["producto_nombre"],
            "precio_venta": float(r["precio_venta"]) if r.get("precio_venta") else 0,
            "rendimiento": float(r["rendimiento"]) if r.get("rendimiento") else 1,
            "tiempo_preparacion": r["tiempo_preparacion"],
            "instrucciones": r["instrucciones"],
            "coste_calculado": float(r["coste_calculado"]) if r.get("coste_calculado") else None,
            "margen_porcentaje": float(r["margen_porcentaje"]) if r.get("margen_porcentaje") else None,
            "semaforo": r["semaforo"],
            "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
        }
        for r in rows
    ]


@router.post("/recetas")
async def create_receta(
    body: CreateRecetaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Crear receta para un producto."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

        prod = await conn.fetchrow(
            "SELECT id FROM productos WHERE id = $1 AND tenant_id = $2",
            UUID(body.producto_id),
            UUID(tenant_id),
        )
        if not prod:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        row = await conn.fetchrow(
            """
            INSERT INTO recetas (producto_id, rendimiento, tiempo_preparacion, instrucciones)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            UUID(body.producto_id),
            body.rendimiento,
            body.tiempo_preparacion,
            body.instrucciones,
        )

    return dict(row)


@router.put("/recetas/{id}")
async def update_receta(
    id: UUID,
    body: UpdateRecetaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Editar receta."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

        receta = await conn.fetchrow(
            """
            SELECT r.* FROM recetas r
            JOIN productos p ON r.producto_id = p.id
            WHERE r.id = $1 AND p.tenant_id = $2
            """,
            id,
            UUID(tenant_id),
        )
        if not receta:
            raise HTTPException(status_code=404, detail="Receta no encontrada")

        updates = []
        vals = []
        i = 1
        if body.rendimiento is not None:
            updates.append(f"rendimiento = ${i}")
            vals.append(body.rendimiento)
            i += 1
        if body.tiempo_preparacion is not None:
            updates.append(f"tiempo_preparacion = ${i}")
            vals.append(body.tiempo_preparacion)
            i += 1
        if body.instrucciones is not None:
            updates.append(f"instrucciones = ${i}")
            vals.append(body.instrucciones)
            i += 1

        if not updates:
            raise HTTPException(status_code=400, detail="Nada que actualizar")

        vals.append(id)
        row = await conn.fetchrow(
            f"""
            UPDATE recetas SET {", ".join(updates)}
            WHERE id = ${i}
            RETURNING *
            """,
            *vals,
        )

    return dict(row)


@router.post("/recetas/{id}/ingredientes")
async def add_ingrediente(
    id: UUID,
    body: AddIngredienteRequest,
    current_user: dict = Depends(get_current_user),
):
    """Añadir ingrediente a receta."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

        receta = await conn.fetchrow(
            """
            SELECT r.* FROM recetas r
            JOIN productos p ON r.producto_id = p.id
            WHERE r.id = $1 AND p.tenant_id = $2
            """,
            id,
            UUID(tenant_id),
        )
        if not receta:
            raise HTTPException(status_code=404, detail="Receta no encontrada")

        art = await conn.fetchrow(
            "SELECT id FROM articulos WHERE id = $1 AND tenant_id = $2",
            UUID(body.articulo_id),
            UUID(tenant_id),
        )
        if not art:
            raise HTTPException(status_code=404, detail="Artículo no encontrado")

        max_orden = await conn.fetchval(
            "SELECT COALESCE(MAX(orden), 0) FROM receta_ingredientes WHERE receta_id = $1",
            id,
        )

        row = await conn.fetchrow(
            """
            INSERT INTO receta_ingredientes (receta_id, articulo_id, cantidad_neta, porcentaje_merma, unidad, orden)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            id,
            UUID(body.articulo_id),
            body.cantidad_neta,
            body.porcentaje_merma,
            body.unidad,
            (max_orden or 0) + 1,
        )

    return dict(row)


@router.delete("/recetas/{id}/ingredientes/{ingrediente_id}")
async def delete_ingrediente(
    id: UUID,
    ingrediente_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Eliminar ingrediente de receta."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

        receta = await conn.fetchrow(
            """
            SELECT r.* FROM recetas r
            JOIN productos p ON r.producto_id = p.id
            WHERE r.id = $1 AND p.tenant_id = $2
            """,
            id,
            UUID(tenant_id),
        )
        if not receta:
            raise HTTPException(status_code=404, detail="Receta no encontrada")

        result = await conn.execute(
            """
            DELETE FROM receta_ingredientes
            WHERE id = $1 AND receta_id = $2
            """,
            ingrediente_id,
            id,
        )

    if "DELETE 0" in result:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")
    return {"deleted": True}


@router.get("/recetas/{id}/coste")
async def get_receta_coste(
    id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Calcular coste en tiempo real.
    coste = suma(cantidad_bruta * coste_unitario)
    cantidad_bruta = cantidad_neta / (1 - porcentaje_merma/100)
    margen = (precio_venta - coste) / precio_venta * 100
    semáforo: verde >65%, amarillo 40-65%, rojo <40%
    """
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(status_code=403, detail="Usuario sin tenant")

        receta = await conn.fetchrow(
            """
            SELECT r.*, p.precio as precio_venta
            FROM recetas r
            JOIN productos p ON r.producto_id = p.id
            WHERE r.id = $1 AND p.tenant_id = $2
            """,
            id,
            UUID(tenant_id),
        )
        if not receta:
            raise HTTPException(status_code=404, detail="Receta no encontrada")

        ingredientes = await conn.fetch(
            """
            SELECT ri.*, a.coste_unitario
            FROM receta_ingredientes ri
            JOIN articulos a ON ri.articulo_id = a.id
            WHERE ri.receta_id = $1
            ORDER BY ri.orden
            """,
            id,
        )

    coste_total = Decimal("0")
    for ing in ingredientes:
        cantidad_neta = Decimal(str(ing["cantidad_neta"]))
        pct_merma = Decimal(str(ing["porcentaje_merma"] or 0))
        coste_unit = Decimal(str(ing["coste_unitario"] or 0))
        cantidad_bruta = cantidad_neta / (Decimal("1") - pct_merma / Decimal("100"))
        coste_total += (cantidad_bruta * coste_unit).quantize(Decimal("0.0001"), ROUND_HALF_UP)

    precio_venta = Decimal(str(receta["precio_venta"] or 0))
    if precio_venta > 0:
        margen = ((precio_venta - coste_total) / precio_venta * 100).quantize(
            Decimal("0.01"), ROUND_HALF_UP
        )
    else:
        margen = Decimal("0")

    semaforo = _calcular_semaforo(margen)

    return {
        "receta_id": str(id),
        "coste": float(coste_total),
        "precio_venta": float(precio_venta),
        "margen_porcentaje": float(margen),
        "semaforo": semaforo,
        "ingredientes": [
            {
                "articulo_id": str(ing["articulo_id"]),
                "cantidad_neta": float(ing["cantidad_neta"]),
                "porcentaje_merma": float(ing["porcentaje_merma"] or 0),
                "cantidad_bruta": float(
                    Decimal(str(ing["cantidad_neta"]))
                    / (Decimal("1") - Decimal(str(ing["porcentaje_merma"] or 0)) / Decimal("100"))
                ),
                "coste_unitario": float(ing["coste_unitario"] or 0),
            }
            for ing in ingredientes
        ],
    }


@router.get("/recetas/semaforo")
async def get_semaforo_platos(current_user: dict = Depends(get_current_user)):
    """Todos los platos con su semáforo de rentabilidad."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(status_code=403, detail="Usuario sin tenant")

        rows = await conn.fetch(
            """
            SELECT p.id, p.nombre, p.precio, r.id as receta_id
            FROM productos p
            LEFT JOIN recetas r ON p.id = r.producto_id
            WHERE p.tenant_id = $1 AND p.activo = true
            ORDER BY p.nombre
            """,
            UUID(tenant_id),
        )

        ingredientes_por_receta = {}
        receta_ids = [r["receta_id"] for r in rows if r["receta_id"]]
        if receta_ids:
            ingredientes = await conn.fetch(
                """
                SELECT ri.receta_id, ri.cantidad_neta, ri.porcentaje_merma, a.coste_unitario
                FROM receta_ingredientes ri
                JOIN articulos a ON ri.articulo_id = a.id
                WHERE ri.receta_id = ANY($1::uuid[])
                """,
                receta_ids,
            )
            for ing in ingredientes:
                rid = str(ing["receta_id"])
                if rid not in ingredientes_por_receta:
                    ingredientes_por_receta[rid] = []
                ingredientes_por_receta[rid].append(ing)

    result = []
    for r in rows:
        if not r["receta_id"]:
            result.append({
                "producto_id": str(r["id"]),
                "producto_nombre": r["nombre"],
                "precio": float(r["precio"]),
                "coste": None,
                "margen_porcentaje": None,
                "semaforo": "sin_receta",
            })
            continue

        ingredientes = ingredientes_por_receta.get(str(r["receta_id"]), [])
        coste_total = Decimal("0")
        for ing in ingredientes:
            cantidad_neta = Decimal(str(ing["cantidad_neta"]))
            pct_merma = Decimal(str(ing["porcentaje_merma"] or 0))
            coste_unit = Decimal(str(ing["coste_unitario"] or 0))
            cantidad_bruta = cantidad_neta / (Decimal("1") - pct_merma / Decimal("100"))
            coste_total += (cantidad_bruta * coste_unit).quantize(Decimal("0.0001"), ROUND_HALF_UP)

        precio_venta = Decimal(str(r["precio"] or 0))
        if precio_venta > 0:
            margen = ((precio_venta - coste_total) / precio_venta * 100).quantize(
                Decimal("0.01"), ROUND_HALF_UP
            )
        else:
            margen = Decimal("0")

        result.append({
            "producto_id": str(r["id"]),
            "producto_nombre": r["nombre"],
            "precio": float(precio_venta),
            "coste": float(coste_total),
            "margen_porcentaje": float(margen),
            "semaforo": _calcular_semaforo(margen),
        })

    return result
