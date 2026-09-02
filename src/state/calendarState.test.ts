import { describe, expect, it } from 'vitest'
import type { Calendar } from '../types'
import { coerceCalendar } from '../lib/json'
import * as st from './calendarState'

const cal = (id: string, name = id): Calendar => coerceCalendar({ id, name })
const state = (calendars: Calendar[], currentId: string | null): st.StoredState => ({
  calendars,
  currentId,
})

describe('parseStoredState', () => {
  it('devuelve estado vacío ante basura', () => {
    expect(st.parseStoredState(null)).toEqual(st.EMPTY_STATE)
    expect(st.parseStoredState({ calendars: 'no soy un array' })).toEqual(st.EMPTY_STATE)
  })

  it('descarta un calendario corrupto sin llevarse los demás', () => {
    const s = st.parseStoredState({ calendars: [{ id: 'a', name: 'A' }, 42], currentId: 'a' })
    expect(s.calendars.map((c) => c.id)).toEqual(['a'])
  })

  it('fusiona duplicados por id conservando el último', () => {
    const s = st.parseStoredState({
      calendars: [
        { id: 'a', name: 'vieja', events: [] },
        { id: 'a', name: 'nueva', events: [{ title: 'X', kind: 'otro', date: '2026-12-17' }] },
      ],
      currentId: 'a',
    })
    expect(s.calendars).toHaveLength(1)
    expect(s.calendars[0].name).toBe('nueva')
    expect(s.calendars[0].events).toHaveLength(1)
  })

  it('corrige un currentId que no apunta a nada', () => {
    const s = st.parseStoredState({ calendars: [{ id: 'a', name: 'A' }], currentId: 'fantasma' })
    expect(s.currentId).toBe('a')
  })
})

describe('importCalendar', () => {
  // Este es el bug que sobrescribió un fichero real: abrir un archivo añadía una segunda entrada
  // con el mismo id, `currentOf` devolvía la primera (la vieja) y guardar la escribía en disco.
  it('abrir desde archivo recarga en su sitio, sin duplicar', () => {
    const viejo = coerceCalendar({ id: 'a', name: 'A', events: [] })
    const delDisco = coerceCalendar({
      id: 'a',
      name: 'A',
      events: [{ title: 'Concierto', kind: 'otro', date: '2026-12-17' }],
    })
    const s = st.importCalendar(state([viejo], 'a'), delDisco, { replaceById: true })

    expect(s.calendars).toHaveLength(1)
    expect(st.currentOf(s)?.events).toHaveLength(1)
  })

  it('importar como nuevo con un id que ya existe le da un id distinto', () => {
    const s = st.importCalendar(state([cal('a')], 'a'), cal('a', 'otra'))
    expect(s.calendars).toHaveLength(2)
    expect(s.calendars[0].id).not.toBe(s.calendars[1].id)
    expect(st.currentOf(s)?.name).toBe('otra')
  })

  it('nunca deja dos calendarios con el mismo id', () => {
    let s = state([cal('a')], 'a')
    for (let i = 0; i < 5; i++) s = st.importCalendar(s, cal('a', `copia ${i}`))
    const ids = s.calendars.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('replaceCurrent conserva el id del actual', () => {
    const s = st.importCalendar(state([cal('a'), cal('b')], 'b'), cal('z', 'nuevo'), {
      replaceCurrent: true,
    })
    expect(s.calendars.map((c) => c.id)).toEqual(['a', 'b'])
    expect(st.currentOf(s)?.name).toBe('nuevo')
  })
})

describe('deleteCalendar', () => {
  it('al borrar el actual selecciona otro', () => {
    const s = st.deleteCalendar(state([cal('a'), cal('b')], 'a'), 'a')
    expect(s.currentId).toBe('b')
  })

  it('no mueve el actual si se borra otro', () => {
    const s = st.deleteCalendar(state([cal('a'), cal('b')], 'b'), 'a')
    expect(s.currentId).toBe('b')
  })

  it('borrar el último deja el estado vacío', () => {
    expect(st.deleteCalendar(state([cal('a')], 'a'), 'a')).toEqual(st.EMPTY_STATE)
  })
})

describe('patchCurrent', () => {
  it('solo toca el calendario actual y sella la fecha', () => {
    const s = st.patchCurrent(
      state([cal('a', 'A'), cal('b', 'B')], 'b'),
      (c) => ({ ...c, name: 'editado' }),
      '2026-08-29T10:00:00.000Z',
    )
    expect(s.calendars.map((c) => c.name)).toEqual(['A', 'editado'])
    expect(s.calendars[1].updatedAt).toBe('2026-08-29T10:00:00.000Z')
  })

  it('sin calendario actual no hace nada', () => {
    const s = st.EMPTY_STATE
    expect(st.patchCurrent(s, (c) => c, 'x')).toBe(s)
  })
})

describe('duplicateCalendar', () => {
  it('la copia tiene id propio y queda seleccionada', () => {
    const s = st.duplicateCalendar(state([cal('a', 'Curso')], 'a'), 'a')
    expect(s.calendars).toHaveLength(2)
    expect(s.calendars[1].id).not.toBe('a')
    expect(s.calendars[1].name).toBe('Curso (copia)')
    expect(s.currentId).toBe(s.calendars[1].id)
  })
})
