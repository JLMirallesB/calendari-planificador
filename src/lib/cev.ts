// Consumo del dataset de legislación educativa de la Comunitat Valenciana (app A,
// «legis_cpmdem»). Sitio estático servido por GitHub Pages; se lee con fetch (GET
// simple, sin cabeceras → sin preflight CORS). Aquí vive la lógica que traduce ese
// dataset al modelo de Calendar de esta app, incluyendo el mapeo de `kind` y las
// claves de procedencia (`srcKey`) que permiten re-sincronizar más adelante.

import type { Calendar, CalEvent, CalendarSource } from '../types'
import { CEV_DATASET_BASE, CEV_SCHEMA } from '../config'
import { newCalendar, makeId } from './json'
import type { Lang } from '../i18n'

// ---- Forma del dataset publicado por A ----

export interface CevEnsenyanca {
  code: string
  name: string
}
export interface CevMunicipio {
  code: string
  name: string
}
export interface CevManifest {
  schema: string
  version: number
  updated: string
  source?: string
  courses: string[]
  ensenyances: CevEnsenyanca[]
  municipios: CevMunicipio[]
}

interface CevDated {
  title: string
  date: string
}
interface CevPeriod {
  title: string
  start: string
  end: string
}
interface CevOverride {
  courseStart?: string
  courseEnd?: string
}
export interface CevCourse {
  schema: string
  version: number
  course: string
  courseStart: string
  courseEnd: string
  ensenyanceOverrides?: Record<string, CevOverride>
  vacations: CevPeriod[]
  autonomicHolidays: CevDated[]
  nonLectiveDays: CevDated[]
  localHolidays: Record<string, CevDated[]>
}

// ---- Fetch ----

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url) // GET simple, sin cabeceras personalizadas
  if (!r.ok) throw new Error(`HTTP ${r.status} al cargar ${url}`)
  return (await r.json()) as T
}

export const manifestUrl = () => `${CEV_DATASET_BASE}manifest.json`
export const courseUrl = (course: string) => `${CEV_DATASET_BASE}${course}.json`

export function fetchManifest(): Promise<CevManifest> {
  return fetchJson<CevManifest>(manifestUrl())
}
export function fetchCourse(course: string): Promise<CevCourse> {
  return fetchJson<CevCourse>(courseUrl(course))
}

// ---- Construcción del calendario ----

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos combinantes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface EvInput {
  title: string
  kind: CalEvent['kind']
  date?: string | null
  range?: { start: string; end: string } | null
  srcKey?: string
}
function ev(p: EvInput): CalEvent {
  return {
    id: makeId('ev'),
    title: p.title,
    kind: p.kind,
    date: p.date ?? null,
    range: p.range ?? null,
    provisional: false,
    profiles: [], // visible para todos
    notes: '',
    ...(p.srcKey ? { srcKey: p.srcKey } : {}),
  }
}

export interface CevSelection {
  municipio: CevMunicipio
  ensenyanca: CevEnsenyanca
}

/** Prefijo común de todas las `srcKey` generadas desde este dataset. */
export const CEV_SRC_PREFIX = 'cev:'

/**
 * Eventos que el dataset genera para un municipio dado. Cada uno lleva `srcKey`
 * estable, base de la re-sincronización:
 *  - vacaciones → clave por tipo/título (detecta cambios de fechas)
 *  - festivos (autonómicos y locales) → clave por fecha
 * La enseñanza NO afecta a los eventos (solo a las fechas de curso, ver `cevCourseDates`).
 */
export function cevEventsFor(course: CevCourse, municipioCode: string): CalEvent[] {
  const events: CalEvent[] = []
  for (const v of course.vacations) {
    events.push(
      ev({
        title: v.title,
        kind: 'vacaciones',
        range: { start: v.start, end: v.end },
        srcKey: `cev:vac:${slug(v.title)}`,
      }),
    )
  }
  for (const h of course.autonomicHolidays) {
    events.push(ev({ title: h.title, kind: 'festivoAutonomico', date: h.date, srcKey: `cev:auto:${h.date}` }))
  }
  // nonLectiveDays hoy llega vacío desde A; se contempla por robustez.
  for (const n of course.nonLectiveDays) {
    events.push(ev({ title: n.title, kind: 'vacaciones', date: n.date, srcKey: `cev:nolectiu:${n.date}` }))
  }
  for (const l of course.localHolidays[municipioCode] ?? []) {
    events.push(ev({ title: l.title, kind: 'festivoLocal', date: l.date, srcKey: `cev:local:${l.date}` }))
  }
  return events
}

/** Fechas de inicio/fin de curso para una enseñanza (aplicando overrides parciales). */
export function cevCourseDates(course: CevCourse, ensCode: string): { courseStart: string; courseEnd: string } {
  const ov = course.ensenyanceOverrides?.[ensCode] ?? {}
  return { courseStart: ov.courseStart ?? course.courseStart, courseEnd: ov.courseEnd ?? course.courseEnd }
}

/**
 * Traduce un curso del dataset + la selección de municipio/enseñanza a un Calendar
 * de esta app.
 */
export function buildCalendarFromCev(
  course: CevCourse,
  manifest: CevManifest,
  sel: CevSelection,
  lang: Lang,
): Calendar {
  const { courseStart, courseEnd } = cevCourseDates(course, sel.ensenyanca.code)
  const events = cevEventsFor(course, sel.municipio.code)

  const source: CalendarSource = {
    provider: 'cev-legis',
    manifestUrl: manifestUrl(),
    courseUrl: courseUrl(course.course),
    course: course.course,
    municipio: sel.municipio.code,
    municipioName: sel.municipio.name,
    ensenyanca: sel.ensenyanca.code,
    ensenyancaName: sel.ensenyanca.name,
    schema: course.schema || CEV_SCHEMA,
    version: course.version,
    seenUpdated: manifest.updated,
  }

  // newCalendar aporta id, perfiles y trimestres por defecto en el idioma activo.
  const base = newCalendar(`${sel.municipio.name} · ${course.course}`, lang)
  return {
    ...base,
    community: `Comunitat Valenciana — ${sel.municipio.name}`,
    courseStart,
    courseEnd,
    events,
    source,
  }
}
