import type { EventKind } from '../types'

// Las etiquetas de texto de cada tipo se resuelven vía i18n (`events.kind.*`).

/** Color asociado a cada tipo de evento (para leyendas y calendario compacto). */
export const EVENT_KIND_COLOR: Record<EventKind, string> = {
  vacaciones: 'var(--vacaciones)',
  festivoAutonomico: 'var(--festivo)',
  festivoLocal: 'var(--festivo)',
  festivoALectivo: 'var(--lective)',
  noLaborable: 'var(--festivo)',
  claustro: 'var(--accent)',
  cocope: 'var(--accent)',
  consejoEscolar: 'var(--accent)',
  pruebaAcceso: 'var(--accent)',
  otro: 'var(--text-muted)',
}
