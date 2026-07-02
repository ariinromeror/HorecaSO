"""
Tests unitarios (sin DB) del motor Verifactu.
Cubre la parte más sensible legalmente: el cálculo de la huella SHA-256
según la Orden HAC/1177/2024 (orden de campos, mayúsculas, encadenado).
"""

import hashlib

from services.verifactu_engine import generar_huella, generar_qr_url


def test_generar_huella_determinista():
    registro = {
        "nif_emisor": "B12345678",
        "numero_serie": "SERIE-2026-000001",
        "fecha_expedicion": "2026-07-02",
        "tipo_factura": "F1",
        "cuota_iva": "0.32",
        "importe_total": "3.50",
        "fecha_hora_generacion": "2026-07-02T10:00:00+00:00",
    }
    huella = generar_huella(registro, huella_anterior="")

    cadena_esperada = "&".join(
        [
            "B12345678",
            "SERIE-2026-000001",
            "2026-07-02",
            "F1",
            "0.32",
            "3.50",
            "",
            "2026-07-02T10:00:00+00:00",
        ]
    )
    esperado = hashlib.sha256(cadena_esperada.encode("utf-8")).hexdigest().upper()

    assert huella == esperado


def test_generar_huella_es_siempre_mayusculas():
    registro = {
        "nif_emisor": "B12345678",
        "numero_serie": "SERIE-2026-000002",
        "fecha_expedicion": "2026-07-02",
        "tipo_factura": "F1",
        "cuota_iva": "1.00",
        "importe_total": "11.00",
        "fecha_hora_generacion": "2026-07-02T10:05:00+00:00",
    }
    huella = generar_huella(registro, huella_anterior="")
    assert huella == huella.upper()
    assert len(huella) == 64  # SHA-256 en hex


def test_generar_huella_encadena_con_la_anterior():
    """Cambiar huella_anterior debe cambiar el resultado (hash chaining)."""
    registro = {
        "nif_emisor": "B12345678",
        "numero_serie": "SERIE-2026-000003",
        "fecha_expedicion": "2026-07-02",
        "tipo_factura": "F1",
        "cuota_iva": "2.00",
        "importe_total": "22.00",
        "fecha_hora_generacion": "2026-07-02T10:10:00+00:00",
    }
    huella_a = generar_huella(registro, huella_anterior="")
    huella_b = generar_huella(registro, huella_anterior="AAAA")
    assert huella_a != huella_b


def test_generar_qr_url_contiene_los_parametros():
    url = generar_qr_url(
        nif="B12345678", numero_serie="SERIE-2026-000001", fecha="2026-07-02", importe="3.50"
    )
    assert "nif=B12345678" in url
    assert "numserie=SERIE-2026-000001" in url
    assert "fecha=2026-07-02" in url
    assert "importe=3.50" in url
    assert url.startswith("https://www.aeat.es/")
