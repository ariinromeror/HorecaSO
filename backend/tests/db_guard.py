"""
Guarda de seguridad: los tests SOLO pueden tocar una BD de prueba local.

El conftest borra y recrea el esquema public en cada sesión, así que
apuntar a Supabase destruiría producción. Reglas:
  - TEST_DATABASE_URL obligatoria (nunca se usa DATABASE_URL).
  - Host local (localhost / 127.0.0.1 / ::1) o listado en HORECASO_TEST_DB_HOSTS.
  - Nada que parezca Supabase / pooler / hosting gestionado.
  - El nombre de la BD debe contener "test".
  - No puede coincidir con el DATABASE_URL de backend/.env.
"""

import os
from urllib.parse import urlparse

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
FORBIDDEN_MARKERS = ("supabase", "pooler", "render.com", "railway", "neon.tech", "amazonaws")


class UnsafeTestDatabase(RuntimeError):
    pass


def _target(url: str) -> tuple[str, int | None, str]:
    p = urlparse(url)
    return (p.hostname or "").lower(), p.port, p.path.lstrip("/").lower()


def assert_safe_test_database_url(url: str, env_database_url: str | None = None) -> None:
    if not url:
        raise UnsafeTestDatabase(
            "TEST_DATABASE_URL no está definida. Levanta la BD de tests "
            "(ver docs/TESTING.md) y exporta TEST_DATABASE_URL."
        )

    p = urlparse(url)
    if p.scheme not in ("postgresql", "postgres"):
        raise UnsafeTestDatabase(f"TEST_DATABASE_URL debe ser postgresql://, recibido '{p.scheme}'")

    host, port, db = _target(url)
    user = (p.username or "").lower()

    for marker in FORBIDDEN_MARKERS:
        if marker in host or marker in user:
            raise UnsafeTestDatabase(
                f"TEST_DATABASE_URL apunta a un servicio gestionado ('{marker}' en host/usuario). "
                "Los tests borran el esquema: usa solo una BD local de prueba."
            )
    if user.startswith("postgres."):
        raise UnsafeTestDatabase(
            "Usuario con formato 'postgres.<project_ref>' (pooler de Supabase). Abortado."
        )

    extra_hosts = {
        h.strip().lower()
        for h in os.environ.get("HORECASO_TEST_DB_HOSTS", "").split(",")
        if h.strip()
    }
    if host not in LOCAL_HOSTS | extra_hosts:
        raise UnsafeTestDatabase(
            f"Host '{host}' no permitido para tests. Permitidos: {sorted(LOCAL_HOSTS | extra_hosts)} "
            "(añade hosts de CI con HORECASO_TEST_DB_HOSTS)."
        )

    if "test" not in db:
        raise UnsafeTestDatabase(
            f"La BD '{db}' no contiene 'test' en el nombre. Usa p. ej. 'horecaso_test'."
        )

    if env_database_url and _target(env_database_url) == (host, port, db):
        raise UnsafeTestDatabase(
            "TEST_DATABASE_URL coincide con DATABASE_URL de backend/.env. Usa una BD distinta."
        )
