"""
Datos ficticios para la demo de «Restaurante Prueba» (tenant 1111…).

Genera unas 8 semanas de actividad para que dashboard, reportes, reservas,
mermas, cierre de caja, inventario y personal no salgan vacíos.

- Todo es inventado: nombres, teléfonos (600 000 xxx) y correos @example.com.
- Reproducible: misma semilla = mismos datos (las fechas se cuentan hacia atrás
  desde hoy, así la demo siempre se ve «reciente»).
- Repetible: borra lo que él mismo creó (marca DEMO_DATOS) y lo vuelve a crear.
- Requiere la base ya preparada con neon_apply.py (tenant, usuarios, carta, mesas).

Uso (desde backend/):
    DATABASE_URL=postgresql://... python scripts/seed_demo_datos.py
    python scripts/seed_demo_datos.py --dry-run        # solo cuenta, no escribe

Si el servidor NO es local, exige --confirmar-remoto (para no tocar Neon por error).
"""

import asyncio
import os
import random
import sys
import uuid
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from zoneinfo import ZoneInfo

import asyncpg

TENANT = uuid.UUID("11111111-1111-1111-1111-111111111111")
OUTLET = uuid.UUID("22222222-2222-2222-2222-222222222222")
TAG = "DEMO_DATOS"
NS = uuid.UUID("5e6d0000-0000-4000-8000-00000000d3d0")
MADRID = ZoneInfo("Europe/Madrid")
SEMANAS = 8
SEED = 20261125

NOMBRES = [
    "Laura Gómez", "Miguel Ruiz", "Carmen Soler", "Javier Prieto", "Marta Vidal",
    "Andrés Cabrera", "Lucía Ferrer", "Pablo Nieto", "Elena Marín", "Sergio Campos",
    "Rosa Iglesias", "Hugo Santos", "Nuria Lozano", "Daniel Pascual", "Irene Vega",
    "Álvaro Rubio", "Sofía Medina", "Raúl Herrera", "Paula Cano", "Tomás Gil",
]
EMPLEADOS_EXTRA = [
    ("Camarero", "Iván Robles", 1380), ("Camarero", "Noelia Pastor", 1380),
    ("Camarero", "Óscar Fuentes", 1350), ("Cocinero", "Teresa Molina", 1650),
    ("Ayudante de cocina", "Rubén Ortega", 1300), ("Friegaplatos", "Ana Beltrán", 1240),
]
MOTIVOS_MERMA = ["caducidad", "rotura", "error_cocina", "sobras", "mal_estado"]
PAGO_PESOS = [("efectivo", 25), ("tarjeta_credito", 40), ("tarjeta_debito", 20), ("bizum", 15)]


def uid(*partes) -> uuid.UUID:
    return uuid.uuid5(NS, "|".join(str(p) for p in partes))


def d2(x) -> Decimal:
    return Decimal(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def es_local(url: str) -> bool:
    p = urlparse(url)
    host = (p.hostname or "").lower()
    socket = (parse_qs(p.query).get("host") or [""])[0]
    return host in ("localhost", "127.0.0.1", "::1") or (host == "" and socket.startswith("/"))


def ts(dia: date, hora: time) -> datetime:
    return datetime.combine(dia, hora, tzinfo=MADRID)


def elegir_pago(rng: random.Random) -> str:
    return rng.choices([p for p, _ in PAGO_PESOS], [w for _, w in PAGO_PESOS])[0]


def tickets_del_dia(rng: random.Random, dia: date) -> int:
    base = {0: 14, 1: 17, 2: 20, 3: 24, 4: 36, 5: 44, 6: 32}[dia.weekday()]
    return max(6, int(base * rng.uniform(0.8, 1.2)))


async def cargar_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        from dotenv import dotenv_values

        url = (dotenv_values(Path(__file__).resolve().parent.parent / ".env").get("DATABASE_URL") or "").strip()
    return url


async def columnas(conn, tabla: str) -> set[str]:
    rows = await conn.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
        tabla,
    )
    return {r["column_name"] for r in rows}


async def main() -> int:
    dry = "--dry-run" in sys.argv
    url = await cargar_url()
    if not url:
        print("Falta DATABASE_URL.")
        return 1
    if not es_local(url) and "--confirmar-remoto" not in sys.argv:
        print("La base NO es local. Para escribir en un servidor remoto añade --confirmar-remoto.")
        return 1

    rng = random.Random(SEED)
    hoy = datetime.now(MADRID).date()
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        if not await conn.fetchval("SELECT 1 FROM tenants WHERE id=$1", TENANT):
            print("No existe el tenant demo. Ejecuta antes neon_apply.py.")
            return 1

        productos = [dict(r) for r in await conn.fetch(
            "SELECT id, nombre, precio, iva_porcentaje, es_bebida, destino_kds FROM productos "
            "WHERE tenant_id=$1 AND COALESCE(activo,true)", TENANT)]
        comida = [p for p in productos if not p["es_bebida"]]
        bebida = [p for p in productos if p["es_bebida"]]
        mesas = [dict(r) for r in await conn.fetch("SELECT id, capacidad FROM mesas WHERE outlet_id=$1", OUTLET)]
        articulos = [dict(r) for r in await conn.fetch(
            "SELECT id, coste_unitario, unidad_medida FROM articulos WHERE tenant_id=$1 ORDER BY sku", TENANT)]
        usuarios = {r["rol"]: r["id"] for r in await conn.fetch(
            "SELECT rol, id FROM usuarios WHERE outlet_id=$1", OUTLET)}
        if not (comida and bebida and mesas and articulos and usuarios):
            print("Faltan carta, mesas, artículos o usuarios base.")
            return 1
        camarero, admin = usuarios["camarero"], usuarios["admin"]
        cols_mov = await columnas(conn, "movimientos_stock")
        cols_lote = await columnas(conn, "lotes_inventario")

        inicio = hoy - timedelta(weeks=SEMANAS)
        tickets, lineas, pagos, cierres = [], [], [], []
        dia = inicio
        while dia < hoy:
            tot = {"efectivo": Decimal(0), "tarjeta": Decimal(0), "bizum": Decimal(0)}
            n_dia, total_dia = 0, Decimal(0)
            for i in range(tickets_del_dia(rng, dia)):
                almuerzo = rng.random() < 0.45
                hora = time(rng.randint(13, 15), rng.randint(0, 59)) if almuerzo else time(rng.randint(20, 22), rng.randint(0, 59))
                comensales = rng.choice([1, 2, 2, 2, 3, 4, 4, 5, 6])
                mesa = rng.choice(mesas)
                tid = uid("ticket", dia, i)
                ocupacion = rng.randint(40, 105)
                abre = ts(dia, hora)
                total = Decimal(0)
                iva = Decimal(0)
                n_platos = max(1, comensales + rng.randint(0, 2))
                elegidos = [rng.choice(comida) for _ in range(n_platos)] + [rng.choice(bebida) for _ in range(comensales + rng.randint(0, 2))]
                for j, p in enumerate(elegidos):
                    cant = rng.choice([1, 1, 1, 2])
                    sub = d2(p["precio"] * cant)
                    total += sub
                    iva += d2(sub - sub / (1 + p["iva_porcentaje"] / 100))
                    lineas.append((
                        uid("linea", dia, i, j), tid, p["id"], cant, p["precio"], sub,
                        p["destino_kds"] != "barra", abre + timedelta(minutes=2),
                        "servido" if p["destino_kds"] != "barra" else None,
                        p["destino_kds"] == "barra", abre + timedelta(minutes=2),
                        "servido" if p["destino_kds"] == "barra" else "pendiente",
                    ))
                metodo = elegir_pago(rng)
                cobra = abre + timedelta(minutes=ocupacion)
                tickets.append((tid, OUTLET, mesa["id"], camarero, total, metodo, abre, cobra, iva,
                                comensales, ocupacion))
                pagos.append((uid("pago", dia, i), tid, total, metodo, cobra))
                clave = "efectivo" if metodo == "efectivo" else "bizum" if metodo == "bizum" else "tarjeta"
                tot[clave] += total
                n_dia += 1
                total_dia += total
            cierres.append((uid("cierre", dia), OUTLET, admin, dia, tot["efectivo"], tot["tarjeta"], tot["bizum"],
                            total_dia, n_dia, d2(total_dia / n_dia), ts(dia, time(23, 55))))
            dia += timedelta(days=1)

        # Clientes y reservas
        clientes = []
        for i, nombre in enumerate(NOMBRES):
            clientes.append((uid("cliente", i), nombre,
                             f"{nombre.lower().split()[0].replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u')}.{i}@example.com",
                             f"600000{100 + i}", rng.randint(1, 14)))
        reservas = []
        for k in range(110):
            off = rng.randint(-SEMANAS * 7, 10)
            fdia = hoy + timedelta(days=off)
            cli = rng.choice(clientes)
            hora = rng.choice([time(13, 30), time(14, 0), time(14, 30), time(21, 0), time(21, 30), time(22, 0)])
            if off < 0:
                estado = rng.choices(["sentada", "no_show", "cancelada"], [80, 8, 12])[0]
            elif off == 0:
                estado = "confirmada"
            else:
                estado = rng.choices(["confirmada", "pendiente"], [75, 25])[0]
            personas = rng.choice([2, 2, 3, 4, 4, 5, 6, 8])
            mesa = rng.choice([m for m in mesas if m["capacidad"] >= min(personas, 4)] or mesas)
            reservas.append((uid("reserva", k), OUTLET, mesa["id"], cli[1], cli[3], fdia, hora, personas, estado,
                             rng.choice(["telefono", "web", "app", "walk_in"]), cli[2], cli[0],
                             ts(fdia - timedelta(days=rng.randint(1, 6)), time(11, 0))))
        # Garantiza una agenda de hoy con varias reservas (la pantalla de reservas filtra por hoy)
        horas_hoy = [time(13, 30), time(14, 0), time(14, 30), time(21, 0), time(21, 30), time(22, 0)]
        for j, hora in enumerate(horas_hoy):
            k = 110 + j
            cli = rng.choice(clientes)
            personas = rng.choice([2, 3, 4, 4, 6])
            mesa = rng.choice([m for m in mesas if m["capacidad"] >= min(personas, 4)] or mesas)
            reservas.append((uid("reserva", k), OUTLET, mesa["id"], cli[1], cli[3], hoy, hora, personas,
                             "confirmada" if j % 3 else "pendiente",
                             rng.choice(["telefono", "web", "app"]), cli[2], cli[0],
                             ts(hoy - timedelta(days=rng.randint(1, 4)), time(11, 0))))

        # Mermas (movimientos de stock tipo merma + tabla mermas)
        mermas = []
        for k in range(46):
            a = rng.choice(articulos)
            cant = d2(rng.uniform(0.3, 3.5))
            f = ts(hoy - timedelta(days=rng.randint(1, SEMANAS * 7)), time(rng.choice([9, 16, 23]), 15))
            mermas.append((uid("merma", k), a["id"], cant, rng.choice(MOTIVOS_MERMA),
                           d2(a["coste_unitario"] or 0), f))

        # Entradas de inventario (compras semanales)
        entradas = []
        for s in range(SEMANAS):
            lunes = hoy - timedelta(days=hoy.weekday()) - timedelta(weeks=s)
            for k, a in enumerate(rng.sample(articulos, 24)):
                f = ts(lunes + timedelta(days=rng.choice([0, 2])), time(9, 30))
                entradas.append((uid("entrada", s, k), a["id"], d2(rng.uniform(4, 30)),
                                 d2(a["coste_unitario"] or 0), f, s, k))

        # Empleados extra y turnos
        emp_extra = []
        for i, (cargo, nombre, sueldo) in enumerate(EMPLEADOS_EXTRA):
            emp_extra.append((uid("empleado", i), cargo, nombre, sueldo, f"0000{1000 + i}R"))

        print(f"Plan: {len(tickets)} tickets, {len(lineas)} líneas, {len(cierres)} cierres, "
              f"{len(reservas)} reservas, {len(mermas)} mermas, {len(entradas)} entradas, "
              f"{len(emp_extra)} empleados nuevos.")
        if dry:
            print("--dry-run: no se escribió nada.")
            return 0

        async with conn.transaction():
            # Limpieza de una ejecución anterior
            await conn.execute("DELETE FROM ticket_pagos WHERE ticket_id IN (SELECT id FROM tickets WHERE notas=$1)", TAG)
            await conn.execute("DELETE FROM ticket_lineas WHERE ticket_id IN (SELECT id FROM tickets WHERE notas=$1)", TAG)
            await conn.execute("DELETE FROM tickets WHERE notas=$1", TAG)
            await conn.execute("DELETE FROM cierres_caja WHERE notas=$1", TAG)
            await conn.execute("DELETE FROM reservas WHERE notas=$1", TAG)
            await conn.execute("DELETE FROM clientes WHERE notas=$1", TAG)
            await conn.execute("DELETE FROM movimientos_stock WHERE motivo LIKE $1", f"{TAG}%")
            await conn.execute("DELETE FROM lotes_inventario WHERE numero_lote LIKE $1", f"{TAG}%")
            await conn.execute("DELETE FROM mermas WHERE motivo LIKE $1", "%[demo]")
            await conn.execute("DELETE FROM turnos WHERE outlet_id=$1 AND fecha < $2", OUTLET, hoy)
            await conn.execute(
                "DELETE FROM cuadrante_asignaciones WHERE empleado_id IN (SELECT id FROM empleados "
                "WHERE tenant_id=$1 AND dni LIKE '0000%R' AND usuario_id IS NULL)", TENANT)
            await conn.execute("DELETE FROM empleados WHERE tenant_id=$1 AND dni LIKE '0000%R' AND usuario_id IS NULL", TENANT)

            await conn.executemany(
                "INSERT INTO tickets (id,outlet_id,mesa_id,camarero_id,estado,total,metodo_pago,created_at,cobrado_at,"
                "total_iva,num_comensales,notas,tiempo_ocupacion) VALUES ($1,$2,$3,$4,'cobrado',$5,$6,$7,$8,$9,$10,'"
                + TAG + "',$11)", tickets)
            await conn.executemany(
                "INSERT INTO ticket_lineas (id,ticket_id,producto_id,cantidad,precio_unitario,subtotal,enviado_cocina,"
                "enviado_cocina_at,estado_cocina,enviado_barra,enviado_barra_at,estado_barra) "
                "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", lineas)
            await conn.executemany(
                "INSERT INTO ticket_pagos (id,ticket_id,importe,metodo_pago,created_at) VALUES ($1,$2,$3,$4,$5)", pagos)
            await conn.executemany(
                "INSERT INTO cierres_caja (id,outlet_id,usuario_id,fecha,total_efectivo,total_tarjeta,total_bizum,"
                "total_transferencia,total_invitaciones,total_ventas,num_tickets,ticket_medio,notas,created_at) "
                "VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,$9,$10,'" + TAG + "',$11)", cierres)
            await conn.executemany(
                "INSERT INTO clientes (id,tenant_id,nombre,email,telefono,total_visitas,gasto_total,gasto_medio,"
                "ultima_visita,puntos_fidelidad,notas) VALUES ($1,'" + str(TENANT) + "',$2,$3,$4,$5,$6,$7,$8,$9,'" + TAG + "')",
                [(c[0], c[1], c[2], c[3], c[4], d2(c[4] * 38), d2(38), hoy - timedelta(days=rng.randint(1, 30)),
                  c[4] * 10) for c in clientes])
            await conn.executemany(
                "INSERT INTO reservas (id,outlet_id,mesa_id,nombre_cliente,telefono,fecha,hora,num_personas,estado,"
                "origen,email,cliente_id,created_at,notas) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'"
                + TAG + "')", reservas)

            cols_ins = "(id,articulo_id,outlet_id,tipo,cantidad,coste_unitario,motivo,usuario_id,created_at"
            for m in mermas:
                extra_c, extra_v = (",delta", ",$9") if "delta" in cols_mov else ("", "")
                await conn.execute(
                    f"INSERT INTO movimientos_stock {cols_ins}{extra_c}) VALUES ($1,$2,$3,'merma',$4,$5,$6,$7,$8{extra_v})",
                    m[0], m[1], OUTLET, m[2], m[4], f"{TAG}: {m[3]}", admin, m[5], *([-m[2]] if "delta" in cols_mov else []))
                await conn.execute(
                    "INSERT INTO mermas (id,outlet_id,articulo_id,cantidad,motivo,coste_imputado,usuario_id,created_at) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                    uid("merma-tabla", m[0]), OUTLET, m[1], m[2], f"{m[3]} [demo]", d2(m[2] * m[4]), admin, m[5])
            for e in entradas:
                extra_c, extra_v = (",delta", ",$9") if "delta" in cols_mov else ("", "")
                await conn.execute(
                    f"INSERT INTO movimientos_stock {cols_ins}{extra_c}) VALUES ($1,$2,$3,'entrada',$4,$5,$6,$7,$8{extra_v})",
                    e[0], e[1], OUTLET, e[2], e[3], f"{TAG}: compra semanal", admin, e[4], *([e[2]] if "delta" in cols_mov else []))
                lote_c, lote_v = (",origen", ",'compra'") if "origen" in cols_lote else ("", "")
                await conn.execute(
                    "INSERT INTO lotes_inventario (id,articulo_id,outlet_id,cantidad,coste_unitario,fecha_caducidad,"
                    f"created_at,numero_lote{lote_c}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8{lote_v})",
                    uid("lote", e[0]), e[1], OUTLET, e[2], e[3], (e[4].date() + timedelta(days=rng.randint(5, 40))),
                    e[4], f"{TAG}-{e[5]:02d}-{e[6]:02d}")

            for e in emp_extra:
                await conn.execute(
                    "INSERT INTO empleados (id,tenant_id,dni,cargo,fecha_inicio,activo,contrato,jornada_horas,"
                    "irpf_porcentaje,salario_bruto_mensual,nombre_completo) "
                    "VALUES ($1,$2,$3,$4,$5,true,'indefinido',40,10.0,$6,$7)",
                    e[0], TENANT, e[4], e[1], hoy - timedelta(days=rng.randint(120, 700)), e[3], e[2])

            todos = await conn.fetch("SELECT id, cargo FROM empleados WHERE tenant_id=$1 AND activo", TENANT)
            turnos = []
            for emp in todos:
                cocina = emp["cargo"] in ("Cocinero", "Ayudante de cocina", "Friegaplatos")
                libres = rng.sample(range(7), 2)
                dia = inicio
                while dia < hoy:
                    if dia.weekday() not in libres:
                        if rng.random() < 0.5:
                            ent, sal = (time(11, 0), time(17, 0)) if cocina else (time(12, 30), time(17, 30))
                        else:
                            ent, sal = (time(18, 0), time(23, 59)) if cocina else (time(19, 30), time(23, 59))
                        extra = Decimal(rng.choice([0, 0, 0, 0, 0.5, 1]))
                        horas = d2((datetime.combine(dia, sal) - datetime.combine(dia, ent)).seconds / 3600)
                        turnos.append((uid("turno", emp["id"], dia), emp["id"], dia, ent, sal, horas, extra))
                    dia += timedelta(days=1)
            await conn.executemany(
                "INSERT INTO turnos (id,empleado_id,outlet_id,fecha,hora_entrada,hora_salida,horas_trabajadas,"
                "hora_inicio_planificada,hora_fin_planificada,horas_extra,tipo,firmado_empleado) "
                "VALUES ($1,$2,'" + str(OUTLET) + "',$3,$4,$5,$6,$4,$5,$7,'normal',true)", turnos)

            # Cuadrante publicado: semana pasada, actual y siguiente (la pantalla Cuadrante lee estas tablas)
            lunes = hoy - timedelta(days=hoy.weekday())
            semanas = [lunes + timedelta(days=7 * k) for k in (-1, 0, 1)]
            await conn.execute(
                "DELETE FROM cuadrante_asignaciones WHERE cuadrante_id IN "
                "(SELECT id FROM cuadrantes WHERE outlet_id=$1 AND semana_inicio = ANY($2::date[]))", OUTLET, semanas)
            await conn.execute("DELETE FROM cuadrantes WHERE outlet_id=$1 AND semana_inicio = ANY($2::date[])",
                               OUTLET, semanas)
            n_asig = 0
            for sem in semanas:
                cid = uid("cuadrante", sem)
                await conn.execute(
                    "INSERT INTO cuadrantes (id,outlet_id,semana_inicio,semana_fin,publicado) VALUES ($1,$2,$3,$4,true)",
                    cid, OUTLET, sem, sem + timedelta(days=6))
                asigs = []
                for emp in todos:
                    cocina = emp["cargo"] in ("Cocinero", "Ayudante de cocina", "Friegaplatos")
                    libres = rng.sample(range(7), 2)
                    for k in range(7):
                        if k in libres:
                            continue
                        dia_a = sem + timedelta(days=k)
                        if rng.random() < 0.5:
                            hi, hf = (time(11, 0), time(17, 0)) if cocina else (time(12, 30), time(17, 30))
                        else:
                            hi, hf = (time(18, 0), time(23, 30)) if cocina else (time(19, 30), time(23, 30))
                        asigs.append((uid("asig", cid, emp["id"], dia_a), cid, emp["id"], dia_a, hi, hf,
                                      "Cocina" if cocina else "Sala"))
                await conn.executemany(
                    "INSERT INTO cuadrante_asignaciones (id,cuadrante_id,empleado_id,fecha,hora_inicio,hora_fin,puesto) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7)", asigs)
                n_asig += len(asigs)
            print(f"Cuadrante: {len(semanas)} semanas, {n_asig} asignaciones.")

        print(f"Listo. {len(turnos)} turnos creados. Ventas totales: "
              f"{sum(t[4] for t in tickets):.2f} €.")
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
