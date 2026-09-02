// Re-sincronización de un calendario con su fuente (dataset de legislación CV).
// Compara los eventos de procedencia (`srcKey` con prefijo cev:) del calendario con
// los que la fuente genera AHORA para el mismo municipio, y propone altas, cambios y
// bajas. Los eventos creados a mano (sin `srcKey`) nunca se tocan ni se listan.

import type { Calendar, CalEvent } from '../types'
import { cevEventsFor, CEV_SRC_PREFIX, type CevCourse } from './cev'

export type CevDiffKind = 'add' | 'change' | 'remove'

export interface CevDiffItem {
  kind: CevDiffKind
  srcKey: string
  /** Evento actual en el calendario (en 'change' y 'remove'). */
  current: CalEvent | null
  /** Evento propuesto por la fuente (en 'add' y 'change'). */
  next: CalEvent | null
}

function sameEvent(a: CalEvent, b: CalEvent): boolean {
  return (
    a.title === b.title &&
    a.kind === b.kind &&
    a.date === b.date &&
    (a.range?.start ?? null) === (b.range?.start ?? null) &&
    (a.range?.end ?? null) === (b.range?.end ?? null)
  )
}

function isCevEvent(e: CalEvent): boolean {
  return typeof e.srcKey === 'string' && e.srcKey.startsWith(CEV_SRC_PREFIX)
}

/** Calcula el diff entre el calendario y lo que la fuente genera hoy. */
export function diffCev(cal: Calendar, course: CevCourse): CevDiffItem[] {
  const municipio = cal.source?.municipio ?? ''
  const expected = cevEventsFor(course, municipio)

  const expByKey = new Map<string, CalEvent>()
  for (const e of expected) if (e.srcKey) expByKey.set(e.srcKey, e)

  const curByKey = new Map<string, CalEvent>()
  for (const e of cal.events) if (isCevEvent(e)) curByKey.set(e.srcKey as string, e)

  const items: CevDiffItem[] = []

  for (const [key, exp] of expByKey) {
    const cur = curByKey.get(key)
    if (!cur) {
      items.push({ kind: 'add', srcKey: key, current: null, next: exp })
    } else if (!sameEvent(cur, exp)) {
      // Conserva el id del evento existente al actualizarlo.
      items.push({ kind: 'change', srcKey: key, current: cur, next: { ...exp, id: cur.id } })
    }
  }
  for (const [key, cur] of curByKey) {
    if (!expByKey.has(key)) items.push({ kind: 'remove', srcKey: key, current: cur, next: null })
  }

  return items
}

export interface CevSyncMeta {
  seenUpdated: string
  version: number
}

/** Aplica los items seleccionados y actualiza la marca de procedencia. */
export function applyCevDiff(cal: Calendar, selected: CevDiffItem[], meta: CevSyncMeta): Calendar {
  const changeByKey = new Map<string, CalEvent>()
  const removeKeys = new Set<string>()
  const adds: CalEvent[] = []
  for (const it of selected) {
    if (it.kind === 'change' && it.next) changeByKey.set(it.srcKey, it.next)
    else if (it.kind === 'remove') removeKeys.add(it.srcKey)
    else if (it.kind === 'add' && it.next) adds.push(it.next)
  }

  const events = cal.events
    .filter((e) => !(e.srcKey && removeKeys.has(e.srcKey)))
    .map((e) => (e.srcKey && changeByKey.has(e.srcKey) ? changeByKey.get(e.srcKey) as CalEvent : e))
    .concat(adds)

  const source = cal.source
    ? { ...cal.source, seenUpdated: meta.seenUpdated, version: meta.version }
    : cal.source

  return { ...cal, events, ...(source ? { source } : {}) }
}
