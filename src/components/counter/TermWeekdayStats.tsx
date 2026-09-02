import type { Calendar } from '../../types'
import { computeTermStats } from '../../lib/lectiveDays'
import { useI18n } from '../../i18n'

export default function TermWeekdayStats({ cal }: { cal: Calendar }) {
  const { t, fmt } = useI18n()
  const stats = computeTermStats(cal)
  return (
    <div className="card">
      <div className="section-title">{t('counter.statsTitle')}</div>
      {stats.length === 0 && <p className="inline-note">{t('counter.needTermStart')}</p>}
      {stats.map((s) => (
        <div key={s.termId} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 650, fontSize: 14 }}>{s.termName}</div>
          <div className="inline-note" style={{ marginBottom: 6 }}>
            {fmt.human(s.start)} → {fmt.human(s.end)}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{s.weeks}</span>{' '}
              <span className="inline-note">{t('counter.weeks')}</span>
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--lective)' }}>{s.lectiveDays}</span>{' '}
              <span className="inline-note">{t('counter.lectiveDays')}</span>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  {s.byWeekday.map((w) => (
                    <th key={w.weekday} className="num">
                      {fmt.weekdayShort(w.weekday)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {s.byWeekday.map((w) => (
                    <td key={w.weekday} className="num">
                      {w.count}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
