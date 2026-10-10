"""
HSO-22 / HSO-23 — Defensa en profundidad y try/except en los módulos del informe.
"""

from decimal import Decimal

import pytest
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from config import settings
from main import create_app
from routers.recetas.admin_recetas_ingredientes import _actualizar_coste_receta
from tests.auth_helpers import auth_headers


def test_docs_ocultos_fuera_de_development(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    app = create_app()
    assert isinstance(app, FastAPI)
    assert app.docs_url is None
    assert app.redoc_url is None
    assert app.openapi_url is None


def test_docs_visibles_en_development(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    app = create_app()
    assert app.docs_url == "/docs"
    assert app.openapi_url == "/openapi.json"


def test_cors_vacio_no_acepta_asterisco(monkeypatch):
    monkeypatch.setattr(settings, "ALLOWED_ORIGINS", "")
    app = create_app()
    cors = [m for m in app.user_middleware if m.cls is CORSMiddleware]
    assert cors, "CORSMiddleware no está instalado"
    orígenes = cors[0].kwargs.get("allow_origins")
    assert orígenes == []
    assert "*" not in orígenes


async def test_coste_elaboracion_no_toca_articulo_de_otro_tenant(seed, db):
    """HSO-22: UPDATE articulos debe filtrar por tenant_id."""
    t_a, t_b = seed.a, seed.b
    art_a = await db.fetchval(
        "INSERT INTO articulos (tenant_id, nombre, unidad_medida, coste_unitario) "
        "VALUES ($1, 'Harina A', 'kg', 1) RETURNING id",
        t_a.id,
    )
    art_b = await db.fetchval(
        "INSERT INTO articulos (tenant_id, nombre, unidad_medida, coste_unitario) "
        "VALUES ($1, 'Harina B', 'kg', 9) RETURNING id",
        t_b.id,
    )
    receta_id = await db.fetchval(
        "INSERT INTO recetas (articulo_salida_id, rendimiento) VALUES ($1, 1) RETURNING id",
        art_b,
    )
    await db.execute(
        "INSERT INTO receta_ingredientes (receta_id, articulo_id, cantidad_neta, unidad) "
        "VALUES ($1, $2, 2, 'kg')",
        receta_id,
        art_a,
    )

    await _actualizar_coste_receta(db, receta_id)

    assert await db.fetchval("SELECT coste_unitario FROM articulos WHERE id = $1", art_b) == Decimal(
        "9.0000"
    )


@pytest.mark.parametrize(
    "path",
    [
        "/api/verifactu/registros",
        "/api/dashboard/director",
    ],
)
async def test_endpoints_hso23_no_filtran_excepcion(client, seed, path):
    r = await client.get(path, headers=auth_headers(seed.a.usuarios["admin"]))
    assert r.status_code == 200, r.text
    if "detail" in r.json() and isinstance(r.json(), dict):
        assert "Traceback" not in str(r.json()["detail"])
