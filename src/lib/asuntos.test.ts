import { describe, expect, it } from 'vitest'
import type { Calendar } from '../types'
import { coerceCalendar } from './json'
import { buildAsuntosCSV, buildAsuntosMeta, computeAsuntos, type AsuntosConfig } from './asuntos'

// Curso inventado (NO son fechas de ningún centro real: estos tests viajan al repo público).
// Lunes 7 de septiembre de 2026 → viernes 18 de junio de 2027.
const CURSO_START = '2026-09-07'
const CURSO_END = '2027-06-18'

const NAVIDAD: Record<string, unknown> = {
  id: 'ev-navidad',
  title: 'Vacaciones de Navidad',
  kind: 'vacaciones',
  range: { start: '2026-12-21', end: '2027-01-06' },
}

const term = (type: string, guided: Record<string, unknown>): Record<string, unknown> => ({
  id: `term-${type}`,
  type,
  name: type,
  guidedEnabled: true,
  guided,
})

const curso = (over: Record<string, unknown> = {}): Calendar =>
  coerceCalendar({
    id: 'cal_test',
    name: 'Curso de prueba',
    courseStart: CURSO_START,
    courseEnd: CURSO_END,
    restWeekdays: [6, 0],
    events: [NAVIDAD],
    terms: [],
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...over,
  })

const cfg = (over: Partial<AsuntosConfig> = {}): Partial<AsuntosConfig> => ({
  inicioCurso: 7,
  finCurso: 7,
  ventanas: [{ code: 'navidad', eventIds: ['ev-navidad'], antes: 7, despues: 7 }],
  ...over,
})

/** Atajo: la fila de un día concreto. */
const dia = (cal: Calendar, fecha: string, config: Partial<AsuntosConfig> = cfg()) =>
  computeAsuntos(cal, { config }).rows.find((r) => r.fecha === fecha)!

describe('computeAsuntos · rango y tipo de día', () => {
  it('cubre del 1 de septiembre al 31 de julio, no el periodo lectivo', () => {
    const { rango, rows } = computeAsuntos(curso(), { config: cfg() })
    expect(rango).toEqual({ desde: '2026-09-01', hasta: '2027-07-31' })
    expect(rows[0].fecha).toBe('2026-09-01')
    expect(rows[rows.length - 1].fecha).toBe('2027-07-31')
  })

  it('sin fechas de curso no devuelve nada que publicar', () => {
    const r = computeAsuntos(curso({ courseStart: null }), { config: cfg() })
    expect(r.rango).toBeNull()
    expect(r.rows).toEqual([])
    expect(r.reglasIncompletas).toContain('curso_sin_fechas')
  })

  it('distingue las tres categorías', () => {
    const cal = curso()
    // Martes 1 de septiembre: laborable, aún sin clase → cuenta de la bolsa no lectiva.
    expect(dia(cal, '2026-09-01').tipoDia).toBe('no_lectivo')
    // Miércoles 30 de septiembre: día de clase.
    expect(dia(cal, '2026-09-30').tipoDia).toBe('lectivo')
    // Sábado.
    expect(dia(cal, '2026-09-05').tipoDia).toBe('no_laborable')
    // Dentro de las vacaciones de Navidad.
    expect(dia(cal, '2026-12-28').tipoDia).toBe('no_laborable')
    // Lunes 21 de junio, ya acabado el curso: laborable sin clase.
    expect(dia(cal, '2027-06-21').tipoDia).toBe('no_lectivo')
  })

  it('dentro del curso no hay ningún día no_lectivo', () => {
    const { rows } = computeAsuntos(curso(), { config: cfg() })
    const dentro = rows.filter((r) => r.fecha >= CURSO_START && r.fecha <= CURSO_END)
    expect(dentro.some((r) => r.tipoDia === 'no_lectivo')).toBe(false)
  })

  it('un día laborable sin clase fuera del curso es pedible', () => {
    expect(dia(curso(), '2026-09-01').pedible).toBe(true)
    expect(dia(curso(), '2027-07-15').pedible).toBe(true)
  })
})

describe('computeAsuntos · inicio y fin de curso', () => {
  it('bloquea los 7 primeros días lectivos, contando el primero como 1.º', () => {
    const cal = curso()
    expect(dia(cal, '2026-09-07').motivos).toContain('inicio_curso') // 1.º
    expect(dia(cal, '2026-09-15').motivos).toContain('inicio_curso') // 7.º
    expect(dia(cal, '2026-09-16').pedible).toBe(true) // 8.º, ya se puede
  })

  it('cuenta días lectivos, no días naturales: un festivo por medio corre la cuenta', () => {
    const cal = curso({
      events: [NAVIDAD, { id: 'ev-f', title: 'Festivo', kind: 'festivoAutonomico', date: '2026-09-09' }],
    })
    // Con el festivo, el 7.º día lectivo pasa del 15 al 16 de septiembre.
    expect(dia(cal, '2026-09-16').motivos).toContain('inicio_curso')
    expect(dia(cal, '2026-09-17').pedible).toBe(true)
  })

  it('bloquea los 7 últimos días lectivos', () => {
    const cal = curso()
    expect(dia(cal, '2027-06-18').motivos).toContain('fin_curso') // último
    expect(dia(cal, '2027-06-10').motivos).toContain('fin_curso') // 7.º por la cola
    expect(dia(cal, '2027-06-09').pedible).toBe(true)
  })
})

describe('computeAsuntos · ventanas alrededor de un ancla', () => {
  it('cuenta hacia atrás desde el último día lectivo anterior al periodo', () => {
    const cal = curso()
    expect(dia(cal, '2026-12-18').motivos).toContain('navidad') // 1.º hacia atrás
    expect(dia(cal, '2026-12-10').motivos).toContain('navidad') // 7.º
    expect(dia(cal, '2026-12-09').pedible).toBe(true) // 8.º
  })

  it('cuenta hacia delante desde el primer día lectivo posterior al periodo', () => {
    const cal = curso()
    expect(dia(cal, '2027-01-07').motivos).toContain('navidad') // 1.º hacia delante
    expect(dia(cal, '2027-01-15').motivos).toContain('navidad') // 7.º
    expect(dia(cal, '2027-01-18').pedible).toBe(true) // 8.º
  })

  it('una fiesta de varios días se ancla a su primer y último día', () => {
    const magdalena = {
      id: 'ev-magdalena',
      title: 'Magdalena',
      kind: 'festivoLocal',
      range: { start: '2027-03-15', end: '2027-03-16' },
    }
    const cal = curso({ events: [NAVIDAD, magdalena] })
    const config = cfg({
      ventanas: [
        { code: 'navidad', eventIds: ['ev-navidad'], antes: 7, despues: 7 },
        { code: 'fiesta_local', eventIds: ['ev-magdalena'], antes: 7, despues: 7 },
      ],
    })
    expect(dia(cal, '2027-03-12', config).motivos).toContain('fiesta_local') // 1.º hacia atrás
    expect(dia(cal, '2027-03-04', config).motivos).toContain('fiesta_local') // 7.º
    expect(dia(cal, '2027-03-03', config).pedible).toBe(true)
    expect(dia(cal, '2027-03-17', config).motivos).toContain('fiesta_local') // 1.º hacia delante
    expect(dia(cal, '2027-03-25', config).motivos).toContain('fiesta_local') // 7.º
    expect(dia(cal, '2027-03-26', config).pedible).toBe(true)
  })

  it('un festivo recuperado como lectivo es día de clase y cuenta para la ventana', () => {
    const cal = curso({
      events: [
        NAVIDAD,
        { id: 'ev-rec', title: 'Recuperado', kind: 'festivoALectivo', date: '2026-12-21' },
      ],
    })
    // El 21 deja de ser vacaciones: es lectivo y es el 1.º de la ventana hacia atrás,
    // así que la cuenta se corre un día y el 10 de diciembre ya es pedible.
    expect(dia(cal, '2026-12-21').tipoDia).toBe('lectivo')
    expect(dia(cal, '2026-12-21').motivos).toContain('navidad')
    expect(dia(cal, '2026-12-10').pedible).toBe(true)
  })

  it('un día de clase en medio del periodo también se bloquea', () => {
    // Fiesta del lunes 1 al viernes 5 de marzo con el miércoles recuperado como lectivo.
    const cal = curso({
      events: [
        NAVIDAD,
        { id: 'ev-fiesta', title: 'Fiesta', kind: 'festivoLocal', range: { start: '2027-03-01', end: '2027-03-05' } },
        { id: 'ev-rec', title: 'Recuperado', kind: 'festivoALectivo', date: '2027-03-03' },
      ],
    })
    const config = cfg({ ventanas: [{ code: 'fiesta_local', eventIds: ['ev-fiesta'], antes: 7, despues: 7 }] })
    const d = dia(cal, '2027-03-03', config)
    expect(d.tipoDia).toBe('lectivo')
    expect(d.motivos).toContain('fiesta_local')
  })

  it('la misma fiesta da lo mismo como rango que como festivos sueltos', () => {
    // Antes, como rango el centro quedaba libre y como festivos sueltos se bloqueaba.
    const comoRango = curso({
      events: [
        NAVIDAD,
        { id: 'ev-fiesta', title: 'Fiesta', kind: 'festivoLocal', range: { start: '2027-03-01', end: '2027-03-05' } },
        { id: 'ev-r1', title: 'Recuperado', kind: 'festivoALectivo', range: { start: '2027-03-02', end: '2027-03-04' } },
      ],
    })
    const comoSueltos = curso({
      events: [
        NAVIDAD,
        { id: 'ev-f1', title: 'Fiesta (lunes)', kind: 'festivoLocal', date: '2027-03-01' },
        { id: 'ev-f2', title: 'Fiesta (viernes)', kind: 'festivoLocal', date: '2027-03-05' },
      ],
    })
    const cfgRango = cfg({ ventanas: [{ code: 'fiesta_local', eventIds: ['ev-fiesta'], antes: 7, despues: 7 }] })
    const cfgSueltos = cfg({ ventanas: [{ code: 'fiesta_local', eventIds: ['ev-f1', 'ev-f2'], antes: 7, despues: 7 }] })
    for (const f of ['2027-03-02', '2027-03-03', '2027-03-04']) {
      expect(dia(comoRango, f, cfgRango).pedible).toBe(false)
      expect(dia(comoSueltos, f, cfgSueltos).pedible).toBe(false)
    }
  })

  it('si el ancla ya no existe lo dice en voz alta en vez de callarse', () => {
    const r = computeAsuntos(curso({ events: [] }), { config: cfg() })
    expect(r.reglasIncompletas).toContain('ancla_no_encontrada:navidad:ev-navidad')
  })
})

describe('computeAsuntos · evaluaciones', () => {
  const terms = [
    term('Primer', { sesionEvaluacion: { date: '2026-12-16' } }),
    term('Anticipacion', { sesionEvaluacion: { date: '2027-02-10' } }),
    term('Ordinaria', { sesionEvaluacion: { date: '2027-06-15' } }),
    term('Extraordinaria', { evaluacionExtraordinaria: { date: '2027-06-30' } }),
  ]

  it('bloquea el día de la sesión de evaluación', () => {
    const cal = curso({ terms })
    expect(dia(cal, '2026-12-16').motivos).toContain('sesion_evaluacion')
  })

  it('el tramo va de la ordinaria a la extraordinaria, ambas incluidas', () => {
    const cal = curso({ terms })
    expect(dia(cal, '2027-06-15').motivos).toContain('ordinaria_extraordinaria')
    expect(dia(cal, '2027-06-30').motivos).toContain('ordinaria_extraordinaria')
    expect(dia(cal, '2027-07-01').pedible).toBe(true)
  })

  it('el tramo se come días no lectivos y no laborables posteriores al fin de curso', () => {
    const cal = curso({ terms })
    // Lunes 21 de junio: el curso ya ha acabado, pero está dentro del tramo.
    expect(dia(cal, '2027-06-21').tipoDia).toBe('no_lectivo')
    expect(dia(cal, '2027-06-21').pedible).toBe(false)
    // Sábado dentro del tramo.
    expect(dia(cal, '2027-06-26').tipoDia).toBe('no_laborable')
  })

  it('la convocatoria anticipada queda fuera del tramo, pero su sesión se bloquea', () => {
    const cal = curso({ terms })
    expect(dia(cal, '2027-02-10').motivos).toContain('sesion_evaluacion')
    expect(dia(cal, '2027-02-10').motivos).not.toContain('ordinaria_extraordinaria')
    expect(dia(cal, '2027-02-11').pedible).toBe(true)
  })

  it('si se configura al revés, la anticipada abre el tramo', () => {
    const cal = curso({ terms })
    const config = cfg({ tramoIncluyeAnticipacion: true })
    expect(dia(cal, '2027-02-11', config).motivos).toContain('ordinaria_extraordinaria')
  })

  it('sin sesión extraordinaria no calcula el tramo y lo avisa', () => {
    const cal = curso({ terms: terms.slice(0, 3) })
    const r = computeAsuntos(cal, { config: cfg() })
    expect(r.reglasIncompletas).toContain('tramo_sin_sesion_extraordinaria')
    expect(r.rows.find((x) => x.fecha === '2027-06-21')!.pedible).toBe(true)
  })

  it('la semana de exámenes no cuenta si no está configurada como evaluación', () => {
    const cal = curso({
      terms: [term('Primer', { examenesExtraordinaria: { range: { start: '2026-11-02', end: '2026-11-06' } } })],
    })
    expect(dia(cal, '2026-11-03').pedible).toBe(true)
  })
})

describe('computeAsuntos · prioridad, provisionales y descripción', () => {
  it('el motivo principal sigue el orden fijado, y motivos los conserva todos', () => {
    // 21 de diciembre: vacaciones (no laborable) y además dentro de la ventana de Navidad
    // si se ha recuperado como lectivo; aquí basta con un día que cumpla dos supuestos.
    const cal = curso({ terms: [term('Primer', { sesionEvaluacion: { date: '2026-09-07' } })] })
    const d = dia(cal, '2026-09-07')
    expect(d.motivos).toEqual(['sesion_evaluacion', 'inicio_curso'])
    expect(d.motivoPrincipal).toBe('sesion_evaluacion')
  })

  it('marca provisional cuando lo que bloquea el día aún se mueve', () => {
    const cal = curso({
      terms: [term('Primer', { sesionEvaluacion: { date: '2026-12-16', provisional: true } })],
    })
    expect(dia(cal, '2026-12-16').provisional).toBe(true)
  })

  it('marca provisional también un día pedible que depende de una fecha sin confirmar', () => {
    const cal = curso({
      events: [{ ...NAVIDAD, provisional: true }],
    })
    // Día de vacaciones provisionales: hoy no se pide por no laborable, pero si las vacaciones
    // se caen pasará a ser lectivo. Que la hoja lo sepa.
    expect(dia(cal, '2026-12-28').provisional).toBe(true)
  })

  it('la descripción solo lleva lo que justifica el bloqueo', () => {
    const cal = curso({
      events: [
        NAVIDAD,
        { id: 'ev-claustro', title: 'Claustro extraordinario', kind: 'claustro', date: '2026-12-28' },
      ],
    })
    const d = dia(cal, '2026-12-28')
    expect(d.descripcion).toBe('Vacaciones de Navidad')
    expect(d.descripcion).not.toContain('Claustro')
  })

  it('los fines de semana van sin descripción', () => {
    expect(dia(curso(), '2026-09-05').descripcion).toBe('')
  })

  it('ningún evento interno se cuela en ninguna fila', () => {
    const cal = curso({
      events: [
        NAVIDAD,
        { id: 'e1', title: 'COCOPE', kind: 'cocope', date: '2026-10-05' },
        { id: 'e2', title: 'Consejo escolar', kind: 'consejoEscolar', date: '2026-10-06' },
        { id: 'e3', title: 'Reunión interna', kind: 'otro', date: '2026-10-07' },
        { id: 'e4', title: 'Prueba de acceso', kind: 'pruebaAcceso', date: '2026-10-08' },
      ],
    })
    const todas = computeAsuntos(cal, { config: cfg() }).rows.map((r) => r.descripcion).join(' ')
    for (const fuera of ['COCOPE', 'Consejo', 'Reunión', 'Prueba de acceso']) {
      expect(todas).not.toContain(fuera)
    }
  })
})

describe('buildAsuntosCSV', () => {
  const filas = () => computeAsuntos(curso(), { config: cfg() }).rows

  it('cabecera fija, BOM y CRLF', () => {
    const csv = buildAsuntosCSV(filas())
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')[0]).toBe(
      'fecha;tipo_dia;pedible;motivo_no_pedible;motivos;provisional;descripcion',
    )
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('un día pedible deja vacíos los dos campos de motivo', () => {
    const csv = buildAsuntosCSV(filas())
    const linea = csv.split('\r\n').find((l) => l.startsWith('2026-09-01'))!
    expect(linea).toBe('2026-09-01;no_lectivo;1;;;0;')
  })

  it('entrecomilla lo que lleve punto y coma o comillas', () => {
    const csv = buildAsuntosCSV([
      {
        fecha: '2026-12-28',
        tipoDia: 'no_laborable',
        pedible: false,
        motivoPrincipal: 'no_laborable',
        motivos: ['no_laborable'],
        provisional: false,
        descripcion: 'Vacaciones; «de "invierno"»',
      },
    ])
    expect(csv).toContain('"Vacaciones; «de ""invierno""»"')
  })
})

describe('buildAsuntosMeta', () => {
  it('lleva lo que hace falta para detectar datos viejos y no lleva el nombre del centro', () => {
    const cal = curso()
    const r = computeAsuntos(cal, { config: cfg() })
    const meta = buildAsuntosMeta(cal, r, '2026-09-02T00:00:00.000Z') as Record<string, unknown>
    expect(meta.updatedAt).toBe('2026-09-01T10:00:00.000Z')
    expect(meta.generatedAt).toBe('2026-09-02T00:00:00.000Z')
    expect(meta.rango).toEqual({ desde: '2026-09-01', hasta: '2027-07-31' })
    expect(JSON.stringify(meta)).not.toContain(cal.name)
  })
})
