"""
Auditoría: platform_logs + tenant_audit_log.
Fail-safe: nunca tumba la operación principal.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional
from uuid import UUID

logger = logging.getLogger(__name__)


def _as_uuid(value: Any) -> Optional[UUID]:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


def _json_detalle(detalle: Any) -> str:
    if detalle is None:
        return "{}"
    if isinstance(detalle, str):
        return detalle
    return json.dumps(detalle, default=str)


async def log_platform(
    conn,
    *,
    tenant_id: Any,
    usuario_id: Any,
    modulo: str,
    accion: str,
    detalle: Any = None,
    nivel: str = "info",
) -> None:
    """INSERT en platform_logs. Errores solo warning."""
    try:
        tid = _as_uuid(tenant_id)
        uid = _as_uuid(usuario_id)
        if nivel not in ("info", "warning", "error", "critical"):
            nivel = "info"
        await conn.execute(
            """
            INSERT INTO platform_logs (
                nivel, tenant_id, usuario_id, modulo, accion, detalle
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb)
            """,
            nivel,
            tid,
            uid,
            modulo,
            accion,
            _json_detalle(detalle),
        )
    except Exception as e:
        logger.warning("log_platform falló (%s/%s): %s", modulo, accion, e)


async def log_tenant_audit(
    conn,
    *,
    tenant_id: Any,
    usuario_id: Any,
    tabla: str,
    operacion: str,
    registro_id: Any = None,
    datos_antes: Any = None,
    datos_despues: Any = None,
) -> None:
    """INSERT en tenant_audit_log. Errores solo warning."""
    try:
        tid = _as_uuid(tenant_id)
        if not tid:
            return
        op = (operacion or "").upper()
        if op not in ("INSERT", "UPDATE", "DELETE"):
            op = "UPDATE"
        rid = _as_uuid(registro_id)
        await conn.execute(
            """
            INSERT INTO tenant_audit_log (
                tenant_id, usuario_id, tabla, operacion, registro_id,
                datos_antes, datos_despues
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6::jsonb, $7::jsonb
            )
            """,
            tid,
            _as_uuid(usuario_id),
            tabla,
            op,
            rid,
            _json_detalle(datos_antes) if datos_antes is not None else None,
            _json_detalle(datos_despues) if datos_despues is not None else None,
        )
    except Exception as e:
        logger.warning(
            "log_tenant_audit falló (%s/%s): %s", tabla, operacion, e
        )


async def audit_config_change(
    conn,
    *,
    tenant_id: Any,
    usuario_id: Any,
    modulo: str,
    accion: str,
    tabla: str,
    operacion: str,
    registro_id: Any = None,
    detalle: Any = None,
) -> None:
    """Escribe platform_logs + tenant_audit_log en un solo paso fail-safe."""
    await log_platform(
        conn,
        tenant_id=tenant_id,
        usuario_id=usuario_id,
        modulo=modulo,
        accion=accion,
        detalle=detalle,
    )
    await log_tenant_audit(
        conn,
        tenant_id=tenant_id,
        usuario_id=usuario_id,
        tabla=tabla,
        operacion=operacion,
        registro_id=registro_id,
        datos_despues=detalle,
    )
