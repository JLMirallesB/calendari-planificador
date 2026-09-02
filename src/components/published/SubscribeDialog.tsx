import { useState } from 'react'
import type { Calendar } from '../../types'
import { downloadICS, feedWebcalUrl } from '../../lib/ics'
import { occurrenceLabels, useI18n } from '../../i18n'

interface Props {
  publishedId: string
  cal: Calendar
  onImport: () => void
}

export default function SubscribeDialog({ publishedId, cal, onImport }: Props) {
  const { t } = useI18n()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const url = feedWebcalUrl(`${publishedId}-${profileId ?? 'all'}`)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div className="card" style={{ background: 'var(--surface-2)' }}>
      <div className="section-title">{t('published.subscribeTitle')}</div>
      <p className="help">{t('published.subscribeHelp')}</p>
      <div className="field-row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 1 }}>
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
      </div>
      <div className="field">
        <label>{t('published.subscribeUrlLabel')}</label>
        <input type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
      </div>
      <div className="btn-group">
        <a className="btn btn-primary" href={url}>
          {t('published.subscribe')}
        </a>
        <button className="btn" onClick={copy}>
          {copied ? t('published.copied') : t('published.copyUrl')}
        </button>
        <button className="btn" onClick={() => downloadICS(cal, profileId, occurrenceLabels(t))}>
          {t('published.downloadIcs')}
        </button>
        <button className="btn" onClick={onImport} title={t('published.copyToEditorTitle')}>
          {t('published.copyToEditor')}
        </button>
      </div>
    </div>
  )
}
