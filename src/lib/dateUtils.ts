import type { ISODate } from '../types'

// Todas las fechas se manejan como cadenas ISO `YYYY-MM-DD`. Para evitar desfases por
// zona horaria, construimos objetos Date en horario local (no UTC).

export const WEEKDAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

/** Orden de presentación empezando en lunes: índices getDay() 1..6,0. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** getDay(): 0=domingo … 6=sábado. */
export function weekday(iso: ISODate): number {
  return parseISO(iso).getDay()
}

export function isValidISO(v: unknown): v is ISODate {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(parseISO(v).getTime())
}

/** Devuelve todas las fechas (inclusive) entre start y end. */
export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = []
  if (parseISO(start) > parseISO(end)) return out
  let cur = start
  // Límite de seguridad para evitar bucles infinitos por datos corruptos.
  for (let i = 0; i < 5000 && parseISO(cur) <= parseISO(end); i++) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/** Lunes de la semana (ISO, lunes como primer día) que contiene la fecha dada. */
export function mondayOf(iso: ISODate): ISODate {
  const d = parseISO(iso)
  const day = d.getDay() // 0=dom
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toISO(d)
}

/** Días de calendario entre dos fechas (b - a); negativo si b < a. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000)
}

/** Lunes más cercano a la fecha dada (el de su semana o el siguiente, el que menos diste). */
export function nearestMonday(iso: ISODate): ISODate {
  const prev = mondayOf(iso)
  const next = addDays(prev, 7)
  return daysBetween(prev, iso) <= daysBetween(iso, next) ? prev : next
}

/** Número de semanas (lunes-domingo) distintas que abarca el rango. */
export function weeksSpanned(start: ISODate, end: ISODate): number {
  if (!start || !end || parseISO(start) > parseISO(end)) return 0
  const first = parseISO(mondayOf(start))
  const last = parseISO(mondayOf(end))
  const ms = last.getTime() - first.getTime()
  return Math.round(ms / (7 * 24 * 3600 * 1000)) + 1
}

export function clampMax(a: ISODate | null, b: ISODate | null): ISODate | null {
  if (!a) return b
  if (!b) return a
  return parseISO(a) < parseISO(b) ? a : b
}

/** Formato legible en español: "lun 8 sep 2026". */
export function formatHuman(iso: ISODate): string {
  const d = parseISO(iso)
  const wd = WEEKDAY_NAMES[d.getDay()].slice(0, 3).toLowerCase()
  const mo = MONTH_NAMES[d.getMonth()].slice(0, 3).toLowerCase()
  return `${wd} ${d.getDate()} ${mo} ${d.getFullYear()}`
}

/** Formato largo: "8 de septiembre de 2026". */
export function formatLong(iso: ISODate): string {
  const d = parseISO(iso)
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`
}
