import { describe, expect, it } from 'vitest'
import { coerceCalendar, parseCalendar, serializeCalendar } from './json'

describe('coerceCalendar: qué acepta', () => {
  it('rechaza lo que no es un objeto', () => {
    for (const basura of [42, 'hola', true, null, undefined, [1, 2]]) {
      expect(() => coerceCalendar(basura)).toThrow()
    }
  })

  it('acepta un objeto casi vacío y lo completa', () => {
    const c = coerceCalendar({})
    expect(c.id).toMatch(/^cal_/)
    expect(c.restWeekdays).toEqual([6, 0])
    expect(c.profiles.length).toBeGreaterThan(0)
    expect(c.terms.length).toBeGreaterThan(0)
    expect(c.events).toEqual([])
  })

  it('conserva el id, que es lo que mantiene vivos los feeds', () => {
    expect(coerceCalendar({ id: 'cal_ejemplo' }).id).toBe('cal_ejemplo')
  })
})

describe('coerceCalendar: saneado de campos', () => {
  it('descarta fechas de curso inválidas en vez de propagarlas', () => {
    const c = coerceCalendar({ courseStart: '14/09/2026', courseEnd: '2027-06-11' })
    expect(c.courseStart).toBeNull()
    expect(c.courseEnd).toBe('2027-06-11')
  })

  it('un tipo de evento desconocido pasa a «otro» en vez de romper la app', () => {
    const c = coerceCalendar({ events: [{ title: 'X', kind: 'inventado', date: '2026-12-17' }] })
    expect(c.events[0].kind).toBe('otro')
  })

  it('un rango incompleto se descarta', () => {
    const c = coerceCalendar({
      events: [{ title: 'X', kind: 'otro', range: { start: '2026-12-17' } }],
    })
    expect(c.events[0].range).toBeNull()
  })

  it('los días de descanso fuera de 0..6 se filtran', () => {
    expect(coerceCalendar({ restWeekdays: [6, 0, 9, -1, 'x'] }).restWeekdays).toEqual([6, 0])
  })
})

describe('guardar y volver a leer', () => {
  // Invariante del flujo «Guardar en el archivo» → «Abrir desde archivo»: la ida y vuelta por
  // disco no puede perder ni cambiar nada, o cada guardado degradaría un poco el calendario.
  it('serializar y parsear devuelve exactamente lo mismo', () => {
    const original = coerceCalendar({
      id: 'cal_ejemplo',
      name: 'Calendario del curso 26/27',
      community: 'Conservatorio de ejemplo',
      courseStart: '2026-09-14',
      courseEnd: '2027-06-11',
      restWeekdays: [6, 0],
      profiles: [
        { id: 'docentes', name: 'Docentes', color: '#2563eb' },
        { id: 'admin', name: 'Administración', color: '#9333ea' },
      ],
      events: [
        { id: 'ev_1', title: 'COCOPE', kind: 'cocope', date: '2026-09-03', profiles: ['docentes'] },
        {
          id: 'ev_2',
          title: 'Nadal',
          kind: 'vacaciones',
          range: { start: '2026-12-22', end: '2027-01-06' },
          provisional: true,
        },
      ],
    })

    const ida = parseCalendar(serializeCalendar(original))
    expect(ida).toEqual(original)
    // Y una segunda vuelta tampoco lo mueve (idempotente).
    expect(parseCalendar(serializeCalendar(ida))).toEqual(original)
  })

  it('un JSON que no es un calendario da error legible al importar', () => {
    expect(() => parseCalendar('[]')).toThrow()
    expect(() => parseCalendar('no soy json')).toThrow()
  })
})
