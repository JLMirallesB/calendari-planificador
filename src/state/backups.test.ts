import { describe, expect, it } from 'vitest'
import { coerceCalendar } from '../lib/json'
import type { StoredState } from './calendarState'
import { describeBackup, parseBackups, pushBackup, type Backup } from './backups'

// `updatedAt` distingue una versión de otra: es lo que cambia al editar, y lo que usa el anillo
// para saber si un estado ya está archivado.
const estado = (ids: string[], updatedAt = '2026-08-29T09:00:00.000Z'): StoredState => ({
  calendars: ids.map((id) => coerceCalendar({ id, name: id, updatedAt })),
  currentId: ids[0] ?? null,
})

const t = (min: number) => new Date(Date.UTC(2026, 7, 29, 10, min)).toISOString()

describe('pushBackup', () => {
  it('no guarda copias de un estado vacío', () => {
    expect(pushBackup([], estado([]), estado(['a']), t(0))).toEqual([])
  })

  it('la primera copia se guarda siempre', () => {
    const ring = pushBackup([], estado(['a']), estado(['a', 'b']), t(0))
    expect(ring).toHaveLength(1)
    expect(ring[0].state.calendars.map((c) => c.id)).toEqual(['a'])
  })

  it('no guarda una copia por cada tecla: respeta el hueco mínimo', () => {
    const v1 = estado(['a'], t(0))
    const ring = pushBackup([], v1, estado(['a'], t(1)), t(0))
    // Cinco minutos después y con otra edición encima: aún no toca.
    const pronto = pushBackup(ring, estado(['a'], t(4)), estado(['a'], t(5)), t(5))
    expect(pronto).toBe(ring) // mismo objeto: no ha tocado nada
    // Pasado el hueco, sí.
    const luego = pushBackup(ring, estado(['a'], t(10)), estado(['a'], t(11)), t(11))
    expect(luego).toHaveLength(2)
  })

  it('no archiva de nuevo un estado que ya está en el anillo', () => {
    const v1 = estado(['a'], t(0))
    const ring = pushBackup([], v1, estado(['a', 'b']), t(0))
    expect(pushBackup(ring, v1, estado(['a']), t(60))).toBe(ring)
  })

  // Lo importante: un borrado es justo el cambio que uno quiere deshacer, así que se copia
  // aunque acabe de hacerse otra copia hace un segundo.
  it('un borrado se copia siempre, ignorando el hueco', () => {
    const ring = pushBackup([], estado(['a', 'b'], t(0)), estado(['a', 'b'], t(1)), t(0))
    const trasBorrar = pushBackup(ring, estado(['a', 'b'], t(1)), estado(['a'], t(1)), t(1))
    expect(trasBorrar).toHaveLength(2)
    expect(trasBorrar[0].state.calendars.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('vaciarlo todo también se copia', () => {
    const ring = pushBackup([], estado(['a']), { calendars: [], currentId: null }, t(0))
    expect(ring[0].state.calendars.map((c) => c.id)).toEqual(['a'])
  })

  it('conserva como mucho las N más recientes, la primera la más nueva', () => {
    let ring: Backup[] = []
    for (let i = 0; i < 12; i++) {
      ring = pushBackup(ring, estado([`c${i}`]), estado([`c${i}`, 'x']), t(i * 11))
    }
    expect(ring).toHaveLength(5)
    expect(ring[0].state.calendars[0].id).toBe('c11')
    expect(ring[4].state.calendars[0].id).toBe('c7')
  })

  it('si no cabe, suelta las más viejas en vez de reventar', () => {
    let ring: Backup[] = []
    for (let i = 0; i < 4; i++) {
      ring = pushBackup(ring, estado([`c${i}`]), estado([`c${i}`, 'x']), t(i * 11), {
        maxBytes: 4000,
      })
    }
    expect(ring.length).toBeLessThan(4)
    expect(ring[0].state.calendars[0].id).toBe('c3') // la más reciente sobrevive
  })
})

describe('pushBackup: force y repetidos', () => {
  it('force salta el hueco mínimo (lo usa restaurar)', () => {
    const ring = pushBackup([], estado(['a']), estado(['a']), t(0))
    const forzado = pushBackup(ring, estado(['a', 'b']), estado(['a']), t(1), { force: true })
    expect(forzado).toHaveLength(2)
  })

  it('no archiva dos veces el mismo estado seguido', () => {
    const previo = estado(['a'])
    const ring = pushBackup([], previo, estado(['a', 'b']), t(0))
    const otra = pushBackup(ring, previo, estado(['a']), t(30), { force: true })
    expect(otra).toBe(ring)
  })
})

describe('parseBackups', () => {
  it('ignora lo que no tenga forma de copia', () => {
    expect(parseBackups(null)).toEqual([])
    expect(parseBackups([42, {}, { at: 'x' }, { at: 'x', state: { calendars: [] } }])).toHaveLength(1)
  })
})

describe('describeBackup', () => {
  it('cuenta calendarios y fechas (eventos e hitos)', () => {
    const cal = coerceCalendar({
      id: 'a',
      name: 'A',
      events: [
        { title: 'X', kind: 'otro', date: '2026-12-17' },
        { title: 'Sin fecha', kind: 'otro' },
      ],
    })
    const b: Backup = { at: t(0), state: { calendars: [cal], currentId: 'a' } }
    expect(describeBackup(b)).toEqual({ calendars: 1, dates: 1 })
  })
})
