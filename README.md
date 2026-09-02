# 📅 Calendari — Planificador de curso

App web **100 % estática** para planificar el **calendario escolar y académico** de un
conservatorio de música o danza: días lectivos, trimestres, hitos de evaluación, festivos,
claustros y pruebas de acceso. Se despliega en GitHub Pages, no tiene servidor y no guarda nada en
ningún sitio ajeno: los datos viven en el navegador de quien la usa (`localStorage`), más
import/export en JSON.

Está pensada para que **cada centro tenga la suya**: forkeas, cambias un fichero de configuración
y tienes tu propio planificador publicado, con tus calendarios y tus URL de suscripción.

## Qué hace

- **Curso y días lectivos.** Inicio y fin de curso, días de descanso semanal, vacaciones y
  festivos autonómicos y locales, con un contador de días lectivos que se actualiza solo. Un
  festivo puede convertirse en día lectivo recuperado.
- **Trimestres.** Primer, Segundo y Tercer trimestre, más Anticipación, Ordinaria/Final y
  Extraordinaria, con recuento de semanas y de días lectivos por día de la semana.
- **Modo guiado por trimestre.** Avisa de los hitos pendientes —prueba teórica, semana de
  revisión, sesión de evaluación, notas en ITACA, WebFamília, actas, firma, reclamaciones,
  anticipación— y puede autocompletar la cascada administrativa a partir de la fecha de la sesión
  de evaluación, contando en días hábiles reales del calendario.
- **Perfiles.** Docentes, alumnado, administración… Cada fecha decide para quién es visible, y de
  ahí salen impresiones y suscripciones distintas para cada colectivo.
- **Impresión.** Hoja en lista o calendario compacto anual, filtrada por perfil, lista para PDF.
- **Suscripción.** Cada calendario publicado genera un feed `.ics` por perfil: quien se suscribe ve
  los cambios en su móvil sin hacer nada.
- **Sin sustos.** Deshacer y rehacer, duplicar fechas, un panel de avisos que detecta
  incoherencias —fechas fuera de curso, solapes, hitos sin rellenar— y copias de seguridad
  automáticas en el navegador.
- **Castellano y valencià/català**, con la interfaz traducida y los datos del usuario intactos.

## Usarlo en tu centro

Todo el proceso se puede hacer **desde el navegador**, sin instalar nada:

1. **Forkea** este repositorio con el botón *Fork*.
2. **Edita `site.config.json`** en la web de GitHub. Como mínimo `github.user` y `github.repo`,
   que deben coincidir con tu usuario y con el nombre de tu fork, y `maintainer`, que es el
   contacto que aparecerá en el pie de tu app.
   > ⚠️ Si no lo editas, tu app funcionará, pero los códigos QR de tus impresiones y los botones de
   > suscripción apuntarán a **este** repositorio y no al tuyo. Es un fallo silencioso: no da error,
   > simplemente manda a la gente al sitio equivocado.
3. **Activa Pages**: *Settings → Pages → Source: GitHub Actions*. El workflow de despliegue ya
   viene incluido; cada `push` a `main` reconstruye y publica.
   > Hazlo **antes** del primer despliegue. Si no, el workflow falla con `Create Pages site failed.
   > Error: Resource not accessible by integration`: en un repositorio recién creado el permiso de
   > las Actions es de solo lectura y no puede activar Pages por su cuenta. Actívalo a mano y
   > relanza el despliegue desde la pestaña *Actions*.
4. En un par de minutos tendrás tu app en `https://<tu-usuario>.github.io/<tu-repo>/`.
5. **Planifica el curso** en la app y expórtalo con *Guardar en el archivo*.
6. **Publícalo**: sube ese JSON a `public/calendars/` y añade su entrada en
   `public/calendars/index.json` (*Add file → Upload files*, también desde el navegador). Al
   desplegarse aparecerá en tu galería y generará los feeds de suscripción.

Si solo quieres planificar tu curso y llevarte un PDF o un `.ics`, no necesitas nada de esto: la
app funciona entera en el navegador. El fork hace falta únicamente para **publicar** calendarios a
los que otras personas puedan suscribirse.

### Mantenerte al día

Tu fork trae un workflow que, una vez por semana, mira si aquí ha salido algo nuevo y te abre un
**Pull Request** con los cambios. No fusiona nada por su cuenta: lo revisas y lo aceptas cuando te
venga bien. Tu `site.config.json` y tus calendarios no entran en ese PR, así que actualizar no te
deshace la configuración.

Para que funcione tienes que **entrar una vez en la pestaña «Actions» de tu fork y activarlas**:
GitHub desactiva las Actions en los repositorios recién forkeados. Y si pasan 60 días sin
actividad, vuelve a desactivar los workflows programados; desde esa misma pestaña puedes
relanzarlo a mano con *Run workflow*.

## Configuración

Todo lo que distingue un despliegue de otro está en **`site.config.json`**, en la raíz. No hay que
tocar código.

| Campo | Para qué |
|---|---|
| `app.name`, `app.tagline`, `app.emoji`, `app.description` | Marca visible: cabecera, título de la pestaña y favicon. |
| `github.user`, `github.repo` | De aquí salen la ruta base, `https://<user>.github.io/<repo>/`, las URL `webcal://` de suscripción y el enlace al repositorio. |
| `publicBaseUrl` | Opcional. Con dominio propio, escríbela entera (`https://calendari.micentro.org/`) y la app pasa a servirse en la raíz. |
| `maintainer` | Quién mantiene **tu** despliegue: es el «Contacto» del pie. |
| `cev.datasetBase` | Dataset del calendario escolar oficial que consume la sincronización. |

Si falta un campo, el build falla diciendo cuál. La URL pública es siempre un valor **escrito**,
nunca deducido de la dirección del navegador: la hoja impresa lleva un QR con ella, y un PDF
generado desde un servidor local llevaría, si no, un QR a `localhost`, inútil en papel.

**Aviso sobre la sincronización con el calendario oficial:** la función que importa festivos y
periodos del calendario escolar publicado en el DOGV es específica de la **Comunitat Valenciana** y
consume un dataset mantenido por el autor. Fuera de esa comunidad no te servirá; el resto de la
app, sí.

## Desarrollo

```bash
npm install
npm run dev          # servidor local
npm run build        # feeds ICS + typecheck estricto + build de producción
npm test             # lógica pura y transiciones del estado
npm run build:feeds  # regenera solo los .ics a partir de public/calendars/
```

React 18 + Vite + TypeScript, sin librería de estado ni de i18n: la lógica pura vive en `src/lib/`
con sus tests al lado, el estado en `src/state/` y los textos en `src/i18n/`. Las fechas son
siempre cadenas ISO `YYYY-MM-DD` construidas en horario local, nunca en UTC.

## Cómo se mantiene este repositorio

El desarrollo ocurre en un repositorio de trabajo privado —contiene calendarios reales de un
centro— y aquí llega por **sincronización de una sola dirección**. Eso tiene una consecuencia
práctica importante: **los commits hechos directamente aquí se pierden en la siguiente
sincronización**. Las aportaciones son bienvenidas y se aplican a mano en el origen, con crédito;
está explicado en [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

Código bajo licencia **MIT** (ver [`LICENSE`](LICENSE)): úsalo, modifícalo y redistribúyelo,
también en un fork para tu centro, conservando el aviso de copyright.

El **nombre «Calendari» y el logotipo no se licencian**: son la identidad de este proyecto, no
parte del código. Si publicas una versión modificada, ponle tu propio nombre y tu contacto en
`site.config.json`, para que nadie confunda tu despliegue con el original ni escriba al autor
equivocado.

App diseñada por **José Luis Miralles** ([jlmirall.es](https://jlmirall.es)) con ayuda de Claude ·
[Invitar a una orxata ☕](https://ko-fi.com/miralles)
