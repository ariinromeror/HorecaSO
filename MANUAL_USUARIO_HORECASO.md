# HorecaSO — Manual de usuario

## ¿Qué es HorecaSO?

HorecaSO es una aplicación web para gestionar tu restaurante desde el móvil o el ordenador. Te ayuda a tomar comandas, cobrar en sala, coordinar cocina y barra, controlar existencias, personal, reservas y la compra a proveedores, y a sacar informes útiles para tomar decisiones.

Está pensada para que varias personas trabajen a la vez: sala, cocina, despensa y dirección comparten la misma información al instante.

---

## ¿Quién puede usar HorecaSO?

En el sistema existen distintos **perfiles**. Cada uno ve un menú acorde con su trabajo. Lo que ves depende de cómo te haya dado de alta el responsable del local.

**Administrador del local**  
Tienes acceso amplio: carta, productos, usuarios del local, sala, informes y la mayoría de módulos de gestión. Eres quien suele configurar el día a día del programa.

**Director**  
Compartes con el administrador gran parte de la gestión: carta, recetas y costes, inventario, proveedores, empleados, nóminas, reservas, clientes, informes y análisis. No sueles tener la pantalla exclusiva de “usuarios del local” (eso queda para el administrador).

**Jefe de sala**  
Organizas la sala: mesas, reservas, clientes, cuadrante, informes que el menú te muestre, y la pantalla de cocina y barra (KDS) si la usáis. Puedes usar Venta Live para ver la actividad del servicio.

**Camarero**  
Trabajas sobre todo con la sala, el TPV (caja de mesa) y, si aplica, el KDS. Puedes fichar al entrar si tu ficha está enlazada.

**Cocina**  
Ves el KDS con los pedidos que van a cocina, y puedes entrar en inventario, mermas, APPCC, proveedores y recetas si el menú te lo permite.

**Barra**  
Similar a cocina en el KDS, orientado a bebidas y preparación en barra cuando así está configurado el local.

**Almacén**  
Te centras en inventario, mermas, APPCC, stock FIFO, proveedores y facturas de compra, y en fichar si procede.

**Equipo de plataforma (perfil especial)**  
Si tu cuenta es de soporte o administración central de HorecaSO, verás un panel aparte para dar de alta o revisar locales y consultar registros de actividad. No es el día a día de un restaurante concreto.

En el programa, el **“rol”** es la etiqueta de tu perfil: determina qué entradas del menú ves y qué pantallas te dejan abrir.

---

## Cómo entrar a HorecaSO

1. Abre la dirección web que te haya indicado tu proveedor o el administrador (en el navegador, como cualquier página).
2. Escribe tu **correo electrónico** y tu **contraseña**.
3. Pulsa el botón para entrar.

Si los datos no son correctos, verás un mensaje de error. Comprueba mayúsculas y espacios; si sigue fallando, pide al administrador del local que revise tu usuario.

Algunos perfiles (sala, cocina, barra, almacén) pueden **registrar la entrada laboral automáticamente** al iniciar sesión, si tu usuario está vinculado a una ficha de empleado y así lo tenéis configurado.

Para **cerrar sesión**, usa la opción de salir en el menú lateral (icono de puerta o “Cerrar sesión”). Así evitas que otra persona use tu cuenta en ese dispositivo.

Puedes cambiar entre **modo claro y oscuro** con el botón de sol o luna, según aparezca en tu pantalla.

---

## Módulos — Qué puedes hacer

Cada apartado siguiente existe en la aplicación tal como está montada hoy: pantalla en el menú y funciones enlazadas al servidor. Si algo no aparece en tu menú, es que tu perfil no incluye ese módulo.

### 🍽️ Sala — Mesas

- **Para qué sirve:** Ver el plano de mesas del local y abrir la caja de cada una.
- **Quién lo usa:** En el menú suele aparecer a administrador, director, jefe de sala y camarero. Cualquier usuario con sesión puede abrir la pantalla si conoce la ruta, pero el menú está pensado para sala.
- **Cómo se usa:**
  1. Entra en **Sala** desde el menú.
  2. Revisa la leyenda de colores si la hay (libre, ocupada, reservada).
  3. Toca o haz clic en una mesa para abrir el TPV de esa mesa.
  4. Si tu perfil lo permite, puedes marcar una mesa como libre desde la tarjeta de la mesa cuando corresponda.

### 💳 Caja de mesa (TPV)

- **Para qué sirve:** Crear el pedido de una mesa, añadir platos y bebidas, aplicar cobros o pagos parciales y cerrar la cuenta.
- **Quién lo usa:** Cualquier usuario con sesión puede abrir una caja si entra desde una mesa; en la práctica la usan camareros y quien cobra en sala.
- **Cómo se usa:**
  1. Desde **Sala**, abre una mesa (se abre la caja asociada).
  2. Añade productos desde la carta del TPV y ajusta cantidades.
  3. Revisa el total y los pagos si dividís la cuenta.
  4. Confirma el cobro con el método que elija el cliente.
  5. Cuando termine el servicio en esa mesa, deja la mesa lista para el siguiente cliente según el procedimiento del local.

### 🔔 Cocina y barra (KDS)

- **Para qué sirve:** Ver los pedidos que deben prepararse en cocina o en barra y marcar en qué estado van (pendiente, en curso, listo, etc.).
- **Quién lo usa:** Administrador, director, jefe de sala, camarero, cocina y barra (la aplicación solo deja entrar a estos perfiles en esta pantalla).
- **Cómo se usa:**
  1. Abre **KDS** desde el menú.
  2. Revisa los tickets o comandas agrupados; según tu perfil verás solo cocina, solo barra o todo.
  3. Cambia el estado de cada línea con los botones que indique la pantalla.
  4. Cuando un plato esté servido o terminado, marca el estado final para que sala sepa que puede recoger o servir.

### ⚙️ Gestión de sala

- **Para qué sirve:** Crear, editar o eliminar mesas y organizar el plano del local.
- **Quién lo usa:** Solo administrador, director y jefe de sala.
- **Cómo se usa:**
  1. Entra en **Gestión Sala** desde el menú.
  2. Crea o edita mesas con número, zona, capacidad y forma si aplica.
  3. Guarda los cambios y comprueba en **Sala** que el plano cuadra con la realidad.

### 📊 Panel de resumen (Dashboard)

- **Para qué sirve:** Ver indicadores del día: ventas, tickets, cierre aproximado y datos clave para dirección.
- **Quién lo usa:** Cualquier usuario con sesión puede abrir la pantalla; en el menú suele mostrarse a administrador y director.
- **Cómo se usa:**
  1. Abre **Dashboard**.
  2. Lee los bloques de resumen (ventas del día, ticket medio, etc.).
  3. Si hay selector de fecha para el cierre del día, elige el día que quieras consultar.

### 📈 Analytics (análisis avanzado)

- **Para qué sirve:** Profundizar en rentabilidad por mesas, “ingeniería de menú” (qué platos rinden más o menos) y coste de personal.
- **Quién lo usa:** La pantalla está pensada para **administrador y director**. Si entras con otro perfil, la propia aplicación te puede devolver a la sala.
- **Cómo se usa:**
  1. Abre **Analytics**.
  2. Elige la pestaña: Rentabilidad mesas, Ingeniería menú o Coste personal.
  3. Ajusta filtros (fechas, zonas, etc.) según lo que muestre cada bloque.
  4. Interpreta tablas y gráficos con tu equipo para decidir precios o carta.

### ⚡ Venta Live

- **Para qué sirve:** Ver de un vistazo los tickets del día y el estado del servicio en tiempo casi real (se actualiza solo de forma periódica).
- **Quién lo usa:** En el menú aparece a administrador, director y jefe de sala; la pantalla acepta cualquier usuario con sesión.
- **Cómo se usa:**
  1. Entra en **Venta Live**.
  2. Revisa tarjetas o tablas con tickets abiertos o cobrados del día.
  3. Si necesitas actuar en una mesa concreta, abre su TPV desde el enlace o botón que ofrezca la pantalla.

### 📋 Carta y productos

- **Para qué sirve:** Gestionar categorías, platos y bebidas que luego salen en el TPV; marcar alérgenos en los productos.
- **Quién lo usa:** Administrador y director.
- **Cómo se usa:**
  1. Abre **Carta** en el menú.
  2. Crea o edita **categorías** para ordenar el menú.
  3. Crea o edita **productos** con nombre, precio y datos que pida el formulario.
  4. Asocia **alérgenos** a cada producto cuando la ley o tu protocolo lo exijan.
  5. Guarda y comprueba en el TPV que los cambios se ven como esperas.

### 👤 Usuarios del local

- **Para qué sirve:** Dar de alta compañeros con correo y contraseña, asignarles perfil (camarero, cocina, etc.) y, si aplica, un local o zona dentro del negocio; activar o desactivar cuentas.
- **Quién lo usa:** Solo el **administrador** del local.
- **Cómo se usa:**
  1. Entra en **Usuarios** desde el menú.
  2. Pulsa **Nuevo usuario**, rellena nombre, correo, contraseña y perfil.
  3. Si tenéis varias zonas de servicio en el sistema, elige una en el desplegable o déjalo sin asignar.
  4. Para cambiar datos de alguien, toca su fila en la tabla, edita y guarda; allí puedes activar o desactivar la cuenta sin borrarla.

### 🧑‍🍳 Recetas y costes

- **Para qué sirve:** Definir recetas ligadas a platos, ingredientes y costes aproximados para ver márgenes.
- **Quién lo usa:** Administrador, director y cocina.
- **Cómo se usa:**
  1. Abre **Recetas y Costes**.
  2. Crea una **nueva receta** o abre una existente.
  3. Añade ingredientes desde el inventario y cantidades.
  4. Revisa el coste calculado y el semáforo o avisos si los hay.
  5. Ajusta rendimientos o instrucciones según vuestra cocina.

### 📦 Inventario

- **Para qué sirve:** Llevar artículos de almacén, stock, alertas, movimientos de entrada y salida e inventarios físicos.
- **Quién lo usa:** Solo administrador, director, almacén y cocina (la aplicación bloquea a otros perfiles).
- **Cómo se usa:**
  1. Entra en **Inventario**.
  2. Consulta la tabla de artículos y las alertas de stock bajo.
  3. Registra **movimientos** (entradas, salidas, ajustes) con el formulario.
  4. Cuando hagas un recuento real, usa la opción de **inventario físico** si está disponible.
  5. Crea artículos nuevos cuando incorpores productos nuevos al almacén.

### 🗑️ Mermas

- **Para qué sirve:** Registrar producto retirado por caducidad, rotura, error de elaboración u otras causas, para cuadrar stock y costes.
- **Quién lo usa:** Mismo criterio que inventario: administrador, director, almacén y cocina.
- **Cómo se usa:**
  1. Abre **Mermas** desde el menú.
  2. Elige periodo o filtros si la pantalla los tiene.
  3. Registra una nueva merma indicando artículo, cantidad y motivo según el formulario.
  4. Revisa el listado para auditorías internas.

### ✅ APPCC

- **Para qué sirve:** Registrar controles de autocontrol alimentario (temperaturas, limpiezas, incidencias) y ver el resumen del día.
- **Quién lo usa:** En el menú: administrador, director, almacén y cocina; la pantalla acepta cualquier usuario con sesión.
- **Cómo se usa:**
  1. Entra en **APPCC**.
  2. Consulta el **resumen del día** si está visible.
  3. Añade **registros** nuevos (temperatura, revisión, etc.) según los campos del formulario.
  4. Filtra por fechas o revisa incidencias “no conformes” si hay apartado dedicado.

### 📚 Stock FIFO

- **Para qué sirve:** Gestionar lotes con fecha de caducidad, consumir stock respetando lo que entra primero (FIFO) y ver alertas de caducidad y valoración.
- **Quién lo usa:** En el menú: administrador, director y almacén.
- **Cómo se usa:**
  1. Abre **Stock FIFO**.
  2. Revisa **lotes** activos y alertas de caducidad.
  3. Da de alta **lotes nuevos** con cantidad y fechas que pida el formulario.
  4. Registra **consumos** cuando sacáis mercancía para cocina o mermas.
  5. Consulta la valoración de stock si vuestra pantalla la muestra.

### 🚚 Proveedores

- **Para qué sirve:** Mantener la lista de proveedores y sus datos de contacto y pedidos.
- **Quién lo usa:** Administrador, director, almacén y cocina.
- **Cómo se usa:**
  1. Entra en **Proveedores**.
  2. Crea o edita una ficha de proveedor.
  3. Desactiva proveedores que ya no uséis si la opción existe.
  4. Abre el detalle para ver historial o notas si la pantalla lo incluye.

### 🧾 Facturas de compra

- **Para qué sirve:** Registrar facturas de proveedor, marcarlas como pagadas y, si lo usáis, subir imagen para rellenar datos con ayuda automática (lectura inteligente).
- **Quién lo usa:** Mismo grupo que proveedores.
- **Cómo se usa:**
  1. Abre **Facturas compra** desde el menú.
  2. Crea una factura nueva rellenando importe, proveedor y fechas.
  3. Si hay **escaneo o foto**, súbela según las instrucciones en pantalla y revisa siempre el resultado antes de guardar.
  4. Marca como **pagada** cuando se haya realizado el pago.
  5. Consulta el listado de pendientes de pago si lo necesitas para tesorería.

### 👥 Empleados

- **Para qué sirve:** Fichas de personal vinculadas al local: datos laborales y conexión con usuario de acceso si aplica.
- **Quién lo usa:** En el menú, administrador y director; la ruta no tiene bloqueo extra en la aplicación, pero es responsabilidad del negocio quién entra aquí.
- **Cómo se usa:**
  1. Abre **Empleados**.
  2. Crea un empleado nuevo o edita uno existente.
  3. Rellena los campos obligatorios (nombre, puesto, fechas, etc.).
  4. Guarda y coordina con **Usuarios del local** si la misma persona debe entrar en el programa.

### ⏱️ Control horario

- **Para qué sirve:** Fichar entrada y salida y ver turnos registrados.
- **Quién lo usa:** En el menú: administrador, director, jefe de sala, camarero, cocina y almacén.
- **Cómo se usa:**
  1. Entra en **Control Horario**.
  2. Elige empleado si la pantalla lo pide (según tu perfil).
  3. Pulsa **entrada** o **salida** según corresponda.
  4. Revisa el listado de turnos del día o del periodo seleccionado.

### 📅 Cuadrante

- **Para qué sirve:** Planificar turnos de trabajo por fechas y empleados.
- **Quién lo usa:** Administrador, director y jefe de sala.
- **Cómo se usa:**
  1. Abre **Cuadrante**.
  2. Elige semana o mes según la vista.
  3. Añade o edita turnos arrastrando o con formularios, según diseño de la pantalla.
  4. Guarda los cambios y avisa al equipo.

### 💶 Nóminas

- **Para qué sirve:** Calcular o consultar nóminas por empleado y ver detalles.
- **Quién lo usa:** En el menú, administrador y director.
- **Cómo se usa:**
  1. Entra en **Nóminas**.
  2. Selecciona empleado y periodo.
  3. Lanza el **cálculo** si la pantalla lo permite.
  4. Abre el **detalle** para revisar conceptos antes de pagar fuera del programa.

### 📆 Reservas y lista de espera

- **Para qué sirve:** Gestionar reservas con fecha, hora y estado, y anotar personas en lista de espera cuando el local está lleno.
- **Quién lo usa:** Administrador, director y jefe de sala en el menú.
- **Cómo se usa:**
  1. Abre **Reservas**.
  2. Crea una **reserva nueva** con datos del cliente y mesa o comensales.
  3. Cambia el **estado** (confirmada, cancelada, completada, etc.) según evolucione el día.
  4. En **lista de espera**, añade nombre y contacto y actualiza el estado cuando haya mesa.
  5. Revisa el listado del día para coordinar con sala.

### 🤝 Clientes

- **Para qué sirve:** Ficha de clientes habituales, historial de visitas y puntos o fidelización si lo usáis.
- **Quién lo usa:** Administrador, director y jefe de sala en el menú.
- **Cómo se usa:**
  1. Entra en **Clientes**.
  2. Crea o busca un cliente.
  3. Edita datos de contacto y preferencias.
  4. Abre el **historial** para ver tickets o visitas recientes.
  5. Ajusta **puntos** u ofertas si vuestra pantalla lo incluye.

### 📥 Reportes (documentos PDF)

- **Para qué sirve:** Descargar informes en PDF: ventas, inventario, cierre de caja, nóminas, cuadrante, APPCC, comparativas de proveedores, etc.
- **Quién lo usa:** En el menú: administrador, director, jefe de sala y almacén (según pestaña, algunos informes pueden necesitar datos que solo tiene dirección).
- **Cómo se usa:**
  1. Abre **Reportes**.
  2. Elige la pestaña: Operativos, Ventas, RRHH o Proveedores y APPCC.
  3. Rellena fecha o filtros que pida cada informe.
  4. Pulsa **descargar** o el botón equivalente; se abrirá o guardará un PDF (si el navegador bloquea ventanas nuevas, permítelas para este sitio).

### 🏢 Panel de plataforma (solo equipo central)

- **Para qué sirve:** Ver la lista de **restaurantes dados de alta** en HorecaSO, entrar en el detalle de cada uno (zonas, usuarios activos), activar o desactivar un local, y consultar un **registro de actividad** de cambios importantes hechos desde este panel.
- **Quién lo usa:** Solo cuentas del **equipo de plataforma** (no es una pantalla del día a día del camarero o del director de un solo local).
- **Cómo se usa:**
  1. Tras iniciar sesión, usa el menú lateral del panel de plataforma (no el menú habitual del restaurante).
  2. En **Restaurantes en plataforma**, recorre la tabla y entra en un local para ver su detalle.
  3. Si debes impedir que un local acceda temporalmente, usa la acción de activar o desactivar y confirma en el cuadro de diálogo.
  4. En **Registro de actividad**, filtra por fechas si hace falta y revisa quién hizo qué cambio.

---

## Preguntas frecuentes

**No veo una opción en el menú que sí ve mi compañero.**  
Tu perfil es distinto. Pide al administrador del local que revise tu rol o que te cree un usuario con el perfil adecuado.

**Me dice que el correo o la contraseña no son válidos.**  
Revisa mayúsculas y que no haya espacios al final del correo. Si sigue igual, el administrador debe comprobar que tu usuario esté activo.

**He cerrado el navegador sin cerrar sesión.**  
En un ordenador compartido, vuelve a entrar y cierra sesión explícitamente. En tu móvil personal el riesgo es menor, pero es buena costumbre salir al terminar.

**El KDS no muestra pedidos.**  
Puede que los platos no estén marcados para cocina o barra en la carta, o que no haya tickets abiertos con líneas pendientes. Revisa con dirección la configuración de productos.

**¿Qué diferencia hay entre “ticket” y “mesa”?**  
La **mesa** es el sitio en sala. El **ticket** (o cuenta) es el pedido abierto asociado a esa mesa con líneas y total.

**¿Puedo usar HorecaSO en el móvil?**  
Sí; la interfaz está pensada para pantallas pequeñas y grandes. En el móvil verás un menú tipo “hamburguesa” en muchas pantallas.

**Inventario y Stock FIFO: ¿son lo mismo?**  
No. **Inventario** es el control general de artículos y movimientos. **FIFO** se centra en **lotes** con caducidad y en consumir primero lo más antiguo.

**¿Qué es “escaneo” en facturas de compra?**  
Es subir una foto o archivo de la factura para que el programa proponga datos automáticamente; **debes revisar y corregir** antes de dar por buena la factura.

**Lista de espera y reserva: ¿cuál uso?**  
**Reserva** es cita con fecha y hora. **Lista de espera** es cuando el cliente espera hueco sin haber reservado antes.

**Me ha fichado solo al entrar.**  
Si tu usuario está enlazado a empleado y tu perfil es de sala, cocina, barra o almacén, el sistema puede registrar la entrada al iniciar sesión. Si no quieres ese comportimiento, coméntalo con dirección.

**Los PDF no se abren.**  
Mira si el navegador bloquea ventanas emergentes y vuelve a intentar. Comprueba también que tengas un visor de PDF.

**Soy del equipo central y al entrar veo el restaurante vacío en el menú.**  
Tu menú muestra solo enlaces del panel de plataforma. Abre “Restaurantes en plataforma” desde ahí, no esperes ver carta ni mesas como un local normal.

**¿Puedo cambiar mi correo yo mismo?**  
En la pantalla de **Usuarios del local**, el administrador gestiona altas; si necesitas cambiar correo, habla con él.

**¿Dónde configuro precios y platos?**  
En **Carta**, no en el TPV. Los cambios de carta los hacen normalmente administrador o director.

---

## Glosario

**Administrador (del local)** — Perfil con acceso amplio a configuración, carta y usuarios del establecimiento.

**Alérgeno** — Sustancia que puede causar alergia alimentaria; en la carta se asocia a cada plato para informar al cliente.

**Analytics** — En esta aplicación, nombre de la pantalla de **análisis avanzado** (rentabilidad por mesas, platos y coste de personal).

**APPCC** — Sistema de autocontrol en seguridad alimentaria: registros de temperaturas, limpiezas e incidencias.

**Barra** — Perfil de quien prepara bebidas y pedidos en la zona de barra; en el KDS suele ver solo lo que corresponde a barra.

**Camarero** — Perfil de sala: mesas, TPV y, si aplica, KDS.

**Categoría** — Grupo en el menú (entrantes, postres, etc.) que ordena los productos en carta y TPV.

**Cliente (ficha)** — Persona o empresa que guardáis en el módulo de clientes para historial y fidelización.

**Cocina** — Perfil de elaboración en cocina; en el KDS ve lo enviado a cocina.

**Comanda** — Conjunto de líneas de un pedido que cocina o barra deben preparar; en la pantalla KDS aparece agrupado por ticket o mesa.

**Control horario** — Registro de horas de entrada y salida del personal.

**Cuadrante** — Planificación de turnos por días y empleados.

**Dashboard** — Pantalla de **resumen** con indicadores del día o periodo.

**Director** — Perfil de gestión del local, similar al administrador en muchos módulos pero sin la gestión exclusiva de usuarios del sistema en el menú habitual.

**Empleado** — Ficha laboral en el módulo de personal; puede estar enlazada a un usuario que entra en HorecaSO.

**FIFO** — Método “el primero en entrar es el primero en salir”: en **Stock FIFO** sirve para gastar primero los lotes más antiguos y respetar caducidades.

**Ingeniería de menú** — Apartado dentro de Analytics que ayuda a ver qué platos aportan más o menos margen o interés.

**Inventario** — Control de artículos de almacén, existencias y movimientos.

**Jefe de sala** — Perfil que coordina sala, reservas y suele tener más visibilidad operativa que un camarero.

**KDS** — Pantalla de **cocina y barra** donde se ven los pedidos pendientes y su estado (suele colgarse en monitor en cocina).

**Lista de espera** — Cola de clientes sin reserva previa esperando mesa.

**Local / zona de servicio** — Dentro del mismo negocio, un espacio con mesas propias (por ejemplo sala principal y terraza); en algunos formularios aparece como selección opcional al crear usuarios.

**Merma** — Pérdida de producto (caducidad, rotura, error) que se registra para ajustar el stock.

**Nómina** — Liquidación periódica de salario de un empleado; en el programa puedes calcularla o consultarla según vuestra configuración.

**Proveedor** — Empresa de la que compráis mercancía; su ficha alimenta las facturas de compra.

**Receta** — Relación entre un plato de carta y los ingredientes con cantidades, para calcular coste.

**Registro de actividad (plataforma)** — Listado de acciones relevantes hechas desde el panel central (por ejemplo activar o desactivar un restaurante cliente).

**Reserva** — Cita con fecha y hora para ocupar mesa o comensales.

**Restaurante en plataforma** — Cada negocio cliente dado de alta en HorecaSO a nivel central (visible solo en el panel de plataforma).

**Ticket** — Cuenta abierta de una mesa con productos pedidos y total; al cobrarse pasa a cerrada en los informes.

**TPV** — Punto donde se cargan productos y cobras en una mesa (la “caja” de sala).

**Usuario** — Cuenta con correo y contraseña para entrar en HorecaSO; no siempre coincide con la ficha de empleado, pero pueden estar enlazados.

**Venta Live** — Pantalla que muestra la actividad de venta del día de forma actualizada para supervisión.

**Zona** — Agrupación de mesas en el plano del local (por ejemplo interior, terraza o barra), para ordenar la vista de sala o los filtros de informes.

---

*Este manual describe las pantallas y perfiles tal como están definidos en la aplicación en el momento de su redacción. Si tu instalación ha personalizado textos o flujos, adapta las explicaciones con tu proveedor.*
