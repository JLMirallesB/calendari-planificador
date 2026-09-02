import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { es, type Dict } from './es'
import { ca } from './ca'

export type Lang = 'es' | 'ca'

export const LANG_KEY = 'calendari:lang'

const DICTS: Record<Lang, Dict> = { es, ca }
const LOCALES: Record<Lang, string> = { es: 'es-ES', ca: 'ca-ES' }

export function getLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'es' || saved === 'ca') return saved
  } catch {
    /* noop */
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ca')) return 'ca'
  return 'es'
}

/** Resuelve una clave con puntos (p. ej. "events.kind.otro") en el diccionario. */
function resolve(dict: Dict, path: string): string {
  const val = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, dict)
  return typeof val === 'string' ? val : path
}

export type TFunc = (path: string, params?: Record<string, string | number>) => string

export interface Formatters {
  human: (iso: string) => string
  long: (iso: string) => string
  /** Fecha numérica compacta (dd/mm/aaaa). Acepta también timestamps ISO completos. */
  short: (iso: string) => string
  /** Fecha y hora de un timestamp ISO completo (para copias de seguridad y similares). */
  dateTime: (iso: string) => string
  monthName: (m: number) => string
  weekdayLong: (weekday: number) => string
  weekdayShort: (weekday: number) => string
}

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunc
  fmt: Formatters
}

const I18nContext = createContext<I18nContextValue | null>(null)

function parseISOlocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function buildFormatters(lang: Lang): Formatters {
  const locale = LOCALES[lang]
  const humanFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const longFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  const shortFmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  const dateTimeFmt = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'long' })
  const wdLongFmt = new Intl.DateTimeFormat(locale, { weekday: 'long' })
  const wdShortFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-07 es domingo (getDay 0). Sumando el índice obtenemos cada día de la semana.
  const wdRef = (weekday: number) => new Date(2024, 0, 7 + weekday)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return {
    human: (iso) => humanFmt.format(parseISOlocal(iso)),
    long: (iso) => longFmt.format(parseISOlocal(iso)),
    short: (iso) => shortFmt.format(parseISOlocal(iso.slice(0, 10))),
    dateTime: (iso) => dateTimeFmt.format(new Date(iso)),
    monthName: (m) => cap(monthFmt.format(new Date(2024, m, 1))),
    weekdayLong: (weekday) => cap(wdLongFmt.format(wdRef(weekday))),
    weekdayShort: (weekday) => cap(wdShortFmt.format(wdRef(weekday)).replace(/\.$/, '')),
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* noop */
    }
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])

  const t: TFunc = useCallback(
    (path, params) => {
      let out = resolve(DICTS[lang], path)
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return out
    },
    [lang],
  )

  const fmt = useMemo(() => buildFormatters(lang), [lang])

  const value: I18nContextValue = { lang, setLang, t, fmt }
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider')
  return ctx
}

/** Construye el objeto de etiquetas que consume icsCore (títulos por tipo, hitos, prefijo). */
export function occurrenceLabels(t: TFunc) {
  const kinds = [
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
  ]
  const guidedKeys = [
    'pruebaEvaluacionTeorica',
    'semanaRevisionCalificaciones',
    'sesionEvaluacion',
    'itacaNotasInicio',
    'itacaNotasFinDocentes',
    'itacaNotasFinRectificacion',
    'webFamiliaVisibilidad',
    'impresionActas',
    'firmaActas',
    'plazoReclamacion',
    'anticipacionSolicitudInicio',
    'anticipacionSolicitudFin',
    'anticipacionListadoProvisional',
    'anticipacionListadoDefinitivo',
    'examenesExtraordinaria',
    'revisionExtraordinaria',
    'evaluacionExtraordinaria',
  ]
  const kind: Record<string, string> = {}
  kinds.forEach((k) => (kind[k] = t(`events.kindTitle.${k}`)))
  const guided: Record<string, string> = {}
  guidedKeys.forEach((k) => (guided[k] = t(`guided.items.${k}`)))
  return { kind, guided, startPrefix: t('terms.startPrefix') }
}
