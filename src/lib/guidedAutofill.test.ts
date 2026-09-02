import { describe, expect, it } from 'vitest'
import type { Calendar, Term } from '../types'
import { coerceCalendar } from './json'
import {
  applyGuidedMilestones,
  canAutofill,
  computeGuidedMilestones,
  diffGuidedMilestones,
} from './guidedAutofill'

/** Calendario con un trimestre y su sesión de evaluación, más los festivos que se le pasen.
 *  El término se pasa suelto: `coerceCalendar` lo normaliza (rellena guided, provisional, etc.). */
function calWith(
  term: Record<string, unknown>,
  festivos: { date: string; kind?: string }[] = [],
): Calendar {
  return coerceCalendar({
    id: 'c',
    name: 'C',
    courseStart: '2026-09-14',
    courseEnd: '2027-06-11',
    events: festivos.map((f, i) => ({
      id: `f${i}`,
      title: 'F',
      kind: f.kind ?? 'festivoAutonomico',
      date: f.date,
    })),
    terms: [{ type: 'Primer', name: 'Primer', ...term }],
  })
}

const byKey = <T extends { key: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((i) => [i.key, i]))

describe('canAutofill', () => {
  it('los trimestres ordinarios lo admiten', () => {
    for (const type of ['Primer', 'Segundo', 'Tercer', 'Ordinaria'] as const) {
      expect(canAutofill(coerceCalendar({ terms: [{ type, name: type }] }).terms[0])).toBe(true)
    }
  })
  it('Anticipación y Extraordinaria no', () => {
    for (const type of ['Anticipacion', 'Extraordinaria'] as const) {
      expect(canAutofill(coerceCalendar({ terms: [{ type, name: type }] }).terms[0])).toBe(false)
    }
  })
  it('Ordinaria enlazada al 3.º tampoco (ya se sincroniza)', () => {
    const t = coerceCalendar({ terms: [{ type: 'Ordinaria', name: 'O', linkedToTercer: true }] }).terms[0]
    expect(canAutofill(t)).toBe(false)
  })
})

describe('computeGuidedMilestones', () => {
  it('sin sesión de evaluación no propone nada', () => {
    const cal = calWith({ startDate: '2026-09-14', guided: {} })
    expect(computeGuidedMilestones(cal, cal.terms[0])).toEqual([])
  })

  // Regresión contra el calendario real 26/27: la sesión del 1.º (09→11 dic) debe generar las
  // fechas exactas que el usuario tenía puestas a mano.
  it('reproduce las fechas reales del Primer trimestre 26/27', () => {
    const cal = calWith(
      {
        startDate: '2026-09-14',
        guided: { sesionEvaluacion: { range: { start: '2026-12-09', end: '2026-12-11' } } },
      },
      [{ date: '2026-12-08' }], // Immaculada, festivo previo a la cascada
    )
    const m = byKey(computeGuidedMilestones(cal, cal.terms[0]))
    expect(m.itacaNotasFinDocentes).toMatchObject({ date: '2026-12-11' })
    expect(m.itacaNotasFinRectificacion).toMatchObject({ date: '2026-12-14' }) // salta el finde
    expect(m.webFamiliaVisibilidad).toMatchObject({ date: '2026-12-15' })
    expect(m.impresionActas).toMatchObject({ date: '2026-12-15' })
    expect(m.firmaActas).toMatchObject({ start: '2026-12-16', end: '2026-12-18' })
    expect(m.plazoReclamacion).toMatchObject({ start: '2026-12-16', end: '2026-12-18' })
  })

  it('las vacaciones cuentan como inhábiles: un plazo las salta', () => {
    // Sesión que acaba justo antes de Navidad; la rectificación cae en la semana de vacaciones.
    const cal = calWith(
      {
        startDate: '2026-09-14',
        guided: { sesionEvaluacion: { date: '2026-12-18' } }, // viernes
      },
      [{ date: '2026-12-21', kind: 'vacaciones' }, { date: '2026-12-22', kind: 'vacaciones' }],
    )
    const m = byKey(computeGuidedMilestones(cal, cal.terms[0]))
    // 18 vie → +1 hábil debe saltar finde (19,20) y vacaciones (21,22) → 23 mié.
    expect(m.itacaNotasFinRectificacion).toMatchObject({ date: '2026-12-23' })
  })
})

describe('diff y aplicar', () => {
  const cal = calWith({
    startDate: '2026-09-14',
    guided: {
      sesionEvaluacion: { range: { start: '2026-12-09', end: '2026-12-11' } },
      itacaNotasFinDocentes: { date: '2026-12-11' }, // ya coincide
      firmaActas: { range: { start: '2026-12-16', end: '2026-12-22' } }, // el usuario la alargó
    },
  })
  const proposed = computeGuidedMilestones(cal, cal.terms[0])

  it('marca como cambio lo que difiere y como igual lo que coincide', () => {
    const d = byKey(diffGuidedMilestones(cal.terms[0], proposed))
    expect(d.itacaNotasFinDocentes.changes).toBe(false) // igual
    expect(d.firmaActas.changes).toBe(true) // el usuario la editó
    expect(d.webFamiliaVisibilidad.changes).toBe(true) // estaba vacío
  })

  it('aplica solo lo seleccionado y conserva perfiles y provisional', () => {
    const term: Term = {
      ...cal.terms[0],
      guided: {
        ...cal.terms[0].guided,
        webFamiliaVisibilidad: { date: null, range: null, provisional: true, profiles: ['gestion'] },
      },
    }
    const g = applyGuidedMilestones(term, proposed, new Set(['webFamiliaVisibilidad']))
    expect(g.webFamiliaVisibilidad).toMatchObject({
      date: '2026-12-15',
      provisional: true,
      profiles: ['gestion'],
    })
    // Un hito no seleccionado no se toca (firmaActas sigue con el rango largo del usuario).
    expect(g.firmaActas.range?.end).toBe('2026-12-22')
  })
})
