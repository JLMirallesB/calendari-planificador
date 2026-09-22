import type { Calendar, CalEvent, ISODate } from '../types'

export interface HabilSets {
  /** Festivos autonómicos y locales (inhábiles). */
  festivo: Set<ISODate>
  /** Festivos convertidos en lectivo (vuelven a ser hábiles). */
  overrides: Set<ISODate>
}

export interface LectiveSets {
  /** Vacaciones, festivos (autonómicos y locales) y días no laborables. */
  nonLective: Set<ISODate>
  /** Festivos convertidos en lectivos. */
  overrides: Set<ISODate>
}

/** Expande un evento a la lista de fechas ISO que ocupa (puntual o rango). */
export function eventDates(ev: CalEvent): ISODate[]
export function habilSets(cal: Calendar): HabilSets
/** Día hábil (administrativo): no sábado/domingo y no festivo. No mira vacaciones. */
export function isHabil(cal: Calendar, iso: ISODate, sets?: HabilSets): boolean
export function lectiveSets(cal: Calendar): LectiveSets
/** Día lectivo: dentro del curso, no de descanso y no en vacaciones/festivo. */
export function isLectiveDay(cal: Calendar, iso: ISODate, sets?: LectiveSets): boolean
