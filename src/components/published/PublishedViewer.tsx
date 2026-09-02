import { useState } from 'react'
import type { Calendar } from '../../types'
import { totalLectiveDays } from '../../lib/lectiveDays'
import { useI18n } from '../../i18n'
import ListLayout from '../print/ListLayout'
import CompactCalendar from '../print/CompactCalendar'
import SubscribeDialog from './SubscribeDialog'

interface Props {
  publishedId: string
  cal: Calendar
  onImport: () => void
  onBack: () => void
}

export default function PublishedViewer({ publishedId, cal, onImport, onBack }: Props) {
  const { t, fmt } = useI18n()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [mode, setMode] = useState<'lista' | 'compacto'>('compacto')

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>{cal.name}</h2>
          <button className="btn btn-sm" onClick={onBack}>
            {t('published.viewerBack')}
          </button>
        </div>
        <p className="help">
          {cal.community && <>{cal.community} · </>}
          {cal.courseStart && cal.courseEnd && (
            <>
              {t('print.courseRange')} {fmt.long(cal.courseStart)} – {fmt.long(cal.courseEnd)} ·{' '}
            </>
          )}
          <strong>{totalLectiveDays(cal)}</strong> {t('published.lectiveDaysLabel')} · {t('published.readonly')}
        </p>
        <div className="print-controls">
          <div className="field" style={{ margin: 0 }}>
            <label>{t('common.profile')}</label>
            <select value={profileId ?? ''} onChange={(e) => setProfileId(e.target.value || null)}>
              <option value="">{t('common.allProfiles')}</option>
              {cal.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('common.format')}</label>
            <div className="btn-group">
              <button className={`btn btn-sm ${mode === 'lista' ? 'btn-primary' : ''}`} onClick={() => setMode('lista')}>
                {t('print.formatList')}
              </button>
              <button
                className={`btn btn-sm ${mode === 'compacto' ? 'btn-primary' : ''}`}
                onClick={() => setMode('compacto')}
              >
                {t('print.formatCompactShort')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <SubscribeDialog publishedId={publishedId} cal={cal} onImport={onImport} />

      <div className="print-sheet">
        {mode === 'lista' ? (
          <ListLayout cal={cal} profileId={profileId} />
        ) : (
          <CompactCalendar cal={cal} profileId={profileId} />
        )}
      </div>
    </>
  )
}
