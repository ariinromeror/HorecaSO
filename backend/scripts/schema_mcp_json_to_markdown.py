"""
Genera SCHEMA_BASE_DATOS.md a partir del JSON de Supabase MCP list_tables (verbose).
Uso (ajusta la ruta al dump):
  python backend/scripts/schema_mcp_json_to_markdown.py <ruta_al_json.txt> > SCHEMA_BASE_DATOS.md
O desde repo con ruta absoluta al agent-tools.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Descripciones cortas (producto); alinear con índice histórico
DESC = {
    "alergenos": "Catálogo de alérgenos alimentarios",
    "articulos": "Artículos de almacén e inventario",
    "ausencias": "Ausencias registradas de empleados",
    "categorias_menu": "Categorías de la carta del restaurante",
    "cierres_caja": "Cierres de caja diarios por outlet",
    "clientes": "Clientes con historial y fidelización",
    "configuracion": "Configuración clave-valor por tenant",
    "cuadrante_asignaciones": "Asignaciones de empleados a cuadrantes",
    "cuadrantes": "Cuadrantes semanales de turnos",
    "empleados": "Datos laborales de empleados",
    "facturas_proveedor": "Facturas recibidas de proveedores",
    "facturas_proveedor_lineas": "Líneas de cada factura de proveedor",
    "ingenieria_menu": "Análisis de rentabilidad por producto (BCG)",
    "lista_espera": "Lista de espera de clientes sin reserva",
    "lotes_inventario": "Lotes de stock con fecha de caducidad (FIFO)",
    "mermas": "Registro de pérdidas y mermas de stock",
    "mesas": "Mesas físicas del restaurante",
    "movimientos_stock": "Historial de entradas y salidas de stock",
    "nominas": "Nóminas mensuales de empleados",
    "notificaciones": "Notificaciones internas del sistema",
    "platform_logs": "Registro de actividad de plataforma (superadmin)",
    "outlets": "Locales o puntos de venta de un tenant",
    "pedidos_proveedor": "Pedidos realizados a proveedores",
    "pedidos_proveedor_lineas": "Líneas de cada pedido a proveedor",
    "producto_alergenos": "Relación muchos-a-muchos producto / alérgeno",
    "productos": "Productos de la carta",
    "proveedores": "Proveedores del restaurante",
    "receta_ingredientes": "Ingredientes de cada receta",
    "recetas": "Recetas vinculadas a productos",
    "registros_appcc": "Controles de seguridad alimentaria (APPCC)",
    "rentabilidad_mesas": "Métricas de rentabilidad por mesa y ticket",
    "reservas": "Reservas de clientes",
    "solicitudes_ausencia": "Solicitudes de ausencia de empleados",
    "tenant_audit_log": "Auditoría de cambios por tenant",
    "tenants": "Restaurantes / empresas en la plataforma",
    "ticket_lineas": "Líneas de productos dentro de un ticket",
    "ticket_pagos": "Pagos registrados por ticket",
    "tickets": "Tickets / comandas de venta",
    "turnos": "Fichajes y turnos de empleados",
    "usuario_permisos": "Permisos granulares por usuario y tenant",
    "usuarios": "Usuarios del sistema con rol y acceso",
    "verifactu_registros": "Registros fiscales Verifactu (AEAT)",
}


def col_options(opts: list) -> str:
    parts = []
    if "updatable" in opts:
        parts.append("NOT NULL" if "nullable" not in opts else "NULL OK")
    return ", ".join(parts) if parts else "—"


def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: python schema_mcp_json_to_markdown.py <archivo.json> [salida.md]", file=sys.stderr)
        sys.exit(1)
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    raw = Path(sys.argv[1]).read_text(encoding="utf-8")
    data = json.loads(raw)
    tables = data.get("tables", [])
    # orden alfabético por nombre corto
    def short_name(t: dict) -> str:
        return t["name"].replace("public.", "")

    tables_sorted = sorted(tables, key=short_name)
    n = len(tables_sorted)

    lines = [
        "# HorecaSO — Schema completo de la base de datos",
        "",
        "Documento de referencia alineado con **PostgreSQL / Supabase** (esquema `public`).",
        "",
        "**Fuente:** volcado `list_tables` (verbose) vía MCP Supabase, 27/03/2026.",
        "",
        f"**Total de tablas en `public`:** {n}",
        "",
        "**RLS:** en la instancia auditada, Row Level Security estaba **desactivado** en todas las tablas listadas; antes de producción con clientes reales conviene políticas por `tenant_id` donde aplique.",
        "",
        "**`tenants.activo`:** presente en esta instancia (migración Fase B aplicada).",
        "",
        "---",
        "",
        "## Índice de tablas",
        "",
        "| Tabla | Descripción |",
        "|-------|-------------|",
    ]
    for t in tables_sorted:
        sn = short_name(t)
        desc = DESC.get(sn, "Tabla de negocio")
        lines.append(f"| [{sn}](#{sn}) | {desc} |")

    lines.extend(
        [
            "",
            "---",
            "",
            "## Tablas Fase B (plataforma)",
            "",
            "Incluidas en este volcado: `platform_logs`, `tenant_audit_log`, `usuario_permisos` (DDL en [backend/sql/migration_fase_b.sql](backend/sql/migration_fase_b.sql)).",
            "",
            "---",
            "",
            "## Notas generales",
            "",
            "- Claves primarias: mayoría `id UUID` con `gen_random_uuid()`; `alergenos.id` es `serial`/`integer`.",
            "- `producto_alergenos`: PK compuesta (`producto_id`, `alergeno_id`).",
            "- Dinero y cantidades sensibles: tipos `numeric`.",
            "- `usuarios.rol`: CHECK incluye `superadmin`, `admin`, `director`, `jefe_sala`, `camarero`, `cocina`, `barra`, `almacen`.",
            "- `productos.destino_kds`: CHECK `cocina` | `barra` | `ninguno`.",
            "",
            "---",
            "",
            "## Tablas (detalle)",
            "",
        ]
    )

    for t in tables_sorted:
        sn = short_name(t)
        rows = t.get("rows", "?")
        rls = t.get("rls_enabled", False)
        lines.append(f"### {sn}")
        lines.append("")
        lines.append(f"**Filas (snapshot MCP):** {rows} · **RLS:** {'sí' if rls else 'no'}")
        lines.append("")
        lines.append("| Columna | Tipo (formato) | Opciones / default |")
        lines.append("|---------|------------------|---------------------|")
        for c in t.get("columns", []):
            nm = c["name"]
            fmt = c.get("format", c.get("data_type", ""))
            opts = c.get("options", [])
            opt_s = ", ".join(opts) if opts else "—"
            dv = c.get("default_value")
            chk = c.get("check")
            extra = []
            if dv is not None:
                extra.append(f"default: `{dv}`")
            if chk:
                extra.append(f"check: `{chk[:120]}{'…' if len(str(chk)) > 120 else ''}`")
            extra_s = " · ".join(extra) if extra else "—"
            lines.append(f"| {nm} | {fmt} | {opt_s}; {extra_s} |")
        lines.append("")
        pks = t.get("primary_keys", [])
        lines.append(f"**PK:** {', '.join(pks) if pks else '—'}")
        lines.append("")
        fks = t.get("foreign_key_constraints", [])
        if fks:
            lines.append("**FKs (restricciones):**")
            for fk in fks:
                lines.append(f"- `{fk.get('name')}`: `{fk.get('source')}` → `{fk.get('target')}`")
        else:
            lines.append("**FKs:** —")
        lines.append("")
        lines.append("---")
        lines.append("")

    lines.append("")
    lines.append("*Generado con `backend/scripts/schema_mcp_json_to_markdown.py`. Volver a ejecutar tras migraciones o nuevo volcado MCP.*")
    lines.append("")

    text = "\n".join(lines)
    if out_path:
        out_path.write_text(text, encoding="utf-8")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(text, end="")


if __name__ == "__main__":
    main()
