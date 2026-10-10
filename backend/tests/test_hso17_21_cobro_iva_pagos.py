"""
HSO-17 — tickets.total_iva no se rellenaba al cobrar (el informe de ventas daba IVA 0).
HSO-21 — /cobrar no dejaba su pago en ticket_pagos; el cierre del dashboard
         ignoraba los cobros mixtos.

Ticket abierto del seed: 2 x Menú 12.50 (IVA 10) + 2 x Caña 2.50 (IVA 21) = 30.00
  Menú: 25.00 -> base 22.73, cuota 2.27
  Caña:  5.00 -> base  4.13, cuota 0.87      => cuota total 3.14
"""

import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

from tests.auth_helpers import auth_headers
from tests.factories import PRECIO_CANA, PRECIO_MENU, create_open_ticket

CUOTA_TICKET_SEED = Decimal("3.14")
SCRIPT_HISTORICO = Path(__file__).resolve().parent.parent / "sql" / "ops_hso17_recalcular_total_iva.sql"


def _cobrar(ticket_id):
    return f"/api/tpv/tickets/{ticket_id}/cobrar"


def _pagos(ticket_id):
    return f"/api/tpv/tickets/{ticket_id}/pagos"


async def _pagos_ticket(db, ticket_id):
    rows = await db.fetch(
        "SELECT importe, metodo_pago FROM ticket_pagos WHERE ticket_id = $1 ORDER BY created_at, metodo_pago",
        ticket_id,
    )
    return [(r["metodo_pago"], r["importe"]) for r in rows]


async def _segundo_ticket(db, t, importe_menus=2):
    """Ticket abierto en otra mesa: `importe_menus` x Menú (IVA 10)."""
    tid, total, _ = await create_open_ticket(
        db, outlet_id=t.outlet_id, mesa_id=t.mesa_libre_id,
        camarero_id=t.usuarios["camarero"].id,
        lineas=[(t.productos["menu"], importe_menus, PRECIO_MENU)],
    )
    return tid, total


# --- HSO-17 -------------------------------------------------------------------

async def test_cobrar_rellena_total_iva_igual_que_verifactu(client, seed, db):
    t = seed.a
    r = await client.post(_cobrar(t.ticket_abierto_id), json={"metodo_pago": "efectivo"},
                          headers=auth_headers(t.usuarios["camarero"]))

    assert r.status_code == 200, r.text
    total_iva = await db.fetchval("SELECT total_iva FROM tickets WHERE id = $1", t.ticket_abierto_id)
    cuota_vf = await db.fetchval(
        "SELECT cuota_iva FROM verifactu_registros WHERE ticket_id = $1", t.ticket_abierto_id
    )
    assert cuota_vf == CUOTA_TICKET_SEED
    assert total_iva == cuota_vf


async def test_pago_dividido_rellena_total_iva(client, seed, db):
    t = seed.a
    h = auth_headers(t.usuarios["camarero"])
    await client.post(_pagos(t.ticket_abierto_id), json={"importe": "10.00", "metodo_pago": "tarjeta_credito"}, headers=h)
    r = await client.post(_pagos(t.ticket_abierto_id), json={"importe": "20.00", "metodo_pago": "efectivo"}, headers=h)

    assert r.status_code == 200 and r.json()["completado"] is True, r.text
    assert await db.fetchval(
        "SELECT total_iva FROM tickets WHERE id = $1", t.ticket_abierto_id
    ) == CUOTA_TICKET_SEED


async def test_informe_ventas_muestra_iva(client, seed, db):
    t = seed.a
    await client.post(_cobrar(t.ticket_abierto_id), json={"metodo_pago": "tarjeta_debito"},
                      headers=auth_headers(t.usuarios["camarero"]))
    hoy = datetime.now(ZoneInfo("Europe/Madrid")).date().isoformat()

    r = await client.get("/api/reportes/ventas/datos", params={"desde": hoy, "hasta": hoy},
                         headers=auth_headers(t.usuarios["admin"]))

    assert r.status_code == 200, r.text
    assert Decimal(str(r.json()["filas"][0]["iva"])) == CUOTA_TICKET_SEED


def _bloque_rollback(sql: str) -> str:
    bloque = sql.split("-- ROLLBACK")[1]
    bloque = "-- BEGIN;" + bloque.split("-- BEGIN;", 1)[1].split("-- COMMIT;", 1)[0] + "-- COMMIT;"
    return "\n".join(re.sub(r"^-- ?", "", ln) for ln in bloque.splitlines())


async def test_script_historico_total_iva(client, seed, db):
    t = seed.a
    # Ticket cobrado "antiguo": registro Verifactu correcto pero total_iva = 0.
    await client.post(_cobrar(t.ticket_abierto_id), json={"metodo_pago": "efectivo"},
                      headers=auth_headers(t.usuarios["camarero"]))
    await db.execute("UPDATE tickets SET total_iva = 0 WHERE id = $1", t.ticket_abierto_id)
    # Ticket cobrado sin registro Verifactu: 1 Menú (IVA 10) + 2 Cañas (IVA 21) = 17.50
    #   12.50 -> base 11.36, cuota 1.14 ; 5.00 -> base 4.13, cuota 0.87  => 2.01
    sin_vf, _, _ = await create_open_ticket(
        db, outlet_id=t.outlet_id, mesa_id=t.mesa_libre_id, camarero_id=t.usuarios["camarero"].id,
        lineas=[(t.productos["menu"], 1, PRECIO_MENU), (t.productos["cana"], 2, PRECIO_CANA)],
    )
    await db.execute("UPDATE tickets SET estado = 'cobrado', cobrado_at = now() WHERE id = $1", sin_vf)
    abierto, _, _ = await create_open_ticket(
        db, outlet_id=t.outlet_id, mesa_id=t.mesa_libre_2_id, camarero_id=t.usuarios["camarero"].id,
        lineas=[(t.productos["menu"], 1, PRECIO_MENU)],
    )
    sql = SCRIPT_HISTORICO.read_text(encoding="utf-8")

    await db.execute(sql)
    await db.execute(sql)  # idempotente

    iva = {str(r["id"]): r["total_iva"] for r in await db.fetch("SELECT id, total_iva FROM tickets")}
    assert iva[t.ticket_abierto_id] == CUOTA_TICKET_SEED
    assert iva[sin_vf] == Decimal("2.01")
    assert iva[abierto] == Decimal("0.00")
    assert await db.fetchval(
        "SELECT total_iva_anterior FROM ops_hso17_total_iva_backup WHERE ticket_id = $1",
        t.ticket_abierto_id,
    ) == Decimal("0.00")

    await db.execute(_bloque_rollback(sql))

    assert await db.fetchval(
        "SELECT total_iva FROM tickets WHERE id = $1", t.ticket_abierto_id
    ) == Decimal("0.00")
    assert await db.fetchval("SELECT to_regclass('public.ops_hso17_total_iva_backup')") is None


# --- HSO-21 -------------------------------------------------------------------

async def test_cobrar_inserta_pago_en_ticket_pagos(client, seed, db):
    t = seed.a
    r = await client.post(_cobrar(t.ticket_abierto_id), json={"metodo_pago": "bizum"},
                          headers=auth_headers(t.usuarios["camarero"]))

    assert r.status_code == 200, r.text
    assert await _pagos_ticket(db, t.ticket_abierto_id) == [("bizum", Decimal("30.00"))]


async def test_cobrar_tras_pago_parcial_solo_registra_el_pendiente(client, seed, db):
    t = seed.a
    h = auth_headers(t.usuarios["camarero"])
    await client.post(_pagos(t.ticket_abierto_id), json={"importe": "10.00", "metodo_pago": "tarjeta_credito"}, headers=h)

    r = await client.post(_cobrar(t.ticket_abierto_id), json={"metodo_pago": "efectivo"}, headers=h)

    assert r.status_code == 200, r.text
    pagos = await _pagos_ticket(db, t.ticket_abierto_id)
    assert sorted(pagos) == [("efectivo", Decimal("20.00")), ("tarjeta_credito", Decimal("10.00"))]
    assert await db.fetchval(
        "SELECT metodo_pago FROM tickets WHERE id = $1", t.ticket_abierto_id
    ) == "mixto"


async def test_cierre_con_pagos_mixtos_cuadra_con_los_tickets(client, seed, db):
    """
    Ticket 1 (30.00): 10.00 tarjeta + 20.00 efectivo por /pagos.
    Ticket 2 (25.00): /cobrar con tarjeta.
    Ticket 3 (12.50): 5.00 bizum por /pagos y el resto por /cobrar en efectivo.
    """
    t = seed.a
    h = auth_headers(t.usuarios["camarero"])
    await client.post(_pagos(t.ticket_abierto_id), json={"importe": "10.00", "metodo_pago": "tarjeta_credito"}, headers=h)
    await client.post(_pagos(t.ticket_abierto_id), json={"importe": "20.00", "metodo_pago": "efectivo"}, headers=h)

    t2, _ = await _segundo_ticket(db, t, 2)
    assert (await client.post(_cobrar(t2), json={"metodo_pago": "tarjeta_debito"}, headers=h)).status_code == 200

    t3, _, _ = await create_open_ticket(
        db, outlet_id=t.outlet_id, mesa_id=t.mesa_libre_2_id, camarero_id=t.usuarios["camarero"].id,
        lineas=[(t.productos["menu"], 1, PRECIO_MENU)],
    )
    await client.post(_pagos(t3), json={"importe": "5.00", "metodo_pago": "bizum"}, headers=h)
    assert (await client.post(_cobrar(t3), json={"metodo_pago": "efectivo"}, headers=h)).status_code == 200

    esperado = {
        "total_efectivo": Decimal("27.50"),
        "total_tarjeta": Decimal("35.00"),
        "total_bizum": Decimal("5.00"),
        "total_ventas": Decimal("67.50"),
        "num_tickets": 3,
    }
    suma_tickets = await db.fetchval(
        "SELECT SUM(total) FROM tickets WHERE outlet_id = $1 AND estado = 'cobrado'", t.outlet_id
    )
    suma_pagos = await db.fetchval(
        """
        SELECT SUM(p.importe) FROM ticket_pagos p JOIN tickets tk ON tk.id = p.ticket_id
        WHERE tk.outlet_id = $1 AND tk.estado = 'cobrado'
        """,
        t.outlet_id,
    )
    assert suma_tickets == suma_pagos == esperado["total_ventas"]

    admin = auth_headers(t.usuarios["admin"])
    tpv = (await client.get("/api/tpv/cierre-caja/preview", headers=admin)).json()
    dash = (await client.get("/api/dashboard/cierre-dia", headers=admin)).json()

    for cierre in (tpv, dash):
        for k, v in esperado.items():
            assert Decimal(str(cierre[k])) == Decimal(str(v)), (k, cierre)
        metodos = sum(
            Decimal(str(cierre[k]))
            for k in ("total_efectivo", "total_tarjeta", "total_bizum",
                      "total_transferencia", "total_invitaciones")
        )
        assert metodos == Decimal(str(cierre["total_ventas"]))

    r = await client.post("/api/tpv/cierre-caja", json={}, headers=admin)
    assert r.status_code == 200, r.text
    fila = await db.fetchrow("SELECT * FROM cierres_caja WHERE outlet_id = $1", t.outlet_id)
    assert fila["total_efectivo"] + fila["total_tarjeta"] + fila["total_bizum"] == fila["total_ventas"]
