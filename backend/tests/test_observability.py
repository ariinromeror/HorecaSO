"""
Tests de integración para observabilidad (Fase 7 del PRD): health check
ampliado, middleware de request_id, e inicialización condicional de Sentry.
"""

import sentry_sdk

from observability import init_sentry


async def test_health_check_incluye_version_y_pool(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert body["pool"]["initialized"] is True


async def test_health_ready_responde_200(client):
    resp = await client.get("/api/health/ready")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_request_id_se_genera_y_se_devuelve_en_header(client):
    resp = await client.get("/api/health")
    assert "x-request-id" in resp.headers
    assert len(resp.headers["x-request-id"]) > 0


async def test_request_id_entrante_se_reutiliza(client):
    resp = await client.get("/api/health", headers={"X-Request-ID": "mi-id-de-prueba"})
    assert resp.headers["x-request-id"] == "mi-id-de-prueba"


def test_init_sentry_sin_dsn_no_activa_nada():
    assert init_sentry(dsn="", environment="development", release="1.0.0") is False


def _dsn_falso_de_prueba() -> str:
    # Construido por partes para evitar que herramientas de texto detecten
    # esto como una dirección de correo real y la reescriban.
    clave = "abc123def456"
    host = "o000000" + "." + "ingest" + "." + "sentry" + "." + "io"
    return f"https://{clave}@{host}/0"


def test_init_sentry_con_dsn_activa_el_sdk():
    try:
        activo = init_sentry(
            dsn=_dsn_falso_de_prueba(),
            environment="development",
            release="1.0.0-test",
        )
        assert activo is True
        assert sentry_sdk.get_client().is_active()
    finally:
        sentry_sdk.get_client().close(timeout=0)
