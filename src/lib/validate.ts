import type { Calendar } from '../types'
import { isLectiveDay, eventDates } from './lectiveDays'

/**
 * Validación **no bloqueante** de un calendario: detecta incoherencias y descuidos frecuentes, y
 * devuelve avisos para que el editor los liste. Nunca impide guardar ni publicar; solo señala.
 *
 * Cada aviso trae una clave i18n (`messageKey`) con sus parámetros, y opcionalmente un `target`
 * para saltar a la fila afectada (mismo esquema de anclas que `editTarget`).
 *
 * Función pura: sin React ni acceso al DOM, para poder probarla.
 */
export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  /** Identificador estable del tipo de aviso (para tests y para no repetir). */
  code: string
  severity: IssueSeverity
  messageKey: string
  params?: Record<string, string | number>
  /** Salto al elemento del editor, cuando aplica. */
  target?: { sectionId: string; anchorId: string }
}

/** Sección del editor a la que pertenece un tipo de evento (igual que en editTarget). */
function sectionForKind(kind: string): string {
  if (['vacaciones', 'festivoAutonomico', 'festivoLocal', 'festivoALectivo', 'noLaborable'].includes(kind))
    return 'events-vac'
  if (['claustro', 'cocope', 'consejoEscolar', 'pruebaAcceso'].includes(kind)) return 'events-inst'
  return 'events-otro'
}

/** Nombre corto de un evento para el mensaje (título, o su tipo si no tiene). */
function eventLabel(title: string, kind: string): string {
  return title.trim() || `(${kind})`
}

export function validateCalendar(cal: Calendar): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // 1 · Fin de curso anterior o igual al inicio.
  if (cal.courseStart && cal.courseEnd && cal.courseEnd <= cal.courseStart) {
    issues.push({
      code: 'course-range',
      severity: 'error',
      messageKey: 'validate.courseRange',
      params: { start: cal.courseStart, end: cal.courseEnd },
      target: { sectionId: 'course', anchorId: 'course-dates' },
    })
  }

  // 9 · Inicio de curso en día no lectivo (sábado/domingo por restWeekdays, o festivo).
  if (cal.courseStart && cal.courseEnd && cal.courseStart < cal.courseEnd && !isLectiveDay(cal, cal.courseStart)) {
    issues.push({
      code: 'course-start-nonlective',
      severity: 'warning',
      messageKey: 'validate.courseStartNonLective',
      params: { start: cal.courseStart },
      target: { sectionId: 'course', anchorId: 'course-dates' },
    })
  }

  // 3 · Eventos con rango invertido · 5 · eventos fuera del curso · 11 · eventos sin título.
  for (const ev of cal.events) {
    const target = { sectionId: sectionForKind(ev.kind), anchorId: `ev-${ev.id}` }
    const label = eventLabel(ev.title, ev.kind)

    if (ev.range && ev.range.start && ev.range.end && ev.range.end < ev.range.start) {
      issues.push({
        code: 'event-range',
        severity: 'error',
        messageKey: 'validate.eventRange',
        params: { title: label, start: ev.range.start, end: ev.range.end },
        target,
      })
    }

    // Hora de fin anterior a la de inicio (mismo día).
    if (ev.startTime && ev.endTime && ev.endTime < ev.startTime) {
      issues.push({
        code: 'event-time-range',
        severity: 'error',
        messageKey: 'validate.eventTimeRange',
        params: { title: label, start: ev.startTime, end: ev.endTime },
        target,
      })
    }

    if (!ev.title.trim()) {
      issues.push({
        code: 'event-untitled',
        severity: 'warning',
        messageKey: 'validate.eventUntitled',
        params: { date: eventDates(ev)[0] ?? '' },
        target,
      })
    }

    // 5 · fuera del curso: solo si el curso tiene fechas y son coherentes.
    if (cal.courseStart && cal.courseEnd && cal.courseStart < cal.courseEnd) {
      const days = eventDates(ev)
      if (days.length && days.every((d) => d < cal.courseStart! || d > cal.courseEnd!)) {
        issues.push({
          code: 'event-outside-course',
          severity: 'warning',
          messageKey: 'validate.eventOutsideCourse',
          params: { title: label, date: days[0] },
          target,
        })
      }
    }
  }

  // Trimestres con fecha de inicio, en su orden de aparición.
  const withStart = cal.terms.filter((t) => t.startDate)

  // 2 · Trimestre con fin anterior al inicio · 4 · hito guiado con rango invertido.
  for (const term of cal.terms) {
    const anchor = { sectionId: 'terms', anchorId: `term-${term.id}` }
    if (term.startDate && term.endDate && term.endDate < term.startDate) {
      issues.push({
        code: 'term-range',
        severity: 'error',
        messageKey: 'validate.termRange',
        params: { name: term.name, start: term.startDate, end: term.endDate },
        target: anchor,
      })
    }
    for (const [key, v] of Object.entries(term.guided)) {
      if (v.range && v.range.start && v.range.end && v.range.end < v.range.start) {
        issues.push({
          code: 'guided-range',
          severity: 'error',
          messageKey: 'validate.guidedRange',
          params: { name: term.name, key, start: v.range.start, end: v.range.end },
          target: { sectionId: 'terms', anchorId: `guided-${term.id}-${key}` },
        })
      }
    }
  }

  // 8 · Trimestres desordenados: un inicio anterior al del trimestre previo (por orden en la lista).
  for (let i = 1; i < withStart.length; i++) {
    const prev = withStart[i - 1]
    const cur = withStart[i]
    if (cur.startDate! < prev.startDate!) {
      issues.push({
        code: 'terms-unordered',
        severity: 'warning',
        messageKey: 'validate.termsUnordered',
        params: { name: cur.name, prev: prev.name },
        target: { sectionId: 'terms', anchorId: `term-${cur.id}` },
      })
    }
  }

  // 7 · Trimestres solapados: el fin efectivo de uno cae dentro del siguiente. El fin efectivo es
  //     `endDate` si existe; si no, el día anterior al inicio del siguiente trimestre con fecha.
  const sorted = [...withStart].sort((a, b) => a.startDate!.localeCompare(b.startDate!))
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    // Sin endDate, el trimestre acaba justo antes del siguiente: por definición no solapa.
    if (a.endDate && a.endDate >= b.startDate!) {
      issues.push({
        code: 'terms-overlap',
        severity: 'warning',
        messageKey: 'validate.termsOverlap',
        params: { a: a.name, b: b.name, end: a.endDate, start: b.startDate! },
        target: { sectionId: 'terms', anchorId: `term-${a.id}` },
      })
    }
  }

  return issues
}
