import { useEffect, useState } from 'react'
import type { Calendar, GuidedFields, Term, TermType } from '../../types'
import { useI18n } from '../../i18n'
import { addDays } from '../../lib/dateUtils'
import { computeTermStats, equalTrimesterStarts, isLectiveDay } from '../../lib/lectiveDays'
import { guidedDates, guidedHasDates, shiftGuidedDates, withDefaultGuidedProfiles } from '../../lib/guided'
import TermGuidedPanel from './TermGuidedPanel'
import Section from './Section'
import { useEditorFocus } from './EditorFocus'
import DateInput from './DateInput'

interface Props {
  cal: Calendar
  onChange: (terms: Term[]) => void
}

export default function TermsEditor({ cal, onChange }: Props) {
  const { t, fmt } = useI18n()
  const { request } = useEditorFocus()
  const [collapsedTerms, setCollapsedTerms] = useState<Set<string>>(new Set())
  const [collapsedGuided, setCollapsedGuided] = useState<Set<string>>(new Set())

  // Al saltar desde el compacto a un trimestre/hito, expande el bloque (y su guiado).
  useEffect(() => {
    if (!request) return
    const parts = request.anchorId.split('-')
    const tid = parts[0] === 'term' ? parts.slice(1).join('-') : parts[0] === 'guided' ? parts[1] : null
    if (!tid) return
    setCollapsedTerms((s) => (s.has(tid) ? new Set([...s].filter((x) => x !== tid)) : s))
    setCollapsedGuided((s) => (s.has(tid) ? new Set([...s].filter((x) => x !== tid)) : s))
  }, [request])

  const tercer = cal.terms.find((x) => x.type === 'Tercer') ?? null
  const ordinaria = cal.terms.find((x) => x.type === 'Ordinaria') ?? null
  const synced = !!ordinaria?.linkedToTercer
  const cloneGuided = (g: GuidedFields) => JSON.parse(JSON.stringify(g)) as GuidedFields

  // Con la sincronización activa, el trimestre «pareja» del editado (3.º ↔ Ordinaria).
  const counterpartId = (id: string): string | null => {
    if (!synced || !tercer || !ordinaria) return null
    if (id === tercer.id) return ordinaria.id
    if (id === ordinaria.id) return tercer.id
    return null
  }

  const update = (id: string, patch: Partial<Term>) => {
    let terms = cal.terms.map((term) => (term.id === id ? { ...term, ...patch } : term))
    const cid = counterpartId(id)
    if (cid) {
      // Espeja solo las fechas/hitos (no el nombre) al trimestre sincronizado.
      const mirror: Partial<Term> = {}
      if ('startDate' in patch) mirror.startDate = patch.startDate
      if ('endDate' in patch) mirror.endDate = patch.endDate
      if ('guidedEnabled' in patch) mirror.guidedEnabled = patch.guidedEnabled
      if ('guided' in patch && patch.guided) mirror.guided = cloneGuided(patch.guided)
      if (Object.keys(mirror).length) terms = terms.map((term) => (term.id === cid ? { ...term, ...mirror } : term))
    }
    onChange(terms)
  }
  const setGuided = (id: string, guided: GuidedFields) => update(id, { guided })

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const n = new Set(set)
    n.has(id) ? n.delete(id) : n.add(id)
    setSet(n)
  }

  const hasCourse = Boolean(cal.courseStart && cal.courseEnd)
  const statsById = new Map(computeTermStats(cal).map((s) => [s.termId, s]))

  const splitEqual = () => {
    if (!cal.courseStart || !cal.courseEnd) return
    const s = equalTrimesterStarts(cal.courseStart, cal.courseEnd)
    const starts: Partial<Record<TermType, string>> = { Primer: s.primer, Segundo: s.segundo, Tercer: s.tercer }
    onChange(
      cal.terms.map((term) =>
        starts[term.type] ? { ...term, startDate: starts[term.type] as string, endDate: null } : term,
      ),
    )
  }

  // Copia (puntual) inicio, fin e hitos del 3.º trimestre a la evaluación Ordinaria/Final.
  const linkOrdinariaToTercer = () => {
    if (!tercer || !ordinaria) return
    if (!window.confirm(t('terms.linkOrdinariaConfirm'))) return
    onChange(
      cal.terms.map((term) =>
        term.id === ordinaria.id
          ? {
              ...term,
              startDate: tercer.startDate,
              endDate: tercer.endDate,
              guidedEnabled: tercer.guidedEnabled,
              guided: cloneGuided(tercer.guided),
            }
          : term,
      ),
    )
  }

  const sameSyncData = (a: Term, b: Term) =>
    a.startDate === b.startDate &&
    a.endDate === b.endDate &&
    a.guidedEnabled === b.guidedEnabled &&
    JSON.stringify(a.guided) === JSON.stringify(b.guided)

  // Activa/desactiva la sincronización permanente 3.º ↔ Ordinaria/Final.
  const toggleSync = () => {
    if (!tercer || !ordinaria) return
    if (synced) {
      onChange(
        cal.terms.map((term) => {
          if (term.id !== ordinaria.id) return term
          const rest = { ...term }
          delete rest.linkedToTercer
          return rest
        }),
      )
      return
    }
    // Al activar, si difieren, preguntar qué trimestre prevalece.
    let source = tercer
    if (!sameSyncData(tercer, ordinaria)) {
      source = window.confirm(t('terms.syncDirection')) ? tercer : ordinaria
    }
    const targetId = source.id === tercer.id ? ordinaria.id : tercer.id
    onChange(
      cal.terms.map((term) => {
        if (term.id === targetId) {
          const copied = {
            ...term,
            startDate: source.startDate,
            endDate: source.endDate,
            guidedEnabled: source.guidedEnabled,
            guided: cloneGuided(source.guided),
          }
          return targetId === ordinaria.id ? { ...copied, linkedToTercer: true } : copied
        }
        if (term.id === ordinaria.id) return { ...term, linkedToTercer: true }
        return term
      }),
    )
  }

  // Re-siembra los perfiles por defecto en los hitos de todos los trimestres.
  const applyDefaultProfiles = () => {
    if (!window.confirm(t('terms.applyGuidedProfilesConfirm'))) return
    onChange(cal.terms.map((term) => ({ ...term, guided: withDefaultGuidedProfiles(term.guided) })))
  }

  const nudgeWeeks = (term: Term, weeks: number) => {
    if (!term.startDate) return
    const days = weeks * 7
    const newStart = addDays(term.startDate, days)

    // Si hay hitos con fecha, preguntar si mover también todos los hitos del trimestre.
    if (term.guidedEnabled && guidedHasDates(term.guided)) {
      const moveAll = window.confirm(t('terms.moveMilestonesConfirm'))
      if (moveAll) {
        const shifted = shiftGuidedDates(term.guided, days)
        // Avisar si, tras moverlos, algún hito cae en día no lectivo.
        const seen = new Set<string>()
        const collisions = guidedDates(shifted).filter((d) => {
          if (isLectiveDay(cal, d.iso)) return false
          const k = `${d.key}|${d.iso}`
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
        if (collisions.length) {
          const list = collisions.map((c) => `• ${t(`guided.items.${c.key}`)}: ${c.iso}`).join('\n')
          if (!window.confirm(t('terms.milestoneCollision', { list }))) return
        }
        update(term.id, { startDate: newStart, guided: shifted })
        return
      }
    }
    update(term.id, { startDate: newStart })
  }

  return (
    <Section
      title={t('terms.title')}
      sectionId="terms"
      headerExtra={
        <button className="btn btn-sm" onClick={splitEqual} disabled={!hasCourse} title={t('terms.splitTitle')}>
          {t('terms.splitEqual')}
        </button>
      }
    >
      <p className="help">{t('terms.help')}</p>
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={applyDefaultProfiles} title={t('terms.applyGuidedProfilesTitle')}>
          👥 {t('terms.applyGuidedProfiles')}
        </button>
      </div>
      {cal.terms.map((term) => {
        const st = statsById.get(term.id)
        const open = !collapsedTerms.has(term.id)
        return (
          <div key={term.id} id={`term-${term.id}`} className="term-block">
            <div className="term-block-header">
              <button
                type="button"
                className="section-toggle"
                aria-expanded={open}
                onClick={() => toggle(collapsedTerms, setCollapsedTerms, term.id)}
              >
                <span className="chevron" aria-hidden>
                  {open ? '▾' : '▸'}
                </span>
                <strong>{term.name || t('terms.nameLabel')}</strong>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {synced && (term.type === 'Tercer' || term.type === 'Ordinaria') && (
                  <span
                    className="badge"
                    style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}
                  >
                    🔄 {t('terms.syncBadge')}
                  </span>
                )}
                {term.startDate && (
                  <span className="inline-note">
                    {fmt.human(term.startDate)}
                    {st ? ` · ${st.lectiveDays} ${t('counter.lectiveDays')}` : ''}
                  </span>
                )}
              </div>
            </div>

            {open && (
              <div className="term-block-body">
                <div className="field-row">
                  <div className="field" style={{ flex: 2 }}>
                    <label>{t('terms.nameLabel')}</label>
                    <input type="text" value={term.name} onChange={(e) => update(term.id, { name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>{t('terms.startLabel')}</label>
                    <DateInput
                      value={term.startDate ?? ''}
                      onChange={(e) => update(term.id, { startDate: e.target.value || null })}
                    />
                  </div>
                  <div className="field">
                    <label>{t('terms.endLabel')}</label>
                    <DateInput
                      value={term.endDate ?? ''}
                      onChange={(e) => update(term.id, { endDate: e.target.value || null })}
                    />
                  </div>
                </div>

                {term.startDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                    <div className="btn-group">
                      <button className="btn btn-sm" onClick={() => nudgeWeeks(term, -1)} title={t('terms.weekEarlier')}>
                        − {t('terms.week')}
                      </button>
                      <button className="btn btn-sm" onClick={() => nudgeWeeks(term, 1)} title={t('terms.weekLater')}>
                        + {t('terms.week')}
                      </button>
                    </div>
                    {st && (
                      <span className="inline-note">
                        <strong style={{ color: 'var(--lective)', fontSize: 15 }}>{st.lectiveDays}</strong>{' '}
                        {t('counter.lectiveDays')} · {st.weeks} {t('counter.weeks')}
                      </span>
                    )}
                  </div>
                )}

                {term.type === 'Ordinaria' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm" onClick={linkOrdinariaToTercer} title={t('terms.linkOrdinariaTitle')}>
                      🔗 {t('terms.linkOrdinaria')}
                    </button>
                    <button
                      className={`btn btn-sm ${synced ? 'btn-primary' : ''}`}
                      onClick={toggleSync}
                      title={t('terms.syncTitle')}
                    >
                      🔄 {synced ? t('terms.syncOn') : t('terms.syncOff')}
                    </button>
                  </div>
                )}

                <label className="checkbox" style={{ marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={term.guidedEnabled}
                    onChange={(e) => update(term.id, { guidedEnabled: e.target.checked })}
                  />
                  {t('terms.guidedToggle')}
                </label>
                {term.guidedEnabled && (
                  <TermGuidedPanel
                    cal={cal}
                    term={term}
                    open={!collapsedGuided.has(term.id)}
                    onToggle={() => toggle(collapsedGuided, setCollapsedGuided, term.id)}
                    onChange={(g) => setGuided(term.id, g)}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </Section>
  )
}
