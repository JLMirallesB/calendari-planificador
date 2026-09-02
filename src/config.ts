// Configuración global de la app.
//
// Lo que cambia de un despliegue a otro —usuario y repo de GitHub, URL pública, nombre y
// contacto— vive en `site.config.json` (raíz del proyecto). Aquí solo se le pone nombre y se
// derivan los valores que salen de él, en `src/lib/site.js`. Un fork edita ese JSON y no toca
// código.

import raw from '../site.config.json'
import { deriveSite } from './lib/site'

const site = deriveSite(raw)

export const APP_NAME = site.app.name
export const APP_TAGLINE = site.app.tagline
export const APP_EMOJI = site.app.emoji

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

// Repositorio en GitHub (usuario/repo). Se usa para enlaces y URLs de suscripción.
export const GITHUB_USER = site.github.user
export const GITHUB_REPO = site.github.repo
export const REPO_URL = site.repoUrl

// Base pública donde se sirven los feeds ICS (coincide con `base` de vite.config.ts, porque
// las dos salen del mismo sitio). En producción: https://<user>.github.io/<repo>/
export const PUBLIC_BASE_URL = site.publicBaseUrl

/** Quién mantiene ESTE despliegue: el «Contacto» del pie es su correo. */
export const AUTHOR = site.maintainer

/**
 * Crédito del proyecto original. NO es configurable a propósito: viaja con el código a
 * cualquier fork, igual que el aviso de copyright de la licencia MIT.
 */
export const ORIGIN = {
  project: 'Calendari',
  author: 'José Luis Miralles',
  site: 'https://jlmirall.es',
  kofi: 'https://ko-fi.com/miralles',
}

/** ¿Este despliegue es el del autor original? Para no dar el mismo nombre dos veces en el pie. */
export const IS_ORIGIN = AUTHOR.name === ORIGIN.author

export const STORAGE_KEY = 'calendari:data:v1'
export const THEME_KEY = 'calendari:theme'
/** Anillo de copias de seguridad del almacén (ver src/state/backups.ts). */
export const BACKUPS_KEY = 'calendari:backups:v1'

// Dataset de legislación educativa de la Comunitat Valenciana (app «legis_cpmdem»).
// Sitio estático en GitHub Pages; se consume por fetch (GET simple). Ver src/lib/cev.ts.
export const CEV_DATASET_BASE = site.cev.datasetBase
export const CEV_SCHEMA = 'cev-calendario-escolar'
