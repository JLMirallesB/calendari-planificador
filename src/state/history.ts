import type { Calendar } from '../types'

/**
 * Historial de deshacer/rehacer, **por calendario** y en memoria (no se persiste: al recargar se
 * empieza limpio, como en cualquier editor; la recuperación entre sesiones la dan las copias de
 * seguridad, ver [[backups]]).
 *
 * Por calendario y no global a propósito: así `Ctrl+Z` deshace solo ediciones del calendario que
 * tienes delante, y cambiar de calendario en el selector no mezcla historiales ni deshace algo
 * que no esperabas. Cambiar de calendario activo no es una edición, así que no entra aquí.
 */
export interface CalHistory {
  /** Versiones anteriores del calendario, de la más vieja a la más reciente. */
  past: Calendar[]
  /** Versiones rehacer (lo deshecho), la próxima a rehacer la primera. */
  future: Calendar[]
}

export type Histories = Record<string, CalHistory>

/** Tope de pasos recordados por calendario. De sobra para una sesión de edición. */
export const HISTORY_LIMIT = 50

const empty: CalHistory = { past: [], future: [] }

/**
 * Registra la versión *anterior* de un calendario, justo antes de aplicarle una edición. Vacía el
 * futuro: editar después de deshacer descarta lo rehacer, como en cualquier editor.
 */
export function record(histories: Histories, prev: Calendar): Histories {
  const h = histories[prev.id] ?? empty
  const past = [...h.past, prev].slice(-HISTORY_LIMIT)
  return { ...histories, [prev.id]: { past, future: [] } }
}

export function canUndo(histories: Histories, id: string | null): boolean {
  return !!id && (histories[id]?.past.length ?? 0) > 0
}

export function canRedo(histories: Histories, id: string | null): boolean {
  return !!id && (histories[id]?.future.length ?? 0) > 0
}

/**
 * Deshace la última edición del calendario `current`. Devuelve la versión a restaurar y el
 * historial actualizado (el estado actual pasa a «rehacer»), o `null` si no hay nada que deshacer.
 */
export function undo(
  histories: Histories,
  current: Calendar,
): { histories: Histories; restored: Calendar } | null {
  const h = histories[current.id]
  if (!h || !h.past.length) return null
  const restored = h.past[h.past.length - 1]
  return {
    restored,
    histories: {
      ...histories,
      [current.id]: {
        past: h.past.slice(0, -1),
        future: [current, ...h.future].slice(0, HISTORY_LIMIT),
      },
    },
  }
}

/** Simétrico a `undo`: rehace la última edición deshecha. */
export function redo(
  histories: Histories,
  current: Calendar,
): { histories: Histories; restored: Calendar } | null {
  const h = histories[current.id]
  if (!h || !h.future.length) return null
  const restored = h.future[0]
  return {
    restored,
    histories: {
      ...histories,
      [current.id]: {
        past: [...h.past, current].slice(-HISTORY_LIMIT),
        future: h.future.slice(1),
      },
    },
  }
}

/** Olvida el historial de un calendario (p. ej. al borrarlo): no debe crecer sin fin. */
export function forget(histories: Histories, id: string): Histories {
  if (!(id in histories)) return histories
  const { [id]: _drop, ...rest } = histories
  return rest
}
