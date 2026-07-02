"""
Test de integración end-to-end del flujo TPV completo:
crear mesa -> abrir ticket -> añadir línea -> cobrar -> Verifactu.

Cubre en un solo flujo real (vía HTTP, no llamando a funciones internas):
- Decimal/redondeo en el total del ticket.
- Generación correcta del registro Verifactu (IVA 10%, huella SHA-256).
- Que cobrar libera la mesa y marca el ticket como cobrado.
"""

from decimal import ROUND_HALF_UP, Decimal

import pytest

from services.verifactu_engine import generar_huella
from tests.conftest import crear_outlet, crear_producto, crear_tenant, crear_usuario, make_token


@pytest.mark.asyncio
async def test_flujo_completo_ticket_cobro_y_verifactu(client, db):
    tenant_id = await crear_tenant(db, nombre="Restaurante Flujo", nif="F99999999")
    outlet_id = await crear_outlet(db, tenant_id)
    admin_id, _ = await crear_usuario(db, tenant_id, outlet_id, rol="admin")
    camarero_id, _ = await crear_usuario(db, tenant_id, outlet_id, rol="camarero")
    producto_id = await crear_producto(db, tenant_id, nombre="Cerveza", precio="3.50")

    token_admin = make_token(admin_id, "admin", tenant_id)
    token_camarero = make_token(camarero_id, "camarero", tenant_id)

    # 1. Crear mesa (rol admin/director/jefe_sala)
    resp = await client.post(
        "/api/mesas/",
        json={"numero": 1, "capacidad": 4, "outlet_id": outlet_id},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert resp.status_code == 200, resp.text
    mesa_id = resp.json()["id"]
    assert resp.json()["estado"] == "libre"

    # 2. Abrir ticket (rol camarero) — la mesa pasa a ocupada
    resp = await client.post(
        "/api/tpv/tickets",
        json={"mesa_id": mesa_id, "outlet_id": outlet_id},
        headers={"Authorization": f"Bearer {token_camarero}"},
    )
    assert resp.status_code == 200, resp.text
    ticket_id = resp.json()["id"]
    assert resp.json()["estado"] == "abierto"

    mesa_row = await db.fetchrow("SELECT estado FROM mesas WHERE id = $1", mesa_id)
    assert mesa_row["estado"] == "ocupada"

    # 3. Añadir línea: 2x Cerveza a 3.50 = 7.00
    resp = await client.post(
        f"/api/tpv/tickets/{ticket_id}/lineas",
        json={"producto_id": producto_id, "cantidad": 2},
        headers={"Authorization": f"Bearer {token_camarero}"},
    )
    assert resp.status_code == 200, resp.text
    assert Decimal(str(resp.json()["subtotal"])) == Decimal("7.00")

    ticket_row = await db.fetchrow("SELECT total FROM tickets WHERE id = $1", ticket_id)
    assert Decimal(str(ticket_row["total"])) == Decimal("7.00")

    # 4. Cobrar en efectivo
    resp = await client.post(
        f"/api/tpv/tickets/{ticket_id}/cobrar",
        json={"metodo_pago": "efectivo"},
        headers={"Authorization": f"Bearer {token_camarero}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["estado"] == "cobrado"
    assert body["metodo_pago"] == "efectivo"

    mesa_row = await db.fetchrow("SELECT estado FROM mesas WHERE id = $1", mesa_id)
    assert mesa_row["estado"] == "libre"

    # 5. Verifactu: IVA 10% hostelería sobre 7.00 -> base 6.36, cuota 0.64
    verifactu_row = await db.fetchrow(
        "SELECT * FROM verifactu_registros WHERE ticket_id = $1", ticket_id
    )
    assert verifactu_row is not None
    assert str(verifactu_row["tenant_id"]) == tenant_id

    base_esperada = (Decimal("7.00") / Decimal("1.10")).quantize(
        Decimal("0.01"), ROUND_HALF_UP
    )
    cuota_esperada = Decimal("7.00") - base_esperada
    assert Decimal(str(verifactu_row["base_imponible"])) == base_esperada
    assert Decimal(str(verifactu_row["cuota_iva"])) == cuota_esperada
    assert Decimal(str(verifactu_row["importe_total"])) == Decimal("7.00")

    # La huella debe ser reproducible con la misma función que la generó.
    tenant_row = await db.fetchrow("SELECT nif FROM tenants WHERE id = $1", tenant_id)
    fecha_hora_str = verifactu_row["fecha_hora_generacion"].strftime(
        "%Y-%m-%dT%H:%M:%S"
    ) + "+00:00"
    registro_recalculo = {
        "nif_emisor": tenant_row["nif"],
        "numero_serie": verifactu_row["numero_serie"],
        "fecha_expedicion": verifactu_row["fecha_expedicion"].isoformat(),
        "tipo_factura": verifactu_row["tipo_factura"],
        "cuota_iva": verifactu_row["cuota_iva"],
        "importe_total": verifactu_row["importe_total"],
        "fecha_hora_generacion": fecha_hora_str,
    }
    huella_recalculada = generar_huella(
        registro_recalculo, verifactu_row["huella_anterior"] or ""
    )
    assert huella_recalculada == verifactu_row["huella_actual"]
    assert verifactu_row["numero_serie"].startswith("SERIE-")


@pytest.mark.asyncio
async def test_no_se_puede_cobrar_dos_veces_el_mismo_ticket(client, db):
    tenant_id = await crear_tenant(db)
    outlet_id = await crear_outlet(db, tenant_id)
    admin_id, _ = await crear_usuario(db, tenant_id, outlet_id, rol="admin")
    camarero_id, _ = await crear_usuario(db, tenant_id, outlet_id, rol="camarero")
    token_admin = make_token(admin_id, "admin", tenant_id)
    token_camarero = make_token(camarero_id, "camarero", tenant_id)

    resp = await client.post(
        "/api/mesas/",
        json={"numero": 5, "outlet_id": outlet_id},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    mesa_id = resp.json()["id"]

    resp = await client.post(
        "/api/tpv/tickets",
        json={"mesa_id": mesa_id, "outlet_id": outlet_id},
        headers={"Authorization": f"Bearer {token_camarero}"},
    )
    ticket_id = resp.json()["id"]

    resp1 = await client.post(
        f"/api/tpv/tickets/{ticket_id}/cobrar",
        json={"metodo_pago": "tarjeta_credito"},
        headers={"Authorization": f"Bearer {token_camarero}"},
    )
    assert resp1.status_code == 200

    resp2 = await client.post(
        f"/api/tpv/tickets/{ticket_id}/cobrar",
        json={"metodo_pago": "tarjeta_credito"},
        headers={"Authorization": f"Bearer {token_camarero}"},
    )
    assert resp2.status_code == 400

    verifactu_count = await db.fetchval(
        "SELECT COUNT(*) FROM verifactu_registros WHERE ticket_id = $1", ticket_id
    )
    assert verifactu_count == 1


def test_ningun_router_o_servicio_hace_update_o_delete_sobre_verifactu_registros():
    """
    Regla inamovible (.cursorrules — Verifactu): NUNCA UPDATE ni DELETE sobre
    `verifactu_registros`. Es un análisis estático simple (grep sobre el
    código fuente) que actúa como red de seguridad: si alguien añade un
    UPDATE/DELETE contra esa tabla en el futuro, este test lo detecta sin
    necesitar ejecutar ese código.
    """
    import re
    from pathlib import Path

    backend_dir = Path(__file__).resolve().parent.parent
    patron = re.compile(
        r"(UPDATE|DELETE\s+FROM)\s+verifactu_registros", re.IGNORECASE
    )
    ofensores = []
    for carpeta in ("routers", "services"):
        for path in (backend_dir / carpeta).rglob("*.py"):
            texto = path.read_text(encoding="utf-8")
            if patron.search(texto):
                ofensores.append(str(path.relative_to(backend_dir)))

    assert ofensores == [], (
        "Se ha encontrado UPDATE/DELETE sobre verifactu_registros en: "
        + ", ".join(ofensores)
    )
