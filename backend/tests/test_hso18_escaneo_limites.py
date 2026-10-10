"""
HSO-18 — El escaneo IA no acepta archivos enormes, tipos raros ni varias imágenes.
"""

import base64

from tests.auth_helpers import auth_headers

ESCANEAR = "/api/facturas-proveedor/escanear-ia"
MAX = 8 * 1024 * 1024


def _jpeg_tiny():
    return "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff\xd9").decode()


async def test_escaneo_archivo_demasiado_grande_rechazado(client, seed):
    # Cadena base64 más larga que 8 MB decodificados: se rechaza sin llamar a Groq.
    raw = "A" * ((MAX * 4 // 3) + 64)
    r = await client.post(
        ESCANEAR,
        json={"imagen_base64": "data:image/jpeg;base64," + raw},
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 400, r.text
    assert "8" in r.json()["detail"]


async def test_escaneo_mime_no_permitido_rechazado(client, seed):
    payload = "data:image/gif;base64," + base64.b64encode(b"GIF89a").decode()
    r = await client.post(
        ESCANEAR,
        json={"imagen_base64": payload},
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 400, r.text
    assert "tipo" in r.json()["detail"].lower() or "permitido" in r.json()["detail"].lower()


async def test_escaneo_varias_imagenes_rechazado(client, seed):
    r = await client.post(
        ESCANEAR,
        json={"imagenes_base64": [_jpeg_tiny(), _jpeg_tiny()]},
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 400, r.text
