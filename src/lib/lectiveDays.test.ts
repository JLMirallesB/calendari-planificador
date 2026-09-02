import { describe, expect, it } from 'vitest'
import type { Calendar, CalEvent } from '../types'
import { coerceCalendar } from './json'
import { isLectiveDay, totalLectiveDays } from './lectiveDays'

/** Curso de una sola semana (lun 14 → vie 18 de septiembre de 2026) para contar a mano. */
const semana = (events: Partial<CalEvent>[] = []): Calendar =>
  coerceCalendar({
    id: 'cal_test',
    name: 'Semana',
    courseStart: '2026-09-14',
    courseEnd: '2026-09-18',
    restWeekdays: [6, 0],
    events,
  })

describe('totalLectiveDays', () => {
  it('cuenta los días del curso descontando el descanso semanal', () => {
    expect(totalLectiveDays(semana())).toBe(5)
    // Ampliando el curso al fin de semana no aparecen días lectivos nuevos.
    const conFinDeSemana = { ...semana(), courseEnd: '2026-09-20' }
    expect(totalLectiveDays(conFinDeSemana)).toBe(5)
  })

  it('sin fechas de curso no cuenta nada', () => {
    expect(totalLectiveDays({ ...semana(), courseStart: null })).toBe(0)
  })

  it('un festivo resta un día', () => {
    const cal = semana([{ title: 'Festivo', kind: 'festivoAutonomico', date: '2026-09-16' }])
    expect(totalLectiveDays(cal)).toBe(4)
  })

  it('un periodo de vacaciones resta todos sus días lectivos', () => {
    const cal = semana([
      { title: 'Vacaciones', kind: 'vacaciones', range: { start: '2026-09-15', end: '2026-09-17' } },
    ])
    expect(totalLectiveDays(cal)).toBe(2)
  })

  it('«festivo convertido en lectivo» manda sobre el festivo', () => {
    const cal = semana([
      { title: 'Festivo', kind: 'festivoAutonomico', date: '2026-09-16' },
      { title: 'Recuperado', kind: 'festivoALectivo', date: '2026-09-16' },
    ])
    expect(totalLectiveDays(cal)).toBe(5)
    expect(isLectiveDay(cal, '2026-09-16')).toBe(true)
  })

  it('un evento fuera del curso no cambia la cuenta', () => {
    const cal = semana([{ title: 'Festivo', kind: 'festivoAutonomico', date: '2026-10-09' }])
    expect(totalLectiveDays(cal)).toBe(5)
  })
})

describe('isLectiveDay', () => {
  it('los días fuera del curso no son lectivos', () => {
    const cal = semana()
    expect(isLectiveDay(cal, '2026-09-13')).toBe(false)
    expect(isLectiveDay(cal, '2026-09-19')).toBe(false)
  })

  it('respeta restWeekdays personalizados', () => {
    // Un centro que además descansa los lunes.
    const cal = { ...semana(), restWeekdays: [6, 0, 1] }
    expect(isLectiveDay(cal, '2026-09-14')).toBe(false)
    expect(isLectiveDay(cal, '2026-09-15')).toBe(true)
    expect(totalLectiveDays(cal)).toBe(4)
  })
})
