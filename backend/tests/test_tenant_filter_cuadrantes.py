"""Cuadrantes: outlet del JWT debe pertenecer al tenant."""

from datetime import date, timedelta

from tests.auth_helpers import auth_headers


async def _remap_outlet(db, user_id: str, outlet_id: str):
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        outlet_id,
        user_id,
    )


async def _cuadrante(db, outlet_id: str, created_by: str, lunes: date) -> str:
    domingo = lunes + timedelta(days=6)
    return str(
        await db.fetchval(
            """
            INSERT INTO cuadrantes
                (outlet_id, semana_inicio, semana_fin, publicado, created_by)
            VALUES ($1, $2, $3, true, $4)
            RETURNING id
            """,
            outlet_id,
            lunes,
            domingo,
            created_by,
        )
    )


def _lunes() -> date:
    hoy = date.today()
    return hoy - timedelta(days=hoy.weekday())


async def test_cuadrantes_outlet_otro_tenant_bloqueado(client, seed, db):
    """Usuario A con outlet_id de B no debe ver el cuadrante de B."""
    lunes = _lunes()
    cid_b = await _cuadrante(
        db, seed.b.outlet_id, seed.b.usuarios["admin"].id, lunes
    )
    a_admin = seed.a.usuarios["admin"]
    await _remap_outlet(db, a_admin.id, seed.b.outlet_id)

    r = await client.get(
        f"/api/cuadrantes/?semana_inicio={lunes.isoformat()}",
        headers=auth_headers(a_admin),
    )
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        body = r.json()
        if body is None:
            return
        assert body.get("id") != cid_b, "no debe devolver cuadrante de otro tenant"


async def test_cuadrantes_outlet_propio_ok(client, seed, db):
    lunes = _lunes()
    cid_a = await _cuadrante(
        db, seed.a.outlet_id, seed.a.usuarios["admin"].id, lunes
    )
    r = await client.get(
        f"/api/cuadrantes/?semana_inicio={lunes.isoformat()}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body is not None
    assert body["id"] == cid_a
