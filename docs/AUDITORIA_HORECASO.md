# Auditoría HorecaSO — Informe completo

**Fecha:** 06/10/2026 · **Actualizada:** 10/10/2026 · **Alcance:** repositorio completo + base de datos Supabase (consultas de solo lectura).
Los hallazgos marcados como **sospecha** no se han podido confirmar. Las líneas citadas corresponden al código en la fecha de la auditoría.
Estado de las correcciones: ver `BUGS_Y_SOLUCIONES.md` y `BITACORA_HORECASO.md`.

## PASO 1 — Mapeo

**Stack real (de `backend/requirements.txt` y `frontend/package.json`):**
- **Backend:** FastAPI 0.115.0, asyncpg 0.29 (SQL sin ORM), python-jose 3.3.0, passlib 1.7.4 + bcrypt 4.0.1, pydantic 2.9, slowapi 0.1.9, reportlab 4.0.8 y groq.
- **Arranque:** gunicorn con 2 workers uvicorn (`backend/Dockerfile`).
- **Frontend:** React 19.2, Vite ^8.0.1 (no la 7 que dice `.cursorrules`), Tailwind 4, axios, react-router 7, xlsx ^0.18.5 y vite-plugin-pwa.
- **Datos y despliegue:** PostgreSQL en Supabase, accedido a través de pgbouncer (`statement_cache_size=0`). Render + Vercel. El remoto es `github.com/ariinromeror/HorecaSO`.

**Arquitectura:**
- `get_db()` (`database.py` L55-73) abre una transacción por cada `async with`. Pool de 2 a 10 conexiones, timeout de 60 s.
- Unos 140 endpoints repartidos en estos módulos:
  - Operativa: TPV (cobros, pagos parciales, cierre), Verifactu, mesas, carta y KDS.
  - Inventario y costes: inventario, FIFO, recetas/escandallos, proveedores y facturas (escaneo con Groq), APPCC y costes.
  - Personal y clientes: empleados, fichajes, cuadrantes, ausencias, nóminas, reservas, lista de espera y clientes.
  - Gestión: dashboard, analytics, reportes, usuarios, superadmin (tenants, logs, acuerdos).

**Autenticación:**
- JWT HS256 con 24 h de duración. Claims: `sub`, `user_id`, `role`, `negocio_id`.
- `get_current_user` (`auth/dependencies.py` L17-29) solo decodifica el token, sin consultar la BD.
- `require_roles` comprueba el rol que viene en el token. `require_modulo` lee `tenants.modulos`.

**Base de datos (41 tablas):**
- Solo hay PK y FK.
- `UNIQUE` únicamente en `usuarios.email`, y un único `CHECK`, sobre `usuarios.rol`.
- Cero triggers.
- Índices solo en las PK de las tablas con más tráfico.

**Tests:** ninguno automatizado.

---

## PASO 2 y 3 — Hallazgos

Están ordenados por criticidad. Primero dinero, inventario y permisos; después el resto.

### CRÍTICOS

**HSO-01 — Base de datos accesible desde la API pública de Supabase** · Seguridad · Crítica
- **Ubicación:** BD Supabase, esquema `public`.
  - El advisor de Supabase marca `rls_disabled_in_public` en 41 tablas.
  - `has_table_privilege` confirma que los roles `anon` y `authenticated` tienen SELECT/UPDATE/DELETE sobre `usuarios`, `nominas`, `empleados`, `tickets` y `verifactu_registros`.
- **Qué pasa:** la clave anon/publishable de Supabase está pensada para ser pública. Quien la tenga puede, sin pasar por el backend:
  - leer los `password_hash`, las nóminas y los IBAN;
  - borrar o alterar registros fiscales.

  Aunque el frontend no use esa clave, sigue siendo válida.
- **Impacto:** fuga de datos personales (RGPD, multas) y manipulación de facturación.
- **Verificar:** `GET https://<ref>.supabase.co/rest/v1/usuarios?select=email,password_hash` con las cabeceras `apikey` y `Authorization: Bearer <anon>`. Si devuelve filas, está expuesto.
- **Solución:**
```sql
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP; END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
```
- **Esfuerzo:** Bajo.
- **Riesgo:** Bajo, con una condición.
  - Hay 4 tablas que ya tienen RLS activo sin políticas (`platform_logs`, `tenant_audit_log`, `gastos_operativos`, `usuario_permisos`) y el backend escribe en ellas sin problema. Eso indica que el backend se salta RLS.
  - Antes de aplicarlo, confirmar que `DATABASE_URL` usa el rol `postgres`.

**HSO-02 — Doble cobro, numeración duplicada y cadena Verifactu rota por concurrencia** · Integridad (dinero/fiscal) · Crítica
- **Ubicación:**
  - `routers/tpv/tpv_cobrar.py` L47-50: `SELECT * FROM tickets WHERE id=$1`, sin `FOR UPDATE`.
  - `tpv_cobrar.py` L62-70: el UPDATE no incluye `AND estado='abierto'`.
  - `services/verifactu_engine.py` L34-64: `generar_numero_serie` hace MAX+1 sin bloqueo.
  - `verifactu_engine.py` L105-116: la huella anterior se lee con `ORDER BY created_at DESC LIMIT 1`, sin bloqueo.
  - `routers/tpv/tpv_pagos.py` L54-77: mismo patrón en el último pago parcial.
- **Qué pasa:** dos casos realistas.
  - **El mismo ticket, con doble clic o reintento.** La segunda petición espera el bloqueo de fila. Cuando la primera termina, el UPDATE se ejecuta igual (no se vuelve a comprobar el estado) y se genera un **segundo registro Verifactu** para la misma venta.
  - **Dos tickets distintos cobrados a la vez en el mismo tenant** (dos TPV en hora punta). Ambos leen el mismo último número de serie y la misma huella. Resultado: **número de serie duplicado y cadena bifurcada**.

  Como los registros son inmutables, no se pueden corregir después.
- **Impacto:** ingresos declarados dos veces e incumplimiento de Verifactu (cadena no verificable).
- **Verificar:** lanzar dos `POST /tpv/tickets/{id}/cobrar` con `asyncio.gather`, y luego:
  ```sql
  SELECT ticket_id, count(*) FROM verifactu_registros GROUP BY 1 HAVING count(*) > 1;
  ```
  Repetir con dos tickets distintos y buscar `numero_serie` duplicados. Hoy los datos están limpios (16 registros), pero no hay nada que lo impida.
- **Solución:**
```python
# tpv_cobrar / tpv_pagos
ticket = await conn.fetchrow("SELECT * FROM tickets WHERE id=$1 FOR UPDATE", ticket_id)
if not ticket or ticket["estado"] != "abierto":
    raise HTTPException(409, "El ticket ya no está abierto")
# verifactu_engine.crear_registro_verifactu, al inicio:
await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))", str(tenant_id))
if await conn.fetchval("SELECT 1 FROM verifactu_registros WHERE ticket_id=$1", ticket_uuid):
    raise ValueError("Ticket ya registrado en Verifactu")
```
```sql
CREATE UNIQUE INDEX uq_vf_ticket ON verifactu_registros(ticket_id);
CREATE UNIQUE INDEX uq_vf_serie  ON verifactu_registros(tenant_id, numero_serie);
CREATE FUNCTION vf_inmutable() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'verifactu_registros es inmutable'; END $$;
CREATE TRIGGER trg_vf_inmutable BEFORE UPDATE OR DELETE ON verifactu_registros
  FOR EACH ROW EXECUTE FUNCTION vf_inmutable();
```
  Además, el año de la serie se calcula en UTC. Debe usar `Europe/Madrid`.
- **Esfuerzo:** Medio.
- **Riesgo:** Bajo. Solo serializa los cobros de un mismo tenant, durante milisegundos.

**HSO-03 — Credenciales de superadmin y admin publicadas en GitHub, con las cuentas activas** · Seguridad · Crítica (condicional)
- **Ubicación:**
  - `backend/scripts/generate_test_hashes.py` L6-12: contraseñas en claro (`SuperAdmin2024!`, `Admin1234!`…). El archivo está commiteado (commit `abd5574`) y subido a `origin`.
  - `admin@test.com / admin123` aparece en `.cursorrules` y en `docs/`.
  - En la BD están activos `superadmin@horecaso.com`, `admin@test.com` y `admin@prueba.com`.
- **Impacto:** si el repositorio es público y esas contraseñas no se han cambiado, cualquiera controla toda la plataforma (todos los tenants).
- **Verificar:** si el repo es público en GitHub, y si esas contraseñas siguen funcionando contra producción. Esto último no lo he probado a propósito.
- **Solución:**
  - Rotar ya las tres contraseñas y desactivar las cuentas demo en producción.
  - Quitar las contraseñas del script (leerlas de variables de entorno).
  - Si el repo es público, asumir que están comprometidas aunque se borren del historial.
- **Esfuerzo:** Bajo. **Riesgo:** Nulo.
- **Nota (10/10/2026):** commit `1dba7c0` — credenciales demo fuera del código (`VITE_DEMO_*`, `check_bundle_secrets.mjs`). Hash superadmin rotado en BD; cuentas demo `@prueba.com` desactivadas en Supabase.
  - Código (commit `1dba7c0`): verificado por lectura y build.
  - Credenciales en BD y producción: verificado manualmente por el responsable (ver bitácora); prueba negativa del script pendiente.

### ALTOS

**HSO-04 — Endpoints del TPV y de mesas sin aislamiento de tenant ni control de rol** · Seguridad/Permisos · Alta
- **Ubicación:**
  - `tpv_tickets_detalle.get_ticket` L23-95: `get_current_user`, `_ = current_user`, consulta solo por `id`.
    - Devuelve el NIF y la dirección del tenant dueño del ticket (aunque no sea el tuyo).
    - Hace una escritura lateral sobre la mesa de otro tenant: `UPDATE mesas SET estado='ocupada'` (L52-59).
  - `tpv_lineas` (añadir, editar y borrar línea): `SELECT * FROM tickets WHERE id=$1`, sin filtro de tenant ni de outlet.
  - `tpv_cobrar.cobrar_ticket`: cualquier rol puede cobrar. Un intento entre tenants falla, pero solo por casualidad: Verifactu lanza `ValueError` y se devuelve `detail=str(e)`.
  - `mesas_list.get_mesa` L123-137: `WHERE m.id=$1`, sin filtro de tenant.
- **Impacto:**
  - Entre tenants, el riesgo lo mitiga que los IDs sean UUIDv4 difíciles de adivinar.
  - Dentro del mismo tenant el riesgo es real: un rol `cocina` o `almacen` puede cobrar, o borrar líneas de un ticket antes de cobrarlo (fraude interno).
- **Verificar:** con un token de rol `cocina`, `DELETE /tpv/tickets/{id}/lineas/{lid}` devuelve 200.
- **Solución:** reutilizar el helper que ya existe en `tpv_pagos`:
```python
current_user = Depends(require_roles(["admin","director","jefe_sala","camarero"]))
ticket = await _require_ticket_tpv_access(conn, ticket_id, current_user)  # tenant + outlet
```
  Y quitar la escritura lateral de `get_ticket`: un GET no debe escribir.
- **Esfuerzo:** Bajo-Medio. **Riesgo:** Medio. Puede bloquear algún flujo legítimo de un rol; revisar contra el `NAV_ITEMS` del sidebar.
- **Nota (10/10/2026):** commits `8d938c7` (GET ticket solo lectura + 404 cross-tenant), `d69e8e4` (GET coste receta sin escritura); filtro tenant `838fba9` (KDS), `0b3994f` (APPCC), `d9e1547` (reportes), `670aa79` (analytics). **Verificado por test** (cross-tenant KDS/APPCC/reportes ventas/analytics; GET sin escritura). Ampliación a otros reportes/cierre/PDF: verificado por lectura (sin test cross-tenant).

**HSO-05 — Se aceptan cantidades negativas o cero en las líneas de ticket** · Dinero · Alta
- **Ubicación:**
  - `tpv_schemas.py` L11-16: `cantidad: int`, sin `gt=0`.
  - `tpv_lineas.py` L68-69: el subtotal se calcula como `precio * cantidad`.
  - En la BD, `ticket_lineas.cantidad` es `integer` sin `CHECK`.
- **Impacto:** se pueden emitir tickets con total reducido o negativo, que acaban en Verifactu. Es una vía de fraude interno y genera facturas inválidas.
- **Verificar:** `POST /tpv/tickets/{id}/lineas` con `{"cantidad": -3}` devuelve 200.
- **Solución:**
  - En el schema: `cantidad: int = Field(..., gt=0, le=999)` (también en el PATCH).
  - En la BD: `ALTER TABLE ticket_lineas ADD CONSTRAINT ck_cant CHECK (cantidad > 0);`
  - Las devoluciones irían por un flujo de factura rectificativa, que hoy no existe.
- **Esfuerzo:** Bajo. **Riesgo:** Bajo (los datos actuales no tienen cantidades negativas).

**HSO-06 — Un usuario desactivado o un tenant suspendido sigue teniendo acceso hasta 24 h** · Permisos · Alta
- **Ubicación:**
  - `auth/dependencies.py` L17-29: no se comprueban `usuarios.activo`, `tenants.activo` ni el rol actual.
  - `/auth/verify` tampoco consulta la BD.
  - TTL de 1440 minutos en `config.py`.
- **Impacto:**
  - Un empleado despedido sigue cobrando y anulando durante un día.
  - Bajar de rol a alguien no surte efecto.
  - Suspender un tenant por impago no corta el servicio.
- **Verificar:** iniciar sesión, desactivar el usuario y llamar a `/tpv/...` con el token antiguo: devuelve 200.
- **Solución:**
```python
row = await conn.fetchrow("""SELECT u.activo, u.rol, u.tenant_id, t.activo AS t_activo
  FROM usuarios u LEFT JOIN tenants t ON t.id=u.tenant_id WHERE u.id=$1""", UUID(payload["sub"]))
if not row or not row["activo"] or (row["rol"] != "superadmin" and row["t_activo"] is False):
    raise HTTPException(401, "Sesión no válida")
payload["role"] = row["rol"]
```
  Opcionalmente, una caché en memoria de 30-60 s para no penalizar el polling. Bajar el TTL a 8-12 h.
- **Esfuerzo:** Medio. **Riesgo:** Medio. Afecta a todos los endpoints y añade una consulta por petición.

**HSO-07 — Login sin límite de intentos** · Seguridad · Alta
- **Ubicación:**
  - `main.py` L80 y L118-120 crean el `Limiter` y el middleware.
  - No existe ningún `@limiter.limit` en el código.
- **Impacto:** fuerza bruta sobre `/auth/login`. El riesgo es mayor por HSO-03.
- **Solución:**
  - Añadir `@limiter.limit("5/minute")` a `login(request: Request, ...)`.
  - Sacar `limiter` a un módulo propio para evitar un import circular con `main`.
  - Detrás del proxy de Render, gunicorn ve la IP del proxy. Hay que añadir `--forwarded-allow-ips="*"` en el `CMD` del `Dockerfile`. Si no, todo el restaurante comparte el mismo límite y se bloquea entero.
  - Con 2 workers y almacén en memoria, el límite real es el doble. Es aceptable.
- **Esfuerzo:** Bajo. **Riesgo:** Bajo-Medio, solo si no se configuran las cabeceras del proxy.
- **Nota (10/10/2026):** rate limit de login en código (Fase 2; `rate_limit.py` + `test_hso07_rate_limit_login.py`). Suite del cierre de seguridad tenant: **verificado por test** (incluido en 190 passed). Superficie de fuerza bruta reducida además por ops de HSO-03 (commit `1dba7c0` + rotación/desactivación en BD).
  Pendiente: comprobar en producción la IP registrada en el log de 429 (la suite verifica la lógica, no la cabecera X-Forwarded-For real de Render).

**HSO-08 — Se aceptan sobrepagos y el cierre de caja descuadra** · Dinero · Alta
- **Ubicación:** `tpv_pagos.add_ticket_pago` L54-77 no compara el `importe` con lo pendiente. `tpv_cierre_caja` suma los pagos por método.
- **Qué pasa:**
  - Si en una cuenta de 40 € se pagan 50 € en efectivo, se guardan 50 €.
  - El cuadre por métodos da 50 €, pero `total_ventas` da 40 €.
  - Un error de tecleo (500 en lugar de 50,00) infla el cierre.
- **Solución:** guardar `min(importe, pendiente)` y devolver `cambio = importe - pendiente`, solo en efectivo. En el resto de métodos, rechazar con 422 cuando `importe > pendiente`.
- **Esfuerzo:** Bajo. **Riesgo:** Bajo. El frontend tiene que mostrar el cambio.

**HSO-09 — Fechas en UTC en dashboard e informes, y el dashboard ignora los pagos mixtos** · Dinero/Reporting · Alta
- **Ubicación:**
  - `dashboard.py` L46-57 y L151-176: `date.today()` + `DATE(t.cobrado_at)`.
  - `reportes_dif_ventas.py` L50-59: `cobrado_at::date`.
  - `analytics_menu` L88-89.
  - `date.today()` en APPCC, analytics, `fifo_consumo` L194 y en el valor por defecto de reportes de inventario.
  - En cambio, `tpv_cierre_caja` sí usa `Europe/Madrid`.
  - `dashboard.py` L188-200 (cierre del día) agrupa por `tickets.metodo_pago` e ignora `'mixto'`.
- **Impacto:**
  - Las ventas entre las 00:00 y las 02:00 (hora de Madrid) caen en el día anterior o siguiente.
  - Dashboard, informes y cierre dan cifras distintas para el mismo día.
  - Los métodos del dashboard no suman el total cuando hay cuentas divididas.

  El director pierde la confianza en los números.
- **Verificar:** cobrar un ticket a las 00:30 (hora de Madrid) y comparar el dashboard de "hoy" con el cierre.
- **Solución:**
  - Usar una única expresión en todo el código: `(t.cobrado_at AT TIME ZONE 'Europe/Madrid')::date`.
  - Sustituir `date.today()` por un helper `hoy_madrid()`.
  - El cierre del dashboard debe reutilizar el cálculo por `ticket_pagos` de `tpv_cierre_caja`.
- **Esfuerzo:** Medio. **Riesgo:** Bajo-Medio, porque cambian las cifras históricas mostradas.

**HSO-10 — Huella Verifactu probablemente no conforme a la especificación de la AEAT** · Fiscal · Alta (**sospecha fuerte**)
- **Ubicación:** `verifactu_engine.generar_huella` L15-31.
  - Concatena los valores sin nombre de campo, separados por `&`.
  - Fecha en ISO.
  - `tipo_factura="F1"` para tickets de hostelería.
- **Qué pasa:** según mi conocimiento de la especificación, la huella se calcula sobre pares `IDEmisorFactura=…&NumSerieFactura=…&FechaExpedicionFactura=dd-mm-aaaa&TipoFactura=…&CuotaTotal=…&ImporteTotal=…&Huella=…&FechaHoraHusoGenRegistro=…`. Además, los tickets sin datos del destinatario suelen ser `F2` (factura simplificada).
- **Impacto:** si se confirma, todos los registros generados serían rechazados o no verificables cuando se envíen a la AEAT.
- **Verificar:** contrastar con el documento oficial «Especificaciones técnicas de huella/encadenamiento» de la AEAT y con su validador. No he tenido el documento delante.
- **Solución:**
  - Reescribir `generar_huella` según la especificación.
  - Añadir una columna `version_huella` para que `verificar_cadena` siga validando los registros antiguos.
  - Como el sistema está en piloto (16 registros), valorar empezar una cadena nueva.
- **Esfuerzo:** Medio. **Riesgo:** Alto. Es irreversible una vez en producción: decidirlo antes de facturar en real.

**HSO-11 — Inventario con dos fuentes de stock desincronizadas, que permiten stock negativo** · Inventario · Alta
- **Ubicación:**
  - `inventario_movimientos_core.crear_movimiento` L52-110:
    - fija `stock_actual` como valor absoluto;
    - no toca `lotes_inventario`;
    - en un `ajuste` sobrescribe el stock directamente.
  - `fifo_consumo.consumir_fifo` L50-165:
    - comprueba solo la suma de los lotes;
    - después hace `stock_actual = stock_actual - $1` sin la condición `stock_actual >= $1`.
- **Impacto:**
  - Tras una entrada manual (sin lote), FIFO dice "sin stock" aunque `stock_actual` muestre unidades.
  - Al revés, `stock_actual` puede quedar negativo.
  - La valoración del inventario y el coste de mermas dependen de qué vía se usó.
- **Verificar:**
  1. Entrada manual de 10 unidades en un artículo sin lotes.
  2. `POST /fifo/consumir` de 1 unidad: da error.
  3. Comparar `stock_actual` con `SUM(lotes.cantidad)` por artículo.
- **Solución:**
  - Un único servicio de stock: toda entrada crea un lote y toda salida consume FIFO.
  - El ajuste genera un movimiento por la diferencia, no un valor absoluto.
  - `UPDATE ... WHERE id=$2 AND stock_actual >= $1 RETURNING`, y opcionalmente `CHECK (stock_actual >= 0)`.
  - Añadir `require_modulo('fifo')` en `/fifo/consumir`.
- **Esfuerzo:** Alto. **Riesgo:** Medio. Hace falta un script de reconciliación de los datos actuales.

**HSO-12 — Sin tests automatizados** · Calidad · Alta
- **Ubicación:** el repositorio solo tiene `scripts/_test_bcrypt_shim.py`.
- **Impacto:** cualquier arreglo de HSO-02, 06 o 11 puede romper cobros sin que nadie se entere.
- **Solución:** ver la sección de tests del Paso 4.
- **Esfuerzo:** Medio para lo crítico. **Riesgo:** Nulo.

### MEDIOS

**HSO-13 — Faltan restricciones de integridad en la BD** · Integridad · Media
- **Qué falta:**
  - `UNIQUE` en `cierres_caja(outlet_id, fecha)`. La comprobación previa en `tpv_cierre_caja` L333-346 tiene una condición de carrera (dos cierres simultáneos pueden pasarla).
  - `UNIQUE` en `nominas(empleado_id, mes, anio)`.
  - `CHECK` de importes ≥ 0 en `ticket_pagos.importe` y `tickets.total`.
- **Solución:**
```sql
CREATE UNIQUE INDEX uq_cierre ON cierres_caja(outlet_id, fecha);
CREATE UNIQUE INDEX uq_nomina ON nominas(empleado_id, mes, anio);
ALTER TABLE ticket_pagos ADD CONSTRAINT ck_imp CHECK (importe > 0);
```
  Y capturar `UniqueViolationError` para devolver 409.
- **Esfuerzo:** Bajo. **Riesgo:** Bajo. Antes, comprobar que no hay duplicados.

**HSO-14 — Faltan índices en las tablas con más tráfico** · Rendimiento · Media
- **Ubicación:** `tickets`, `ticket_lineas`, `verifactu_registros`, `movimientos_stock`, `lotes_inventario`, `turnos`, `reservas` y `cierres_caja` solo tienen PK.
- **Impacto:** con unos pocos miles de tickets, el polling cada 30 s del KDS y de Venta Live empezará a hacer recorridos completos de tabla.
- **Solución:**
```sql
CREATE INDEX ON tickets(outlet_id, estado);
CREATE INDEX ON tickets(outlet_id, cobrado_at);
CREATE INDEX ON ticket_lineas(ticket_id);
CREATE INDEX ON verifactu_registros(tenant_id, created_at);
CREATE INDEX ON movimientos_stock(articulo_id, created_at);
CREATE INDEX ON lotes_inventario(articulo_id, fecha_caducidad);
CREATE INDEX ON reservas(outlet_id, fecha);
CREATE INDEX ON turnos(empleado_id, fecha);
```
- **Esfuerzo:** Bajo. **Riesgo:** Bajo.

**HSO-15 — El coste de las recetas no se guarda y los errores de conversión se silencian** · Dinero · Media
- **Ubicación:**
  - No existe ningún `UPDATE recetas SET coste_calculado` en el código; el único `UPDATE recetas` está en `admin_recetas.py` L349.
  - `admin_recetas_ingredientes._calcular_coste_total_receta` L75-92 hace `except (ValueError, ArithmeticError): pass`.
- **Impacto:**
  - `list_recetas` y `reportes_dif_carta` leen un coste y un semáforo antiguos o nulos.
  - Un ingrediente con unidad incompatible cuenta como 0 €.
  - El semáforo sale verde cuando debería salir rojo.
- **Solución:** guardar `coste_calculado`, `margen_porcentaje` y `semaforo` al guardar los ingredientes, y devolver una lista de `ingredientes_no_costeados` en lugar de usar `pass`.
- **Esfuerzo:** Bajo-Medio. **Riesgo:** Bajo.

**HSO-16 — Roles demasiado amplios en dashboard y Verifactu** · Permisos · Media
- **Ubicación:**
  - `dashboard.py` L38-39 solo usa `get_current_user`.
  - Todos los endpoints de `verifactu.py` usan `get_current_user`. Filtran por tenant, pero un camarero puede ver las ventas y exportar el CSV fiscal.
- **Solución:** `require_roles(['admin','director'])`, más `jefe_sala` donde lo prevea el sidebar.
- **Esfuerzo:** Bajo. **Riesgo:** Bajo.
- **Nota (10/10/2026):** `require_roles` en dashboard/Verifactu (Fase 1; `test_hso16_roles_dashboard_verifactu.py`). Suite del cierre de seguridad tenant: **verificado por test** (incluido en 190 passed). Sin commit nuevo específico en este cierre.

**HSO-17 — `descuento_porcentaje` y `total_iva` nunca se rellenan** · Reporting · Media
- **Ubicación:** el TPV no escribe esas columnas, y el informe de ventas hace `SUM(COALESCE(total_iva,0))`.
- **Impacto:** la columna de IVA del informe de ventas siempre vale 0, aunque Verifactu sí calcula la cuota.
- **Solución:** calcular `total_iva` desde las líneas al cobrar, en la misma transacción que Verifactu, o hacer que el informe lea de `verifactu_registros.cuota_iva`.
- **Esfuerzo:** Bajo. **Riesgo:** Bajo.
- **Actualización (10/10/2026) — superado en código (parcial):** `total_iva` ya se rellena al cobrar desde Fase 3 vía `_fijar_total_iva` en `tpv_cobrar.py` (y el camino de pagos), con la cuota del registro interno. El texto anterior describe el estado en el momento de la auditoría. `descuento_porcentaje` no se ha tratado en ese arreglo; históricos sin cuota siguen pendientes del script `ops_hso17_recalcular_total_iva.sql`.

**HSO-18 — Escaneo de facturas con IA sin límite de tamaño ni de tipo de archivo** · Seguridad/Coste · Media
- **Ubicación:** `facturas_proveedor_escaneo.py` y `proveedores_shared.py` L137-209. Además devuelve `str(e)` al cliente.
- **Impacto:** un archivo enorme puede provocar falta de memoria en el worker y coste en Groq.
- **Solución:** limitar a unos 8 MB, aceptar solo `image/jpeg`, `image/png` y `application/pdf`, y devolver un error genérico.
- **Esfuerzo:** Bajo. **Riesgo:** Bajo.

**HSO-19 — Dependencias con vulnerabilidades conocidas** · Seguridad · Media (**verificar con `npm audit` / `pip-audit`**, no los he ejecutado)
- `xlsx` 0.18.5 de npm tiene CVE-2023-30533 (prototype pollution) y CVE-2024-22363 (ReDoS), y procesa archivos que sube el usuario en la importación de ingredientes. Se arregla con la versión del CDN de SheetJS, 0.20.x.
- `python-jose` 3.3.0 tiene CVE-2024-33663 y CVE-2024-33664. Con HS256 el impacto es bajo. Migrar a PyJWT.
- `passlib` ya no recibe mantenimiento; el shim de bcrypt es un parche.
- **Esfuerzo:** Bajo-Medio. **Riesgo:** Bajo para xlsx; Medio para cambiar la librería de JWT (afecta a todas las sesiones).

**HSO-20 — Token guardado en localStorage con 24 h de validez** · Seguridad · Media
- **Ubicación:** `frontend/src/services/api.js` L26-30.
- **Impacto:** cualquier fallo XSS permite robar la sesión durante un día. No he encontrado `dangerouslySetInnerHTML`, lo que lo mitiga.
- **Solución:** a corto plazo, reducir el TTL (ver HSO-06). A medio plazo, cookie httpOnly con SameSite.
- **Esfuerzo:** Medio-Alto. **Riesgo:** Medio.

### BAJOS

**HSO-21 — Dos caminos de cobro** · Integridad · Baja
- `/cobrar` no crea ninguna fila en `ticket_pagos`; el pago dividido sí.
- El cierre de caja lo compensa usando `tickets.metodo_pago` cuando no hay pagos, pero cualquier informe nuevo que lea `ticket_pagos` saldrá incompleto.
- **Solución:** que `/cobrar` inserte también su pago en `ticket_pagos`.

**HSO-22 — Fallos de defensa en profundidad** · Seguridad · Baja
- `_sync_articulo_elaborado_coste` (`admin_recetas_ingredientes.py` L108-112): `UPDATE articulos ... WHERE id=$2` sin `tenant_id`.
- `/fifo/consumir` no tiene la comprobación de módulo.
- `detail=str(e)` en `tpv_cobrar` L91-94 y en el escaneo de facturas.
- `ALLOWED_ORIGINS` vacío hace que CORS acepte `*`.
- La documentación de la API solo se oculta si `ENVIRONMENT=="production"`.

**HSO-23 — No se sigue el patrón obligatorio try/except + logger** · Mantenibilidad · Baja
- **Ubicación:** `tpv_lineas`, `tpv_cobrar`, `dashboard` y `verifactu` no siguen el patrón de `.cursorrules`.
- El manejador global evita que se filtren errores, pero los logs pierden el contexto del endpoint.

**Puntos positivos verificados:**
- Sin inyección SQL: siempre `$N` o columnas en lista blanca.
- `password_hash` nunca sale en las respuestas.
- `SECRET_KEY_AUTH` es obligatoria y no tiene valor por defecto.
- `admin_usuarios` impide crear superadmins.
- Nóminas con `Decimal` y tipos de Seguridad Social correctos.
- FIFO con `FOR UPDATE`.
- Cierre de caja en hora de Madrid.
- Solo `.env.example` está versionado.

**Huecos funcionales (decisión de producto, no son bugs):**
- El TPV y el KDS no descuentan stock por receta.
- Las facturas de proveedor no dan entrada al stock ni actualizan costes.
- La tabla `mermas` no se usa.
- No existe factura rectificativa.
- Hay 9 tickets cobrados en marzo de 2026 sin registro Verifactu, probablemente datos de prueba anteriores al motor.

---

## PASO 4 — Resumen y plan

| ID | Título | Severidad | Esfuerzo |
|---|---|---|---|
| HSO-01 | BD expuesta por la API de Supabase | Crítica | Bajo |
| HSO-02 | Concurrencia en cobro y Verifactu | Crítica | Medio |
| HSO-03 | Credenciales en GitHub | Crítica* | Bajo |
| HSO-04 | IDOR y roles en TPV/mesas | Alta | Bajo-Medio |
| HSO-05 | Cantidades negativas | Alta | Bajo |
| HSO-06 | JWT no revocable | Alta | Medio |
| HSO-07 | Login sin rate limit | Alta | Bajo |
| HSO-08 | Sobrepago descuadra el cierre | Alta | Bajo |
| HSO-09 | Fechas UTC y pagos mixtos | Alta | Medio |
| HSO-10 | Formato de huella Verifactu — **BLOQUEANTE para facturar en real** | Alta (sospecha) | Medio |
| HSO-11 | Stock desincronizado | Alta | Alto |
| HSO-12 | Sin tests | Alta | Medio |
| HSO-13 | Faltan UNIQUE/CHECK | Media | Bajo |
| HSO-14 | Índices | Media | Bajo |
| HSO-15 | Coste de recetas | Media | Bajo-Medio |
| HSO-16 | Roles en dashboard/Verifactu | Media | Bajo |
| HSO-17 | total_iva vacío — **superado parcialmente** (código Fase 3; `descuento_porcentaje` y backfill históricos pendientes) | Media | Bajo |
| HSO-18 | Límites de subida en escaneo | Media | Bajo |
| HSO-19 | Dependencias con CVE | Media | Bajo-Medio |
| HSO-20 | Token en localStorage | Media | Medio-Alto |
| HSO-21 a HSO-23 | Defensa en profundidad y patrones | Baja | Bajo |

\*Crítica si el repositorio es público y las contraseñas no se han rotado.

**Plan por fases (estado 10/10/2026):**
- **Fase 0 — HSO-01 y HSO-03:** código/SQL listos · **pendiente de ejecutar en BD** (RLS/REVOKE; ops credenciales demo).
- **Fase 1 — HSO-02, 05, 08, 13, 04, 16:** hecha en código + tests · **pendiente de ejecutar en BD** (`migration_hso_fase1_integridad.sql`, `migration_hso13_importes_no_negativos.sql`).
- **Fase 2 — HSO-06, 07 (TTL):** hecha en código + tests · HSO-20 (cookie httpOnly) **pendiente**.
- **Fase 3 — HSO-09, 17, 21, 15:** hecha en código + tests · script `ops_hso17_recalcular_total_iva.sql` **pendiente de ejecutar** en históricos.
- **Fase 4 — HSO-11:** hecha en código + tests · **pendiente de ejecutar en BD** (`migration_hso11_stock_schema.sql`, `migration_hso11_datos_lotes.sql`) + recuento físico.
- **Fase 5 — HSO-14, 18, 19, 22, 23:** hecha en código + tests · **pendiente de ejecutar en BD** `migration_hso14_indices.sql` (CONCURRENTLY, fuera de transacción); bumps de deps con CVE **pendiente** (decisión).
- **Verifactu (HSO-10) — BLOQUEANTE para facturar en real:** **pendiente** (spec AEAT + huella + decisión de reinicio de cadena).

**Tests a añadir:** pytest + httpx `AsyncClient` contra una BD de prueba (una rama de Supabase o un Postgres local).
- Cobro concurrente del mismo ticket y de dos tickets distintos: un solo registro, series únicas y cadena válida.
- Sobrepago.
- Cantidad ≤ 0.
- Acceso de otro tenant a ticket y mesa (404).
- Rol `cocina` intentando cobrar (403).
- Token de un usuario desactivado (401).
- Cierre con pagos mixtos (los métodos suman el total).
- Ticket cobrado a las 00:30 de Madrid (cae en el día correcto).
- Coherencia entre FIFO y `stock_actual`.
- Merma ≥ 100 %.
- Coste de receta guardado.

**No revisado o con revisión limitada:**
- Auditoría de UX del frontend completo. Solo he revisado auth, api y los componentes tocados.
- Empleados, fichajes, cuadrantes, clientes y reservas: solo un barrido de seguridad, sin revisar la lógica en profundidad.
- Servicios de generación de PDF.
- Explotación real en vivo y pruebas de concurrencia (no permitidas en esta fase).
- Variables de entorno de Render/Vercel, el rol de `DATABASE_URL` y si la BD auditada es la de producción o la de desarrollo.
- `npm audit` / `pip-audit` sin ejecutar.
- Especificación oficial de Verifactu de la AEAT.

---

## PLAN DE CORRECCIÓN POR FASES

Referencia: hallazgos HSO-01 a HSO-23 de este informe.

### Fase 0 — Hoy (sin dependencias)
- HSO-01: activar RLS en todas las tablas de `public` y hacer REVOKE a `anon`/`authenticated` (tablas, secuencias, default privileges). Antes, confirmar que `DATABASE_URL` usa el rol `postgres`.
- HSO-03: rotar las contraseñas de `superadmin@horecaso.com`, `admin@test.com` y `admin@prueba.com`. Desactivar las cuentas demo en producción. Quitar las contraseñas en claro de [backend/scripts/generate_test_hashes.py](../backend/scripts/generate_test_hashes.py).

### Fase 1 — Integridad del dinero
- HSO-02:
  - `SELECT ... FOR UPDATE` + comprobar `estado='abierto'` en [backend/routers/tpv/tpv_cobrar.py](../backend/routers/tpv/tpv_cobrar.py) y [backend/routers/tpv/tpv_pagos.py](../backend/routers/tpv/tpv_pagos.py).
  - `pg_advisory_xact_lock` por tenant y comprobación de duplicado en [backend/services/verifactu_engine.py](../backend/services/verifactu_engine.py). Año de la serie en hora de Madrid.
  - Migración SQL: UNIQUE(ticket_id), UNIQUE(tenant_id, numero_serie) y trigger de inmutabilidad.
- HSO-05: `cantidad: int = Field(gt=0, le=999)` en [backend/routers/tpv/tpv_schemas.py](../backend/routers/tpv/tpv_schemas.py) y CHECK en la BD.
- HSO-08: limitar el pago al pendiente y devolver el cambio (solo efectivo).
- HSO-13: UNIQUE en cierres_caja(outlet_id, fecha) y nominas(empleado_id, mes, anio), y CHECK de importes. Capturar UniqueViolation para devolver 409.
- HSO-04 / HSO-16: `_require_ticket_tpv_access` + `require_roles` en tpv_lineas, tpv_tickets_detalle (quitar el UPDATE de mesas en el GET), tpv_cobrar, mesas_list.get_mesa, dashboard y verifactu.

### Fase 2 — Autenticación
- HSO-06: revalidar usuario, tenant y rol en [backend/auth/dependencies.py](../backend/auth/dependencies.py), con caché corta. Bajar el TTL a 8-12 h.
- HSO-07: `@limiter.limit("5/minute")` en el login (limiter en un módulo propio) + `--forwarded-allow-ips="*"` en [backend/Dockerfile](../backend/Dockerfile).

### Fase 3 — Coherencia de informes
- HSO-09: helper `hoy_madrid()` y expresión `AT TIME ZONE 'Europe/Madrid'` en dashboard, reportes_dif_ventas, analytics, appcc y fifo_consumo. Cierre del dashboard calculado desde ticket_pagos.
- HSO-17: rellenar `total_iva` al cobrar.
- HSO-21: `/cobrar` inserta también en ticket_pagos.
- HSO-15: guardar el coste, margen y semáforo de las recetas, y reportar los ingredientes sin coste en lugar de `pass`.

### Fase 4 — Inventario (requiere decisión de modelo)
- HSO-11: un único servicio de stock (entradas crean lote, salidas consumen FIFO, ajustes por diferencia), guarda contra stock negativo, `require_modulo('fifo')` y script de reconciliación de stock_actual contra la suma de lotes.

### Fase 5 — Robustez
- HSO-14: índices.
- HSO-18: límites de subida en el escaneo IA.
- HSO-19: xlsx desde el CDN de SheetJS 0.20.x y PyJWT; ejecutar `npm audit` y `pip-audit`.
- HSO-22 / HSO-23: defensa en profundidad y patrón try/except.

### Bloqueante aparte — Verifactu (HSO-10)
Contrastar `generar_huella` con la especificación de la AEAT (formato campo=valor, fecha dd-mm-aaaa, F2 para simplificadas). Añadir `version_huella` y decidir si se reinicia la cadena antes de facturar en real.

### Tests (paralelo a la Fase 1)
pytest + httpx AsyncClient contra una BD de prueba: cobro concurrente, sobrepago, cantidad no positiva, acceso de otro tenant, rol sin permiso, token de usuario desactivado, cierre con pagos mixtos, límite de fecha a medianoche de Madrid, coherencia FIFO/stock, coste de receta.

### Documentación
Entrada en BITACORA_HORECASO.md por fase y alta de HSO-02/05/08/09/11 en BUGS_Y_SOLUCIONES.md.
