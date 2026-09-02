import type { StoredState } from './calendarState'

/**
 * Anillo de copias de seguridad del almacén, en `localStorage`.
 *
 * La app guarda una sola versión de tus calendarios: cualquier escritura equivocada —un import
 * mal hecho, un borrado, un fallo en el propio código— la pisa y no hay vuelta atrás. Esto guarda
 * las últimas versiones *anteriores* a cada cambio, para poder retroceder.
 *
 * No es un historial de edición: no interesa una copia por cada tecla, sino unas pocas separadas
 * en el tiempo (la de hace un rato, la de esta mañana). Por eso se limita por hueco temporal, con
 * una excepción: si un cambio **hace desaparecer un calendario**, se copia siempre, porque ese es
 * justo el cambio que uno quiere deshacer.
 */
export interface Backup {
  /** Momento en que se guardó, ISO. */
  at: string
  state: StoredState
}

/** Copias que se conservan. Cinco cubren «un rato», «esta mañana» y «ayer» sin ocupar de más. */
export const MAX_BACKUPS = 5
/** Hueco mínimo entre copias rutinarias. */
export const MIN_GAP_MS = 10 * 60 * 1000
/** Tope de tamaño del anillo serializado (los logos en base64 pesan). */
export const MAX_BYTES = 1_500_000

export function parseBackups(raw: unknown): Backup[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (b): b is Backup =>
      !!b &&
      typeof b === 'object' &&
      typeof (b as Backup).at === 'string' &&
      !!(b as Backup).state &&
      Array.isArray((b as Backup).state.calendars),
  )
}

/** Firma barata de un estado, para no archivar dos veces lo mismo. */
function firma(s: StoredState): string {
  return s.calendars.map((c) => `${c.id}@${c.updatedAt}`).join('|')
}

/** Ids que estaban y ya no están: el cambio ha destruido algo. */
function perdidos(previous: StoredState, next: StoredState): boolean {
  const ahora = new Set(next.calendars.map((c) => c.id))
  return previous.calendars.some((c) => !ahora.has(c.id))
}

/**
 * Decide si el estado *anterior* merece una copia y devuelve el anillo resultante (más reciente
 * primero). `now` se inyecta para que las pruebas no dependan del reloj.
 */
export function pushBackup(
  ring: Backup[],
  previous: StoredState,
  next: StoredState,
  now: string,
  opts?: { maxEntries?: number; minGapMs?: number; maxBytes?: number; force?: boolean },
): Backup[] {
  const max = opts?.maxEntries ?? MAX_BACKUPS
  const gap = opts?.minGapMs ?? MIN_GAP_MS
  const maxBytes = opts?.maxBytes ?? MAX_BYTES

  // Nada que proteger: no se guardan copias de la nada.
  if (!previous.calendars.length) return ring

  const ultima = ring[0]
  // Nunca dos copias seguidas del mismo estado, aunque se pidan a la fuerza.
  if (ultima && firma(ultima.state) === firma(previous)) return ring

  const destructivo = opts?.force || perdidos(previous, next)
  if (!destructivo && ultima) {
    const transcurrido = new Date(now).getTime() - new Date(ultima.at).getTime()
    if (Number.isFinite(transcurrido) && transcurrido < gap) return ring
  }

  let out = [{ at: now, state: previous }, ...ring].slice(0, max)
  // Si aun así no cabe, se sueltan las más viejas antes que fallar al escribir.
  while (out.length > 1 && JSON.stringify(out).length > maxBytes) out = out.slice(0, -1)
  return out
}

/** Resumen legible de una copia, para la lista de restauración. */
export function describeBackup(b: Backup): { calendars: number; dates: number } {
  let dates = 0
  for (const c of b.state.calendars) {
    dates += c.events.filter((e) => e.date || (e.range && e.range.start)).length
    for (const t of c.terms) {
      for (const v of Object.values(t.guided ?? {})) {
        if (v && (v.date || (v.range && v.range.start))) dates++
      }
    }
  }
  return { calendars: b.state.calendars.length, dates }
}
