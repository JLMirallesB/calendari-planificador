import type { Calendar } from '../../types'
import { totalLectiveDays } from '../../lib/lectiveDays'
import { useI18n } from '../../i18n'

export default function LectiveCounter({ cal }: { cal: Calendar }) {
  const { t } = useI18n()
  const total = totalLectiveDays(cal)
  const ready = cal.courseStart && cal.courseEnd
  return (
    <div className="card">
      <div className="section-title">{t('counter.title')}</div>
      <div className="stat">
        <div className="value">{ready ? total : '—'}</div>
        <div className="label">{t('counter.lectiveTotal')}</div>
      </div>
      {!ready && <p className="inline-note" style={{ marginTop: 10 }}>{t('counter.needDates')}</p>}
    </div>
  )
}
