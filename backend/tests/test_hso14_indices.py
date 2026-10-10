"""
HSO-14 — Índices de las consultas de más tráfico (KDS, Venta Live, FIFO, etc.).
"""

INDICES_HSO14 = [
    "idx_tickets_outlet_estado",
    "idx_tickets_outlet_cobrado_at",
    "idx_tickets_outlet_created_at",
    "idx_ticket_lineas_ticket_id",
    "idx_verifactu_tenant_created",
    "idx_movimientos_articulo_created",
    "idx_lotes_articulo_caducidad",
    "idx_reservas_outlet_fecha",
    "idx_turnos_empleado_fecha",
]


async def test_indices_de_trafico_existen(db):
    rows = await db.fetch(
        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])",
        INDICES_HSO14,
    )
    presentes = {r["indexname"] for r in rows}
    assert presentes == set(INDICES_HSO14), sorted(set(INDICES_HSO14) - presentes)
