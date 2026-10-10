# HorecaSO — Manual para el cliente

**Guía completa para entender qué hace el programa, cómo encaja en tu restaurante y cómo usarlo con criterio.**

Versión orientada a dueños, directores y responsables de sala que quieren conocer el producto antes de adoptarlo o formar a su equipo. Está escrita en lenguaje de negocio hostelero, sin tecnicismos de informática.

---

## Índice

1. [Qué es HorecaSO y qué problema resuelve](#1-qué-es-horecaso-y-qué-problema-resuelve)
2. [Cómo se organiza el trabajo dentro del programa](#2-cómo-se-organiza-el-trabajo-dentro-del-programa)
3. [Los perfiles: quién ve qué](#3-los-perfiles-quién-ve-qué)
4. [Un día completo en tu restaurante con HorecaSO](#4-un-día-completo-en-tu-restaurante-con-horecaso)
5. [La cadena del plato: del almacén al precio en carta](#5-la-cadena-del-plato-del-almacén-al-precio-en-carta)
6. [Caja, cobros y registro fiscal al cerrar la cuenta](#6-caja-cobros-y-registro-fiscal-al-cerrar-la-cuenta)
7. [Módulos uno a uno](#7-módulos-uno-a-uno)
8. [Calidad, seguridad alimentaria y caducidades](#8-calidad-seguridad-alimentaria-y-caducidades)
9. [Personas, horarios y nóminas en España](#9-personas-horarios-y-nóminas-en-españa)
10. [Informes para dirección y gestoría](#10-informes-para-dirección-y-gestoría)
11. [Contrato de uso, gestoría y Verifactu (piloto y venta)](#11-contrato-de-uso-gestoría-y-verifactu-piloto-y-venta)
12. [Preguntas que suele hacer un cliente antes de contratar](#12-preguntas-que-suele-hacer-un-cliente-antes-de-contratar)
13. [Glosario](#13-glosario)
14. [Nota sobre planes y evolución del producto](#14-nota-sobre-planes-y-evolución-del-producto)

---

## 1. Qué es HorecaSO y qué problema resuelve

HorecaSO es una **aplicación web** pensada para restaurantes y bares de tamaño medio en España: equipos de unas cinco a cincuenta personas, con sala, cocina, almacén y dirección compartiendo el mismo local (o varias zonas del mismo negocio).

En la práctica, sustituye o unifica muchas herramientas que suelen ir sueltas:

- Comandas en papel o impresoras desconectadas del stock.
- Hojas de cálculo para inventario que no hablan con la carta.
- Una caja que cobra pero no sabe cuánto cuesta realmente un plato.
- Carpetas de facturas de proveedor, fichajes en papel y cuadrantes en WhatsApp.

**La idea central** es que todo el circuito tenga sentido junto: lo que compras entra en inventario; lo que cocinas consume ingredientes; lo que vendes sale en la carta y en la caja; cocina ve los pedidos en pantalla; al cobrar queda registrado para el cierre del día y, cuando la cuenta está pagada, un **registro fiscal interno inalterable** (preparación Verifactu; el detalle honesto está en el capítulo 11).

No hace falta instalar un programa pesado en cada ordenador: se abre en el navegador (Chrome, Safari, Edge…) desde móvil, tablet o PC. También puede instalarse como acceso directo en la pantalla de inicio del móvil, como una app.

HorecaSO está pensado como **servicio por suscripción** (SaaS): cada restaurante es un cliente con sus datos separados del resto. Según el contrato, pueden activarse más o menos módulos (carta, inventario, nóminas, reservas, etc.).

---

## 2. Cómo se organiza el trabajo dentro del programa

### Entrar y salir

1. Abres la dirección web que te haya dado tu proveedor o el administrador del local.
2. Introduces **correo electrónico** y **contraseña**.
3. Tras un inicio de sesión correcto, llegas a la **pantalla principal con iconos**: una cuadrícula de botones grandes, cada uno con el nombre de un módulo (Sala, Carta, Inventario, etc.).

En la parte superior verás el nombre del negocio, tu nombre, tu perfil (por ejemplo “director” o “camarero”), un interruptor de **modo claro u oscuro** (útil en cocina de noche o en sala con mucha luz) y **Salir** para cerrar sesión. En un terminal compartido, cerrar sesión es imprescindible.

### El menú principal no es igual para todos

Cada botón de la cuadrícula corresponde a un **módulo**. No todo el mundo ve los mismos botones: depende de tu **perfil** (puesto en el programa) y de los **módulos contratados** para tu local. Si un compañero ve “Nóminas” y tú no, no es un error: tu perfil no incluye esa función.

Dentro de muchas pantallas hay un enlace o botón para **volver al menú principal** con los iconos. Desde ahí saltas a otra función sin memorizar direcciones.

### Mesas y caja: un detalle importante

En la cuadrícula verás **Sala**, pero no verás un botón que diga “TPV”. La **caja de mesa** se abre **desde una mesa** en Sala: eliges la mesa y entras al pedido y cobro de esa mesa. En este manual llamamos “TPV” o “caja de mesa” a esa pantalla de comanda y cobro.

---

## 3. Los perfiles: quién ve qué

En HorecaSO el **perfil** (a veces llamado rol) define qué módulos aparecen en tu menú principal. Piensa en ello como el puesto de trabajo dentro del programa, no necesariamente igual al puesto legal en la empresa.

| Perfil | En un servicio normal suele usar… |
|--------|-----------------------------------|
| **Administrador** | Casi todo: carta, usuarios del local, sala, informes, inventario, configuración. Es quien da de alta compañeros con correo y contraseña. |
| **Director** | Gestión económica y operativa: carta, recetas, gastos, inventario, proveedores, empleados, nóminas, reservas, clientes, dashboard, analytics, reportes. No gestiona normalmente la pantalla exclusiva de Usuarios (solo administrador). |
| **Jefe de sala** | Sala, gestión de mesas (si se le permite), reservas, clientes, venta en vivo, cierre de caja, cuadrante, KDS, reportes operativos. |
| **Camarero** | Sala, caja de mesa al tocar una mesa, KDS si hace falta, control horario. |
| **Cocina** | KDS de cocina, inventario y mermas si el menú los muestra, recetas, APPCC, proveedores según configuración. |
| **Barra** | KDS orientado a barra (bebidas y elaborados en barra), con permisos similares a cocina donde aplique. |
| **Almacén** | Inventario, mermas, APPCC, stock FIFO, proveedores, facturas de compra, fichajes, reportes de almacén. |

**Usuario y empleado no son lo mismo.** El **usuario** es la cuenta para entrar (correo y contraseña). El **empleado** es la ficha laboral (DNI, nómina, contrato). Pueden estar enlazados: así, al entrar, a veces se registra el fichaje automáticamente en perfiles de sala, cocina, barra o almacén.

---

## 4. Un día completo en tu restaurante con HorecaSO

Esta historia enlaza módulos en el orden en que muchos locales los usan. Adapta los nombres a tu realidad.

### Por la mañana: almacén y compras

Llega la mercancía del proveedor. La persona de **almacén** (o dirección):

1. Abre **Inventario** y registra **entrada de stock** o da de alta **lotes** en **Stock FIFO** si lleváis caducidades por lote.
2. Si tenéis la factura, en **Facturas compra** se anota el documento (y opcionalmente se sube una foto para rellenar datos más rápido, **revisando siempre** antes de guardar).
3. Comprueba **alertas** de stock bajo o productos próximos a caducar.

### Antes del servicio: sala y reservas

El **jefe de sala** abre **Reservas** y repasa confirmadas, canceladas y comensales. Consulta **Clientes** si hay habituales con preferencias anotadas.

En **Gestión Sala** (solo quien tenga permiso) se ajusta el plano si hoy hay mesas juntas o una terraza cerrada. En **Sala** se comprueba que el plano refleja el local real.

### Servicio de mediodía: comanda, cocina y cobro

1. Un **camarero** entra en **Sala**, toca una mesa libre y abre la **caja de mesa**.
2. Añade platos y bebidas desde la **carta** del TPV (categorías, cantidades, notas por línea si hace falta).
3. Al confirmar líneas que van a cocina o barra, estas aparecen en **KDS** en el monitor correspondiente.
4. **Cocina** o **barra** marcan estados (pendiente, en preparación, listo…) para que sala sepa cuándo servir.
5. Si un cliente paga solo su parte, se registra un **pago parcial** con su método (efectivo, tarjeta, Bizum…). La cuenta sigue abierta hasta que la suma de pagos cubre el total.
6. Cuando la mesa termina y la cuenta está pagada, la mesa vuelve a estar disponible según vuestro procedimiento.

### Tarde: mermas, calidad y dirección

- **Mermas**: se anota lo tirado por caducidad, rotura o error de elaboración.
- **APPCC**: temperaturas de cámaras, limpiezas, incidencias.
- **Venta Live** o **Dashboard**: el responsable mira ventas del día, tickets abiertos o ticket medio sin estar en cada mesa.

### Cierre de turno o de día

Quien cierra (administrador, director o jefe de sala, según permisos) entra en **Cierre de caja**:

1. Revisa el resumen del día: totales por forma de pago, número de tickets, ticket medio.
2. Compara efectivo real en cajón con lo registrado si vuestro protocolo lo exige.
3. Confirma el **cierre** para dejar el día archivado e imprime o guarda el resumen si lo necesitáis.

### Semana: carta, costes y equipo

- **Recetas** y **Elaboraciones**: revisar márgenes si suben precios de proveedor.
- **Gastos operativos**: actualizar alquiler, suministros, partidas de referencia.
- **Cuadrante** y **Nóminas**: planificación y liquidación mensual.
- **Reportes**: PDF para reunión de equipo o gestoría.

---

## 5. La cadena del plato: del almacén al precio en carta

Este capítulo responde a la pregunta más importante para muchos clientes: **¿cómo sé si un plato me deja margen y qué precio poner?**

HorecaSO no adivina el precio perfecto de un local concreto, pero sí te da una **cadena clara de datos** para decidir con números en la mano.

### Paso 1 — Inventario: de qué partimos

Antes de escandallar, necesitas **artículos de almacén** con:

- **Nombre** claro (leche entera, harina, tomate triturado…).
- **Unidad** en la que compráis y contáis: kilogramos, gramos, litros, mililitros o unidades.
- **Stock** y **coste unitario** (lo que os cuesta cada unidad o kilo).
- **SKU** (código interno): opcional, pero útil para no confundir dos productos parecidos. Al crear un artículo nuevo, el programa puede **proponer un código a partir del nombre** (por ejemplo “Leche de almendras” → un código corto tipo LCHA). Podéis cambiarlo a mano o regenerarlo; si ya existe ese código, añade un sufijo (-2, -3…).

Sin inventario con costes razonables, el escandallo será débil. Actualizad costes cuando cambien las facturas de compra.

### Paso 2 — Elaboraciones y recetas: dos niveles

**Elaboraciones** son preparaciones intermedias que no vendéis tal cual en carta: un caldo, una salsa madre, un aliño base. Tienen sus ingredientes y un coste; **no llevan precio de venta al público** en carta, pero alimentan otras recetas.

**Recetas** (escandallos de carta) son los platos o bebidas que **sí vendéis**. Cada receta se vincula a un **producto de carta** y lista ingredientes (desde inventario o desde elaboraciones) con cantidades.

Para cargar muchos ingredientes de golpe, podéis usar la **tabla editable** en pantalla o **importar desde una hoja de cálculo** (Excel o CSV): el programa muestra una vista previa; revisáis nombres, cantidades y unidades antes de confirmar. Las unidades de líquidos pueden expresarse en litros o mililitros (200 ml de leche si el artículo está en litros en inventario).

En cada ingrediente podéis indicar **merma** (porcentaje que se pierde al limpiar o pelar). El coste tiene en cuenta cantidad neta y merma: lo que realmente sacáis del almacén.

### Paso 3 — Semáforo de rentabilidad (sobre coste de ingredientes)

Una vez calculado el **coste de la receta** (suma de ingredientes con merma), el programa muestra un **semáforo** comparando coste y precio de venta en carta (si el plato ya tiene precio):

| Color | Significado habitual |
|-------|----------------------|
| **Verde** | Margen amplio sobre el coste de ingredientes (por encima del 65 % de margen en la lógica del producto). Mantener o estudiar si podéis ser más competitivos. |
| **Amarillo** | Margen intermedio (entre 40 % y 65 %). Conviene vigilar subidas de proveedor. |
| **Rojo** | Margen bajo (por debajo del 40 %). Revisar precio en carta, porción o receta. |

El semáforo habla del **coste de lo que lleva el plato en ingredientes**, no del alquiler ni de las nóminas del mes.

### Paso 4 — PVP sugerido y “porcentaje objetivo de coste sobre venta”

En **Recetas** y **Elaboraciones** veréis un **PVP sugerido** cuando hay coste de ingredientes. Se basa en una regla sencilla de hostelería:

> **Precio orientativo = coste del plato ÷ (porcentaje de coste que aceptáis sobre el precio de venta)**

Por defecto el programa usa **30 %** como objetivo: es decir, el coste de ingredientes debería representar alrededor del 30 % del precio que pagará el cliente (concepto conocido como *food cost* o coste sobre venta).

**Ejemplo numérico**

- Coste total de ingredientes (con merma): **0,49 €**
- Objetivo: ingredientes = **30 %** del PVP  
- Cálculo: 0,49 ÷ 0,30 = **1,63 €** de PVP sugerido

Podéis **cambiar ese porcentaje objetivo** en la pantalla de recetas (por ejemplo 28 % o 32 % según vuestro tipo de local). El PVP sugerido se recalcula; **el precio que cobráis lo decidís vosotros** al guardar el producto en **Carta**.

### Paso 5 — Carta: precio final, IVA y alérgenos

**Carta** es donde el cliente “ve” el producto en sala:

- Nombre, descripción, **precio de venta** (PVP).
- **IVA**: en hostelería suele ser **10 %** en comida y bebida no alcohólica; **21 %** en alcohol y tabaco (vuestro asesor fiscal confirma casos concretos).
- **Alérgenos** obligatorios por producto.
- Indicar si el plato **lleva receta** (para que el escandallo y el semáforo tengan sentido) y si va a **cocina**, **barra** o ambos (afecta al KDS).

Flujo recomendado: inventario → elaboraciones (si las hay) → receta del plato → mirar semáforo y PVP sugerido → **fijar precio en Carta**.

### Gastos operativos y nóminas: qué aportan (y qué no hacen solos)

En **Gastos operativos** anotáis partidas **mensuales** del negocio: alquiler, luz, agua, internet, marketing, tasas, una partida de referencia de personal, etc. La pantalla muestra un **total de gastos fijos** para que dirección tenga una foto del coste estructural.

**Importante para no malinterpretar el producto:**

- El **PVP sugerido de cada plato** se calcula hoy solo con el **coste de ingredientes** y vuestro **porcentaje objetivo de coste sobre venta**.
- **Gastos operativos** y el detalle de **Nóminas** **no recalculan automáticamente** el precio de cada plato. Sirven para que, en paralelo, entendáis cuánto debe facturar el local al mes y para cruzar datos en **Dashboard**, **Analytics** y **Reportes**.
- Si queréis un precio que cubra sueldo y alquiler repartidos por plato, hacedlo con criterio de dirección (ticket medio, cubiertos al día) o con informes; el escandallo os da la base **variable** de comida.

---

## 6. Caja, cobros y registro fiscal al cerrar la cuenta

### Qué es un ticket (cuenta de mesa)

La **mesa** es el sitio físico. El **ticket** (cuenta) es el pedido abierto en esa mesa: líneas con productos, cantidades, notas, total e impuestos. Puede haber un ticket abierto mientras comen; al cobrarse por completo pasa a contarse como venta cerrada en informes.

### Añadir productos y envío a cocina

Desde **Sala** → mesa → caja de mesa:

- Elegís categorías (entrantes, bebidas…) y productos como en una carta digital.
- Las líneas que corresponden a cocina o barra quedan marcadas para el **KDS** cuando vuestro flujo lo envía a preparación.

### Dividir la cuenta

Varios comensales pueden pagar por separado. HorecaSO permite **varios pagos sobre el mismo ticket**:

- Cada pago tiene **importe** y **método** (efectivo, tarjeta de crédito, tarjeta de débito, Bizum, transferencia, invitación).
- La cuenta sigue **abierta** hasta que la suma de pagos **igual o supera el total**.
- En pantalla se ve lo **pendiente** por cobrar.

### Métodos de pago admitidos

Efectivo, tarjeta de crédito, tarjeta de débito, Bizum, transferencia e invitación (cuando el local no cobra esa parte al cliente).

### Qué pasa al quedar la cuenta totalmente pagada

- El ticket pasa a estado **cobrado** para informes y cierre de caja.
- Se genera el **registro fiscal Verifactu interno** asociado a ese cobro: número de serie, importes y huella encadenada. **No se borra ni se edita** ese registro; sirve de trazabilidad y de base para la normativa de sistemas de facturación. **No implica por sí solo** el envío automático de cada cobro a la Agencia Tributaria (ver capítulo 11).
- La mesa puede liberarse para el siguiente servicio.

### Cierre de caja (pantalla dedicada)

**Cierre de caja** no sustituye cada cobro en mesa; es el **resumen del día** (o del turno, según cómo lo uséis):

- Totales por método de pago.
- Número de tickets, ventas, ticket medio.
- Acción de **cerrar** el día para dejar constancia.
- Opción de **imprimir** el resumen (útil con impresora térmica si la tenéis configurada).

Haced el cierre cuando no vayáis a registrar más ventas de ese día contable en ese local.

---

## 7. Módulos uno a uno

Cada apartado sigue la misma lógica: **para qué sirve en el negocio**, **quién lo usa**, **cuándo abrirlo**, **pasos habituales**, **errores frecuentes** y **con qué encaja**.

---

### Sala

**Para qué sirve.** Es el plano de mesas del local: ves de un vistazo qué mesas están libres, ocupadas o reservadas (según colores o leyenda) y entras a la **caja de mesa** de cada una.

**Quién lo usa.** Administrador, director, jefe de sala, camarero.

**Cuándo.** Todo el servicio, continuamente.

**Cómo se hace.**

1. Abre **Sala** desde el menú principal.
2. Lee la leyenda de estados si aparece.
3. Toca la mesa con la que vais a trabajar.
4. Se abre la caja de mesa: ahí cargáis pedido y cobros.
5. Si tenéis permiso, podéis marcar mesa libre cuando el servicio en esa mesa ha terminado.

**Errores frecuentes.** Confundir “mesa libre en plano” con “cuenta cobrada”: asegurad que el ticket está pagado antes de dar por cerrada la venta.

**Encaja con.** Reservas (estado de mesas), Venta Live (visión global), KDS (pedidos enviados), Cierre de caja (ventas del día).

---

### Gestión Sala

**Para qué sirve.** Diseñar y mantener el plano: crear mesas, número, capacidad, zona (interior, terraza…), forma en el plano.

**Quién lo usa.** Administrador, director, jefe de sala.

**Cuándo.** Al abrir el local, al cambiar distribución o temporada.

**Cómo se hace.**

1. Entra en **Gestión Sala**.
2. Crea o edita mesas con los datos que pide el formulario.
3. Guarda y comprueba en **Sala** que coincide con el local real.

**Errores frecuentes.** Mesas duplicadas o números que no coinciden con lo que dice el equipo de sala.

**Encaja con.** Reservas (asignación de mesa), informes por zona si los usáis.

---

### Dashboard

**Para qué sirve.** Panel de **resumen para dirección**: ventas del día, tickets, indicadores rápidos sin entrar mesa a mesa.

**Quién lo usa.** Administrador y director (otros perfiles no suelen ver el botón).

**Cuándo.** Mañana antes del servicio, pausa entre turnos, noche al revisar el día.

**Cómo se hace.**

1. Abre **Dashboard**.
2. Lee los bloques de resumen.
3. Si hay selector de fecha para cierre o día contable, elige el día que quieras consultar.

**Encaja con.** Cierre de caja, Analytics (profundizar), Reportes (PDF).

---

### Analytics

**Para qué sirve.** Análisis más profundo: **rentabilidad por mesas**, **ingeniería de menú** (qué platos aportan más margen o volumen), **coste de personal** en relación con la actividad.

**Quién lo usa.** Administrador y director.

**Cuándo.** Reuniones semanales o mensuales de carta y precios.

**Cómo se hace.**

1. Abre **Analytics**.
2. Elige la pestaña que necesites (mesas, menú, personal).
3. Ajusta fechas y filtros.
4. Interpreta tablas y gráficos con el equipo para decidir carta o turnos.

**Errores frecuentes.** Esperar datos de rentabilidad por plato sin tener **recetas** y ventas enlazadas.

**Encaja con.** Recetas, Carta, Nóminas, Dashboard.

---

### Reportes

**Para qué sirve.** Descargar **documentos PDF**: ventas, inventario, cierre de caja, nóminas, cuadrante, APPCC, comparativas de proveedores, etc.

**Quién lo usa.** Administrador, director, jefe de sala y almacén (según informe).

**Cuándo.** Cierre de mes, auditoría interna, entrega a gestoría.

**Cómo se hace.**

1. Abre **Reportes**.
2. Elige pestaña (operativos, ventas, RRHH, proveedores y APPCC…).
3. Indica fechas o filtros.
4. Pulsa descargar; permite ventanas emergentes si el navegador lo pide.

**Encaja con.** Casi todos los módulos (son la “foto” exportada).

---

### Carta

**Para qué sirve.** El menú que ve el camarero en TPV: categorías, productos, precios, alérgenos, flags de cocina/barra/receta.

**Quién lo usa.** Administrador y director.

**Cuándo.** Alta de platos de temporada, cambios de precio, carta de vinos.

**Cómo se hace.**

1. Abre **Carta**.
2. Crea o ordena **categorías**.
3. Crea o edita **productos** con precio, IVA y alérgenos.
4. Marca si tiene **receta** para escandallo.
5. Guarda y prueba en una mesa de prueba en **Sala**.

**Errores frecuentes.** Cambiar precio solo en papel físico y olvidar **Carta**; platos que no llegan al KDS porque no están marcados para cocina o barra.

**Encaja con.** Recetas, TPV, KDS.

---

### Usuarios

**Para qué sirve.** Dar de alta compañeros: correo, contraseña, perfil, activar o desactivar acceso.

**Quién lo usa.** Solo **administrador** del local.

**Cuándo.** Altas, bajas, cambio de puesto.

**Cómo se hace.**

1. Abre **Usuarios**.
2. Nuevo usuario: nombre, correo, contraseña, perfil.
3. Edita filas existentes para cambiar perfil o desactivar sin borrar historial.

**Encaja con.** Empleados (misma persona puede tener ficha laboral aparte).

---

### Venta Live

**Para qué sirve.** Supervisar **ventas del día en curso**: tickets abiertos y cobrados, actividad del servicio. La pantalla **se actualiza sola cada cierto intervalo** (no hace falta refrescar constantemente).

**Quién lo usa.** Administrador, director, jefe de sala.

**Cuándo.** Servicios intensos, eventos, cuando el responsable no está en sala.

**Cómo se hace.**

1. Abre **Venta Live**.
2. Revisa tarjetas o listados.
3. Si hace falta actuar en una mesa, entra al TPV desde el enlace que ofrezca la pantalla.

**Encaja con.** Sala, Dashboard, Cierre de caja.

---

### Cierre de caja

**Para qué sirve.** **Resumen y cierre contable del día**: desglose por formas de pago, número de tickets, ticket medio, registro del cierre e impresión.

**Quién lo usa.** Administrador, director, jefe de sala.

**Cuándo.** Al final del turno o del día contable, cuando no habrá más cobros de ese día en ese local.

**Cómo se hace.**

1. Abre **Cierre de caja**.
2. Revisa la vista previa del día (si ya se cerró antes, lo indicará).
3. Compara efectivo físico con lo registrado si es vuestra política.
4. Confirma **cerrar caja**.
5. Imprime o guarda el resumen si lo necesitáis.

**Errores frecuentes.** Cerrar antes de cobrar todas las mesas abiertas; intentar cerrar dos veces el mismo día (el sistema avisa).

**Encaja con.** TPV, Reportes PDF de cierre, Dashboard.

---

### Inventario

**Para qué sirve.** Catálogo de **artículos de almacén**, stock actual, mínimos, movimientos (entrada, salida, ajuste), inventario físico, **SKU**.

**Quién lo usa.** Administrador, director, almacén, cocina (según menú).

**Cuándo.** Recepciones, consumos, recuentos semanales.

**Cómo se hace.**

1. Abre **Inventario**.
2. Consulta alertas de stock bajo.
3. Registra **movimientos** con motivo claro.
4. Crea artículos nuevos: nombre, unidad, coste; el **SKU** puede autocompletarse desde el nombre y editarse.
5. Usa inventario físico cuando hagáis recuento real.

**Errores frecuentes.** Unidades incoherentes (comprar en kilos y escandallar en gramos sin convertir); coste desactualizado.

**Encaja con.** Recetas, Mermas, FIFO, Facturas compra.

---

### Mermas

**Para qué sirve.** Registrar **pérdidas** (caducidad, rotura, error) para que el stock y los costes cuadren con la realidad.

**Quién lo usa.** Administrador, director, almacén, cocina.

**Cuándo.** Cada vez que tiráis producto imputable.

**Cómo se hace.**

1. Abre **Mermas**.
2. Nueva merma: artículo, cantidad, motivo.
3. Revisa listados por periodo para reuniones de cocina.

**Encaja con.** Inventario, APPCC (incidencias), Analytics de mermas si lo usáis.

---

### APPCC

**Para qué sirve.** **Autocontrol** en seguridad alimentaria: temperaturas, equipos, limpiezas, conformidad o incidencias.

**Quién lo usa.** Administrador, director, almacén, cocina.

**Cuándo.** Apertura, recepciones, cierre, según vuestro plan APPCC.

**Cómo se hace.**

1. Abre **APPCC**.
2. Mira resumen del día si está disponible.
3. Añade registros con valores y observaciones.
4. Revisa no conformidades.

**Encaja con.** Reportes APPCC, inspecciones sanitarias.

---

### Stock FIFO

**Para qué sirve.** Control por **lotes** con fecha de caducidad: entrar mercancía por lote, consumir **primero lo más antiguo** (FIFO), alertas de caducidad y valoración.

**Quién lo usa.** Administrador, director, almacén.

**Cuándo.** Productos perecederos o con trazabilidad por lote.

**Cómo se hace.**

1. Abre **Stock FIFO**.
2. Da de alta lotes al recibir mercancía.
3. Registra consumos al sacar a cocina o por merma.
4. Atiende alertas de caducidad próxima.

**Errores frecuentes.** Usar solo inventario global sin lotes cuando la inspección exige trazabilidad.

**Encaja con.** Inventario, Mermas, Recetas (coste por lote en escenarios avanzados).

---

### Proveedores

**Para qué sirve.** Directorio de **proveedores**: nombre, contacto, condiciones, estado activo.

**Quién lo usa.** Administrador, director, almacén, cocina (según menú).

**Cuándo.** Alta de nuevo suministrador, revisión anual de condiciones.

**Cómo se hace.**

1. Abre **Proveedores**.
2. Crea o edita fichas.
3. Desactiva los que ya no uséis.

**Encaja con.** Facturas compra, pedidos si los usáis.

---

### Facturas compra

**Para qué sirve.** Registrar **facturas de proveedor**, estado de pago, historial; opcionalmente **subir imagen** para rellenar campos asistidos (siempre **revisar** antes de guardar).

**Quién lo usa.** Administrador, director, almacén, cocina (según menú).

**Cuándo.** Al recibir factura; al pagar al proveedor.

**Cómo se hace.**

1. Abre **Facturas compra**.
2. Nueva factura: proveedor, número, fechas, importe, líneas si aplica.
3. Marca **pagada** cuando se haya pagado.
4. Lista de pendientes para tesorería.

**Encaja con.** Inventario (actualizar costes), Reportes de compras.

---

### Recetas

**Para qué sirve.** **Escandallos** de platos de carta: ingredientes, mermas, coste, semáforo, PVP sugerido, enlace al producto de carta. Desde aquí accedéis también a **Elaboraciones**.

**Quién lo usa.** Administrador, director, cocina.

**Cuándo.** Nuevo plato, cambio de proveedor, revisión de márgenes.

**Cómo se hace.**

1. Abre **Recetas**.
2. Crea receta nueva o abre una existente vinculada a un producto con “tiene receta” en Carta.
3. Añade ingredientes en tabla o importa desde hoja de cálculo.
4. Ajusta **porcentaje objetivo** de coste sobre venta si no usáis el 30 % por defecto.
5. Lee semáforo y PVP sugerido; ajusta **Carta** si procede.
6. Para bases (salsas, caldos), entra en **Elaboraciones** desde el enlace correspondiente.

**Errores frecuentes.** Receta sin producto en carta; ingredientes en unidad distinta a inventario.

**Encaja con.** Carta, Inventario, Gastos operativos (visión global, no PVP automático).

---

### Gastos operativos

**Para qué sirve.** Anotar **gastos fijos y operativos mensuales** del negocio: alquiler, suministros, marketing, tasas, partida de referencia de personal, etc. Muestra **total mensual** de gastos registrados.

**Quién lo usa.** Administrador, director, cocina (consulta según menú); edición sobre todo dirección.

**Cuándo.** Inicio de mes, cuando cambia un contrato o suministro.

**Cómo se hace.**

1. Abre **Gastos operativos**.
2. Añade concepto, categoría e importe mensual.
3. Usa enlaces a **Recetas**, **Elaboraciones** o **Nóminas** cuando el propio texto de la pantalla lo indique.
4. Recuerda: el coste de **ingredientes por plato** se gestiona en **Recetas**, no aquí.

**Encaja con.** Dashboard, Analytics, decisiones de precios a nivel local (criterio humano).

---

### Empleados

**Para qué sirve.** **Fichas laborales**: datos personales, contrato, salario, enlace opcional con usuario de acceso.

**Quién lo usa.** Administrador y director.

**Cuándo.** Altas, cambios de contrato, bajas.

**Cómo se hace.**

1. Abre **Empleados**.
2. Crea o edita fichas con campos obligatorios.
3. Coordina con **Usuarios** si la misma persona entra en HorecaSO.

**Encaja con.** Control Horario, Cuadrante, Nóminas.

---

### Control Horario

**Para qué sirve.** **Fichar** entrada y salida y consultar turnos registrados (obligación de registro horario en España desde la normativa vigente).

**Quién lo usa.** Administrador, director, jefe de sala, camarero, cocina, almacén.

**Cuándo.** Inicio y fin de turno; revisiones por dirección.

**Cómo se hace.**

1. Abre **Control Horario**.
2. Elige empleado si la pantalla lo pide según tu perfil.
3. Registra entrada o salida.
4. Revisa listado del día o periodo.

**Encaja con.** Cuadrante (planificado vs real), Nóminas.

---

### Cuadrante

**Para qué sirve.** **Planificar turnos** por semana y empleado.

**Quién lo usa.** Administrador, director, jefe de sala.

**Cuándo.** Semanalmente, antes de publicar horarios.

**Cómo se hace.**

1. Abre **Cuadrante**.
2. Elige semana.
3. Añade o modifica turnos según la interfaz (formulario o arrastre).
4. Comunica al equipo.

**Encaja con.** Control Horario, Reportes de cuadrante.

---

### Nóminas

**Para qué sirve.** **Calcular y consultar nóminas** con reglas orientadas a España: Seguridad Social del empleado, cuota patronal, IRPF según configuración, líquido a percibir.

**Quién lo usa.** Administrador y director.

**Cuándo.** Cierre de mes laboral.

**Cómo se hace.**

1. Abre **Nóminas**.
2. Selecciona empleado y mes.
3. Lanza cálculo si la pantalla lo permite.
4. Revisa detalle antes del pago real (transferencia, banco, asesor laboral).

**Nota.** El pago bancario puede hacerse fuera del programa; HorecaSO documenta y calcula.

**Encaja con.** Empleados, Gastos operativos (partida de referencia), Reportes PDF.

---

### Reservas

**Para qué sirve.** **Reservas** con fecha, hora, comensales, estado, mesa opcional; **lista de espera** cuando no hay mesa.

**Quién lo usa.** Administrador, director, jefe de sala.

**Cuándo.** Todo el día para servicios futuros y el día del servicio.

**Cómo se hace.**

1. Abre **Reservas**.
2. Crea reserva con datos del cliente.
3. Actualiza estado (confirmada, sentada, cancelada, no show…).
4. Gestiona lista de espera aparte de reservas con cita.

**Encaja con.** Clientes, Sala.

---

### Clientes

**Para qué sirve.** **Base de clientes**: contacto, visitas, gasto acumulado, **puntos de fidelización** si los usáis, historial de tickets.

**Quién lo usa.** Administrador, director, jefe de sala.

**Cuándo.** Reservas recurrentes, campañas, atención personalizada.

**Cómo se hace.**

1. Abre **Clientes**.
2. Busca o crea ficha.
3. Consulta historial al atender una reserva o en sala.

**Encaja con.** Reservas, TPV (asociación según vuestro uso).

---

### KDS

**Para qué sirve.** **Kitchen Display System**: pantalla de cocina y/o barra con comandas pendientes y estados por línea. Suele usarse en un **monitor fijo** en cocina.

**Quién lo usa.** Administrador, director, jefe de sala, camarero, cocina, barra.

**Cuándo.** Todo el servicio de comida y bebida elaborada.

**Cómo se hace.**

1. Abre **KDS** (a menudo en pantalla completa en cocina).
2. Filtra mentalmente por estación: cocina ve lo enviado a cocina; barra lo de barra.
3. Cambia estado de cada línea hasta “listo” o equivalente.
4. Sala retira o sirve cuando ve el estado.

**Errores frecuentes.** Producto en carta sin envío a cocina/barra; KDS vacío con mesas llenas por no haber enviado líneas.

**Encaja con.** Sala/TPV, Carta.

---

## 8. Calidad, seguridad alimentaria y caducidades

**APPCC** demuestra ante inspección que registráis controles habituales (temperaturas, limpieza, incidencias). No sustituye vuestro plan escrito APPCC, pero centraliza el registro diario.

**Stock FIFO** reduce el riesgo de servir producto caducado al forzar consumo ordenado por fecha de lote.

**Mermas** explican diferencias entre stock teórico y real; sin mermas, el escandallo parece más barato de lo que es.

En conjunto, estos módulos protegen **salud del cliente**, **multas** y **márgenes reales**.

---

## 9. Personas, horarios y nóminas en España

HorecaSO incluye bloques pensados para la **realidad laboral española**:

- **Control horario**: registro de jornada (entrada/salida).
- **Cuadrante**: planificación previa.
- **Nóminas**: devengos y deducciones habituales (SS empleado, SS empresa, IRPF configurado, líquido).

Conceptos en lenguaje claro:

- **Seguridad Social (empleado)**: parte de la nómina que retiene el trabajador para cotizar.
- **Cuota patronal**: coste de SS que paga la empresa además del bruto.
- **IRPF**: retención a cuenta del impuesto sobre la renta según datos del empleado.

El programa **calcula y documenta**; la **transferencia bancaria** y el cumplimiento de convenio los gestionáis con vuestro asesor laboral.

---

## 10. Informes para dirección y gestoría

| Herramienta | Qué es | Cuándo usarla |
|-------------|--------|----------------|
| **Dashboard** | Foto rápida del día | Gestión diaria |
| **Venta Live** | Servicio en curso | Picos de servicio |
| **Analytics** | Tendencias y rentabilidad | Decisiones de carta y turnos |
| **Reportes PDF** | Documentos formales | Gestoría, auditoría, archivo |

Llevad a la gestoría los PDF de **ventas**, **cierre de caja** y, si aplica, **nóminas** y **compras** según acordéis con el asesor. También podéis exportar el listado de **registros Verifactu** (archivo de hoja de cálculo tipo CSV) y el **resumen trimestral de IVA** de ayuda a gestoría (no sustituye el modelo oficial 303).

El envío habitual al contador es: descargar PDF o CSV → correo electrónico o carpeta compartida → el asesor prepara las declaraciones. HorecaSO **no presenta impuestos** por vosotros.

---

## 11. Contrato de uso, gestoría y Verifactu (piloto y venta)

Este capítulo aclara la parte administrativa: qué papel firmáis, cómo habláis con el contador y qué significa Verifactu **hoy**, sin confundirlo con un sello de Hacienda.

### Contrato de uso del servicio (SaaS)

HorecaSO se ofrece como **servicio en la nube**: entráis con usuario y contraseña; el proveedor mantiene el programa y da acceso según el acuerdo.

No es lo mismo que “os regalan el código del programa”. Lo que necesitáis (y lo que el proveedor debe daros) es un **contrato o condiciones de uso del servicio**:

- Duración del piloto o de la suscripción.
- Qué módulos están incluidos.
- Que los **datos del restaurante son vuestros** y están separados de otros locales.
- Que **vosotros** sois responsables de las declaraciones fiscales con vuestra gestoría.
- Qué hace el sistema al cobrar (registro interno) y qué **aún no** hace (envío automático completo a la Agencia Tributaria).
- Confidencialidad, soporte y cómo terminar el acuerdo.

Para un piloto de varios restaurantes conviene un **acuerdo escrito corto** (firmado o aceptado por correo). Cuando el servicio se cobre de forma habitual, las mismas ideas pasan a ser las **condiciones de uso** del producto. La plantilla de referencia del proyecto está en el documento **Acuerdo de piloto HorecaSO** (`docs/ACUERDO_PILOTO_HORECASO.md`).

### Cómo pasar las ventas al contador

1. Al final del día (o del turno): **Cierre de caja** y, si hace falta, PDF desde **Reportes**.
2. Al cierre de mes o trimestre: PDF de ventas / compras / nóminas según lo pida el asesor.
3. Si el asesor pide detalle de tickets fiscales internos: exportar **registros Verifactu** (CSV) y, si está disponible, el **resumen de IVA por trimestre** (ayuda a gestoría).
4. Enviar esos archivos por el canal que uséis (correo, Drive, etc.).

El contador sigue presentando el **modelo 303** y el resto de obligaciones en nombre del negocio (o con vuestra firma), igual que con cualquier otra caja.

### Verifactu: tres capas que no hay que mezclar

| Capa | Qué es | Qué implica en la práctica |
|------|--------|----------------------------|
| **A. Cobrar y declarar como siempre** | Tickets, IVA, libros, gestoría | Obligatoriedad de siempre. El piloto no la cambia. |
| **B. Reglamento de sistemas de facturación (conocido como Verifactu)** | Cómo deben comportarse los programas de facturación (registros íntegros, etc.) | Hacienda ha anunciado aplazar obligaciones pendientes hacia **octubre de 2028** (alineación con factura electrónica; confirmar siempre en normativa vigente / asesor). Hasta la fecha de obligación aplicable, el periodo previo sirve de **pruebas**. |
| **C. “Estar acreditado por Hacienda”** | Idea confusa: no es un carnet que Hacienda entrega al restaurante para usar el piloto | Cuando la norma sea obligatoria, el **sistema** debe cumplir requisitos y, en la modalidad de remisión, enviar registros a la AEAT. Eso es trabajo de producto y calendario legal, no un trámite de mañana para tres locales. |

### Qué hace HorecaSO hoy (honesto)

Al **cobrar por completo** una cuenta:

- Se crea un **registro fiscal interno** (número de serie, importes, huella encadenada).
- Ese registro **no se borra ni se edita** en el sistema.
- Podéis **listarlo, comprobar la cadena y exportarlo**.

Eso ordena las ventas y prepara el camino Verifactu. **No significa** que cada cobro ya se esté enviando automáticamente a la Agencia Tributaria, ni que el programa esté vendido como “homologado Verifactu al 100 %” en todas las modalidades oficiales.

### Frase recomendada para el piloto

*“Hoy facturáis y cobráis con registro interno inalterable; vuestra gestoría declara como hasta ahora. Cuando la norma sea obligatoria y el producto cierre el envío a la AEAT o los requisitos finales, el mismo HorecaSO evolucionará. Mientras, no presentamos impuestos por vosotros.”*

### Qué falta en roadmap (sin tecnicismos)

- Remisión automática de cada registro a la Agencia Tributaria (modalidad de envío en línea), cuando el producto y el calendario legal lo exijan.
- Completar cualquier requisito extra de la modalidad sin remisión continua, si se elige ese camino.

Hasta entonces: operad con transparencia, pasad cierres al contador y no prometáis “ya estamos acreditados Verifactu 2028”.

---

## 12. Preguntas que suele hacer un cliente antes de contratar

**¿Puedo usarlo en el móvil?**  
Sí. Está pensado para pantallas pequeñas y grandes; el menú principal son botones grandes fáciles de tocar.

**¿Varios empleados a la vez?**  
Sí. Cada uno con su usuario; cocina, sala y dirección pueden trabajar en paralelo.

**¿El precio sugerido del plato incluye sueldos y alquiler?**  
No automáticamente. Incluye **ingredientes** según vuestro **porcentaje objetivo de coste sobre venta**. Gastos fijos y nóminas se gestionan en sus pantallas para visión global.

**¿Qué pasa si no veo un módulo?**  
Perfil insuficiente o módulo no contratado en vuestro plan. Hablad con el administrador o con HorecaSO.

**¿Sustituye a mi gestoría o asesor fiscal?**  
No. Ordena ventas y deja registro interno al cobrar; las declaraciones y criterios fiscales los confirma vuestro asesor.

**¿Puedo dividir la cuenta entre varios pagos?**  
Sí, hasta cubrir el total del ticket.

**¿Qué es Verifactu en una frase?**  
Normativa sobre sistemas de facturación; en HorecaSO, cada cobro completo deja un **registro interno inalterable** (preparación). El envío automático completo a Hacienda es evolución del producto según calendario legal.

**¿Necesito firmar algo para un piloto?**  
Sí. Un **acuerdo de uso del servicio** (corto) deja claras fechas, datos, responsabilidades fiscales y qué hace o no el sistema.

**¿Necesito Excel para las recetas?**  
No es obligatorio; podéis editar en tabla o importar Excel/CSV si ya tenéis escandallos hechos.

**¿Qué es el SKU?**  
Código corto interno para identificar un artículo de almacén; opcional pero recomendable con muchos productos parecidos.

---

## 13. Glosario

**Administrador (del local)** — Perfil con acceso amplio; gestiona usuarios del establecimiento.

**Alérgeno** — Sustancia que puede provocar alergia; debe informarse en carta.

**Analytics** — Pantalla de análisis avanzado (mesas, menú, personal).

**APPCC** — Autocontrol en seguridad alimentaria (registros de temperatura, limpieza, incidencias).

**Barra** — Perfil y estación KDS para bebidas y elaboración en barra.

**Camarero** — Perfil de sala y caja de mesa.

**Carta** — Productos y precios que salen en el TPV.

**Cierre de caja** — Resumen y cierre del día de ventas por formas de pago.

**Cliente (ficha)** — Persona en el módulo Clientes con historial y fidelización.

**Contrato de uso / SaaS** — Acuerdo por el que el restaurante usa HorecaSO como servicio en la nube (acceso, módulos, soporte), sin adquirir la propiedad del programa.

**Cocina** — Perfil y estación KDS de elaboración en cocina.

**Comanda** — Conjunto de líneas de pedido que cocina o barra deben preparar.

**Control horario** — Fichajes de entrada y salida.

**Cuadrante** — Planificación de turnos.

**Dashboard** — Resumen de indicadores para dirección.

**Director** — Perfil de gestión del local.

**Elaboración** — Preparación intermedia (salsa, caldo) con coste pero sin PVP en carta.

**Empleado** — Ficha laboral; puede enlazarse a un usuario.

**Escandallo** — Mismo concepto que receta de coste: ingredientes y coste del plato.

**FIFO** — “Primero en entrar, primero en salir”; método de consumo por lotes y caducidad.

**Food cost** — Porcentaje que representa el coste de ingredientes sobre el precio de venta (objetivo editable, por defecto 30 %).

**Gastos operativos** — Gastos fijos mensuales del local (alquiler, suministros, etc.).

**Ingeniería de menú** — Análisis en Analytics sobre qué platos rinden más.

**Inventario** — Artículos de almacén, stock y movimientos.

**Jefe de sala** — Perfil que coordina sala, reservas y supervisión.

**KDS** — Pantalla de cocina/barra con pedidos en tiempo de servicio.

**Lista de espera** — Clientes sin reserva esperando mesa.

**Merma** — Pérdida de producto registrada (caducidad, rotura, error).

**Nómina** — Liquidación salarial mensual del empleado.

**PVP** — Precio de venta al público.

**PVP sugerido** — Precio orientativo según coste de ingredientes y porcentaje objetivo de coste sobre venta.

**Proveedor** — Empresa de la que compráis mercancía.

**Receta** — Escandallo ligado a un plato de carta.

**Registro Verifactu** — Registro fiscal interno inalterable al cobrar la cuenta por completo (número de serie, importes, huella). Preparación normativa; no equivale por sí solo al envío automático a la AEAT.

**Reserva** — Cita con fecha y hora para comensales.

**Semáforo (receta)** — Verde / amarillo / rojo según margen sobre coste de ingredientes.

**SKU** — Código interno opcional del artículo de inventario.

**Ticket** — Cuenta de una mesa con líneas y total; cobrada cuando los pagos cubren el total.

**TPV / caja de mesa** — Pantalla de pedido y cobro abierta desde una mesa en Sala.

**Usuario** — Cuenta de acceso (correo y contraseña).

**Venta Live** — Supervisión de ventas del día en curso.

**Zona** — Agrupación de mesas (interior, terraza, barra…).

---

## 14. Nota sobre planes y evolución del producto

Este manual describe HorecaSO **tal como está hoy** en producto: pantallas, nombres de módulos y reglas de precio sugerido, semáforo, cierre de caja y registro fiscal interno al cobrar.

Según vuestro **contrato de suscripción o acuerdo de piloto**, algunos módulos (reservas, nóminas, ayuda en facturas de compra, predicciones, etc.) pueden estar activos o no. Si algo no aparece en el menú principal, confirmad con vuestro contacto comercial o administrador.

El producto evoluciona: nuevas funciones (por ejemplo conectar gastos fijos al cálculo de precios por plato, o el envío de registros a la Agencia Tributaria cuando el calendario legal lo exija) se anunciarán en actualizaciones; hasta entonces, usad **Recetas** para lo variable, **Gastos operativos** para la foto mensual del local, y vuestra **gestoría** para declarar.

Para una **referencia rápida por pantalla** (más corta, orientada a quien ya usa el día a día), consultad también el documento **Manual de usuario** en la misma carpeta de documentación del proyecto. Para el **acuerdo escrito del piloto**, consultad **Acuerdo de piloto HorecaSO**.

---

*HorecaSO — Manual para el cliente. Redactado para formación comercial y onboarding de equipos hostelero.*
