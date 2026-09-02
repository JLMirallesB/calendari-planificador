import { describe, expect, it } from 'vitest'
import { adoptarClavesAntiguas, type AlmacenSimple } from './storage'

/** localStorage de mentira, con lo justo. */
function almacen(inicial: Record<string, string> = {}): AlmacenSimple & { datos: Record<string, string> } {
  const datos = { ...inicial }
  return {
    datos,
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => {
      datos[k] = v
    },
  }
}

const parejas = [
  { antigua: 'calendari:data:v1', nueva: 'calendari:calendario:data:v1' },
  { antigua: 'calendari:theme', nueva: 'calendari:calendario:theme' },
]

describe('adoptarClavesAntiguas', () => {
  it('copia lo guardado a la clave nueva', () => {
    const a = almacen({ 'calendari:data:v1': '{"calendars":[]}', 'calendari:theme': 'dark' })
    expect(adoptarClavesAntiguas(a, parejas)).toHaveLength(2)
    expect(a.datos['calendari:calendario:data:v1']).toBe('{"calendars":[]}')
    expect(a.datos['calendari:calendario:theme']).toBe('dark')
  })

  it('no borra el original: si algo sale mal, los datos siguen ahí', () => {
    const a = almacen({ 'calendari:data:v1': 'mis calendarios' })
    adoptarClavesAntiguas(a, parejas)
    expect(a.datos['calendari:data:v1']).toBe('mis calendarios')
  })

  it('nunca pisa lo que ya hay en la clave nueva', () => {
    // Segundo arranque: lo que el usuario haya hecho hoy manda sobre lo que había antes.
    const a = almacen({ 'calendari:data:v1': 'viejo', 'calendari:calendario:data:v1': 'nuevo' })
    expect(adoptarClavesAntiguas(a, parejas)).toEqual([])
    expect(a.datos['calendari:calendario:data:v1']).toBe('nuevo')
  })

  it('sin lista de parejas no toca nada', () => {
    // Es el caso de la demo y de cualquier fork: no adoptan los datos de nadie.
    const a = almacen({ 'calendari:data:v1': 'los calendarios de otro despliegue' })
    expect(adoptarClavesAntiguas(a, [])).toEqual([])
    expect(Object.keys(a.datos)).toEqual(['calendari:data:v1'])
  })

  it('aguanta un almacén que lanza (modo privado, cuota llena)', () => {
    const roto: AlmacenSimple = {
      getItem: () => 'algo',
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => adoptarClavesAntiguas(roto, parejas)).not.toThrow()
    expect(adoptarClavesAntiguas(roto, parejas)).toEqual([])
  })
})
