"""
Tests de aislamiento multi-tenant (regresión de los IDOR corregidos en la
Fase 1 del PRD): un usuario del tenant A nunca debe poder leer ni modificar
recursos del tenant B, aunque conozca (o adivine) el UUID.
"""

import pytest

from tests.conftest import (
    crear_mesa,
    crear_outlet,
    crear_producto,
    crear_tenant,
    crear_ticket,
    crear_usuario,
    make_token,
)


async def _setup_dos_tenants(db):
    """Crea tenant A (con mesa/ticket) y tenant B (usuario atacante)."""
    tenant_a = await crear_tenant(db, nombre="Restaurante A", nif="A11111111")
    outlet_a = await crear_outlet(db, tenant_a, nombre="Outlet A")
    user_a_id, _ = await crear_usuario(db, tenant_a, outlet_a, rol="camarero")
    mesa_a = await crear_mesa(db, outlet_a, numero=1)
    ticket_a = await crear_ticket(db, outlet_a, mesa_a, user_a_id)

    tenant_b = await crear_tenant(db, nombre="Restaurante B", nif="B22222222")
    outlet_b = await crear_outlet(db, tenant_b, nombre="Outlet B")
    user_b_id, _ = await crear_usuario(db, tenant_b, outlet_b, rol="camarero")

    return {
        "tenant_a": tenant_a,
        "outlet_a": outlet_a,
        "user_a_id": user_a_id,
        "mesa_a": mesa_a,
        "ticket_a": ticket_a,
        "tenant_b": tenant_b,
        "outlet_b": outlet_b,
        "user_b_id": user_b_id,
    }


@pytest.mark.asyncio
async def test_get_mesa_de_otro_tenant_devuelve_403_o_404(client, db):
    ctx = await _setup_dos_tenants(db)
    token_b = make_token(ctx["user_b_id"], "camarero", ctx["tenant_b"])

    resp = await client.get(
        f"/api/mesas/{ctx['mesa_a']}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_get_mesa_del_propio_tenant_funciona(client, db):
    ctx = await _setup_dos_tenants(db)
    token_a = make_token(ctx["user_a_id"], "camarero", ctx["tenant_a"])

    resp = await client.get(
        f"/api/mesas/{ctx['mesa_a']}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == ctx["mesa_a"]


@pytest.mark.asyncio
async def test_get_ticket_de_otro_tenant_devuelve_403_o_404(client, db):
    ctx = await _setup_dos_tenants(db)
    token_b = make_token(ctx["user_b_id"], "camarero", ctx["tenant_b"])

    resp = await client.get(
        f"/api/tpv/tickets/{ctx['ticket_a']}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_cobrar_ticket_de_otro_tenant_devuelve_403_o_404(client, db):
    """Regresión directa del hallazgo P0 de la Fase 1: un usuario no puede
    cobrar (ni por tanto generar Verifactu) sobre un ticket ajeno."""
    ctx = await _setup_dos_tenants(db)
    token_b = make_token(ctx["user_b_id"], "camarero", ctx["tenant_b"])

    resp = await client.post(
        f"/api/tpv/tickets/{ctx['ticket_a']}/cobrar",
        json={"metodo_pago": "efectivo"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code in (403, 404)

    # El ticket de la víctima sigue abierto: no se cobró nada.
    row = await db.fetchrow("SELECT estado FROM tickets WHERE id = $1", ctx["ticket_a"])
    assert row["estado"] == "abierto"

    # Y no se generó ningún registro Verifactu para ese ticket.
    verifactu_count = await db.fetchval(
        "SELECT COUNT(*) FROM verifactu_registros WHERE ticket_id = $1", ctx["ticket_a"]
    )
    assert verifactu_count == 0


@pytest.mark.asyncio
async def test_add_linea_a_ticket_de_otro_tenant_devuelve_403_o_404(client, db):
    ctx = await _setup_dos_tenants(db)
    producto_b = await crear_producto(db, ctx["tenant_b"], nombre="Cerveza B")
    token_b = make_token(ctx["user_b_id"], "camarero", ctx["tenant_b"])

    resp = await client.post(
        f"/api/tpv/tickets/{ctx['ticket_a']}/lineas",
        json={"producto_id": producto_b, "cantidad": 1},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code in (403, 404)

    lineas_count = await db.fetchval(
        "SELECT COUNT(*) FROM ticket_lineas WHERE ticket_id = $1", ctx["ticket_a"]
    )
    assert lineas_count == 0
