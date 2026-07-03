#!/bin/bash
# Se ejecuta automáticamente por la imagen oficial de postgres la PRIMERA vez
# que el volumen de datos está vacío (docker-entrypoint-initdb.d).
#
# Carga, en orden: (1) el esquema base mínimo que usa la suite de tests
# (backend/tests/schema_test.sql — ver nota de limitación arquitectónica en
# ese fichero: no existe todavía una migración "baseline" completa que
# reproduzca 1:1 el esquema de producción de Supabase) y (2) las migraciones
# incrementales versionadas de backend/sql/migrations/ (Fase 5 del PRD), para
# que el Postgres de `docker compose up` termine con el mismo esquema que usa
# CI/tests más las migraciones reales aplicadas encima.
set -euo pipefail

echo "[initdb] Cargando esquema base (schema_test.sql)..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -f /docker-entrypoint-initdb.d/schema_test.sql

echo "[initdb] Aplicando migraciones versionadas (backend/sql/migrations/)..."
for f in /docker-entrypoint-initdb.d/migrations/*.sql; do
    echo "[initdb]   -> $(basename "$f")"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
        -f "$f"
done

echo "[initdb] Registrando migraciones en schema_migrations..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'SQL'
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
SQL
for f in /docker-entrypoint-initdb.d/migrations/*.sql; do
    name="$(basename "$f")"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
        -c "INSERT INTO schema_migrations (version) VALUES ('${name}') ON CONFLICT (version) DO NOTHING;"
done

echo "[initdb] Listo."
