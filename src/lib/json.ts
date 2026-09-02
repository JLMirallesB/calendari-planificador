import type {
  Calendar,
  CalendarSource,
  CalEvent,
  GuidedFields,
  GuidedValue,
  Profile,
  Term,
  TermType,
} from '../types'
import { isValidISO } from './dateUtils'
import { withDefaultGuidedProfiles } from './guided'
import { es } from '../i18n/es'
import { ca } from '../i18n/ca'

export const SCHEMA_VERSION = 1

type Lang = 'es' | 'ca'
const DICTS = { es, ca }
function dnames(lang: Lang) {
  return (DICTS[lang] ?? es).defaults
}

const TERM_LABEL_KEY: Record<TermType, keyof typeof es.defaults> = {
  Primer: 'termPrimer',
  Segundo: 'termSegundo',
  Tercer: 'termTercer',
  Anticipacion: 'termAnticipacion',
  Ordinaria: 'termOrdinaria',
  Extraordinaria: 'termExtraordinaria',
}

export function makeId(prefix = 'id'): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    }
  } catch {
    /* noop */
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function emptyGuidedValue(): GuidedValue {
  return { date: null, range: null, provisional: false, profiles: [] }
}
/** Hito en modo rango (vacío). Se usa para los que por defecto conviene que sean rango. */
function emptyRangeGuided(): GuidedValue {
  return { date: null, range: { start: null, end: null }, provisional: false, profiles: [] }
}

export function emptyGuided(): GuidedFields {
  const base: GuidedFields = {
    pruebaEvaluacionTeorica: emptyGuidedValue(),
    semanaRevisionCalificaciones: emptyRangeGuided(),
    sesionEvaluacion: emptyGuidedValue(),
    itacaNotasInicio: emptyGuidedValue(),
    itacaNotasFinDocentes: emptyGuidedValue(),
    itacaNotasFinRectificacion: emptyGuidedValue(),
    webFamiliaVisibilidad: emptyGuidedValue(),
    impresionActas: emptyGuidedValue(),
    firmaActas: emptyGuidedValue(),
    plazoReclamacion: emptyRangeGuided(),
    anticipacionSolicitudInicio: emptyGuidedValue(),
    anticipacionSolicitudFin: emptyGuidedValue(),
    anticipacionListadoProvisional: emptyGuidedValue(),
    anticipacionListadoDefinitivo: emptyGuidedValue(),
    examenesExtraordinaria: emptyRangeGuided(),
    revisionExtraordinaria: emptyRangeGuided(),
    evaluacionExtraordinaria: emptyGuidedValue(),
  }
  // Siembra los perfiles por defecto por hito (para calendarios nuevos).
  return withDefaultGuidedProfiles(base)
}

/** Etiqueta por defecto de un tipo de trimestre en el idioma dado. */
export function defaultTermLabel(type: TermType, lang: Lang = 'es'): string {
  return dnames(lang)[TERM_LABEL_KEY[type]]
}

const TERM_ORDER: TermType[] = ['Primer', 'Segundo', 'Tercer', 'Anticipacion', 'Ordinaria', 'Extraordinaria']

export function newTerm(type: TermType, lang: Lang = 'es'): Term {
  return {
    id: makeId('term'),
    type,
    name: defaultTermLabel(type, lang),
    startDate: null,
    endDate: null,
    guidedEnabled: false,
    guided: emptyGuided(),
  }
}

export function defaultTerms(lang: Lang = 'es'): Term[] {
  return TERM_ORDER.map((type) => newTerm(type, lang))
}

export function defaultProfiles(lang: Lang = 'es'): Profile[] {
  const d = dnames(lang)
  return [
    { id: 'docentes', name: d.profileDocentes, color: '#2563eb' },
    { id: 'alumnado', name: d.profileAlumnado, color: '#16a34a' },
    { id: 'gestion', name: d.profileGestion, color: '#9333ea' },
  ]
}

export function newCalendar(name?: string, lang: Lang = 'es'): Calendar {
  return {
    id: makeId('cal'),
    name: name || dnames(lang).newCalendar,
    community: '',
    courseStart: null,
    courseEnd: null,
    restWeekdays: [6, 0], // sábado y domingo
    profiles: defaultProfiles(lang),
    terms: defaultTerms(lang),
    events: [],
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  }
}

export function newEvent(): CalEvent {
  return {
    id: makeId('ev'),
    title: '',
    kind: 'otro',
    date: null,
    range: null,
    provisional: false,
    profiles: [],
    notes: '',
  }
}

// ---- Validación / normalización tolerante al importar JSON ----

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}
function asISOorNull(v: unknown): string | null {
  return isValidISO(v) ? (v as string) : null
}
function asBool(v: unknown): boolean {
  return v === true
}
/** Hora HH:MM (24 h) o null. Rechaza cualquier otra cosa para no colar basura en el ICS. */
function asTimeOrNull(v: unknown): string | null {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null
}
function asStrArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/**
 * Normaliza un hito guiado. Modo rango si trae `range` (objeto) o —migración del antiguo
 * `RangeValue`— `start`/`end` en la raíz; en otro caso modo puntual (`date`).
 */
function coerceGuidedValue(v: unknown): GuidedValue {
  const o = (v ?? {}) as Record<string, unknown>
  let range: GuidedValue['range'] = null
  if (o.range && typeof o.range === 'object') {
    const r = o.range as Record<string, unknown>
    range = { start: asISOorNull(r.start), end: asISOorNull(r.end) }
  } else if (isValidISO(o.start) || isValidISO(o.end)) {
    range = { start: asISOorNull(o.start), end: asISOorNull(o.end) }
  }
  return { date: asISOorNull(o.date), range, provisional: asBool(o.provisional), profiles: asStrArray(o.profiles) }
}

function coerceGuided(v: unknown): GuidedFields {
  const o = (v ?? {}) as Record<string, unknown>
  const base = emptyGuided()
  return {
    ...base,
    pruebaEvaluacionTeorica: coerceGuidedValue(o.pruebaEvaluacionTeorica),
    // Ausente → se mantiene en modo rango (es una semana).
    semanaRevisionCalificaciones: coerceGuidedValue(o.semanaRevisionCalificaciones ?? { range: { start: null, end: null } }),
    sesionEvaluacion: coerceGuidedValue(o.sesionEvaluacion),
    itacaNotasInicio: coerceGuidedValue(o.itacaNotasInicio),
    // Migración: el antiguo `itacaNotasUltimaModif` pasa a «fin de introducción por docentes».
    itacaNotasFinDocentes: coerceGuidedValue(o.itacaNotasFinDocentes ?? o.itacaNotasUltimaModif),
    itacaNotasFinRectificacion: coerceGuidedValue(o.itacaNotasFinRectificacion),
    webFamiliaVisibilidad: coerceGuidedValue(o.webFamiliaVisibilidad),
    impresionActas: coerceGuidedValue(o.impresionActas),
    firmaActas: coerceGuidedValue(o.firmaActas),
    // Ausente → se mantiene en modo rango (valor por defecto de este hito).
    plazoReclamacion: coerceGuidedValue(o.plazoReclamacion ?? { range: { start: null, end: null } }),
    anticipacionSolicitudInicio: coerceGuidedValue(o.anticipacionSolicitudInicio),
    anticipacionSolicitudFin: coerceGuidedValue(o.anticipacionSolicitudFin),
    anticipacionListadoProvisional: coerceGuidedValue(o.anticipacionListadoProvisional),
    anticipacionListadoDefinitivo: coerceGuidedValue(o.anticipacionListadoDefinitivo),
    // Exámenes y Revisión por defecto en modo rango (son periodos).
    examenesExtraordinaria: coerceGuidedValue(o.examenesExtraordinaria ?? { range: { start: null, end: null } }),
    revisionExtraordinaria: coerceGuidedValue(o.revisionExtraordinaria ?? { range: { start: null, end: null } }),
    evaluacionExtraordinaria: coerceGuidedValue(o.evaluacionExtraordinaria),
  }
}

const TERM_TYPES: TermType[] = ['Primer', 'Segundo', 'Tercer', 'Anticipacion', 'Ordinaria', 'Extraordinaria']

function coerceTerm(v: unknown): Term {
  const o = (v ?? {}) as Record<string, unknown>
  const type = TERM_TYPES.includes(o.type as TermType) ? (o.type as TermType) : 'Primer'
  return {
    id: asStr(o.id, makeId('term')),
    type,
    name: asStr(o.name, defaultTermLabel(type, 'es')),
    startDate: asISOorNull(o.startDate),
    endDate: asISOorNull(o.endDate),
    guidedEnabled: asBool(o.guidedEnabled),
    guided: coerceGuided(o.guided),
    ...(asBool(o.linkedToTercer) ? { linkedToTercer: true } : {}),
  }
}

const EVENT_KINDS = new Set([
  'vacaciones',
  'festivoAutonomico',
  'festivoLocal',
  'festivoALectivo',
  'noLaborable',
  'claustro',
  'cocope',
  'consejoEscolar',
  'pruebaAcceso',
  'otro',
])

function coerceEvent(v: unknown): CalEvent {
  const o = (v ?? {}) as Record<string, unknown>
  const kind = EVENT_KINDS.has(o.kind as string) ? (o.kind as CalEvent['kind']) : 'otro'
  const rangeRaw = o.range as Record<string, unknown> | null | undefined
  const range =
    rangeRaw && isValidISO(rangeRaw.start) && isValidISO(rangeRaw.end)
      ? { start: rangeRaw.start as string, end: rangeRaw.end as string }
      : null
  return {
    id: asStr(o.id, makeId('ev')),
    title: asStr(o.title),
    kind,
    date: asISOorNull(o.date),
    range: range,
    // Horas solo con sentido en un evento de un día: si es un rango, se descartan.
    startTime: range ? null : asTimeOrNull(o.startTime),
    endTime: range ? null : asTimeOrNull(o.endTime),
    provisional: asBool(o.provisional),
    profiles: asStrArray(o.profiles),
    notes: asStr(o.notes),
    // Se conserva la procedencia solo si viene como cadena; ausente = evento manual.
    ...(typeof o.srcKey === 'string' ? { srcKey: o.srcKey } : {}),
  }
}

/** Conserva el bloque de procedencia externa solo si tiene un `provider` válido. */
function coerceSource(v: unknown): CalendarSource | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  if (typeof o.provider !== 'string' || !o.provider) return undefined
  return {
    provider: o.provider,
    manifestUrl: asStr(o.manifestUrl),
    courseUrl: asStr(o.courseUrl),
    course: asStr(o.course),
    municipio: asStr(o.municipio),
    municipioName: asStr(o.municipioName),
    ensenyanca: asStr(o.ensenyanca),
    ensenyancaName: asStr(o.ensenyancaName),
    schema: asStr(o.schema),
    version: typeof o.version === 'number' ? o.version : 0,
    seenUpdated: asStr(o.seenUpdated),
  }
}

function coerceProfile(v: unknown, i: number): Profile {
  const o = (v ?? {}) as Record<string, unknown>
  return {
    id: asStr(o.id, makeId('prof')),
    name: asStr(o.name, `Perfil ${i + 1}`),
    color: asStr(o.color, '#64748b'),
  }
}

/** Normaliza cualquier objeto a un Calendar válido (import tolerante). */
export function coerceCalendar(v: unknown): Calendar {
  // Tolerante con los campos, no con la forma: sin esto, un JSON que fuera `42` o `"hola"` —o una
  // entrada corrupta en localStorage— no daba error, sino un calendario vacío con nombre por
  // defecto, que aparecía en la lista como si el usuario lo hubiera creado.
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new Error('No es un calendario: se esperaba un objeto JSON')
  }
  const o = v as Record<string, unknown>
  const restWeekdays = Array.isArray(o.restWeekdays)
    ? o.restWeekdays.filter((n): n is number => typeof n === 'number' && n >= 0 && n <= 6)
    : [6, 0]
  const profiles = Array.isArray(o.profiles) && o.profiles.length
    ? o.profiles.map(coerceProfile)
    : defaultProfiles()
  const terms = Array.isArray(o.terms) && o.terms.length ? o.terms.map(coerceTerm) : defaultTerms()
  const events = Array.isArray(o.events) ? o.events.map(coerceEvent) : []
  const source = coerceSource(o.source)
  return {
    id: asStr(o.id, makeId('cal')),
    name: asStr(o.name, 'Calendario importado'),
    community: asStr(o.community),
    ...(typeof o.logo === 'string' && o.logo ? { logo: o.logo } : {}),
    courseStart: asISOorNull(o.courseStart),
    courseEnd: asISOorNull(o.courseEnd),
    restWeekdays,
    profiles,
    terms,
    events,
    ...(source ? { source } : {}),
    schemaVersion: SCHEMA_VERSION,
    updatedAt: asStr(o.updatedAt) || new Date().toISOString(),
  }
}

export function serializeCalendar(cal: Calendar): string {
  return JSON.stringify(cal, null, 2)
}

export function parseCalendar(text: string): Calendar {
  return coerceCalendar(JSON.parse(text))
}
