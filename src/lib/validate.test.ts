import { describe, expect, it } from 'vitest'
import type { Calendar } from '../types'
import { coerceCalendar } from './json'
import { validateCalendar } from './validate'

const base = (over: Record<string, unknown> = {}): Calendar =>
  coerceCalendar({
    id: 'c',
    name: 'C',
    courseStart: '2026-09-14',
    courseEnd: '2027-06-11',
    restWeekdays: [6, 0],
    terms: [],
    events: [],
    ...over,
  })

const codes = (cal: Calendar) => validateCalendar(cal).map((i) => i.code).sort()

describe('un calendario sano no da avisos', () => {
  it('curso coherente, sin eventos ni trimestres problemáticos', () => {
    const cal = base({
      events: [{ title: 'Concierto', kind: 'otro', date: '2026-12-17' }],
    })
    expect(validateCalendar(cal)).toEqual([])
  })
})

describe('curso', () => {
  it('1 · fin de curso anterior o igual al inicio', () => {
    expect(codes(base({ courseStart: '2027-06-11', courseEnd: '2026-09-14' }))).toContain('course-range')
    expect(codes(base({ courseStart: '2026-09-14', courseEnd: '2026-09-14' }))).toContain('course-range')
  })

  it('9 · inicio de curso en día no lectivo (fin de semana)', () => {
    // 2026-09-13 es domingo.
    const cal = base({ courseStart: '2026-09-13', courseEnd: '2027-06-11' })
    expect(codes(cal)).toContain('course-start-nonlective')
  })

  it('9 · inicio de curso en festivo', () => {
    const cal = base({
      courseStart: '2026-10-09',
      courseEnd: '2027-06-11',
      events: [{ title: '9 d’Octubre', kind: 'festivoAutonomico', date: '2026-10-09' }],
    })
    expect(codes(cal)).toContain('course-start-nonlective')
  })

  it('un inicio en día lectivo normal no avisa', () => {
    // 2026-09-14 es lunes.
    expect(codes(base())).not.toContain('course-start-nonlective')
  })
})

describe('eventos', () => {
  it('3 · rango de evento invertido', () => {
    const cal = base({
      events: [{ title: 'Viaje', kind: 'otro', range: { start: '2026-10-10', end: '2026-10-05' } }],
    })
    expect(codes(cal)).toContain('event-range')
  })

  it('5 · evento fuera del curso', () => {
    const cal = base({ events: [{ title: 'Prueba julio', kind: 'pruebaAcceso', date: '2027-07-01' }] })
    expect(codes(cal)).toContain('event-outside-course')
  })

  it('un evento dentro del curso no avisa de estar fuera', () => {
    const cal = base({ events: [{ title: 'X', kind: 'otro', date: '2026-12-17' }] })
    expect(codes(cal)).not.toContain('event-outside-course')
  })

  it('11 · evento sin título', () => {
    const cal = base({ events: [{ title: '   ', kind: 'otro', date: '2026-12-17' }] })
    expect(codes(cal)).toContain('event-untitled')
  })
})

describe('trimestres', () => {
  it('2 · trimestre con fin anterior al inicio', () => {
    const cal = base({
      terms: [{ type: 'Primer', name: 'Primer', startDate: '2026-12-04', endDate: '2026-09-14' }],
    })
    expect(codes(cal)).toContain('term-range')
  })

  it('4 · hito guiado con rango invertido', () => {
    const cal = base({
      terms: [
        {
          type: 'Primer',
          name: 'Primer',
          startDate: '2026-09-14',
          guidedEnabled: true,
          guided: { firmaActas: { range: { start: '2026-12-18', end: '2026-12-16' } } },
        },
      ],
    })
    expect(codes(cal)).toContain('guided-range')
  })

  it('7 · trimestres solapados', () => {
    const cal = base({
      terms: [
        { type: 'Primer', name: 'Primer', startDate: '2026-09-14', endDate: '2026-12-20' },
        { type: 'Segundo', name: 'Segundo', startDate: '2026-12-07', endDate: '2027-02-26' },
      ],
    })
    expect(codes(cal)).toContain('terms-overlap')
  })

  it('trimestres contiguos sin endDate no solapan', () => {
    const cal = base({
      terms: [
        { type: 'Primer', name: 'Primer', startDate: '2026-09-14' },
        { type: 'Segundo', name: 'Segundo', startDate: '2026-12-07' },
      ],
    })
    expect(codes(cal)).not.toContain('terms-overlap')
  })

  it('8 · trimestres desordenados en la lista', () => {
    const cal = base({
      terms: [
        { type: 'Primer', name: 'Primer', startDate: '2027-01-10' },
        { type: 'Segundo', name: 'Segundo', startDate: '2026-09-14' },
      ],
    })
    expect(codes(cal)).toContain('terms-unordered')
  })
})

describe('estructura del aviso', () => {
  it('trae severidad y un target para saltar a la fila', () => {
    const cal = base({
      events: [{ id: 'ev_x', title: 'V', kind: 'otro', range: { start: '2026-10-10', end: '2026-10-05' } }],
    })
    const issue = validateCalendar(cal).find((i) => i.code === 'event-range')!
    expect(issue.severity).toBe('error')
    expect(issue.target).toEqual({ sectionId: 'events-otro', anchorId: 'ev-ev_x' })
  })
})
