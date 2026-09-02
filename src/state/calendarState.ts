import type { Calendar } from '../types'
import { coerceCalendar, makeId } from '../lib/json'

/**
 * Transiciones de estado del almacén de calendarios, como funciones puras.
 *
 * Viven fuera del componente a propósito: son la parte que puede perder datos del usuario
 * (importar, borrar, deduplicar) y así se pueden probar sin montar React ni un DOM falso.
 * `CalendarStore.tsx` se queda con lo que sí es de React: el estado, el contexto y el guardado
 * en `localStorage`.
 */

export interface StoredState {
  calendars: Calendar[]
  currentId: string | null
}

export const EMPTY_STATE: StoredState = { calendars: [], currentId: null }

/**
 * Invariante de todo el módulo: **nunca dos calendarios con el mismo id**. `current` se resuelve
 * buscando por id, así que un duplicado dejaría al segundo inalcanzable y la app seguiría
 * mostrando —y guardando— el primero, el viejo.
 */
function hasId(s: StoredState, id: string): boolean {
  return s.calendars.some((c) => c.id === id)
}

/**
 * Normaliza lo que había en `localStorage` (ya parseado). Nunca lanza: un calendario corrupto se
 * descarta sin llevarse por delante a los demás, y una estructura irreconocible da estado vacío.
 */
export function parseStoredState(raw: unknown): StoredState {
  const parsed = (raw ?? {}) as { calendars?: unknown[]; currentId?: string | null }
  const calendars = Array.isArray(parsed.calendars)
    ? parsed.calendars
        .map((c) => {
          try {
            return coerceCalendar(c)
          } catch {
            return null
          }
        })
        .filter((c): c is Calendar => c !== null)
    : []

  // Saneado de estados guardados antes de la corrección del duplicado por id: si quedaron dos
  // entradas con el mismo id, se conserva la última (la leída más recientemente).
  const byId = new Map(calendars.map((c) => [c.id, c]))
  const unique = [...byId.values()]
  if (!unique.length) return EMPTY_STATE

  const currentId =
    parsed.currentId && unique.some((c) => c.id === parsed.currentId)
      ? parsed.currentId
      : unique[0].id
  return { calendars: unique, currentId }
}

export function selectCalendar(s: StoredState, id: string): StoredState {
  return hasId(s, id) ? { ...s, currentId: id } : s
}

/** Añade un calendario recién creado y lo deja como actual. */
export function addCalendar(s: StoredState, cal: Calendar): StoredState {
  return { calendars: [...s.calendars, cal], currentId: cal.id }
}

export interface ImportOptions {
  /** Sustituye el calendario actual, conservando su id (importar «encima»). */
  replaceCurrent?: boolean
  /** Recarga en su sitio el calendario que ya tenga ese id (abrir desde archivo). */
  replaceById?: boolean
}

export function importCalendar(
  s: StoredState,
  cal: Calendar,
  opts?: ImportOptions,
): StoredState {
  if (opts?.replaceCurrent && s.currentId) {
    const merged = { ...cal, id: s.currentId }
    return {
      calendars: s.calendars.map((c) => (c.id === s.currentId ? merged : c)),
      currentId: s.currentId,
    }
  }
  const clash = hasId(s, cal.id)
  // Abrir desde archivo = recargar ese calendario desde el disco: se sustituye la entrada
  // existente en su sitio, para que lo que se ve (y lo que luego se guarda) sea el archivo.
  if (opts?.replaceById && clash) {
    return {
      calendars: s.calendars.map((c) => (c.id === cal.id ? cal : c)),
      currentId: cal.id,
    }
  }
  // Añadir como nuevo: si el id ya existe, se le da uno nuevo en vez de duplicarlo.
  const added = clash ? { ...cal, id: makeId('cal') } : cal
  return { calendars: [...s.calendars, added], currentId: added.id }
}

export function deleteCalendar(s: StoredState, id: string): StoredState {
  const remaining = s.calendars.filter((c) => c.id !== id)
  if (!remaining.length) return EMPTY_STATE
  return { calendars: remaining, currentId: s.currentId === id ? remaining[0].id : s.currentId }
}

export function duplicateCalendar(s: StoredState, id: string, suffix = 'copia'): StoredState {
  const src = s.calendars.find((c) => c.id === id)
  if (!src) return s
  const copy = coerceCalendar({ ...src, id: undefined, name: `${src.name} (${suffix})` })
  return { calendars: [...s.calendars, copy], currentId: copy.id }
}

/** Aplica `fn` al calendario actual. `now` se inyecta para que los tests sean deterministas. */
export function patchCurrent(
  s: StoredState,
  fn: (c: Calendar) => Calendar,
  now: string,
): StoredState {
  if (!s.currentId) return s
  return {
    ...s,
    calendars: s.calendars.map((c) => (c.id === s.currentId ? { ...fn(c), updatedAt: now } : c)),
  }
}

export function currentOf(s: StoredState): Calendar | null {
  return s.calendars.find((c) => c.id === s.currentId) ?? null
}
