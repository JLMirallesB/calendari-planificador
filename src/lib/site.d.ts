export interface SiteApp {
  name: string
  tagline: string
  emoji: string
  description: string
}

export interface SiteMaintainer {
  name: string
  site: string
  email: string
}

export interface Site {
  app: SiteApp
  github: { user: string; repo: string }
  /** Quién mantiene ESTE despliegue y a quién se escribe. */
  maintainer: SiteMaintainer
  cev: { datasetBase: string }
  /** Ruta base con la que se sirve la app (`base` de Vite). */
  base: string
  publicBaseUrl: string
  /** `publicBaseUrl` en el esquema que abren las apps de calendario. */
  webcalBase: string
  /** Prefijo de las claves de `localStorage`, distinto en cada despliegue del mismo origen. */
  storagePrefix: string
  /** ¿Este despliegue adopta los datos guardados con las claves antiguas, sin prefijo? */
  legacyStorage: boolean
  repoUrl: string
}

export function deriveSite(raw: unknown): Site
