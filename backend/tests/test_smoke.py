"""
Test de humo: flujo feliz completo de sala.
login camarero -> abrir mesa (crear ticket) -> añadir línea -> cobrar en efectivo.
"""

from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo


async def test_login_abrir_mesa_cobrar(client, seed, db):
    tenant = seed.a
    camarero = tenant.usuarios["camarero"]

    r = await client.post(
        "/api/auth/login",
        json={"email": camarero.email, "password": seed.password},
    )
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "camarero"
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = await client.post(
        "/api/tpv/tickets",
        json={"mesa_id": tenant.mesa_libre_id, "outlet_id": tenant.outlet_id},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    ticket_id = r.json()["id"]
    assert r.json()["estado"] == "abierto"
    assert await db.fetchval("SELECT estado FROM mesas WHERE id = $1", tenant.mesa_libre_id) == "ocupada"

    r = await client.post(
        f"/api/tpv/tickets/{ticket_id}/lineas",
        json={"producto_id": tenant.productos["menu"], "cantidad": 2},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    r = await client.post(
        f"/api/tpv/tickets/{ticket_id}/cobrar",
        json={"metodo_pago": "efectivo"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["estado"] == "cobrado"
    assert body["metodo_pago"] == "efectivo"
    assert Decimal(str(body["total"])) == Decimal("25.00")
    year = datetime.now(ZoneInfo("Europe/Madrid")).strftime("%Y")
    assert body["verifactu_numero_serie"] == f"SERIE-{year}-000001"

    assert await db.fetchval("SELECT estado FROM mesas WHERE id = $1", tenant.mesa_libre_id) == "libre"
    vf = await db.fetchrow(
        "SELECT tenant_id, importe_total, base_imponible, cuota_iva, huella_actual "
        "FROM verifactu_registros WHERE ticket_id = $1",
        ticket_id,
    )
    assert vf is not None
    assert str(vf["tenant_id"]) == tenant.id
    assert vf["importe_total"] == Decimal("25.00")
    assert vf["base_imponible"] == Decimal("22.73")
    assert vf["cuota_iva"] == Decimal("2.27")
    assert len(vf["huella_actual"]) == 64
