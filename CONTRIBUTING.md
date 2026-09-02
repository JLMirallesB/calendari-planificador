# Contribuir

Gracias por mirar. Antes de nada, lo que hay que saber de este repositorio, porque no funciona como
la mayoría.

## Este repositorio es un espejo

El desarrollo ocurre en un repositorio de trabajo **privado**: contiene los calendarios reales de
un centro educativo, con sus claustros, sus evaluaciones y sus fechas internas, y por eso no puede
ser público. De ahí sale, mediante un script con lista blanca, **la app y solo la app**, que llega
aquí como un commit `sync: vX.Y.Z` por versión.

La consecuencia práctica: **la sincronización va en una sola dirección**. Un commit hecho
directamente aquí no sobrevive a la siguiente publicación. No es descuido ni desprecio, es cómo
está montado el tubo.

## Cómo aportar entonces

**Erratas, fallos e ideas → abre un issue.** Es la vía principal y la que mejor funciona. Cuanto
más concreto, mejor:

- La **versión**, que aparece junto al nombre de la app en la cabecera.
- Navegador y sistema.
- Qué esperabas y qué pasó.
- Si tiene que ver con un calendario concreto, el JSON exportado **quitando los datos que no
  quieras compartir** (nombre del centro, títulos de eventos). La estructura basta casi siempre.

**Pull requests: adelante, pero léete esto.** Se leen y se agradecen, y si el cambio encaja se
aplica a mano en el repositorio de origen y aparece aquí en la siguiente sincronización, citándote
en el mensaje del commit. Lo que no puede pasar es que se haga *merge*: quedaría machacado. Si tu
PR tarda en «desaparecer y reaparecer», es que está en camino.

Para cambios grandes, abre antes un issue y lo hablamos: es fácil que algo esté escrito así por un
motivo que no se ve desde fuera.

## Si lo que quieres es tu propio calendario

No hace falta contribuir aquí. **Forkea, edita `site.config.json` y publica lo tuyo**, tal como
explica el [README](README.md). Tu fork es tuyo: tus calendarios, tu URL, tus suscripciones.

Y por favor, **no envíes los calendarios de tu centro a este repositorio**. Los datos de cada
centro viven en su propio fork; aquí solo está el calendario de ejemplo.

## Convenciones del código

Si acabas escribiendo código, cuatro cosas que este proyecto se toma en serio:

- **Fechas.** Siempre cadenas ISO `YYYY-MM-DD`, y los `Date` se construyen en horario **local**
  (`src/lib/dateUtils.ts`), nunca en UTC. Un desfase de zona horaria mueve un evento de día y no se
  nota hasta que alguien lo ve en su móvil.
- **Traducciones.** La interfaz se traduce con `t()`; los datos del usuario, no. Todo texto nuevo
  va en `src/i18n/es.ts` **y** en `ca.ts`: el tipo `Dict` sale del primero y el build falla si el
  segundo se queda corto. Para añadir un idioma: crea `src/i18n/<lang>.ts`, regístralo en
  `index.tsx` y añade la opción en `LanguageSelect.tsx`.
- **Tests.** La lógica pura de `src/lib/` y las transiciones de `src/state/` van con test al lado,
  sin React ni DOM. Lo más delicado que cubren es que **los identificadores de los eventos ICS sean
  estables**: si cambian, quien está suscrito ve un evento escribirse encima de otro, con los
  recordatorios que le hubiera puesto.
- **Nada de datos reales en los tests.** Los ficheros de prueba se publican aquí. Los nombres de
  centros, de calendarios y los identificadores generados no pueden aparecer en un fixture; usa
  valores de ejemplo.

## Licencia

Al aportar código aceptas que se publique bajo la licencia **MIT** del proyecto.
