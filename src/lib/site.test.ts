import { describe, expect, it } from 'vitest'
import raw from '../../site.config.json'
import { deriveSite } from './site'
import {
  APP_NAME,
  CEV_DATASET_BASE,
  GITHUB_REPO,
  GITHUB_USER,
  PUBLIC_BASE_URL,
  REPO_URL,
} from '../config'

/** Configuración mínima válida, para probar la derivación sin depender de la real. */
const base = {
  app: { name: 'Calendari', tagline: 'Planificador', emoji: '📅', description: 'Desc' },
  github: { user: 'centro', repo: 'calendario' },
  maintainer: { name: 'Quien sea', site: 'https://ejemplo.org', email: 'a@ejemplo.org' },
  cev: { datasetBase: 'https://ejemplo.org/data/' },
}

describe('deriveSite', () => {
  it('deriva las cuatro URL de usuario y repo', () => {
    const s = deriveSite(base)
    expect(s.publicBaseUrl).toBe('https://centro.github.io/calendario/')
    expect(s.webcalBase).toBe('webcal://centro.github.io/calendario/')
    expect(s.repoUrl).toBe('https://github.com/centro/calendario')
    expect(s.base).toBe('/calendario/')
  })

  it('con dominio propio la app se sirve en la raíz', () => {
    // Un fork con CNAME no vive bajo /<repo>/: si `base` se dedujera del nombre del repo,
    // la app cargaría los assets de una ruta que ahí no existe y saldría en blanco.
    const s = deriveSite({ ...base, publicBaseUrl: 'https://calendari.ejemplo.org' })
    expect(s.base).toBe('/')
    expect(s.publicBaseUrl).toBe('https://calendari.ejemplo.org/') // barra final añadida
    expect(s.webcalBase).toBe('webcal://calendari.ejemplo.org/')
  })

  it('falla diciendo qué campo falta', () => {
    expect(() => deriveSite({ ...base, github: { user: 'centro' } })).toThrow(/github\.repo/)
    expect(() => deriveSite({ ...base, app: { ...base.app, name: '  ' } })).toThrow(/app\.name/)
    expect(() => deriveSite(null)).toThrow(/site\.config\.json/)
  })
})

describe('src/config.ts', () => {
  it('no puede divergir de site.config.json', () => {
    // El motivo de todo esto: antes, estos valores estaban escritos a mano en config.ts,
    // vite.config.ts y build-feeds.mjs, y nada impedía que uno se quedara atrás. Si alguien
    // vuelve a escribir una URL a mano en config.ts, este test lo dice.
    const s = deriveSite(raw)
    expect(APP_NAME).toBe(s.app.name)
    expect(GITHUB_USER).toBe(s.github.user)
    expect(GITHUB_REPO).toBe(s.github.repo)
    expect(PUBLIC_BASE_URL).toBe(s.publicBaseUrl)
    expect(REPO_URL).toBe(s.repoUrl)
    expect(CEV_DATASET_BASE).toBe(s.cev.datasetBase)
  })
})
