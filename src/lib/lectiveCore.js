// Núcleo del cómputo de días: qué día es lectivo y qué día es hábil. JS plano (ESM), como
// `icsCore.js`, para que lo puedan usar tanto la app (vía lectiveCore.d.ts y los re-exports de
// `lectiveDays.ts`) como los scripts de Node de `scripts/`, que importan sin transpilar.
//
// Aquí solo está lo que no depende de React ni de tipos: los conjuntos de fechas y los dos
// predicados. El resto del cómputo del curso (trimestres, estadísticas) sigue en
// `lectiveDays.ts`, que es donde se usa.

import { eachDay, parseISO, weekday } from './dateCore.js'

/** Expande un evento a la lista de fechas ISO que ocupa (puntual o rango). */
export function eventDates(ev) {
  if (ev.date) return [ev.date]
  if (ev.range) return eachDay(ev.range.start, ev.range.end)
  return []
}

/**
 * Conjuntos para el cómputo de días hábiles (administrativos):
 *  - `festivo`: festivos autonómicos y locales (inhábiles).
 *  - `overrides`: festivos reconvertidos en lectivos (vuelven a ser hábiles).
 */
export function habilSets(cal) {
  const festivo = new Set()
  const overrides = new Set()
  for (const ev of cal.events || []) {
    if (ev.kind === 'festivoAutonomico' || ev.kind === 'festivoLocal') {
      eventDates(ev).forEach((d) => festivo.add(d))
    } else if (ev.kind === 'festivoALectivo') {
      eventDates(ev).forEach((d) => overrides.add(d))
    }
  }
  return { festivo, overrides }
}

/**
 * Día hábil (administrativo): no sábado/domingo y no festivo (autonómico/local).
 *
 * OJO: «hábil» no es «laborable en el centro». Esto NO mira vacaciones ni días no laborables,
 * porque el plazo administrativo corre igual en vacaciones. Para saber si alguien trabaja ese
 * día hace falta además `lectiveSets`.
 */
export function isHabil(cal, iso, sets) {
  const wd = weekday(iso)
  if (wd === 0 || wd === 6) return false // domingo / sábado
  const s = sets || habilSets(cal)
  if (s.overrides.has(iso)) return true // festivo recuperado como lectivo → hábil
  return !s.festivo.has(iso)
}

/**
 * Conjuntos para el cómputo de días lectivos:
 *  - `nonLective`: vacaciones, festivos (autonómicos y locales) y días no laborables.
 *  - `overrides`: festivos reconvertidos en lectivos (ganan a todo lo anterior).
 */
export function lectiveSets(cal) {
  const nonLective = new Set()
  const overrides = new Set()
  for (const ev of cal.events || []) {
    const dates = eventDates(ev)
    if (
      ev.kind === 'vacaciones' ||
      ev.kind === 'festivoAutonomico' ||
      ev.kind === 'festivoLocal' ||
      ev.kind === 'noLaborable'
    ) {
      dates.forEach((d) => nonLective.add(d))
    } else if (ev.kind === 'festivoALectivo') {
      dates.forEach((d) => overrides.add(d))
    }
  }
  return { nonLective, overrides }
}

/**
 * Un día es lectivo si está dentro del curso y:
 *  - es un override "festivo→lectivo" (gana siempre), o
 *  - no es día de descanso semanal y no cae en vacaciones/festivo.
 */
export function isLectiveDay(cal, iso, sets) {
  if (!cal.courseStart || !cal.courseEnd) return false
  if (parseISO(iso) < parseISO(cal.courseStart) || parseISO(iso) > parseISO(cal.courseEnd)) return false
  const s = sets || lectiveSets(cal)
  if (s.overrides.has(iso)) return true
  if ((cal.restWeekdays || []).includes(weekday(iso))) return false
  if (s.nonLective.has(iso)) return false
  return true
}
