import type { Calendar, GuidedValue } from '../types'
import { eventDates } from './lectiveDays'

/** Sección del editor y ancla concreta a la que saltar para editar una fecha. */
export interface EditTarget {
  sectionId: string
  anchorId: string
}

function sectionForKind(kind: string): string {
  if (['vacaciones', 'festivoAutonomico', 'festivoLocal', 'festivoALectivo', 'noLaborable'].includes(kind))
    return 'events-vac'
  if (['claustro', 'cocope', 'consejoEscolar', 'pruebaAcceso'].includes(kind)) return 'events-inst'
  return 'events-otro'
}

function inRange(iso: string, start: string | null, end: string | null): boolean {
  return !!start && !!end && iso >= start && iso <= end
}
function guidedHits(v: GuidedValue, iso: string): boolean {
  return v.range ? inRange(iso, v.range.start, v.range.end) : v.date === iso
}

/**
 * Dado un día, decide a qué elemento editable del editor corresponde, en orden de
 * prioridad: evento → inicio de trimestre → hito del modo guiado. `null` si es un día
 * lectivo/sin nada que editar.
 */
export function resolveEditTarget(cal: Calendar, iso: string): EditTarget | null {
  for (const ev of cal.events) {
    if (eventDates(ev).includes(iso)) return { sectionId: sectionForKind(ev.kind), anchorId: `ev-${ev.id}` }
  }
  for (const term of cal.terms) {
    if (term.startDate === iso) return { sectionId: 'terms', anchorId: `term-${term.id}` }
  }
  for (const term of cal.terms) {
    if (!term.guidedEnabled) continue
    for (const [key, value] of Object.entries(term.guided)) {
      if (guidedHits(value as GuidedValue, iso)) return { sectionId: 'terms', anchorId: `guided-${term.id}-${key}` }
    }
  }
  return null
}
