# Changelog

Todas las novedades relevantes de la app se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/) y el
proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [0.7.25] — 2026-09-02

### Corregido

- **Cada despliegue tiene ya su propio almacén en el navegador.** `localStorage` es por **origen**,
  no por ruta: dos despliegues del mismo usuario en GitHub Pages —por ejemplo el planificador de un
  centro y la demo pública del proyecto— compartían los calendarios guardados, de modo que crear
  uno de prueba en un sitio lo hacía aparecer en el otro. Las claves llevan ahora un prefijo con la
  ruta del despliegue. Los datos que ya hubiera guardados **se adoptan automáticamente** en el
  despliegue que los tenía, copiándolos (no moviéndolos): si algo fallara, siguen donde estaban.

## [0.7.24] — 2026-09-02

### Cambiado

- **La documentación interna (`CLAUDE.md`, `docs/PLAN.md`) pasa a estar versionada.** Estaba fuera
  de git por si el repositorio se hacía público algún día; ahora que el proyecto se publica desde
  un repositorio espejo aparte, este se queda privado y no hay motivo para que su guía viva sin
  copia ni historial.
- Como consecuencia, **el `.gitignore` deja de sincronizarse** con el repositorio público: cada uno
  necesita el suyo, porque el del espejo tiene que seguir ignorando su propio `CLAUDE.md`, que es
  una nota local que no debe publicarse ni llegar a los forks.

## [0.7.23] — 2026-09-02

### Añadido

- **`npm run publicar`**: prepara la copia de la app —y solo la app— hacia el repositorio público
  del proyecto, filtrada por **lista blanca**: lo que no está invitado explícitamente no sale, de
  modo que una carpeta nueva con datos no puede publicarse por descuido. Funciona en dos fases: sin
  argumentos enseña el manifiesto y el diff sin escribir nada, y solo con `--aplicar` copia y hace
  el commit. Un guardián deriva lo que está prohibido publicar de los propios calendarios privados
  del despliegue, así que un calendario nuevo queda protegido sin tocar el script. Es herramienta
  interna: no cambia nada de la app.

### Corregido

- Los datos de prueba de `json.test.ts` llevaban el nombre real de un centro y de su calendario.
  Ahora son genéricos: los ficheros de test viajan al repositorio público, y el valor concreto
  nunca importó para lo que ese test comprueba.

## [0.7.22] — 2026-09-02

### Cambiado

- **La identidad del despliegue pasa a un solo fichero: `site.config.json`.** Antes, el usuario y el
  repo de GitHub, la URL pública, las bases `webcal://`, el título de la pestaña y la URL local del
  editor estaban escritos a mano en cinco sitios (`src/config.ts`, `vite.config.ts`,
  `scripts/build-feeds.mjs`, `index.html` y el `.command`), y lo único que los mantenía de acuerdo era
  un comentario pidiéndolo. Ahora se escriben una vez y se derivan en `src/lib/site.js` —JS plano
  isomórfico, como `icsCore.js`—, que consumen los tres. Si falta un campo, el build falla diciendo
  cuál. `site.config.json` admite `publicBaseUrl` para servir la app en un dominio propio, en cuyo
  caso la ruta base pasa a ser `/`. `PUBLIC_BASE_URL` sigue siendo un valor **escrito**, nunca
  derivado de `window.location`: el QR de la hoja impresa apuntaría a `localhost`.
- **El pie distingue quién mantiene el despliegue de quién hizo la app.** `AUTHOR` es ahora el
  mantenedor (configurable, es el «Contacto»); el crédito al autor original y el ko-fi viven en
  `ORIGIN`, en el código, y viajan a cualquier fork. En este despliegue, que son la misma persona, el
  pie se ve exactamente igual que antes.

## [0.7.21] — 2026-09-01

### Corregido

- **Puntos sin explicación en el calendario compacto.** Un evento o hito de varios días pinta un
  punto en todos sus días, pero su fila de la leyenda solo aparecía en el mes de la fecha de
  inicio: los puntos que caían en el mes siguiente se quedaban sin nada que los justificara (un
  viaje del 29 de septiembre al 3 de octubre dejaba tres puntos huérfanos en octubre, dos de ellos
  en fin de semana). Ahora la fila se repite en **cada mes que el rango atraviesa**, con la fecha
  completa («29 sep – 3 oct»). El filtrado por perfil no estaba afectado: ningún punto procedía de
  un evento ajeno al perfil impreso.

## [0.7.20] — 2026-08-30

### Añadido

- **Autocompletar hitos** en cada trimestre ordinario (Primer/Segundo/Tercer/Ordinaria), junto al
  modo guiado. A partir de la **sesión de evaluación**, propone en días hábiles la cascada
  administrativa deducida del calendario real: fin de notas docentes → rectificación → WebFamília
  e impresión de actas → firma → plazo de reclamación. **No aplica nada por su cuenta**: enseña un
  diff con casillas (como la sincronización CEV), con lo que cambia marcado por defecto; lo editado
  a mano se respeta si lo dejas sin marcar, y re-ejecutar tras mover la evaluación vuelve a
  proponer. «Días hábiles» excluye fines de semana, festivos **y vacaciones**. No toca perfiles ni
  la marca de provisional, y como pasa por el editor normal, un Ctrl+Z lo deshace. Oculto en la
  Ordinaria enlazada al 3.º (ya se sincroniza). No cubre la prueba teórica ni la semana de revisión
  (patrón semanal, se dejan manuales), ni Anticipación/Extraordinaria.

## [0.7.19] — 2026-08-30

### Añadido

- **Hora de inicio y fin (opcional) en eventos institucionales y otras fechas.** Solo en eventos
  de un día (no en rangos) y solo en esos tipos —no en festivos ni vacaciones—. Si se pone hora,
  el evento deja de ser de día completo en el ICS y pasa a tener hora en la **zona Europe/Madrid**
  (se incluye la definición de la zona con sus cambios de hora, solo cuando hay algún evento con
  hora). La hora se muestra en la vista de lista y en la hoja impresa. Nuevo aviso de validación:
  hora de fin anterior a la de inicio.

## [0.7.18] — 2026-08-30

### Añadido

- **Panel de avisos** en el editor (`validateCalendar`, función pura con tests). No bloquea nada:
  lista posibles incoherencias y descuidos, cada uno con un enlace «Ir» que salta a la fila. Los
  errores lo abren solo; los avisos, no. Detecta: fin de curso anterior o igual al inicio (error),
  trimestre con fin anterior al inicio (error), rango de evento o de hito guiado invertido (error),
  evento fuera del curso, inicio de curso en día no lectivo, trimestres solapados o desordenados,
  y eventos sin título. Deliberadamente **no** avisa de hitos fuera de su trimestre: muchos actos
  se acaban celebrando fuera.

## [0.7.17] — 2026-08-29

### Añadido

- **Deshacer / rehacer** en el editor, con botones (↶ ↷) y atajos de teclado (Ctrl/Cmd+Z y
  Ctrl+Shift+Z). Cubre toda edición de contenido —borrar un evento, cambiar una fecha, borrar un
  perfil, editar trimestres—, porque todas pasan por un único punto. El historial es **por
  calendario** y en memoria (al recargar se empieza limpio; la recuperación entre sesiones la dan
  las copias de seguridad). Los atajos se ignoran dentro de un campo de texto, para no pisar el
  deshacer nativo de escritura. Tapa además un hueco: borrar un evento no generaba copia de
  seguridad y quedaba sin vuelta atrás.
- **Duplicar un evento**: botón ⧉ en cada fila que clona el evento con id propio y lo inserta
  justo debajo, para editarlo por separado.

## [0.7.16] — 2026-08-29

### Corregido

- **El mini calendario de los campos de fecha ahora se abre al pulsar en el campo**, no solo en
  el iconito de la derecha. Es una diferencia entre navegadores: Safari abre el selector al tocar
  el campo entero y Chrome/Edge solo desde el icono, así que en Chrome parecía que no hubiera
  calendario y había que teclear la fecha. Los diez campos de fecha del editor pasan por un
  componente común, `DateInput`, que llama a `showPicker()`; si el navegador lo rechaza, queda el
  comportamiento nativo de siempre.

## [0.7.15] — 2026-08-29

### Corregido

- **La vista `#/ver` ya no se desborda en el móvil.** Medido a 390 px: el documento ocupaba
  417 px y toda la página arrastraba scroll horizontal. La culpa era de `.occ-row`, en flex sin
  envolver: un título largo con la chapa «Provisional» empujaba la fila fuera. Ahora envuelve en
  pantallas estrechas (solo `@media screen`; en papel la fila cabe y no cambia). El calendario
  compacto y la tabla de días lectivos ya estaban bien.

### Añadido

- **Foco visible** en botones, enlaces y desplegables al recorrer la app con el teclado; antes
  solo lo tenían las tarjetas de la bienvenida.
- **`aria-label`** en los botones que solo llevan un icono (✕ de borrar evento y perfil): `title`
  da tooltip con el ratón, pero no llega al lector de pantalla ni al táctil.

## [0.7.14] — 2026-08-29

### Añadido

- **Fecha de última actualización en la vista de solo lectura** (`#/ver`), junto al título, y
  también al pie de la hoja impresa. Quien abría un enlace compartido no tenía forma de saber si
  estaba mirando algo de hace un año; y en papel, cuándo se imprimió esa copia fija.

## [0.7.13] — 2026-08-29

### Añadido

- **Copias de seguridad en el navegador.** La app guardaba una sola versión de tus calendarios:
  cualquier escritura equivocada la pisaba y no había vuelta atrás. Ahora, antes de sobrescribir,
  archiva la versión anterior en `calendari:backups:v1`. Se conservan las **cinco últimas**,
  espaciadas al menos diez minutos para que no sean cinco fotos del último minuto, y **siempre**
  una justo antes de que desaparezca un calendario, que es el cambio que uno quiere deshacer.
  Nueva sección «Copias de seguridad» en el editor, con la fecha, un resumen (calendarios y
  fechas) y un botón de restaurar. Restaurar también se puede deshacer: el estado actual se
  archiva antes de ser sustituido.
- **Indicador de «cambios sin guardar»** junto al nombre del archivo vinculado, con su contrario
  «al día». Compara el contenido con la huella de lo último escrito en disco, no la hora: hacer
  un cambio y deshacerlo no deja el aviso encendido. Es el agujero por el que un evento pasó un
  mes viviendo solo en el navegador.

## [0.7.12] — 2026-08-29

### Añadido

- **Batería de tests** (`npm test`, Vitest): 50 pruebas sobre la lógica que puede perder datos.
  Cubren las transiciones del almacén (importar, borrar, duplicar, deduplicar por id), el saneado
  de `coerceCalendar`, las fechas locales de `dateUtils` (incluidos los dos cambios de hora del
  curso), el recuento de días lectivos con «festivo convertido en lectivo», y dos invariantes que
  afectan a terceros: los **UID de los feeds ICS no cambian al reordenar** y la **ida y vuelta
  JSON→disco→JSON no pierde nada**. Se ejecutan también en el deploy, antes del build.

### Cambiado

- Las **transiciones del almacén** salen de `CalendarStore.tsx` a `src/state/calendarState.ts`
  como funciones puras. El componente se queda con lo que es de React (contexto, estado,
  `localStorage`); la parte que puede destruir datos del usuario queda aparte y probada.

### Corregido

- **`coerceCalendar` ya no convierte basura en un calendario.** Un JSON que fuera `42`, `"hola"`
  o una lista no daba error: devolvía un calendario vacío con nombre por defecto, que aparecía en
  la lista como si lo hubiera creado el usuario, y una entrada corrupta en `localStorage` se
  colaba igual. Ahora se rechaza y el importador muestra su mensaje de formato incorrecto.

## [0.7.11] — 2026-08-29

### Añadido

- **QR también en la vista de impresión del editor** (`#/print`), no solo en `#/ver`, y siguiendo
  el **perfil seleccionado**. Aparece únicamente si esa vista está publicada de verdad: se
  comprueba contra el sitio público —GitHub Pages responde con CORS abierto—, no contra la
  carpeta local, porque un calendario puede existir en `public/v/` de tu máquina y no estar
  desplegado. Y el código apunta siempre a la URL pública aunque estés imprimiendo desde
  `localhost`: un QR a `localhost` en un papel repartido no lo abre nadie.

## [0.7.10] — 2026-08-29

### Corregido

- **UID estables en los feeds ICS.** El UID de cada evento se construía con su **posición** en la
  lista de ocurrencias (`<id>-<perfil>-<índice>`), así que insertar una fecha por el medio
  desplazaba la identidad de todas las siguientes. Para una app de calendario el UID *es* el
  evento: el suscriptor veía cómo el contenido de un evento se escribía encima de otro, con los
  recordatorios que le hubiera puesto. Ahora la clave sale del `id` del evento o del trimestre
  (`term_xxx-firmaActas`), que no cambia al reordenar; para JSON escritos a mano sin ids se
  deriva del contenido. Verificado: reordenar eventos y trimestres no altera ningún UID.
- **Efecto puntual**: al cambiar el esquema, los suscriptores actuales recrean una vez todos los
  eventos. A partir de ahí quedan estables.

## [0.7.9] — 2026-08-29

### Añadido

- **«Guardar como…»** en Importar / Exportar (Chrome/Edge): elige un archivo y escribe en él el
  calendario que tienes ahora, **sin leerlo antes**. Es la pieza que faltaba: «Guardar en el
  archivo» exigía un handle, y el único modo de conseguirlo era «Abrir», que sustituye lo que hay
  en pantalla por lo del disco. Un calendario que solo vivía en el navegador no tenía forma de
  llegar a un fichero salvo exportando y moviéndolo a mano.

### Corregido

- En la fila del archivo, el **resaltado azul lo lleva ahora la acción que sirve en cada momento**:
  «Guardar como…» mientras no hay archivo vinculado, y 💾 «Guardar en el archivo» en cuanto lo
  hay. Antes el azul estaba fijo en el 💾 aunque estuviera desactivado, y se pulsaba ahí sin que
  ocurriera nada. Se añade además una nota que explica por qué está desactivado.

## [0.7.8] — 2026-08-29

### Añadido

- **Botón de suscripción en la vista de solo lectura** (`#/ver/<id>-<perfil>`): «🔔 Suscribirse»
  y «Copiar URL», junto a imprimir y descargar .ics. El token de la vista nombra también su
  `.ics` —`scripts/build-feeds.mjs` escribe los dos a la vez—, así que la URL `webcal://` sale
  de la propia dirección de la página, sin consultar nada. No expone nada nuevo: es el mismo id
  impredecible que ya tiene quien recibió el enlace.
- **QR al pie de la hoja impresa** (lista y compacto), con la URL de la vista de **ese mismo
  perfil**. Solo aparece si el calendario tiene vista publicada: uno del editor vive únicamente
  en el navegador y no hay dirección que enseñar. Se dibuja como SVG (nítido a cualquier tamaño)
  y en blanco y negro fijos, porque un QR con los colores del tema oscuro no lo lee una cámara.
  Nueva dependencia: `qrcode-generator` (sin dependencias propias).
- **Aviso de «foto fija» frente a suscripción**, tanto en la vista como al pie del PDF: el PDF y
  el `.ics` reflejan el calendario de hoy y no se enteran de los cambios posteriores; la
  suscripción sí se actualiza.

## [0.7.7] — 2026-08-29

### Corregido

- **Abrir un JSON desde archivo ya no crea un calendario duplicado.** Si el id del archivo ya
  existía en el navegador, se añadía una segunda entrada con el mismo id; como el calendario
  actual se resuelve por id, la app seguía mostrando —y guardando— la copia **vieja**, que al
  pulsar «Guardar en el archivo» sobrescribía el archivo bueno. Ahora abrir un archivo
  **recarga** esa entrada en su sitio, e importar un JSON cuyo id ya existe lo añade con un id
  nuevo en vez de duplicarlo. Al arrancar, los duplicados que hubieran quedado guardados se
  fusionan conservando la copia más reciente.

### Añadido

- **Aviso si el archivo cambió en el disco**: al «Guardar en el archivo», si el JSON ha sido
  modificado por fuera desde que se abrió (git, otra máquina, otra pestaña), se pide
  confirmación antes de sobrescribirlo.
- En el **selector de calendarios** cada opción muestra ahora cuántas **fechas** tiene el
  calendario —eventos **más** hitos de los trimestres, no solo los de `events`— y su última
  modificación. Con varias copias de nombre parecido, el nombre solo no bastaba para
  distinguirlas, y contar solo los eventos daba una idea equivocada del tamaño del calendario.

### Corregido

- El **mensaje de error** de la pantalla de fallo incluye ahora `Nombre: mensaje` además de la
  traza: Safari no mete el mensaje dentro de `stack`, así que un informe copiado desde Safari
  llegaba sin la línea que dice qué ha fallado.

## [0.7.6] — 2026-08-11

### Cambiado

- **Calendario de ejemplo** de la galería actualizado al **curso 2026-2027** (antes 2025-2026),
  con los perfiles por defecto actuales (Docentes, Alumnado, Gestión).

## [0.7.5] — 2026-07-27

### Añadido

- **Enlace de «Ver» (solo lectura) por perfil**: página `#/ver/<id>-<perfil>` que muestra el
  calendario como la vista de impresión (lista o compacto), con imprimir/PDF, descargar .ics y
  análisis de días lectivos. Se generan JSON públicos **filtrados por perfil** en `public/v/`
  (mismo id impredecible que los feeds). Los enlaces «Ver» se añaden a `FEEDS.md`.
- En la vista `#/ver/…` el **encabezado es minimalista** (solo idioma y modo claro/oscuro, sin
  navegación) para compartirla con alumnado/familias sin que se pierdan.

## [0.7.4] — 2026-07-27

### Cambiado

- En el **calendario compacto**, el **inicio y el fin de curso** se señalan en la rejilla con un
  chip destacado (con su entrada en la leyenda y en el tooltip), y los **días no lectivos** se
  distinguen mejor con un fondo gris más perceptible.

## [0.7.3] — 2026-07-27

### Añadido

- **Abrir y guardar calendarios en un archivo local** (Chrome/Edge, File System Access API):
  botones «Abrir desde archivo» y «Guardar en el archivo» en Importar/Exportar. Permiten
  editar un JSON local (p. ej. de `calendars-unlisted/`) y guardarlo en el mismo sitio sin
  cambiar nombre ni id, para no romper los feeds de suscripción.

## [0.7.2] — 2026-07-27

### Cambiado

- El **calendario compacto** muestra ahora en la leyenda de cada mes **también los hitos
  puntuales** (antes solo los periodos), y **marca los provisionales** con «(provisional)».

## [0.7.1] — 2026-07-27

### Añadido

- **Emojis por tipo** al inicio del título de cada evento en el ICS (y mismos iconos en la
  lista y el compacto), con emoji específico por cada hito del modo guiado.

### Corregido

- Un **periodo no lectivo** (vacaciones, festivos…) ya no incluye en su rango mostrado los
  días **reconvertidos en lectivos** (festivo→lectivo): se recortan de sus extremos. P. ej.
  si Pascua llega al 5 de abril pero ese día es lectivo, el periodo se muestra hasta el 4.

## [0.7.0] — 2026-07-27

### Añadido

- **Impresión mucho más informativa**:
  - Resumen de fechas clave (inicio/fin de curso y de cada trimestre, incluida Anticipación)
    al principio de la lista y del compacto.
  - Vista de **lista** reorganizada en dos bloques: «Calendario general» e «Hitos por
    trimestre», con iconos por tipo y perfiles de cada hito.
  - **Compacto** con leyenda de fechas bajo cada mes, bandas de trimestre con días lectivos
    por mes/trimestre, y las semanas de examen/periodos guiados etiquetados.
  - Opción de **análisis de días lectivos por día de la semana** al final del PDF (omite los
    días de descanso).
  - **Logo del centro** en la cabecera del PDF (se sube desde «Datos del curso»).
  - Nombre de archivo del PDF propuesto a partir del nombre del calendario (editable).
  - Aviso para desactivar los encabezados/pies del navegador; colores del tema oscuro
    forzados a versión clara al imprimir.
- **Perfiles en los hitos** del modo guiado, con visibilidad por perfil y valores por defecto
  (introducción de notas → Docentes+Gestión; equipo directivo e impresión de actas → Gestión).
- Hitos propios de la **Extraordinaria** (Exámenes, Revisión, Evaluación).
- Nuevo tipo de evento **«No laborable»** (fuera de lectivo), que cuenta como no lectivo.
- **Calendarios no listados**: feeds generados desde `calendars-unlisted/` (fuera de `public/`),
  no aparecen en la galería ni en ningún índice público; botón «Exportar como no listado».

### Corregido / robustez

- Salvaguarda anti-borrado del `localStorage` (no se persiste en el primer render) y carga
  tolerante por calendario.
- **ErrorBoundary**: ante un fallo de render se muestra el error en vez de pantalla en negro.

## [0.6.0] — 2026-07-16

### Añadido

- **Nuevo hito guiado**: «Semana de revisión de calificaciones» (entre la prueba teórica y la
  sesión de evaluación), por defecto en modo rango.
- **Trimestres colapsables** individualmente, con separación visual por bloques; y el **modo
  guiado se puede plegar** (con su chevron) sin necesidad de desactivarlo.
- **Mover un trimestre por semanas** ahora pregunta si mover también todos sus hitos, y
  **avisa** si alguno caería en día no lectivo antes de aplicarlo.
- **Ordinaria/Final ↔ 3.º trimestre**: botón para **copiar** las fechas e hitos del 3.º, y un
  **sincronizado permanente** (editar uno actualiza el otro; al activar con datos distintos
  pregunta qué trimestre prevalece).
- **Leyenda del calendario compacto más completa** (vacaciones, festivo, inicio de trimestre,
  festivo recuperado, evento/hito, no lectivo) con nota sobre los días lectivos.

### Cambiado

- El **calendario compacto** ya no pinta en verde los días lectivos (se deducen del rango de
  curso); solo se resaltan vacaciones, festivos e inicios de trimestre.

### Corregido

- Un **festivo convertido en lectivo** que caía dentro de un periodo vacacional ya no se
  muestra como vacaciones en el compacto: se marca como día lectivo recuperado (anillo verde).

## [0.5.0] — 2026-07-15

### Añadido

- **Reparto en 3 trimestres iguales**: botón en «Trimestres y periodos» que propone el inicio
  de los tres trimestres dividiendo el curso por igual y **alineando al lunes más cercano**. Es
  una propuesta editable.
- **Ajuste por semanas**: cada trimestre con fecha de inicio muestra botones «− semana / +
  semana» para mover su inicio, y el **recuento de días lectivos y semanas se actualiza en
  directo** por trimestre mientras ajustas.
- En el **calendario compacto**, el **inicio de cada trimestre** se resalta con un anillo de
  color y su entrada en la leyenda.
- **Vista previa del calendario compacto en vivo** en el editor: en pantallas anchas aparece
  una columna a la izquierda que se actualiza mientras editas (curso, festivos, trimestres…).
  - Al **pasar el cursor** por un día se muestra un **tooltip** con qué es (festivo, vacaciones,
    inicio de trimestre, hito…).
  - Al **hacer clic** en un día, el editor **salta a la fila donde se edita esa fecha** (abre la
    sección si estaba plegada y la resalta).
- **Secciones del editor plegables**: cada bloque (datos del curso, perfiles, eventos,
  trimestres…) se puede contraer para reducir el desplazamiento.
- **Modo guiado — cada hito puede ser puntual o rango**, a elección (botón Puntual/Rango).
- **Modo guiado — plazo de reclamación automático**: al fijar la *visibilidad de notas en
  WebFamília*, se calcula el plazo de reclamación como **3 días hábiles** desde el día
  siguiente (excluye sábados, domingos y festivos). Queda editable.

### Cambiado

- **Modo guiado — «modificación de notas» se desglosa en dos**: *fin de introducción por
  docentes* y *fin de rectificación por Equipo Directivo* (el antiguo campo se migra al
  primero automáticamente).
- Los **perfiles por defecto** de un calendario nuevo pasan a ser **Docentes, Alumnado y
  Gestión** (antes: Docentes, Alumnado, Familias y Administración).

## [0.4.0] — 2026-07-15

### Añadido

- **Empezar con el calendario oficial de la Comunitat Valenciana**: nueva opción en la
  bienvenida que, eligiendo **curso, enseñanza y municipio**, crea un calendario con las
  fechas de inicio/fin de curso, vacaciones y festivos (autonómicos y locales) tomados del
  dataset de legislación educativa de la CV. Los datos se obtienen por HTTP desde el sitio de
  legislación (sin backend).
- Los eventos generados desde esa fuente guardan su **procedencia** (`source` en el calendario
  y `srcKey` en cada evento).
- **Re-sincronización de festivos**: en el editor, los calendarios creados desde la CV muestran
  un panel «Calendario oficial (CV)» con un botón para **comprobar festivos nuevos o cambios**.
  Presenta un diff (altas, modificaciones y bajas) que se **valida manualmente** con casillas;
  los eventos añadidos a mano nunca se tocan. Pensado para incorporar los festivos locales que
  se publican más tarde en el curso.

## [0.3.0] — 2026-07-15

### Añadido

- **Página de bienvenida** como pantalla de inicio (`#/`): permite elegir entre **crear
  un calendario nuevo**, **importar uno desde un archivo JSON** o **ver los calendarios
  publicados**. Si ya hay calendarios guardados en el navegador, se listan para continuar
  con un clic.

### Cambiado

- El **editor** pasa a la ruta `#/editor`; la cabecera incluye un enlace **«Inicio»**.
- La app ya **no crea un calendario de ejemplo automáticamente**: al abrirla por primera
  vez (o tras borrar el último calendario) se muestra la página de bienvenida.

## [0.2.0] — 2026-07-12

### Añadido

- **Multiidioma (i18n)**: interfaz disponible en **castellano** (por defecto) y
  **valencià/català**, con selector de idioma en la cabecera. El idioma elegido se
  recuerda entre sesiones.
- Fechas, nombres de meses y días de la semana **localizados** según el idioma activo.
- Al crear un calendario nuevo, los nombres por defecto de perfiles y trimestres se
  generan en el idioma activo.
- La vista de impresión y la descarga de `.ics` desde la app respetan el idioma activo.

### Notas

- Los feeds ICS de suscripción publicados en el repositorio se generan con etiquetas en
  castellano; los títulos introducidos por cada usuario se muestran tal cual.

## [0.1.0] — 2026-07-12

### Añadido

- **Editor de calendario**: inicio/fin de curso, días de descanso semanal configurables.
- **Periodos vacacionales** y **festivos** (autonómicos y locales), con soporte para
  convertir un festivo en día lectivo.
- **Importación por JSON** además de la entrada manual de datos.
- **Contador de días lectivos** totales.
- **Fechas puntuales o de rango**, marcables como **provisionales**.
- **Trimestres** con nombre configurable (Primer, Segundo, Tercer, Anticipación,
  Ordinaria/Final, Extraordinaria) y fecha exacta de inicio.
- **Estadísticas por trimestre**: duración en semanas y recuento de lunes/martes/…
  lectivos.
- **Modo guiado** por trimestre: avisa de hitos pendientes (pruebas teóricas, sesiones
  de evaluación, plazos de ITACA, visibilidad en WebFamília, impresión y firma de actas,
  plazo de reclamación; y para Anticipación, solicitud y listados provisional/definitivo).
- **Eventos institucionales**: claustros, COCOPE, consejos escolares y pruebas de acceso.
- **Perfiles** (Docentes, Alumnado, Familias, Administración) editables por calendario;
  cada fecha indica a qué perfiles es visible.
- **Vista de impresión** (lista o calendario compacto) filtrable por perfil, lista para
  guardar como PDF.
- **Exportación ICS** (descarga puntual) y **feeds ICS auto-generados** para suscripción.
- **Galería de calendarios publicados** de solo lectura, con suscripción por perfil.
- Modo **claro/oscuro** y tag de versión enlazado a este changelog.
