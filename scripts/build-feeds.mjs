// Genera, a partir de los calendarios publicados:
//   - feeds ICS de suscripción en public/feeds/  (<id>-all.ics y <id>-<perfil>.ics)
//   - JSON de VISTA (solo lectura) filtrados por perfil en public/v/  (<id>-<perfil>.json)
// Se ejecuta automáticamente antes del build (script "prebuild" en package.json).
//
// Fuentes:
//   - public/calendars/ + index.json  → calendarios LISTADOS (aparecen en la galería).
//   - calendars-unlisted/*.json       → calendarios NO LISTADOS: se generan sus feeds y vistas
//     pero no están en ningún índice público (esa carpeta queda fuera de public/, no se
//     despliega). Solo accesibles conociendo la URL exacta (usa un id aleatorio). Requiere
//     repo privado para ocultar también las fuentes.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildICS } from '../src/lib/icsCore.js'
import { deriveSite } from '../src/lib/site.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const calendarsDir = join(root, 'public', 'calendars')
const feedsDir = join(root, 'public', 'feeds')
const viewDir = join(root, 'public', 'v')
const unlistedDir = join(root, 'calendars-unlisted')
const indexPath = join(calendarsDir, 'index.json')

// Bases públicas: salen de site.config.json, el mismo sitio del que las saca src/config.ts.
const site = deriveSite(JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf-8')))
const WEBCAL_BASE = site.webcalBase
const HTTPS_BASE = site.publicBaseUrl

const visible = (profiles, profileId) =>
  !profileId || !profiles || profiles.length === 0 || profiles.includes(profileId)

/** Devuelve una copia del calendario con solo lo visible para el perfil (null = todos). */
function filterCalendar(cal, profileId) {
  if (!profileId) return cal
  const events = (cal.events || []).filter((e) => visible(e.profiles, profileId))
  const terms = (cal.terms || []).map((term) => {
    if (!term.guided) return term
    const guided = {}
    for (const [k, v] of Object.entries(term.guided)) {
      guided[k] = v && visible(v.profiles, profileId) ? v : { ...(v || {}), date: null, range: null }
    }
    return { ...term, guided }
  })
  return { ...cal, events, terms }
}

/** Escribe feed (.ics) y vista (.json) «todos» + por perfil. Devuelve {feedFile, token, label}[]. */
function writeFeeds(cal, id, name) {
  if (!id) {
    console.warn(`[build-feeds] Calendario sin id; se omite «${name || '(sin nombre)'}».`)
    return []
  }
  const out = []
  const one = (profileId, suffix, calName, label) => {
    writeFileSync(join(feedsDir, `${id}-${suffix}.ics`), buildICS(cal, profileId, { calName }))
    writeFileSync(join(viewDir, `${id}-${suffix}.json`), JSON.stringify(filterCalendar(cal, profileId), null, 2))
    out.push({ feedFile: `${id}-${suffix}.ics`, token: `${id}-${suffix}`, label })
  }
  one(null, 'all', name, 'todos los perfiles')
  for (const p of cal.profiles || []) one(p.id, p.id, `${name} · ${p.name}`, p.name)
  return out
}

/**
 * Escribe calendars-unlisted/FEEDS.md: índice PRIVADO con las URLs de suscripción y de vista
 * de los calendarios no listados. Vive fuera de public/ → no se despliega.
 */
function writeFeedsIndex(unlisted) {
  const lines = [
    '# Calendarios NO listados — enlaces (privado)',
    '',
    '> Generado automáticamente por `scripts/build-feeds.mjs`. **No se despliega** (está fuera de',
    '> `public/`), así que solo lo ve quien tenga acceso a este repo privado. Se regenera al',
    '> ejecutar `npm run build:feeds`. Comparte cada enlace solo con quien corresponda.',
    '',
    '- **Suscripción** (`webcal://`): añádela en Google/Apple/Outlook Calendar.',
    '- **Ver (web)**: página de solo lectura (lista/compacto, imprimir/PDF, descargar .ics).',
    '',
  ]
  if (!unlisted.length) {
    lines.push('_(No hay calendarios en `calendars-unlisted/` por ahora.)_', '')
  }
  for (const c of unlisted) {
    lines.push(`## ${c.name}`, '')
    for (const fd of c.feeds) {
      lines.push(`- **${fd.label}**`)
      lines.push(`  - Suscripción: \`${WEBCAL_BASE}feeds/${fd.feedFile}\``)
      lines.push(`  - Ver (web): ${HTTPS_BASE}#/ver/${fd.token}`)
    }
    lines.push('')
  }
  writeFileSync(join(unlistedDir, 'FEEDS.md'), lines.join('\n'))
}

function main() {
  mkdirSync(feedsDir, { recursive: true })
  mkdirSync(viewDir, { recursive: true })

  // Limpia artefactos previos (conserva .gitkeep) para no dejar ficheros huérfanos.
  for (const f of readdirSync(feedsDir)) if (f.endsWith('.ics')) rmSync(join(feedsDir, f))
  for (const f of readdirSync(viewDir)) if (f.endsWith('.json')) rmSync(join(viewDir, f))

  let count = 0

  // --- Calendarios listados (public/calendars/index.json) ---
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf-8'))
    if (Array.isArray(index)) {
      for (const entry of index) {
        const file = join(calendarsDir, entry.file)
        if (!existsSync(file)) {
          console.warn(`[build-feeds] Falta el fichero ${entry.file}; se omite «${entry.name}».`)
          continue
        }
        const cal = JSON.parse(readFileSync(file, 'utf-8'))
        count += writeFeeds(cal, entry.id, entry.name || cal.name).length
      }
    } else {
      console.warn('[build-feeds] index.json no es un array; se omite.')
    }
  } else {
    console.log('[build-feeds] No hay public/calendars/index.json (sin calendarios listados).')
  }

  // --- Calendarios NO listados (calendars-unlisted/*.json, fuera de public/) ---
  if (existsSync(unlistedDir)) {
    const unlisted = [] // { name, id, feeds } para el índice privado FEEDS.md
    for (const f of readdirSync(unlistedDir)) {
      if (!f.endsWith('.json')) continue
      const cal = JSON.parse(readFileSync(join(unlistedDir, f), 'utf-8'))
      const feeds = writeFeeds(cal, cal.id, cal.name || 'Calendario')
      if (feeds.length) {
        count += feeds.length
        unlisted.push({ name: cal.name || cal.id, id: cal.id, feeds })
        console.log(`[build-feeds] No listado «${cal.name || cal.id}»:`)
        for (const fd of feeds) {
          console.log(`    suscribir: ${WEBCAL_BASE}feeds/${fd.feedFile}   (${fd.label})`)
          console.log(`    ver:       ${HTTPS_BASE}#/ver/${fd.token}`)
        }
      }
    }
    writeFeedsIndex(unlisted)
  }

  console.log(`[build-feeds] Generados ${count} feeds ICS (+ vistas JSON) en public/.`)
}

main()
