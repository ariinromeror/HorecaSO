"""
Tests de RBAC: endpoints que la Fase 1 del PRD pasó de `get_current_user`
(cualquier rol autenticado) a `require_roles([...])`. Verifica que un rol
operativo (`cocina`) recibe 403 y que el rol autorizado (`admin`/`director`)
sí puede acceder.
"""

import pytest

from tests.conftest import (
    crear_mesa,
    crear_outlet,
    crear_tenant,
    crear_ticket,
    crear_usuario,
    make_token,
)


@pytest.mark.asyncio
async def test_verifactu_prohibido_para_cocina(client, db):
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="cocina")
    token = make_token(user_id, "cocina", tenant_id)

    resp = await client.get(
        "/api/verifactu/registros", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_verifactu_permitido_para_admin(client, db):
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    resp = await client.get(
        "/api/verifactu/registros", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_dashboard_prohibido_para_camarero(client, db):
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="camarero")
    token = make_token(user_id, "camarero", tenant_id)

    resp = await client.get(
        "/api/dashboard/director", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_permitido_para_director(client, db):
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="director")
    token = make_token(user_id, "director", tenant_id)

    resp = await client.get(
        "/api/dashboard/director", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ventas_hoy"] == 0
    assert body["num_tickets_hoy"] == 0


@pytest.mark.asyncio
async def test_cobrar_ticket_prohibido_para_cocina(client, db):
    tenant_id = await crear_tenant(db)
    outlet_id = await crear_outlet(db, tenant_id)
    camarero_id, _ = await crear_usuario(db, tenant_id, outlet_id, rol="camarero")
    cocina_id, _ = await crear_usuario(db, tenant_id, outlet_id, rol="cocina")
    mesa_id = await crear_mesa(db, outlet_id)
    ticket_id = await crear_ticket(db, outlet_id, mesa_id, camarero_id)

    token_cocina = make_token(cocina_id, "cocina", tenant_id)
    resp = await client.post(
        f"/api/tpv/tickets/{ticket_id}/cobrar",
        json={"metodo_pago": "efectivo"},
        headers={"Authorization": f"Bearer {token_cocina}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_turnos_prohibido_para_roles_operativos(client, db):
    """GET /api/turnos (historial de fichajes de cualquier empleado del
    tenant) se restringió a admin/director/jefe_sala en la Fase 1."""
    tenant_id = await crear_tenant(db)
    outlet_id = await crear_outlet(db, tenant_id)
    almacen_id, _ = await crear_usuario(db, tenant_id, outlet_id, rol="almacen")
    token = make_token(almacen_id, "almacen", tenant_id)

    resp = await client.get("/api/turnos", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_turnos_permitido_para_jefe_sala(client, db):
    tenant_id = await crear_tenant(db)
    outlet_id = await crear_outlet(db, tenant_id)
    jefe_id, _ = await crear_usuario(db, tenant_id, outlet_id, rol="jefe_sala")
    token = make_token(jefe_id, "jefe_sala", tenant_id)

    resp = await client.get("/api/turnos", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
