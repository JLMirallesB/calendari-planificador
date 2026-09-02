import { describe, expect, it } from 'vitest'
import type { Calendar } from '../types'
import { coerceCalendar } from '../lib/json'
import { canRedo, canUndo, forget, record, redo, undo, type Histories } from './history'

/** Versión `v` de un calendario `id`, distinguible por su nombre. */
const cal = (id: string, v: number): Calendar => coerceCalendar({ id, name: `${id}-v${v}` })

describe('record / undo / redo', () => {
  it('deshace la última edición y la deja para rehacer', () => {
    const v1 = cal('a', 1)
    const v2 = cal('a', 2)
    const h = record({}, v1) // se editaba v1 → v2

    const u = undo(h, v2)!
    expect(u.restored.name).toBe('a-v1')
    expect(canRedo(u.histories, 'a')).toBe(true)

    const r = redo(u.histories, v1)!
    expect(r.restored.name).toBe('a-v2')
  })

  it('undo/redo encadenados recorren el historial en orden', () => {
    let h: Histories = {}
    h = record(h, cal('a', 1))
    h = record(h, cal('a', 2))
    h = record(h, cal('a', 3)) // ahora se ve v4

    const u1 = undo(h, cal('a', 4))!
    expect(u1.restored.name).toBe('a-v3')
    const u2 = undo(u1.histories, u1.restored)!
    expect(u2.restored.name).toBe('a-v2')
    const u3 = undo(u2.histories, u2.restored)!
    expect(u3.restored.name).toBe('a-v1')
    expect(undo(u3.histories, u3.restored)).toBeNull() // no hay más
  })

  it('editar después de deshacer descarta lo rehacer', () => {
    let h = record({}, cal('a', 1)) // v1 → v2
    const u = undo(h, cal('a', 2))! // vuelvo a v1
    expect(canRedo(u.histories, 'a')).toBe(true)
    h = record(u.histories, u.restored) // edito de nuevo desde v1
    expect(canRedo(h, 'a')).toBe(false)
  })

  it('sin nada que deshacer o rehacer devuelve null', () => {
    expect(undo({}, cal('a', 1))).toBeNull()
    expect(redo({}, cal('a', 1))).toBeNull()
    expect(canUndo({}, 'a')).toBe(false)
    expect(canUndo({}, null)).toBe(false)
  })
})

describe('historial por calendario', () => {
  it('los calendarios no comparten historial', () => {
    let h: Histories = {}
    h = record(h, cal('a', 1))
    h = record(h, cal('b', 1))
    expect(canUndo(h, 'a')).toBe(true)
    expect(canUndo(h, 'b')).toBe(true)
    const u = undo(h, cal('a', 2))!
    expect(canUndo(u.histories, 'b')).toBe(true) // deshacer en A no toca a B
  })
})

describe('límites', () => {
  it('no recuerda más de HISTORY_LIMIT pasos', () => {
    let h: Histories = {}
    for (let v = 1; v <= 60; v++) h = record(h, cal('a', v))
    expect(h.a.past).toHaveLength(50)
    expect(h.a.past[0].name).toBe('a-v11') // los 10 más viejos se han soltado
  })

  it('forget olvida el historial de un calendario', () => {
    const h = record({}, cal('a', 1))
    expect(canUndo(forget(h, 'a'), 'a')).toBe(false)
    expect(forget(h, 'inexistente')).toBe(h) // sin cambios, mismo objeto
  })
})
