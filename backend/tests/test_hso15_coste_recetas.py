"""
HSO-15 — El coste de las recetas no se guardaba (coste_calculado, margen y
semáforo quedaban NULL) y los ingredientes que no se podían costear sumaban
0 € en silencio.

Receta del "Menú del día" (PVP 12.50):
  Arroz   0.2 kg  x 2.00 €/kg  = 0.40
  Aceite  50 ml   x 5.00 €/l   = 0.25
  Azafrán 1 g     sin precio   -> no costeado
  => coste 0.65, margen (12.50 - 0.65) / 12.50 = 94.80 % -> verde
"""

from decimal import Decimal

import pytest

from tests.auth_helpers import auth_headers


async def _articulo(db, tenant, nombre, unidad, coste):
    return str(await db.fetchval(
        """
        INSERT INTO articulos (tenant_id, nombre, unidad_medida, coste_unitario)
        VALUES ($1, $2, $3, $4) RETURNING id
        """,
        tenant.id, nombre, unidad, coste,
    ))


async def _receta_menu(client, tenant):
    r = await client.post(
        "/api/admin/recetas",
        json={"producto_id": tenant.productos["menu"]},
        headers=auth_headers(tenant.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


async def _add(client, tenant, receta_id, articulo_id, cantidad, unidad):
    r = await client.post(
        f"/api/admin/recetas/{receta_id}/ingredientes",
        json={"articulo_id": articulo_id, "cantidad_neta": cantidad, "unidad": unidad},
        headers=auth_headers(tenant.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


@pytest.fixture
async def receta(client, seed, db):
    t = seed.a
    arts = {
        "arroz": await _articulo(db, t, "Arroz", "kg", Decimal("2.00")),
        "aceite": await _articulo(db, t, "Aceite", "l", Decimal("5.00")),
        "azafran": await _articulo(db, t, "Azafrán", "g", Decimal("0")),
    }
    rid = await _receta_menu(client, t)
    lineas = {
        "arroz": await _add(client, t, rid, arts["arroz"], "0.2", "kg"),
        "aceite": await _add(client, t, rid, arts["aceite"], "50", "ml"),
        "azafran": await _add(client, t, rid, arts["azafran"], "1", "g"),
    }
    return {"id": rid, "tenant": t, "articulos": arts, "lineas": lineas}


async def _fila_receta(db, receta_id):
    return await db.fetchrow(
        "SELECT coste_calculado, margen_porcentaje, semaforo FROM recetas WHERE id = $1",
        receta_id,
    )


async def test_guardar_ingredientes_persiste_coste_margen_y_semaforo(receta, db):
    fila = await _fila_receta(db, receta["id"])

    assert fila["coste_calculado"] == Decimal("0.65")
    assert fila["margen_porcentaje"] == Decimal("94.80")
    assert fila["semaforo"] == "verde"


async def test_listado_recetas_lee_el_coste_guardado(client, receta):
    r = await client.get("/api/admin/recetas", headers=auth_headers(receta["tenant"].usuarios["admin"]))

    assert r.status_code == 200, r.text
    item = next(x for x in r.json() if x["id"] == receta["id"])
    assert item["coste_calculado"] == 0.65
    assert item["margen_porcentaje"] == 94.80
    assert item["semaforo"] == "verde"


async def test_coste_receta_reporta_ingredientes_sin_precio(client, receta):
    r = await client.get(
        f"/api/admin/recetas/{receta['id']}/coste",
        headers=auth_headers(receta["tenant"].usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["coste_total"] == 0.65
    assert body["coste_completo"] is False
    assert [(x["articulo_nombre"], x["motivo"]) for x in body["ingredientes_no_costeados"]] == [
        ("Azafrán", "sin_coste")
    ]


async def test_ingrediente_con_coste_null_tambien_se_reporta(client, receta, db):
    await db.execute("UPDATE articulos SET coste_unitario = NULL WHERE id = $1", receta["articulos"]["aceite"])

    r = await client.get(
        f"/api/admin/recetas/{receta['id']}/coste",
        headers=auth_headers(receta["tenant"].usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    motivos = {x["articulo_nombre"]: x["motivo"] for x in r.json()["ingredientes_no_costeados"]}
    assert motivos == {"Aceite": "sin_coste", "Azafrán": "sin_coste"}
    assert r.json()["coste_total"] == 0.40


async def test_unidad_incompatible_se_reporta_en_lugar_de_contar_cero(client, receta, db):
    # El artículo cambia de unidad en inventario después de crear la receta.
    await db.execute("UPDATE articulos SET unidad_medida = 'ud' WHERE id = $1", receta["articulos"]["arroz"])

    r = await client.get(
        f"/api/admin/recetas/{receta['id']}/coste",
        headers=auth_headers(receta["tenant"].usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    motivos = {x["articulo_nombre"]: x["motivo"] for x in r.json()["ingredientes_no_costeados"]}
    assert motivos["Arroz"] == "unidad_incompatible"
    assert r.json()["coste_total"] == 0.25


async def test_todos_los_ingredientes_con_precio(client, receta):
    t = receta["tenant"]
    r = await client.delete(
        f"/api/admin/recetas/{receta['id']}/ingredientes/{receta['lineas']['azafran']}",
        headers=auth_headers(t.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text

    r = await client.get(f"/api/admin/recetas/{receta['id']}/coste", headers=auth_headers(t.usuarios["admin"]))

    assert r.json()["coste_completo"] is True
    assert r.json()["ingredientes_no_costeados"] == []


async def test_cambios_de_ingredientes_recalculan_lo_guardado(client, receta, db):
    t = receta["tenant"]
    r = await client.put(
        f"/api/admin/recetas/{receta['id']}/ingredientes/{receta['lineas']['arroz']}",
        json={"cantidad_neta": "3"},  # 3 kg x 2.00 = 6.00 -> coste 6.25, margen 50 %
        headers=auth_headers(t.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text

    fila = await _fila_receta(db, receta["id"])
    assert fila["coste_calculado"] == Decimal("6.25")
    assert fila["margen_porcentaje"] == Decimal("50.00")
    assert fila["semaforo"] == "amarillo"

    r = await client.delete(
        f"/api/admin/recetas/{receta['id']}/ingredientes/{receta['lineas']['arroz']}",
        headers=auth_headers(t.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    assert (await _fila_receta(db, receta["id"]))["coste_calculado"] == Decimal("0.25")


async def test_bulk_devuelve_no_costeados(client, receta, db):
    t = receta["tenant"]
    sal = await _articulo(db, t, "Sal", "kg", None)

    r = await client.post(
        f"/api/admin/recetas/{receta['id']}/ingredientes/bulk",
        json={"lineas": [{"articulo_id": sal, "cantidad_neta": "0.01", "unidad": "kg"}]},
        headers=auth_headers(t.usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    nombres = sorted(x["articulo_nombre"] for x in r.json()["ingredientes_no_costeados"])
    assert nombres == ["Azafrán", "Sal"]


async def test_semaforo_platos_incluye_no_costeados(client, receta, db):
    await db.execute(
        "UPDATE productos SET tiene_receta = true WHERE id = $1", receta["tenant"].productos["menu"]
    )
    r = await client.get("/api/admin/recetas/semaforo", headers=auth_headers(receta["tenant"].usuarios["admin"]))

    assert r.status_code == 200, r.text
    item = next(x for x in r.json() if x["receta_id"] == receta["id"])
    assert item["coste"] == 0.65
    assert item["coste_completo"] is False
    assert [x["articulo_nombre"] for x in item["ingredientes_no_costeados"]] == ["Azafrán"]


async def test_margen_muy_negativo_no_rompe_el_guardado(client, seed, db):
    """PVP 0.10 con coste 10 € da margen -9900 %: no cabe en NUMERIC(5,2)."""
    t = seed.a
    await db.execute("UPDATE productos SET precio = 0.10 WHERE id = $1", t.productos["menu"])
    caro = await _articulo(db, t, "Trufa", "kg", Decimal("1000"))
    rid = await _receta_menu(client, t)

    await _add(client, t, rid, caro, "0.01", "kg")

    fila = await _fila_receta(db, rid)
    assert fila["coste_calculado"] == Decimal("10.00")
    assert fila["semaforo"] == "rojo"
    assert fila["margen_porcentaje"] == Decimal("-999.99")


async def test_elaboracion_guarda_coste_sin_margen(client, seed, db):
    t = seed.a
    h = auth_headers(t.usuarios["admin"])
    r = await client.post("/api/admin/elaboraciones", json={"nombre": "Fondo", "unidad_medida": "l"}, headers=h)
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    hueso = await _articulo(db, t, "Hueso", "kg", Decimal("3.00"))

    await _add(client, t, rid, hueso, "0.5", "kg")

    fila = await _fila_receta(db, rid)
    assert fila["coste_calculado"] == Decimal("1.50")
    assert fila["margen_porcentaje"] is None
    assert fila["semaforo"] == "sin_venta"
