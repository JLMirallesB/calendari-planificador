import type { Calendar, EventKind, ISODate } from '../types'

export type OccurrenceKind = EventKind | 'termStart' | 'guided'

export interface Occurrence {
  startISO: ISODate
  endISO: ISODate
  title: string
  provisional: boolean
  kind: OccurrenceKind
  /** Clave del hito guiado (solo cuando kind === 'guided'). */
  guidedKey?: string
  allDay: boolean
  /** Hora de inicio/fin (HH:MM) cuando el evento tiene hora; ausente en eventos de día completo. */
  startTime?: string
  endTime?: string
  /** Identidad estable de la ocurrencia; base del UID en el ICS. No depende del orden. */
  key?: string
}

/** Emoji por tipo de evento/ocurrencia (para títulos e iconos). */
export const KIND_EMOJI: Record<string, string>
/** Emoji específico por hito del modo guiado. */
export const GUIDED_EMOJI: Record<string, string>

/** Etiquetas localizadas opcionales; si se omiten se usan las de castellano. */
export interface OccurrenceLabels {
  kind: Record<string, string>
  guided: Record<string, string>
  startPrefix: string
}

export function expandOccurrences(
  calendar: Calendar,
  profileId: string | null,
  labels?: OccurrenceLabels,
): Occurrence[]

export function buildICS(
  calendar: Calendar,
  profileId: string | null,
  opts?: { calName?: string; dtstamp?: string; labels?: OccurrenceLabels },
): string
