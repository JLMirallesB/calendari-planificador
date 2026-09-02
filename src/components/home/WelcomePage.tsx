import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../state/CalendarStore'
import { useI18n } from '../../i18n'
import { parseCalendar } from '../../lib/json'

export default function WelcomePage() {
  const { calendars, createCalendar, importCalendar, selectCalendar } = useStore()
  const { t } = useI18n()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const onCreate = () => {
    createCalendar()
    navigate('/editor')
  }

  const onImportFile = async (file: File) => {
    try {
      const cal = parseCalendar(await file.text())
      importCalendar(cal) // se añade como nuevo y pasa a ser el actual
      navigate('/editor')
    } catch {
      setError(t('jsonio.error'))
    }
  }

  const onContinue = (id: string) => {
    selectCalendar(id)
    navigate('/editor')
  }

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <h1>{t('home.title')}</h1>
        <p className="help">{t('home.subtitle')}</p>
      </div>

      <div className="welcome-actions">
        <button
          type="button"
          className="welcome-card welcome-card-featured"
          onClick={() => navigate('/nuevo/cev')}
        >
          <span className="welcome-card-icon" aria-hidden>
            🏛️
          </span>
          <span className="welcome-card-title">{t('home.cevTitle')}</span>
          <span className="welcome-card-desc">{t('home.cevDesc')}</span>
        </button>

        <button type="button" className="welcome-card" onClick={onCreate}>
          <span className="welcome-card-icon" aria-hidden>
            ✏️
          </span>
          <span className="welcome-card-title">{t('home.createTitle')}</span>
          <span className="welcome-card-desc">{t('home.createDesc')}</span>
        </button>

        <button type="button" className="welcome-card" onClick={() => fileRef.current?.click()}>
          <span className="welcome-card-icon" aria-hidden>
            ⬆️
          </span>
          <span className="welcome-card-title">{t('home.importTitle')}</span>
          <span className="welcome-card-desc">{t('home.importDesc')}</span>
        </button>

        <button type="button" className="welcome-card" onClick={() => navigate('/publicados')}>
          <span className="welcome-card-icon" aria-hidden>
            🗂️
          </span>
          <span className="welcome-card-title">{t('home.publishedTitle')}</span>
          <span className="welcome-card-desc">{t('home.publishedDesc')}</span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onImportFile(f)
          e.target.value = ''
        }}
      />

      {error && (
        <p className="inline-note" style={{ color: 'var(--festivo)', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {calendars.length > 0 && (
        <div className="card welcome-recent">
          <div className="card-header">
            <h2>{t('home.yourCalendars')}</h2>
          </div>
          <p className="help">{t('home.yourCalendarsHelp')}</p>
          {calendars.map((c) => (
            <div key={c.id} className="list-item" style={{ alignItems: 'center' }}>
              <div className="grow">
                <div style={{ fontWeight: 650 }}>{c.name}</div>
                {c.community && <div className="inline-note">{c.community}</div>}
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => onContinue(c.id)}>
                {t('home.continue')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
