import { describe, expect, it } from 'vitest'
import type { Calendar, CalEvent } from '../types'
import { coerceCalendar } from './json'
import { buildICS, expandOccurrences } from './icsCore'

/**
 * Calendario sin trimestres: `coerceCalendar` los rellena con los seis por defecto si le llega una
 * lista vacía, y aquí interesa aislar los eventos.
 */
const soloEventos = (events: Partial<CalEvent>[]): Calendar => ({
  ...coerceCalendar({
    id: 'cal_test',
    name: 'Curso',
    courseStart: '2026-09-14',
    courseEnd: '2027-06-11',
    events,
  }),
  terms: [],
})

/** Mapa UID → SUMMARY de un ICS: la identidad de cada evento tal como la ve la app del suscriptor. */
function uidMap(cal: Calendar, profileId: string | null = null): Record<string, string> {
  const out: Record<string, string> = {}
  let uid: string | null = null
  for (const line of buildICS(cal, profileId, { calName: cal.name }).split(/\r?\n/)) {
    if (line.startsWith('UID:')) uid = line.slice(4)
    else if (line.startsWith('SUMMARY:') && uid) {
      out[uid] = line.slice(8)
      uid = null
    }
  }
  return out
}

describe('UID de los feeds', () => {
  // Regresión: el UID se construía con la POSICIÓN en la lista, así que insertar una fecha por el
  // medio desplazaba la identidad de todas las siguientes. Para una app de calendario el UID *es*
  // el evento: el suscriptor veía el contenido de un evento escribirse encima de otro.
  it('no cambia al reordenar los eventos', () => {
    const cal = soloEventos([
      { title: 'Claustro', kind: 'claustro', date: '2026-09-08' },
      { title: 'Nadal', kind: 'vacaciones', range: { start: '2026-12-22', end: '2027-01-06' } },
      { title: 'Concierto', kind: 'otro', date: '2026-12-17' },
    ])
    const barajado = { ...cal, events: [cal.events[2], cal.events[0], cal.events[1]] }
    expect(uidMap(barajado)).toEqual(uidMap(cal))
  })

  it('insertar un evento al principio no toca a los demás', () => {
    const cal = soloEventos([
      { title: 'Concierto', kind: 'otro', date: '2026-12-17' },
      { title: 'Claustro', kind: 'claustro', date: '2027-03-16' },
    ])
    const antes = uidMap(cal)
    const conNuevo = {
      ...cal,
      events: [
        coerceCalendar({
          id: 'x',
          name: 'x',
          events: [{ title: 'COCOPE', kind: 'cocope', date: '2026-09-03' }],
        }).events[0],
        ...cal.events,
      ],
    }
    const despues = uidMap(conNuevo)
    for (const [uid, summary] of Object.entries(antes)) expect(despues[uid]).toBe(summary)
  })

  it('son únicos', () => {
    const cal = soloEventos([
      { title: 'Claustro', kind: 'claustro', date: '2026-09-08' },
      { title: 'Claustro', kind: 'claustro', date: '2026-12-15' },
      { title: 'Claustro', kind: 'claustro', date: '2027-03-16' },
    ])
    const uids = Object.keys(uidMap(cal))
    expect(uids).toHaveLength(3)
    expect(new Set(uids).size).toBe(3)
  })

  it('no llevan caracteres que rompan el formato ICS', () => {
    const cal = soloEventos([
      { title: 'Reunión: café, té; nº 1', kind: 'otro', date: '2026-10-01' },
    ])
    for (const uid of Object.keys(uidMap(cal))) expect(uid).toMatch(/^[A-Za-z0-9._@-]+$/)
  })
})

describe('filtrado por perfil', () => {
  const cal = soloEventos([
    { title: 'Claustro', kind: 'claustro', date: '2026-09-08', profiles: ['docentes'] },
    { title: 'Fiesta', kind: 'otro', date: '2026-10-09', profiles: [] },
  ])

  it('sin perfil salen todos', () => {
    expect(expandOccurrences(cal, null).map((o) => o.title)).toEqual(['Claustro', 'Fiesta'])
  })

  it('un evento marcado para Docentes no llega al feed de Alumnado', () => {
    expect(expandOccurrences(cal, 'alumnado').map((o) => o.title)).toEqual(['Fiesta'])
    expect(expandOccurrences(cal, 'docentes').map((o) => o.title)).toEqual(['Claustro', 'Fiesta'])
  })
})

describe('festivo convertido en lectivo', () => {
  it('recorta el extremo del periodo no lectivo que lo contiene', () => {
    const cal = soloEventos([
      { title: 'Pasqua', kind: 'vacaciones', range: { start: '2027-03-25', end: '2027-04-05' } },
      { title: 'Recuperado', kind: 'festivoALectivo', date: '2027-04-05' },
    ])
    const vac = expandOccurrences(cal, null).find((o) => o.title === 'Pasqua')
    expect(vac?.endISO).toBe('2027-04-04')
  })
})

describe('eventos con hora', () => {
  const cal = soloEventos([
    { title: 'Claustro', kind: 'claustro', date: '2026-12-15', startTime: '17:00', endTime: '19:00' },
  ])
  const ics = buildICS(cal, null, { calName: cal.name })

  it('emite DTSTART/DTEND con hora en Europe/Madrid', () => {
    expect(ics).toContain('DTSTART;TZID=Europe/Madrid:20261215T170000')
    expect(ics).toContain('DTEND;TZID=Europe/Madrid:20261215T190000')
  })

  it('incluye la definición de la zona horaria solo cuando hay horas', () => {
    expect(ics).toContain('BEGIN:VTIMEZONE')
    expect(ics).toContain('TZID:Europe/Madrid')
    const sinHora = buildICS(soloEventos([{ title: 'X', kind: 'otro', date: '2026-12-17' }]), null, {
      calName: 'X',
    })
    expect(sinHora).not.toContain('VTIMEZONE')
  })

  it('un rango ignora las horas (sigue siendo de día completo)', () => {
    const rango = soloEventos([
      { title: 'Viaje', kind: 'otro', range: { start: '2026-12-15', end: '2026-12-17' }, startTime: '17:00' },
    ])
    const out = buildICS(rango, null, { calName: 'R' })
    expect(out).toContain('DTSTART;VALUE=DATE:20261215')
    expect(out).not.toContain('VTIMEZONE')
  })
})

describe('buildICS', () => {
  const cal = soloEventos([{ title: 'Concierto', kind: 'otro', date: '2026-12-17' }])
  const ics = buildICS(cal, null, { calName: cal.name })

  it('produce un VCALENDAR bien cerrado', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })

  it('un evento de un día termina al día siguiente (DTEND es exclusivo en ICS)', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261217')
    expect(ics).toContain('DTEND;VALUE=DATE:20261218')
  })
})
