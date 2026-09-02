import { useState } from 'react'
import type { Calendar, GuidedFields, GuidedValue, Profile, Term } from '../../types'
import { guidedItemsForType, missingGuidedItems } from '../../lib/guided'
import { reclamacionRange } from '../../lib/lectiveDays'
import {
  applyGuidedMilestones,
  canAutofill,
  computeGuidedMilestones,
  diffGuidedMilestones,
  sessionEnd,
  type GuidedDiffItem,
  type ProposedMilestone,
} from '../../lib/guidedAutofill'
import { useI18n } from '../../i18n'
import ProfileSelector from './ProfileSelector'
import DateInput from './DateInput'

interface Props {
  cal: Calendar
  term: Term
  open: boolean
  onToggle: () => void
  onChange: (guided: GuidedFields) => void
}

export default function TermGuidedPanel({ cal, term, open, onToggle, onChange }: Props) {
  const { t, fmt } = useI18n()
  const items = guidedItemsForType(term.type)
  const missing = missingGuidedItems(term)
  const itemLabel = (key: keyof GuidedFields) => t(`guided.items.${key}`)

  // Autocompletar: propuesta de fechas de los hitos administrativos desde la sesión de evaluación.
  // No aplica nada por su cuenta: enseña un diff con casillas y el usuario elige qué aceptar.
  const [proposal, setProposal] = useState<{ proposed: ProposedMilestone[]; diff: GuidedDiffItem[] } | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [autofillMsg, setAutofillMsg] = useState<string | null>(null)
  const canFill = canAutofill(term)
  const hasSession = !!sessionEnd(term)

  const openAutofill = () => {
    const proposed = computeGuidedMilestones(cal, term)
    const diff = diffGuidedMilestones(term, proposed)
    const changed = diff.filter((d) => d.changes)
    if (!changed.length) {
      setProposal(null)
      setAutofillMsg(t('guided.autofillNone'))
      return
    }
    setAutofillMsg(null)
    setProposal({ proposed, diff })
    setPicked(new Set(changed.map((d) => d.key))) // por defecto, marcado lo que cambia
  }

  const applyAutofill = () => {
    if (!proposal) return
    onChange(applyGuidedMilestones(term, proposal.proposed, picked))
    setProposal(null)
  }

  // «2026-12-16→2026-12-18» o «2026-12-15» o «» → texto legible con fechas cortas.
  const fmtDiff = (s: string) =>
    !s ? '—' : s.includes('→') ? s.split('→').map((d) => fmt.short(d)).join(' → ') : fmt.short(s)

  const setField = (key: keyof GuidedFields, value: GuidedValue) => {
    const next: GuidedFields = { ...term.guided, [key]: value }
    // Al fijar la visibilidad de notas en WebFamília, calcular el plazo de reclamación:
    // 3 días hábiles desde el día siguiente a la comunicación.
    if (key === 'webFamiliaVisibilidad' && value.date) {
      const r = reclamacionRange(cal, value.date)
      next.plazoReclamacion = {
        date: null,
        range: { start: r.start, end: r.end },
        provisional: value.provisional,
        profiles: next.plazoReclamacion.profiles,
      }
    }
    onChange(next)
  }

  return (
    <div style={{ marginTop: 12, borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <button type="button" className="section-toggle" aria-expanded={open} onClick={onToggle}>
          <span className="chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
          <span className="section-title" style={{ margin: 0 }}>
            {t('guided.milestones')}
          </span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {missing.length > 0 && <span className="inline-note">{t('guided.pending', { n: missing.length })}</span>}
          {canFill && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={openAutofill}
              disabled={!hasSession}
              title={hasSession ? t('guided.autofillTitle') : t('guided.autofillNeedsSession')}
            >
              ✨ {t('guided.autofill')}
            </button>
          )}
        </div>
      </div>

      {autofillMsg && (
        <p className="inline-note" style={{ marginTop: 8, color: 'var(--lective)' }}>
          {autofillMsg}
        </p>
      )}

      {proposal && (
        <div className="card" style={{ background: 'var(--surface-2)', marginTop: 10, padding: 12 }}>
          <p className="help" style={{ marginTop: 0 }}>
            {t('guided.autofillHelp')}
          </p>
          {proposal.diff.map((d) => (
            <label
              key={d.key}
              className="list-item"
              style={{ alignItems: 'baseline', gap: 8, opacity: d.changes ? 1 : 0.6 }}
            >
              <input
                type="checkbox"
                checked={picked.has(d.key)}
                onChange={(e) => {
                  const next = new Set(picked)
                  if (e.target.checked) next.add(d.key)
                  else next.delete(d.key)
                  setPicked(next)
                }}
              />
              <span className="grow">
                <strong>{itemLabel(d.key)}</strong>{' '}
                {d.changes ? (
                  <span className="inline-note">
                    {fmtDiff(d.current)} → {fmtDiff(d.proposed)}
                  </span>
                ) : (
                  <span className="inline-note">{t('guided.autofillSame')}</span>
                )}
              </span>
            </label>
          ))}
          <div className="btn-group" style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-sm btn-primary" onClick={applyAutofill} disabled={!picked.size}>
              {t('guided.autofillApply', { n: picked.size })}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setProposal(null)}>
              {t('guided.autofillCancel')}
            </button>
          </div>
        </div>
      )}

      {open && (
        <>
          {missing.length > 0 && (
            <ul className="warn-list" style={{ marginTop: 8 }}>
              {missing.map((m) => (
                <li key={m.key}>{itemLabel(m.key)}</li>
              ))}
            </ul>
          )}
          {items.map((it) => (
            <GuidedRow
              key={it.key}
              anchorId={`guided-${term.id}-${it.key}`}
              label={itemLabel(it.key)}
              value={term.guided[it.key]}
              profiles={cal.profiles}
              note={it.key === 'plazoReclamacion' ? t('guided.reclamacionAuto') : undefined}
              onChange={(v) => setField(it.key, v)}
            />
          ))}
        </>
      )}
    </div>
  )
}

function GuidedRow({
  anchorId,
  label,
  value,
  profiles,
  note,
  onChange,
}: {
  anchorId: string
  label: string
  value: GuidedValue
  profiles: Profile[]
  note?: string
  onChange: (v: GuidedValue) => void
}) {
  const { t } = useI18n()
  const isRange = value.range !== null

  const toDate = () =>
    onChange({
      date: value.date ?? value.range?.start ?? null,
      range: null,
      provisional: value.provisional,
      profiles: value.profiles,
    })
  const toRange = () => {
    const start = value.range?.start ?? value.date ?? null
    const end = value.range?.end ?? value.date ?? null
    onChange({ date: null, range: { start, end }, provisional: value.provisional, profiles: value.profiles })
  }

  return (
    <div id={anchorId} style={{ marginBottom: 10 }}>
      <div className="field-row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 'none' }}>
          <label>{label}</label>
          <div className="btn-group">
            <button type="button" className={`btn btn-sm ${!isRange ? 'btn-primary' : ''}`} onClick={toDate}>
              {t('events.punctual')}
            </button>
            <button type="button" className={`btn btn-sm ${isRange ? 'btn-primary' : ''}`} onClick={toRange}>
              {t('events.range')}
            </button>
          </div>
        </div>

        {!isRange ? (
          <div className="field">
            <label>{t('common.date')}</label>
            <DateInput
              value={value.date ?? ''}
              onChange={(e) => onChange({ ...value, date: e.target.value || null })}
            />
          </div>
        ) : (
          <>
            <div className="field">
              <label>{t('common.from')}</label>
              <DateInput
                value={value.range?.start ?? ''}
                onChange={(e) =>
                  onChange({ ...value, range: { start: e.target.value || null, end: value.range?.end ?? null } })
                }
              />
            </div>
            <div className="field">
              <label>{t('common.to')}</label>
              <DateInput
                value={value.range?.end ?? ''}
                onChange={(e) =>
                  onChange({ ...value, range: { start: value.range?.start ?? null, end: e.target.value || null } })
                }
              />
            </div>
          </>
        )}

        <div className="field" style={{ flex: 'none', paddingBottom: 8 }}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={value.provisional}
              onChange={(e) => onChange({ ...value, provisional: e.target.checked })}
            />
            {t('common.provisional')}
          </label>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        <ProfileSelector
          profiles={profiles}
          selected={value.profiles}
          onChange={(ids) => onChange({ ...value, profiles: ids })}
        />
      </div>
      {note && <p className="inline-note" style={{ marginTop: 2 }}>{note}</p>}
    </div>
  )
}
