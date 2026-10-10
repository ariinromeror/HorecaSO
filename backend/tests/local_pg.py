"""
Postgres local para tests SIN Docker (paquete pip `pgserver`, binarios embebidos).

Uso (desde backend/):
    python tests/local_pg.py start   -> arranca, crea horecaso_test e imprime TEST_DATABASE_URL
    python tests/local_pg.py stop    -> para el servidor
    python tests/local_pg.py url     -> imprime la URL de conexión

Los datos viven en backend/.pgtest/ (ignorado por git). Borrar esa carpeta
elimina la BD de tests por completo.
"""

import shutil
import sys
from pathlib import Path

import pgserver
import tzdata

PGDATA = Path(__file__).resolve().parent.parent / ".pgtest"
DB_NAME = "horecaso_test"


def _instalar_zonas_horarias() -> None:
    """
    Los binarios de pgserver para Windows no traen share/postgresql/timezone y
    `AT TIME ZONE 'Europe/Madrid'` falla. Se copian los ficheros TZif del
    paquete tzdata (mismo formato que usa Postgres).
    """
    destino = Path(pgserver.__file__).parent / "pginstall" / "share" / "postgresql" / "timezone"
    if (destino / "Europe" / "Madrid").exists():
        return
    origen = Path(tzdata.__file__).parent / "zoneinfo"
    shutil.copytree(
        origen, destino, dirs_exist_ok=True,
        ignore=shutil.ignore_patterns("__init__.py", "__pycache__"),
    )


def _server():
    PGDATA.mkdir(exist_ok=True)
    _instalar_zonas_horarias()
    return pgserver.get_server(PGDATA, cleanup_mode=None)


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "start"
    if cmd == "stop":
        pgserver.pg_ctl(["stop", "-m", "fast"], pgdata=PGDATA)
        print("Postgres de tests parado.")
        return

    srv = _server()
    if cmd == "start":
        exists = srv.psql(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}';")
        if "1 row" not in exists:
            srv.psql(f"CREATE DATABASE {DB_NAME};")
    print(srv.get_uri(DB_NAME))


if __name__ == "__main__":
    main()
