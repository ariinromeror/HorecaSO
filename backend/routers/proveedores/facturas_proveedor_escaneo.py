"""
Facturas proveedor: escaneo IA.
"""

from __future__ import annotations

import asyncio
import base64
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_roles

from .proveedores_shared import (
    ROLES_ADMIN_ALMACEN,
    EscanearFacturaIARequest,
    _groq_escanear_sync,
    _strip_data_url,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/facturas-proveedor/escanear-ia")
async def escanear_factura_ia(
    body: EscanearFacturaIARequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    _ = current_user
    try:
        raw_b64, mime = _strip_data_url(body.imagen_base64)
        try:
            base64.b64decode(raw_b64, validate=True)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="imagen_base64 no es válida",
            )
        try:
            return await asyncio.to_thread(_groq_escanear_sync, raw_b64, mime)
        except Exception as e:
            logger.error("Error Groq escanear_factura_ia: %s", e)
            return {"error": str(e), "lineas": []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en escanear_factura_ia: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
