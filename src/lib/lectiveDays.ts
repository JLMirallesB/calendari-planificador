import type { Calendar, ISODate, Term, TermType } from '../types'
import {
  addDays,
  daysBetween,
  eachDay,
  nearestMonday,
  weekday,
  weeksSpanned,
  WEEKDAY_ORDER,
  WEEKDAY_NAMES,
} from './dateUtils'
import { habilSets, isHabil, isLectiveDay, lectiveSets } from './lectiveCore'

// El cómputo básico —qué día es lectivo, qué día es hábil— vive en `lectiveCore.js`, JS plano,
// porque también lo necesitan los scripts de Node, que importan sin transpilar. Se re-exporta
// aquí para no cambiar de sitio a quien ya lo usaba.
export { eventDates, habilSets, isHabil, isLectiveDay, lectiveSets } from './lectiveCore'
export type { HabilSets, LectiveSets } from './lectiveCore'

/**
 * Reparte el curso en tres trimestres de duración (en días de calendario) lo más
 * igual posible, alineando el inicio del 2.º y 3.º trimestre al lunes más cercano.
 * El 1.º empieza el primer día de curso. Devuelve las tres fechas de inicio (ISO).
 */
export function equalTrimesterStarts(
  courseStart: ISODate,
  courseEnd: ISODate,
): { primer: ISODate; segundo: ISODate; tercer: ISODate } {
  const total = daysBetween(courseStart, courseEnd)
  const segundo = nearestMonday(addDays(courseStart, Math.round(total / 3)))
  const tercer = nearestMonday(addDays(courseStart, Math.round((2 * total) / 3)))
  return { primer: courseStart, segundo, tercer }
}

/**
 * Plazo de reclamación: 3 días hábiles a computar desde el día siguiente a la fecha de
 * comunicación (visibilidad de notas). Devuelve el primer y el tercer día hábil.
 */
export function reclamacionRange(cal: Calendar, comunicacion: ISODate): { start: ISODate; end: ISODate } {
  const s = habilSets(cal)
  let d = addDays(comunicacion, 1)
  while (!isHabil(cal, d, s)) d = addDays(d, 1)
  const start = d
  let count = 1
  while (count < 3) {
    d = addDays(d, 1)
    if (isHabil(cal, d, s)) count++
  }
  return { start, end: d }
}

/** Total de días lectivos del curso completo. */
export function totalLectiveDays(cal: Calendar): number {
  if (!cal.courseStart || !cal.courseEnd) return 0
  const sets = lectiveSets(cal)
  let count = 0
  for (const iso of eachDay(cal.courseStart, cal.courseEnd)) {
    if (isLectiveDay(cal, iso, sets)) count++
  }
  return count
}

export interface TermRange {
  term: Term
  start: ISODate
  end: ISODate
}

const TRIMESTER_TYPES: TermType[] = ['Primer', 'Segundo', 'Tercer']

/**
 * Rangos de los tres trimestres (Primer/Segundo/Tercer) calculados de forma independiente
 * al resto de periodos: cada uno acaba el día anterior al inicio del siguiente trimestre
 * (o al fin de curso el último). Útil para mostrar inicio y fin de cada trimestre.
 */
export function trimesterRanges(cal: Calendar): TermRange[] {
  if (!cal.courseEnd) return []
  const tri = cal.terms
    .filter((t): t is Term & { startDate: ISODate } => TRIMESTER_TYPES.includes(t.type) && !!t.startDate)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
  return tri.map((term, i) => ({
    term,
    start: term.startDate,
    end: term.endDate ?? (tri[i + 1] ? addDays(tri[i + 1].startDate, -1) : (cal.courseEnd as ISODate)),
  }))
}

/**
 * Calcula el rango efectivo de cada trimestre que tenga fecha de inicio.
 * Fin = endDate explícito; si no, día anterior al inicio del siguiente trimestre;
 * si no hay siguiente, el fin de curso.
 */
export function computeTermRanges(cal: Calendar): TermRange[] {
  const withStart = cal.terms.filter((t) => t.startDate) as (Term & { startDate: ISODate })[]
  const sorted = [...withStart].sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
  const ranges: TermRange[] = []
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]
    let end = t.endDate
    if (!end) {
      const next = sorted[i + 1]
      if (next) end = addDays(next.startDate, -1)
      else end = cal.courseEnd
    }
    if (!end) continue
    ranges.push({ term: t, start: t.startDate, end })
  }
  return ranges
}

export interface WeekdayCount {
  weekday: number // getDay()
  label: string
  count: number
}

export interface TermStats {
  termId: string
  termName: string
  start: ISODate
  end: ISODate
  weeks: number
  lectiveDays: number
  byWeekday: WeekdayCount[] // ordenado lunes→domingo
}

/** Estadísticas por trimestre: semanas, días lectivos y recuento por día de la semana. */
export function computeTermStats(cal: Calendar): TermStats[] {
  const sets = lectiveSets(cal)
  return computeTermRanges(cal).map(({ term, start, end }) => {
    const byWeekdayMap = new Map<number, number>()
    WEEKDAY_ORDER.forEach((wd) => byWeekdayMap.set(wd, 0))
    let lectiveDays = 0
    for (const iso of eachDay(start, end)) {
      if (isLectiveDay(cal, iso, sets)) {
        lectiveDays++
        const wd = weekday(iso)
        byWeekdayMap.set(wd, (byWeekdayMap.get(wd) ?? 0) + 1)
      }
    }
    const byWeekday: WeekdayCount[] = WEEKDAY_ORDER.map((wd) => ({
      weekday: wd,
      label: WEEKDAY_NAMES[wd],
      count: byWeekdayMap.get(wd) ?? 0,
    }))
    return {
      termId: term.id,
      termName: term.name,
      start,
      end,
      weeks: weeksSpanned(start, end),
      lectiveDays,
      byWeekday,
    }
  })
}
