import type { Calendar, GuidedFields, GuidedValue, Term, TermType } from '../types'
import { addDays, eachDay, weekday } from './dateUtils'

/**
 * Autocompletar hitos administrativos de un trimestre a partir de la **sesión de evaluación**.
 *
 * La cascada se dedujo del calendario real (21/21): cada hito es «+1 día hábil» sobre el anterior,
 * salvo los pares que caen el mismo día. Función pura y sin estado: no rellena por su cuenta, solo
 * *propone*; el panel enseña el diff y el usuario elige qué aplicar (como la sincronización CEV).
 *
 * «Día hábil» aquí = lunes a viernes que no sea festivo (autonómico/local) **ni vacaciones**; un
 * festivo recuperado como lectivo sí cuenta. Se decidió incluir las vacaciones (a diferencia de
 * `isHabil`, que no las mira) para que un plazo no caiga dentro de Navidad o Pascua.
 */

/** Tipos de trimestre cuya cascada administrativa está verificada. */
const AUTOFILL_TYPES: TermType[] = ['Primer', 'Segundo', 'Tercer', 'Ordinaria']

/** Los seis hitos que se derivan de la sesión de evaluación (los demás quedan manuales). */
export const AUTOFILL_KEYS: (keyof GuidedFields)[] = [
  'itacaNotasFinDocentes',
  'itacaNotasFinRectificacion',
  'webFamiliaVisibilidad',
  'impresionActas',
  'firmaActas',
  'plazoReclamacion',
]

/** ¿Ofrece este trimestre el autocompletar? No si es Ordinaria enlazada al 3.º (ya se sincroniza). */
export function canAutofill(term: Term): boolean {
  if (!AUTOFILL_TYPES.includes(term.type)) return false
  if (term.type === 'Ordinaria' && term.linkedToTercer) return false
  return true
}

/** Día final de la sesión de evaluación (fin del rango, o el día si es puntual). null si falta. */
export function sessionEnd(term: Term): string | null {
  const v = term.guided.sesionEvaluacion
  if (!v) return null
  if (v.range && v.range.end) return v.range.end
  return v.date ?? null
}

/** Conjunto de días inhábiles: festivos y vacaciones; los festivoALectivo se restan. */
function inhabilSet(cal: Calendar): { off: Set<string>; on: Set<string> } {
  const off = new Set<string>()
  const on = new Set<string>()
  const days = (ev: (typeof cal.events)[number]) =>
    ev.date ? [ev.date] : ev.range && ev.range.start && ev.range.end ? eachDay(ev.range.start, ev.range.end) : []
  for (const ev of cal.events) {
    if (ev.kind === 'festivoAutonomico' || ev.kind === 'festivoLocal' || ev.kind === 'vacaciones') {
      days(ev).forEach((d) => off.add(d))
    } else if (ev.kind === 'festivoALectivo') {
      days(ev).forEach((d) => on.add(d))
    }
  }
  return { off, on }
}

function isWorkingDay(iso: string, sets: { off: Set<string>; on: Set<string> }): boolean {
  const wd = weekday(iso)
  if (wd === 0 || wd === 6) return false
  if (sets.on.has(iso)) return true // festivo recuperado como lectivo → hábil
  return !sets.off.has(iso)
}

/** Avanza `n` días hábiles desde `iso` (n≥1 devuelve el n-ésimo día hábil posterior). */
function addWorking(iso: string, n: number, sets: { off: Set<string>; on: Set<string> }): string {
  let d = iso
  let count = 0
  for (let guard = 0; guard < 400 && count < n; guard++) {
    d = addDays(d, 1)
    if (isWorkingDay(d, sets)) count++
  }
  return d
}

/** Propuesta de fechas para un hito: puntual (`date`) o rango (`start`/`end`). */
export interface ProposedMilestone {
  key: keyof GuidedFields
  date?: string
  start?: string
  end?: string
}

/**
 * Calcula los seis hitos administrativos a partir de la sesión de evaluación. Devuelve `[]` si el
 * trimestre no admite autocompletar o si no hay fecha de sesión.
 */
export function computeGuidedMilestones(cal: Calendar, term: Term): ProposedMilestone[] {
  if (!canAutofill(term)) return []
  const end = sessionEnd(term)
  if (!end) return []
  const sets = inhabilSet(cal)

  const finDocentes = end
  const rectificacion = addWorking(finDocentes, 1, sets)
  const webFamilia = addWorking(rectificacion, 1, sets)
  const impresion = webFamilia
  // Firma y reclamación empiezan el día hábil siguiente a la comunicación (impresión) y duran 3.
  const plazoStart = addWorking(impresion, 1, sets)
  const plazoEnd = addWorking(plazoStart, 2, sets)

  return [
    { key: 'itacaNotasFinDocentes', date: finDocentes },
    { key: 'itacaNotasFinRectificacion', date: rectificacion },
    { key: 'webFamiliaVisibilidad', date: webFamilia },
    { key: 'impresionActas', date: impresion },
    { key: 'firmaActas', start: plazoStart, end: plazoEnd },
    { key: 'plazoReclamacion', start: plazoStart, end: plazoEnd },
  ]
}

/** Valor actual de un hito como cadena comparable (para el diff), o '' si está vacío. */
export function milestoneCurrent(v: GuidedValue | undefined): string {
  if (!v) return ''
  if (v.range) return v.range.start || v.range.end ? `${v.range.start ?? ''}→${v.range.end ?? ''}` : ''
  return v.date ?? ''
}

/** Cadena comparable de una propuesta (mismo formato que `milestoneCurrent`). */
export function milestoneProposed(p: ProposedMilestone): string {
  return p.date ? p.date : `${p.start ?? ''}→${p.end ?? ''}`
}

export interface GuidedDiffItem {
  key: keyof GuidedFields
  current: string
  proposed: string
  /** true si la propuesta difiere de lo que ya hay (incluye rellenar un hito vacío). */
  changes: boolean
}

/** Compara la propuesta con el estado actual del trimestre. */
export function diffGuidedMilestones(term: Term, proposed: ProposedMilestone[]): GuidedDiffItem[] {
  return proposed.map((p) => {
    const current = milestoneCurrent(term.guided[p.key])
    const prop = milestoneProposed(p)
    return { key: p.key, current, proposed: prop, changes: current !== prop }
  })
}

/**
 * Aplica al trimestre solo los hitos cuyas claves están en `selected`, conservando perfiles y la
 * marca de provisional de cada hito; solo cambian las fechas y el modo (puntual/rango).
 */
export function applyGuidedMilestones(
  term: Term,
  proposed: ProposedMilestone[],
  selected: Set<string>,
): GuidedFields {
  const guided: GuidedFields = { ...term.guided }
  for (const p of proposed) {
    if (!selected.has(p.key)) continue
    const prev = guided[p.key] ?? { date: null, range: null, provisional: false, profiles: [] }
    guided[p.key] = p.date
      ? { date: p.date, range: null, provisional: prev.provisional, profiles: prev.profiles }
      : {
          date: null,
          range: { start: p.start ?? '', end: p.end ?? '' },
          provisional: prev.provisional,
          profiles: prev.profiles,
        }
  }
  return guided
}
