import type { Calendar, GuidedFields } from '../../types'
import { expandOccurrences, KIND_EMOJI, GUIDED_EMOJI, type Occurrence } from '../../lib/icsCore'
import { parseISO } from '../../lib/dateUtils'
import { computeTermRanges } from '../../lib/lectiveDays'
import { guidedItemsForType, isGuidedFilled } from '../../lib/guided'
import { occurrenceLabels, useI18n } from '../../i18n'
import CourseSummary from './CourseSummary'

export default function ListLayout({ cal, profileId }: { cal: Calendar; profileId: string | null }) {
  const { t, fmt } = useI18n()

  // ---- Bloque 1: calendario general (eventos + inicios de trimestre; sin hitos) ----
  const general = expandOccurrences(cal, profileId, occurrenceLabels(t)).filter((o) => o.kind !== 'guided')
  const months = new Map<string, Occurrence[]>()
  for (const o of general) {
    const d = parseISO(o.startISO)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    const arr = months.get(key) ?? []
    arr.push(o)
    months.set(key, arr)
  }

  // ---- Bloque 2: hitos agrupados por trimestre ----
  const rangeByTerm = new Map(computeTermRanges(cal).map((r) => [r.term.id, r]))
  const visible = (profiles: string[]) => !profileId || profiles.length === 0 || profiles.includes(profileId)

  const termSections = cal.terms
    .filter((term) => term.guidedEnabled)
    .map((term) => {
      const items = guidedItemsForType(term.type)
        .map((it) => ({ key: it.key, value: term.guided[it.key] }))
        .filter((x) => isGuidedFilled(x.value) && visible(x.value.profiles))
        .map((x) => {
          const v = x.value
          const start = (v.range ? v.range.start : v.date) as string
          const end = (v.range ? v.range.end : v.date) as string
          return { key: x.key as keyof GuidedFields, start, end, provisional: v.provisional, profiles: v.profiles }
        })
        .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
      return { term, items }
    })
    .filter((s) => s.items.length > 0)

  if (general.length === 0 && termSections.length === 0) {
    return (
      <div>
        <CourseSummary cal={cal} />
        <p className="empty">{t('print.noDatesForProfile')}</p>
      </div>
    )
  }

  const dateLabel = (start: string, end: string) =>
    start === end ? fmt.human(start) : `${fmt.human(start)} → ${fmt.human(end)}`
  const profNames = (ids: string[]) =>
    ids.map((id) => cal.profiles.find((p) => p.id === id)?.name).filter(Boolean).join(', ')

  return (
    <div>
      <CourseSummary cal={cal} />
      {general.length > 0 && (
        <section>
          <h2 className="list-block-title">{t('print.listGeneralTitle')}</h2>
          {[...months.entries()].map(([key, items]) => {
            const [y, m] = key.split('-').map(Number)
            return (
              <div key={key} className="month-block">
                <h3>
                  {fmt.monthName(m)} {y}
                </h3>
                {items.map((o, i) => (
                  <div key={i} className="occ-row">
                    <span className="occ-icon" aria-hidden>
                      {KIND_EMOJI[o.kind] ?? '📌'}
                    </span>
                    <span className="date">{dateLabel(o.startISO, o.endISO)}</span>
                    <span className="occ-title">
                      {o.startTime && (
                        <span className="occ-time">
                          {o.startTime}
                          {o.endTime && o.endTime !== o.startTime ? `–${o.endTime}` : ''}{' '}
                        </span>
                      )}
                      {o.title}
                      {o.provisional && (
                        <span className="badge badge-provisional" style={{ marginLeft: 8 }}>
                          {t('common.provisional')}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </section>
      )}

      {termSections.length > 0 && (
        <section>
          <h2 className="list-block-title">{t('print.listMilestonesTitle')}</h2>
          {termSections.map(({ term, items }) => {
            const r = rangeByTerm.get(term.id)
            return (
              <div key={term.id} className="month-block term-section">
                <h3 className="term-section-title">
                  ▸ {term.name}
                  {r && (
                    <span className="inline-note" style={{ marginLeft: 6 }}>
                      ({fmt.human(r.start)} – {fmt.human(r.end)})
                    </span>
                  )}
                </h3>
                {items.map((m, i) => {
                  const names = profNames(m.profiles)
                  return (
                    <div key={i} className="occ-row">
                      <span className="occ-icon" aria-hidden>
                        {GUIDED_EMOJI[m.key] ?? '📋'}
                      </span>
                      <span className="date">{dateLabel(m.start, m.end)}</span>
                      <span className="occ-title">
                        {t(`guided.items.${m.key}`)}
                        {m.provisional && (
                          <span className="badge badge-provisional" style={{ marginLeft: 8 }}>
                            {t('common.provisional')}
                          </span>
                        )}
                        {names && (
                          <span className="inline-note" style={{ marginLeft: 8 }}>
                            · {names}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
