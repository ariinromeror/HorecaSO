"""
Pool de conexiones asyncpg para HorecaSO.
statement_cache_size=0 obligatorio para Supabase pgbouncer.
Patrón InfoCampus — producción.
"""

import logging
from contextlib import asynccontextmanager

import asyncpg

from config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_connection_pool() -> None:
    """Inicializa el pool de conexiones asyncpg."""
    global _pool
    if _pool is not None:
        logger.warning("Pool ya inicializado, omitiendo init_connection_pool")
        return

    try:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=60,
            statement_cache_size=0,  # Obligatorio para Supabase pgbouncer
        )
        logger.info("Pool de base de datos inicializado correctamente")
    except Exception as e:
        logger.error("Error al inicializar pool de base de datos: %s", e)
        raise


async def close_connection_pool() -> None:
    """Cierra el pool de conexiones."""
    global _pool
    if _pool is None:
        return

    try:
        await _pool.close()
        _pool = None
        logger.info("Pool de base de datos cerrado")
    except Exception as e:
        logger.error("Error al cerrar pool: %s", e)
        raise


@asynccontextmanager
async def get_db():
    """
    Context manager async que proporciona una conexión con transacción automática.
    Al salir del bloque: commit si todo ok, rollback si hay excepción.
    """
    if _pool is None:
        raise RuntimeError("Pool no inicializado. Ejecuta init_connection_pool() en el lifespan.")

    conn = await _pool.acquire()
    try:
        async with conn.transaction():
            yield conn
    except Exception as e:
        logger.error("Error en transacción: %s", e)
        raise
    finally:
        await _pool.release(conn)
