import { describe, expect, it } from 'vitest'
import type { Calendar, CalEvent } from '../types'
import { coerceCalendar } from './json'
import { captionsByMonth, monthKey, occurrencesByDay } from './printData'

/** Curso de septiembre a octubre de 2026, para cruzar el límite de mes. */
const curso = (events: Partial<CalEvent>[] = []): Calendar =>
  coerceCalendar({
    id: 'cal_test',
    name: 'Curso',
    courseStart: '2026-09-01',
    courseEnd: '2026-10-31',
    restWeekdays: [6, 0],
    profiles: [
      { id: 'docentes', name: 'Docentes' },
      { id: 'alumnado', name: 'Alumnado' },
    ],
    terms: [],
    events,
  })

const viaje = {
  title: 'Viaje',
  kind: 'otro' as const,
  range: { start: '2026-09-29', end: '2026-10-03' },
}

const titulos = (m: Map<string, { title: string }[]>, year: number, month: number) =>
  (m.get(monthKey(year, month)) ?? []).map((o) => o.title)

describe('captionsByMonth', () => {
  it('repite un rango en la leyenda de cada mes que toca', () => {
    // El compacto pinta punto los cinco días del viaje, tres de ellos en octubre: si la fila
    // solo saliera en septiembre, esos puntos quedarían sin explicación en su recuadro.
    const caps = captionsByMonth(curso([viaje]), null)
    expect(titulos(caps, 2026, 8)).toEqual(['Viaje'])
    expect(titulos(caps, 2026, 9)).toEqual(['Viaje'])
  })

  it('un evento de un solo día sale únicamente en su mes', () => {
    const caps = captionsByMonth(curso([{ title: 'Concierto', kind: 'otro', date: '2026-10-15' }]), null)
    expect(titulos(caps, 2026, 8)).toEqual([])
    expect(titulos(caps, 2026, 9)).toEqual(['Concierto'])
  })

  it('respeta el filtro por perfil en todos los meses del rango', () => {
    const cal = curso([{ ...viaje, profiles: ['docentes'] }])
    for (const month of [8, 9]) {
      expect(titulos(captionsByMonth(cal, 'docentes'), 2026, month)).toEqual(['Viaje'])
      expect(titulos(captionsByMonth(cal, 'alumnado'), 2026, month)).toEqual([])
    }
  })

  it('excluye los inicios de trimestre, que ya tienen su marca en la cuadrícula', () => {
    const cal: Calendar = {
      ...curso(),
      terms: [{ ...coerceCalendar({ terms: [{ name: 'Primer trimestre' }] }).terms[0], startDate: '2026-09-14' }],
    }
    expect(titulos(captionsByMonth(cal, null), 2026, 8)).toEqual([])
    // Pero el punto sí se pinta ese día: la leyenda general lo explica.
    expect(occurrencesByDay(cal, null).get('2026-09-14')?.map((o) => o.kind)).toEqual(['termStart'])
  })
})
