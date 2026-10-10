"""
Facturas proveedor: escaneo IA.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_roles

from .proveedores_shared import (
    ESCANEO_ERROR_GENERICO,
    ESCANEO_MAX_ARCHIVOS,
    ROLES_ADMIN_ALMACEN,
    EscanearFacturaIARequest,
    _groq_escanear_sync,
    archivos_escaneo,
    validar_escaneo,
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
        archivos = archivos_escaneo(body)
        if len(archivos) > ESCANEO_MAX_ARCHIVOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se admite un archivo por petición",
            )
        if not archivos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Falta la imagen",
            )
        raw_b64, mime = validar_escaneo(archivos[0])
        try:
            return await asyncio.to_thread(_groq_escanear_sync, raw_b64, mime)
        except Exception as e:
            logger.error("Error Groq escanear_factura_ia: %s", e)
            return {"error": ESCANEO_ERROR_GENERICO, "lineas": []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en escanear_factura_ia: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
