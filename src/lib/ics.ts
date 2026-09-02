import type { Calendar } from '../types'
import { PUBLIC_BASE_URL } from '../config'
import { buildICS, type OccurrenceLabels } from './icsCore'

export { buildICS, expandOccurrences } from './icsCore'
export type { Occurrence, OccurrenceKind, OccurrenceLabels } from './icsCore'

/**
 * URL `webcal://` del feed publicado. `feedToken` es `<idCalendario>-<perfil|all>`: el mismo
 * identificador que nombra el .ics y la vista .json, que `scripts/build-feeds.mjs` escribe a la
 * vez. Por eso la vista `#/ver/<token>` puede derivar su suscripción sin consultar nada.
 */
export function feedWebcalUrl(feedToken: string): string {
  return `${PUBLIC_BASE_URL}feeds/${feedToken}.ics`.replace(/^https?:\/\//, 'webcal://')
}

/** Dispara la descarga de un fichero .ics para el calendario y perfil dados. */
export function downloadICS(
  cal: Calendar,
  profileId: string | null,
  labels?: OccurrenceLabels,
  filename?: string,
): void {
  const text = buildICS(cal, profileId, { calName: cal.name, labels })
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `${slug(cal.name)}${profileId ? '-' + profileId : '-todos'}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
