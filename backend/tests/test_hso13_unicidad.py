"""
HSO-13 — Falta de UNIQUE en cierres de caja y nóminas (comprobación con carrera)
y de CHECK de importes no negativos.
"""

import asyncio
from datetime import date

import asyncpg
import pytest

from tests.auth_helpers import auth_headers

FECHA = "2026-10-01"

NOMINA_SQL = """
    INSERT INTO nominas (empleado_id, mes, anio, salario_bruto, total_devengos,
        ss_empleado, irpf, total_deducciones, liquido, ss_empresa, coste_total_empresa)
    VALUES ($1, 9, 2026, 1500, 1500, 95.25, 150, 245.25, 1254.75, 448.50, 1948.50)
"""


async def _empleado(db, tenant_id, con_salario=False):
    if con_salario:
        return await db.fetchval(
            "INSERT INTO empleados (tenant_id, nombre_completo, salario_bruto_mensual, "
            "jornada_horas, irpf_porcentaje) VALUES ($1, 'Empleado Test', 1500, 40, 10) RETURNING id",
            tenant_id,
        )
    return await db.fetchval(
        "INSERT INTO empleados (tenant_id, nombre_completo) VALUES ($1, 'Empleado Test') RETURNING id",
        tenant_id,
    )


def _calcular(client, user, body):
    return client.post("/api/nominas/calcular", json=body, headers=auth_headers(user))


# --- Cierres de caja -------------------------------------------------------

async def test_cierre_caja_concurrente_un_solo_cierre(client, seed, db):
    admin = seed.a.usuarios["admin"]
    body = {"fecha": FECHA}

    r1, r2 = await asyncio.gather(
        client.post("/api/tpv/cierre-caja", json=body, headers=auth_headers(admin)),
        client.post("/api/tpv/cierre-caja", json=body, headers=auth_headers(admin)),
    )

    assert sorted([r1.status_code, r2.status_code]) == [200, 409], (r1.text, r2.text)
    assert await db.fetchval(
        "SELECT count(*) FROM cierres_caja WHERE outlet_id = $1 AND fecha = $2",
        seed.a.outlet_id, date.fromisoformat(FECHA),
    ) == 1


async def test_cierre_caja_repetido_409(client, seed):
    admin = seed.a.usuarios["admin"]
    body = {"fecha": FECHA}
    assert (await client.post("/api/tpv/cierre-caja", json=body,
                              headers=auth_headers(admin))).status_code == 200

    r = await client.post("/api/tpv/cierre-caja", json=body, headers=auth_headers(admin))

    assert r.status_code == 409, r.text
    assert r.json()["detail"] == "Ya existe un cierre de caja para esta fecha"


async def test_bd_rechaza_cierre_duplicado(seed, db):
    sql = "INSERT INTO cierres_caja (outlet_id, fecha) VALUES ($1, $2)"
    await db.execute(sql, seed.a.outlet_id, date.fromisoformat(FECHA))
    with pytest.raises(asyncpg.UniqueViolationError):
        await db.execute(sql, seed.a.outlet_id, date.fromisoformat(FECHA))


# --- Nóminas ---------------------------------------------------------------

async def test_nomina_concurrente_una_sola(client, seed, db):
    empleado_id = await _empleado(db, seed.a.id, con_salario=True)
    body = {"empleado_id": str(empleado_id), "mes": 9, "anio": 2026}
    admin = seed.a.usuarios["admin"]

    r1, r2 = await asyncio.gather(_calcular(client, admin, body), _calcular(client, admin, body))

    assert sorted([r1.status_code, r2.status_code]) == [201, 409], (r1.text, r2.text)
    assert await db.fetchval(
        "SELECT count(*) FROM nominas WHERE empleado_id = $1", empleado_id
    ) == 1


async def test_nomina_repetida_409(client, seed, db):
    empleado_id = await _empleado(db, seed.a.id, con_salario=True)
    body = {"empleado_id": str(empleado_id), "mes": 9, "anio": 2026}
    admin = seed.a.usuarios["admin"]
    assert (await _calcular(client, admin, body)).status_code == 201

    r = await _calcular(client, admin, body)

    assert r.status_code == 409, r.text
    assert r.json()["detail"] == "Ya existe nómina para ese periodo"


@pytest.mark.parametrize(
    "campo", ["horas_extra_cantidad", "plus_festivos", "otros_devengos", "otras_deducciones"]
)
async def test_nomina_importes_negativos_422(client, seed, db, campo):
    empleado_id = await _empleado(db, seed.a.id, con_salario=True)
    body = {"empleado_id": str(empleado_id), "mes": 9, "anio": 2026, campo: "-100"}

    r = await _calcular(client, seed.a.usuarios["admin"], body)

    assert r.status_code == 422, r.text
    assert await db.fetchval(
        "SELECT count(*) FROM nominas WHERE empleado_id = $1", empleado_id
    ) == 0


async def test_bd_rechaza_nomina_duplicada(seed, db):
    empleado_id = await _empleado(db, seed.a.id)
    await db.execute(NOMINA_SQL, empleado_id)
    with pytest.raises(asyncpg.UniqueViolationError):
        await db.execute(NOMINA_SQL, empleado_id)


# --- CHECK de importes no negativos ----------------------------------------

@pytest.mark.parametrize("columna", [
    "salario_bruto", "horas_extra_importe", "plus_festivos", "otros_devengos",
    "total_devengos", "ss_empleado", "irpf", "otras_deducciones",
    "total_deducciones", "ss_empresa", "coste_total_empresa",
])
async def test_bd_rechaza_nomina_importe_negativo(seed, db, columna):
    empleado_id = await _empleado(db, seed.a.id)
    await db.execute(NOMINA_SQL, empleado_id)
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            f"UPDATE nominas SET {columna} = -1 WHERE empleado_id = $1", empleado_id
        )


async def test_bd_permite_liquido_negativo(seed, db):
    empleado_id = await _empleado(db, seed.a.id)
    await db.execute(NOMINA_SQL, empleado_id)
    await db.execute("UPDATE nominas SET liquido = -50 WHERE empleado_id = $1", empleado_id)
    assert await db.fetchval(
        "SELECT liquido FROM nominas WHERE empleado_id = $1", empleado_id
    ) == -50


@pytest.mark.parametrize("columna", [
    "total_efectivo", "total_tarjeta", "total_bizum", "total_transferencia",
    "total_invitaciones", "total_ventas", "num_tickets", "ticket_medio",
])
async def test_bd_rechaza_cierre_importe_negativo(seed, db, columna):
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            f"INSERT INTO cierres_caja (outlet_id, fecha, {columna}) VALUES ($1, $2, -1)",
            seed.a.outlet_id, date.fromisoformat(FECHA),
        )


@pytest.mark.parametrize("columna", ["total", "total_iva"])
async def test_bd_rechaza_ticket_importe_negativo(seed, db, columna):
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            f"UPDATE tickets SET {columna} = -1 WHERE id = $1", seed.a.ticket_abierto_id
        )


@pytest.mark.parametrize("columna", ["precio_unitario", "subtotal"])
async def test_bd_rechaza_linea_importe_negativo(seed, db, columna):
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            f"UPDATE ticket_lineas SET {columna} = -1 WHERE id = $1",
            seed.a.ticket_abierto_lineas[0],
        )
