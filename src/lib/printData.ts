import type { Calendar, ISODate } from '../types'
import { expandOccurrences, type Occurrence, type OccurrenceLabels } from './icsCore'
import { eachDay, parseISO, toISO } from './dateUtils'

export interface DayOccurrences {
  iso: ISODate
  occurrences: Occurrence[]
}

/** Mapa fecha ISO → ocurrencias que caen ese día (expandiendo rangos), para el perfil dado. */
export function occurrencesByDay(
  cal: Calendar,
  profileId: string | null,
  labels?: OccurrenceLabels,
): Map<ISODate, Occurrence[]> {
  const map = new Map<ISODate, Occurrence[]>()
  for (const occ of expandOccurrences(cal, profileId, labels)) {
    for (const iso of eachDay(occ.startISO, occ.endISO)) {
      const arr = map.get(iso) ?? []
      arr.push(occ)
      map.set(iso, arr)
    }
  }
  return map
}

export interface MonthInfo {
  year: number
  month: number // 0-11
  first: ISODate
}

/** Lista de meses (año, mes) cubiertos por el rango [start, end]. */
export function monthsInRange(start: ISODate, end: ISODate): MonthInfo[] {
  const out: MonthInfo[] = []
  const s = parseISO(start)
  const e = parseISO(end)
  let y = s.getFullYear()
  let m = s.getMonth()
  const endKey = e.getFullYear() * 12 + e.getMonth()
  // Límite de seguridad de 60 meses.
  for (let i = 0; i < 60 && y * 12 + m <= endKey; i++) {
    out.push({ year: y, month: m, first: toISO(new Date(y, m, 1)) })
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return out
}

/** Clave del mapa de `captionsByMonth`: mes de un año (mes 0-11). */
export function monthKey(year: number, month: number): string {
  return `${year}-${month}`
}

/**
 * Ocurrencias que van a la leyenda de cada mes de la vista compacta, agrupadas por `monthKey`.
 *
 * Un rango aparece en la leyenda de **cada** mes que toca, no solo en el de su fecha de inicio:
 * el compacto pinta un punto en todos sus días, así que dejar la fila solo en el primer mes
 * dejaba sin explicación los puntos del mes siguiente (p. ej. un viaje del 29 de septiembre al
 * 3 de octubre). La fila repetida lleva la fecha completa del rango, no la del trozo.
 *
 * Se excluyen los inicios de trimestre, que ya tienen su propia marca en la cuadrícula.
 */
export function captionsByMonth(
  cal: Calendar,
  profileId: string | null,
  labels?: OccurrenceLabels,
): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>()
  for (const occ of expandOccurrences(cal, profileId, labels)) {
    if (occ.kind === 'termStart') continue
    for (const mi of monthsInRange(occ.startISO, occ.endISO)) {
      const key = monthKey(mi.year, mi.month)
      const arr = map.get(key) ?? []
      arr.push(occ)
      map.set(key, arr)
    }
  }
  return map
}
