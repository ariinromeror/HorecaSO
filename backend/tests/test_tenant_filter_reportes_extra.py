"""Reportes nómina / inventario / fiscal / rentabilidad: cross-tenant."""

from datetime import date

from tests.auth_helpers import auth_headers


async def _empleado_con_usuario(db, tenant_id: str, usuario_id: str) -> str:
    return str(
        await db.fetchval(
            """
            INSERT INTO empleados
                (tenant_id, usuario_id, nombre_completo, dni, cargo, activo,
                 salario_bruto_mensual, jornada_horas, irpf_porcentaje)
            VALUES ($1, $2, 'Emp Nomina', '11111111H', 'camarero', true,
                    1500, 40, 10)
            RETURNING id
            """,
            tenant_id,
            usuario_id,
        )
    )


async def _nomina(db, empleado_id: str) -> str:
    return str(
        await db.fetchval(
            """
            INSERT INTO nominas (
                empleado_id, mes, anio, salario_bruto, total_devengos,
                ss_empleado, irpf, total_deducciones, liquido,
                ss_empresa, coste_total_empresa
            )
            VALUES ($1, 9, 2026, 1500, 1500, 95.25, 150, 245.25, 1254.75,
                    448.50, 1948.50)
            RETURNING id
            """,
            empleado_id,
        )
    )


async def test_reporte_nomina_datos_otro_tenant_404(client, seed, db):
    eid_b = await _empleado_con_usuario(
        db, seed.b.id, seed.b.usuarios["admin"].id
    )
    nid_b = await _nomina(db, eid_b)
    r = await client.get(
        f"/api/reportes/nomina/{nid_b}/datos",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 404, r.text


async def test_reporte_nomina_datos_propio_ok(client, seed, db):
    eid_a = await _empleado_con_usuario(
        db, seed.a.id, seed.a.usuarios["admin"].id
    )
    nid_a = await _nomina(db, eid_a)
    r = await client.get(
        f"/api/reportes/nomina/{nid_a}/datos",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["id"] == nid_a


async def test_reporte_nomina_pdf_otro_tenant_404(client, seed, db):
    eid_b = await _empleado_con_usuario(
        db, seed.b.id, seed.b.usuarios["camarero"].id
    )
    nid_b = await _nomina(db, eid_b)
    r = await client.get(
        f"/api/reportes/nomina/{nid_b}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 404, r.text


async def test_reporte_nomina_pdf_propio_ok(client, seed, db):
    eid_a = await _empleado_con_usuario(
        db, seed.a.id, seed.a.usuarios["camarero"].id
    )
    nid_a = await _nomina(db, eid_a)
    r = await client.get(
        f"/api/reportes/nomina/{nid_a}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    assert "application/pdf" in r.headers.get("content-type", "")


async def test_reporte_inventario_datos_no_incluye_otro_tenant(client, seed, db):
    art_b = await db.fetchval(
        """
        INSERT INTO articulos (tenant_id, nombre, unidad_medida, stock_actual)
        VALUES ($1, 'Art B secreto', 'kg', 10) RETURNING id
        """,
        seed.b.id,
    )
    r = await client.get(
        "/api/reportes/inventario/datos",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    ids = {a["id"] for a in r.json().get("articulos", [])}
    assert str(art_b) not in ids


async def test_reporte_inventario_datos_propio_ok(client, seed, db):
    art_a = await db.fetchval(
        """
        INSERT INTO articulos (tenant_id, nombre, unidad_medida, stock_actual)
        VALUES ($1, 'Art A', 'kg', 5) RETURNING id
        """,
        seed.a.id,
    )
    r = await client.get(
        "/api/reportes/inventario/datos",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    ids = {a["id"] for a in r.json().get("articulos", [])}
    assert str(art_a) in ids


async def test_fiscal_trimestre_no_incluye_otro_tenant(client, seed, db):
    """Fiscal filtra por tenant; con datos solo en B, A debe ver ceros/vacío."""
    r = await client.get(
        "/api/reportes/fiscal-trimestre?anio=2026&trimestre=4",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # No debe referenciar el NIF/tenant de B
    blob = str(body)
    assert seed.b.nif not in blob
    assert "B22222222" not in blob


async def test_fiscal_trimestre_propio_ok(client, seed):
    r = await client.get(
        "/api/reportes/fiscal-trimestre?anio=2026&trimestre=4",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text


async def test_rentabilidad_platos_datos_no_incluye_otro_tenant(client, seed, db):
    # Producto B con receta: no debe aparecer en respuesta de A
    cat_b = await db.fetchval(
        "INSERT INTO categorias_menu (tenant_id, nombre, orden) "
        "VALUES ($1, 'CatB', 1) RETURNING id",
        seed.b.id,
    )
    prod_b = await db.fetchval(
        """
        INSERT INTO productos
            (tenant_id, categoria_id, nombre, precio, iva_porcentaje, activo)
        VALUES ($1, $2, 'Plato B secreto', 20, 10, true) RETURNING id
        """,
        seed.b.id,
        cat_b,
    )
    await db.execute(
        """
        INSERT INTO recetas (producto_id, coste_calculado, margen_porcentaje)
        VALUES ($1, 5.00, 75.00)
        """,
        prod_b,
    )
    r = await client.get(
        "/api/reportes/rentabilidad-platos/datos",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    nombres = {f.get("nombre") for f in r.json().get("filas", [])}
    assert "Plato B secreto" not in nombres


async def test_rentabilidad_platos_datos_propio_ok(client, seed, db):
    cat_a = await db.fetchval(
        "INSERT INTO categorias_menu (tenant_id, nombre, orden) "
        "VALUES ($1, 'CatA', 2) RETURNING id",
        seed.a.id,
    )
    prod_a = await db.fetchval(
        """
        INSERT INTO productos
            (tenant_id, categoria_id, nombre, precio, iva_porcentaje, activo)
        VALUES ($1, $2, 'Plato A', 15, 10, true) RETURNING id
        """,
        seed.a.id,
        cat_a,
    )
    await db.execute(
        """
        INSERT INTO recetas (producto_id, coste_calculado, margen_porcentaje)
        VALUES ($1, 4.00, 70.00)
        """,
        prod_a,
    )
    r = await client.get(
        "/api/reportes/rentabilidad-platos/datos",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    nombres = {f.get("nombre") for f in r.json().get("filas", [])}
    assert "Plato A" in nombres
