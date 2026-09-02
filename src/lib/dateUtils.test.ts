import { describe, expect, it } from 'vitest'
import { addDays, eachDay, mondayOf, parseISO, toISO, weekday, weeksSpanned } from './dateUtils'

// La regla de oro del proyecto: las fechas se construyen en horario LOCAL, nunca en UTC. Con UTC,
// en España `new Date('2026-12-17')` es medianoche UTC = 01:00 local, y cualquier resta de horas
// (cambio de hora incluido) hace que un evento se imprima el día anterior.
describe('fechas en horario local', () => {
  it('parseISO no se desplaza a UTC', () => {
    const d = parseISO('2026-12-17')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 17])
  })

  it('toISO y parseISO son inversas', () => {
    for (const iso of ['2026-01-01', '2026-09-14', '2026-12-31', '2027-02-28']) {
      expect(toISO(parseISO(iso))).toBe(iso)
    }
  })

  it('addDays cruza el cambio de hora sin perder un día', () => {
    // En España el horario de verano acaba el 25 de octubre de 2026 (día de 25 horas).
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    // Y vuelve el 28 de marzo de 2027 (día de 23 horas).
    expect(addDays('2027-03-27', 1)).toBe('2027-03-28')
    expect(addDays('2027-03-28', 1)).toBe('2027-03-29')
  })

  it('addDays cruza fin de mes y fin de año', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29') // bisiesto
  })
})

describe('weekday', () => {
  it('usa la convención de JavaScript (0 = domingo)', () => {
    expect(weekday('2026-09-14')).toBe(1) // lunes: inicio de curso
    expect(weekday('2026-09-19')).toBe(6) // sábado
    expect(weekday('2026-09-20')).toBe(0) // domingo
  })
})

describe('eachDay', () => {
  it('incluye los dos extremos', () => {
    expect(eachDay('2026-09-14', '2026-09-16')).toEqual(['2026-09-14', '2026-09-15', '2026-09-16'])
  })

  it('un solo día devuelve ese día', () => {
    expect(eachDay('2026-09-14', '2026-09-14')).toEqual(['2026-09-14'])
  })

  it('un rango invertido no devuelve nada (y no se cuelga)', () => {
    expect(eachDay('2026-09-16', '2026-09-14')).toEqual([])
  })
})

describe('mondayOf y weeksSpanned', () => {
  it('mondayOf retrocede al lunes de esa semana', () => {
    expect(mondayOf('2026-09-16')).toBe('2026-09-14') // miércoles → lunes
    expect(mondayOf('2026-09-14')).toBe('2026-09-14') // ya es lunes
    expect(mondayOf('2026-09-20')).toBe('2026-09-14') // domingo → lunes anterior
  })

  it('weeksSpanned cuenta semanas naturales tocadas', () => {
    expect(weeksSpanned('2026-09-14', '2026-09-18')).toBe(1) // de lunes a viernes
    expect(weeksSpanned('2026-09-14', '2026-09-21')).toBe(2) // entra en la semana siguiente
    // El primer trimestre real del curso 26/27: 14 sept → 4 dic = 12 semanas.
    expect(weeksSpanned('2026-09-14', '2026-12-04')).toBe(12)
  })
})
