"""
Tests de cálculo de nóminas: SS empleado (6.35%), SS empresa (29.9%) e IRPF,
según las reglas fijas de España documentadas en .cursorrules.
"""

from decimal import Decimal

import pytest

from tests.conftest import crear_empleado, crear_tenant, crear_usuario, make_token


@pytest.mark.asyncio
async def test_calcular_nomina_caso_simple(client, db):
    tenant_id = await crear_tenant(db)
    admin_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    empleado_id = await crear_empleado(
        db,
        tenant_id,
        salario_bruto_mensual="2000.00",
        jornada_horas="40",
        irpf_porcentaje="15",
    )
    token = make_token(admin_id, "admin", tenant_id)

    resp = await client.post(
        "/api/nominas/calcular",
        json={"empleado_id": empleado_id, "mes": 6, "anio": 2026},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()

    # SS empleado = 6.35% de 2000.00 = 127.00
    assert Decimal(str(body["ss_empleado"])) == Decimal("127.00")
    # SS empresa = 29.9% de 2000.00 = 598.00
    assert Decimal(str(body["ss_empresa"])) == Decimal("598.00")
    # IRPF = 15% de 2000.00 = 300.00
    assert Decimal(str(body["irpf"])) == Decimal("300.00")
    # Total deducciones = 127.00 + 300.00 = 427.00
    assert Decimal(str(body["total_deducciones"])) == Decimal("427.00")
    # Líquido = 2000.00 - 427.00 = 1573.00
    assert Decimal(str(body["liquido"])) == Decimal("1573.00")
    # Coste total empresa = 2000.00 + 598.00 = 2598.00
    assert Decimal(str(body["coste_total_empresa"])) == Decimal("2598.00")

    desglose = body["desglose"]
    assert desglose["ss_empleado_pct"] == pytest.approx(6.35)
    assert desglose["ss_empresa_pct"] == pytest.approx(29.9)


@pytest.mark.asyncio
async def test_calcular_nomina_con_horas_extra_y_pluses(client, db):
    tenant_id = await crear_tenant(db)
    admin_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    empleado_id = await crear_empleado(
        db,
        tenant_id,
        salario_bruto_mensual="1732.00",  # salario_hora = 1732 / (40*4.33) = 10.00
        jornada_horas="40",
        irpf_porcentaje="10",
    )
    token = make_token(admin_id, "admin", tenant_id)

    resp = await client.post(
        "/api/nominas/calcular",
        json={
            "empleado_id": empleado_id,
            "mes": 7,
            "anio": 2026,
            "horas_extra_cantidad": "2",
            "plus_festivos": "50.00",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()

    # salario_hora = 1732.00 / (40*4.33) = 10.00 -> horas_extra_importe = 2 * 10.00 * 1.75 = 35.00
    assert Decimal(str(body["desglose"]["salario_hora"])) == Decimal("10.00")
    assert Decimal(str(body["horas_extra_importe"])) == Decimal("35.00")
    # total_devengos = 1732.00 + 35.00 + 50.00 = 1817.00
    assert Decimal(str(body["total_devengos"])) == Decimal("1817.00")


@pytest.mark.asyncio
async def test_no_se_puede_calcular_dos_nominas_mismo_periodo(client, db):
    tenant_id = await crear_tenant(db)
    admin_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    empleado_id = await crear_empleado(db, tenant_id, salario_bruto_mensual="2000.00")
    token = make_token(admin_id, "admin", tenant_id)

    body_req = {"empleado_id": empleado_id, "mes": 6, "anio": 2026}
    resp1 = await client.post(
        "/api/nominas/calcular", json=body_req, headers={"Authorization": f"Bearer {token}"}
    )
    assert resp1.status_code == 201

    resp2 = await client.post(
        "/api/nominas/calcular", json=body_req, headers={"Authorization": f"Bearer {token}"}
    )
    assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_calcular_nomina_prohibido_para_roles_no_rrhh(client, db):
    tenant_id = await crear_tenant(db)
    jefe_id, _ = await crear_usuario(db, tenant_id, None, rol="jefe_sala")
    empleado_id = await crear_empleado(db, tenant_id, salario_bruto_mensual="2000.00")
    token = make_token(jefe_id, "jefe_sala", tenant_id)

    resp = await client.post(
        "/api/nominas/calcular",
        json={"empleado_id": empleado_id, "mes": 6, "anio": 2026},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
