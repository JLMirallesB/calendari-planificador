import type { Calendar, GuidedFields, ISODate } from '../types'

/** Código de motivo por el que un día no se puede solicitar. */
export type MotivoAsuntos =
  | 'no_laborable'
  | 'sesion_evaluacion'
  | 'ordinaria_extraordinaria'
  | 'inicio_curso'
  | 'fin_curso'
  | 'navidad'
  | 'pascua'
  | 'fiesta_local'

/** Tipo de día a efectos del permiso: cada uno descuenta de una bolsa distinta (o de ninguna). */
export type TipoDiaAsuntos = 'lectivo' | 'no_lectivo' | 'no_laborable'

/**
 * Ventana de N días lectivos a cada lado de un ancla (Navidad, Pascua, una fiesta local).
 * El ancla se referencia por id de evento, NO por título ni por clave de procedencia: la de las
 * fiestas locales del dataset CEV lleva la fecha dentro y cambia cada curso.
 */
export interface VentanaAsuntos {
  code: MotivoAsuntos | string
  eventIds: string[]
  /** Días lectivos bloqueados antes del ancla; el contiguo es el 1.º. */
  antes: number
  /** Días lectivos bloqueados después del ancla; el contiguo es el 1.º. */
  despues: number
}

export interface AsuntosConfig {
  /** Días lectivos bloqueados al empezar el curso (el primero cuenta como 1.º). */
  inicioCurso: number
  /** Días lectivos bloqueados al acabar el curso (el último cuenta como 1.º). */
  finCurso: number
  /** Hitos guiados que cuentan como «sesión de evaluación». */
  evaluacionKeys: (keyof GuidedFields | string)[]
  /** ¿La convocatoria anticipada entra en el tramo ordinaria-extraordinaria? */
  tramoIncluyeAnticipacion: boolean
  ventanas: VentanaAsuntos[]
}

export interface AsuntosRow {
  fecha: ISODate
  tipoDia: TipoDiaAsuntos
  pedible: boolean
  /** Primer motivo por orden de prioridad; vacío si es pedible. */
  motivoPrincipal: string
  /** Todos los motivos que se cumplen, por orden de prioridad. */
  motivos: string[]
  /** Alguna fecha provisional influye en la clasificación del día (bloquee o no). */
  provisional: boolean
  descripcion: string
}

export interface AsuntosResult {
  /** Periodo de disfrute cubierto, o null si el calendario no tiene fechas de curso. */
  rango: { desde: ISODate; hasta: ISODate } | null
  rows: AsuntosRow[]
  /** Reglas que no se han podido calcular; si no viene vacía, el resultado tiene días de más. */
  reglasIncompletas: string[]
}

export interface AsuntosLabels {
  inicioCurso?: string
  finCurso?: string
  guided?: Record<string, string>
}

export const MOTIVO_ORDER: MotivoAsuntos[]
export const DEFAULT_EVALUACION_KEYS: string[]

export function normalizeAsuntosConfig(cfg?: Partial<AsuntosConfig> | null): AsuntosConfig

export function computeAsuntos(
  cal: Calendar,
  opts?: { config?: Partial<AsuntosConfig> | null; labels?: AsuntosLabels },
): AsuntosResult

/** CSV con BOM, CRLF, separador `;` y comillas RFC 4180. */
export function buildAsuntosCSV(rows: AsuntosRow[]): string

export function buildAsuntosMeta(
  cal: Calendar,
  resultado: AsuntosResult,
  generatedAt?: string,
): Record<string, unknown>
