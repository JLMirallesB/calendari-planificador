// Modelo de datos de la app. Todas las fechas se guardan como cadenas ISO `YYYY-MM-DD`.

export type ISODate = string // "2026-09-08"

/** Perfiles de visibilidad (docentes, alumnado, familias, administración…). */
export interface Profile {
  id: string
  name: string
  color: string
}

/** Tipos de trimestre soportados. El orden define la secuencia del curso. */
export type TermType =
  | 'Primer'
  | 'Segundo'
  | 'Tercer'
  | 'Anticipacion'
  | 'Ordinaria'
  | 'Extraordinaria'

/** Un valor de fecha que puede marcarse como provisional. */
export interface DateValue {
  date: ISODate | null
  provisional: boolean
}

/** Un rango de fechas que puede marcarse como provisional. */
export interface RangeValue {
  start: ISODate | null
  end: ISODate | null
  provisional: boolean
}

/**
 * Valor de un hito del modo guiado. Puede ser **puntual** (`date`) o **rango** (`range`),
 * a elección del usuario: si `range` no es null, el hito está en modo rango.
 */
export interface GuidedValue {
  date: ISODate | null
  range: { start: ISODate | null; end: ISODate | null } | null
  provisional: boolean
  /** IDs de perfiles a los que es visible el hito. Vacío = visible para todos. */
  profiles: string[]
}

/** Hitos administrativos del modo guiado, comunes a los trimestres. */
export interface GuidedFields {
  pruebaEvaluacionTeorica: GuidedValue
  /** Semana de revisión de calificaciones (por defecto en modo rango). */
  semanaRevisionCalificaciones: GuidedValue
  sesionEvaluacion: GuidedValue
  itacaNotasInicio: GuidedValue
  /** Fecha fin de introducción de notas por docentes. */
  itacaNotasFinDocentes: GuidedValue
  /** Fecha fin de rectificación de notas por el Equipo Directivo. */
  itacaNotasFinRectificacion: GuidedValue
  webFamiliaVisibilidad: GuidedValue
  impresionActas: GuidedValue
  firmaActas: GuidedValue
  plazoReclamacion: GuidedValue
  // Solo relevantes para el trimestre de Anticipación:
  anticipacionSolicitudInicio: GuidedValue
  anticipacionSolicitudFin: GuidedValue
  anticipacionListadoProvisional: GuidedValue
  anticipacionListadoDefinitivo: GuidedValue
  // Solo relevantes para la evaluación Extraordinaria:
  examenesExtraordinaria: GuidedValue
  revisionExtraordinaria: GuidedValue
  evaluacionExtraordinaria: GuidedValue
}

export interface Term {
  id: string
  type: TermType
  /** Nombre visible, editable (p. ej. "Primer trimestre"). */
  name: string
  startDate: ISODate | null
  /** Opcional; si falta, el fin se deduce del inicio del siguiente trimestre. */
  endDate: ISODate | null
  guidedEnabled: boolean
  guided: GuidedFields
  /**
   * Solo en la evaluación Ordinaria/Final: si es true, sus fechas e hitos se mantienen
   * sincronizados con el 3.º trimestre (editar uno actualiza el otro).
   */
  linkedToTercer?: boolean
}

/** Categoría de un evento; determina cómo afecta (o no) al cómputo lectivo. */
export type EventKind =
  | 'vacaciones'
  | 'festivoAutonomico'
  | 'festivoLocal'
  | 'festivoALectivo' // festivo del calendario autonómico convertido en lectivo
  | 'noLaborable' // día no laborable, típicamente fuera del periodo lectivo
  | 'claustro'
  | 'cocope'
  | 'consejoEscolar'
  | 'pruebaAcceso'
  | 'otro'

/** Un evento con fecha puntual (`date`) o de rango (`range`). */
export interface CalEvent {
  id: string
  title: string
  kind: EventKind
  date: ISODate | null
  range: { start: ISODate; end: ISODate } | null
  /**
   * Hora opcional (HH:MM, 24 h) para eventos de un día. Solo se usan en eventos institucionales y
   * «otras fechas»; en vacaciones/festivos y en rangos se ignoran. Si hay `startTime`, el evento
   * deja de ser de día completo en el ICS y pasa a tener hora (zona Europe/Madrid).
   */
  startTime?: string | null
  endTime?: string | null
  provisional: boolean
  /** IDs de perfiles a los que es visible. Vacío = visible para todos. */
  profiles: string[]
  notes: string
  /**
   * Clave estable de procedencia para eventos generados desde una fuente externa
   * (p. ej. el dataset de legislación CV). Permite re-sincronizar sin pisar los
   * eventos creados a mano (que no llevan `srcKey`). Ausente = evento del usuario.
   */
  srcKey?: string
}

/** Procedencia de un calendario creado a partir de una fuente externa. */
export interface CalendarSource {
  provider: string // p. ej. "cev-legis"
  manifestUrl: string
  courseUrl: string
  course: string
  municipio: string // slug/code del municipio
  municipioName: string
  ensenyanca: string // code de la enseñanza
  ensenyancaName: string
  schema: string
  version: number
  /** Valor de `manifest.updated` visto al importar; sirve para detectar cambios. */
  seenUpdated: string
}

export interface Calendar {
  id: string
  name: string
  /** Texto libre, p. ej. "Comunitat Valenciana" o nombre del centro. */
  community: string
  /** Logo del centro (data URL) para la cabecera del PDF. Opcional. */
  logo?: string
  courseStart: ISODate | null
  courseEnd: ISODate | null
  /** Días de la semana no lectivos: 0=domingo … 6=sábado. Por defecto [6, 0]. */
  restWeekdays: number[]
  profiles: Profile[]
  terms: Term[]
  events: CalEvent[]
  /** Procedencia externa (si el calendario se creó desde un dataset). Opcional. */
  source?: CalendarSource
  /** Versión del esquema de datos, para migraciones futuras. */
  schemaVersion: number
  updatedAt: string // ISO datetime
}

/** Entrada del índice de calendarios publicados (public/calendars/index.json). */
export interface PublishedIndexEntry {
  id: string
  name: string
  description: string
  file: string // ruta relativa dentro de public/calendars
}
