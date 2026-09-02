import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Calendar, PublishedIndexEntry } from '../../types'
import { coerceCalendar } from '../../lib/json'
import { useStore } from '../../state/CalendarStore'
import { useI18n } from '../../i18n'
import PublishedViewer from './PublishedViewer'

const BASE = import.meta.env.BASE_URL

export default function PublishedGallery() {
  const { importCalendar } = useStore()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<PublishedIndexEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<{ id: string; cal: Calendar } | null>(null)
  const [loadingCal, setLoadingCal] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`${BASE}calendars/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error('no index')
        return r.json()
      })
      .then((data: PublishedIndexEntry[]) => {
        if (active) setEntries(Array.isArray(data) ? data : [])
      })
      .catch(() => active && setEntries([]))
    return () => {
      active = false
    }
  }, [])

  const open = async (entry: PublishedIndexEntry) => {
    setLoadingCal(true)
    setError(null)
    try {
      const r = await fetch(`${BASE}calendars/${entry.file}`)
      if (!r.ok) throw new Error('no file')
      const cal = coerceCalendar(await r.json())
      setSelected({ id: entry.id, cal })
    } catch {
      setError(t('published.loadError', { name: entry.name }))
    } finally {
      setLoadingCal(false)
    }
  }

  const importToEditor = () => {
    if (!selected) return
    // Copia editable: nuevo id para no colisionar con futuras sincronizaciones.
    importCalendar(
      coerceCalendar({ ...selected.cal, id: undefined, name: `${selected.cal.name} (${t('published.copySuffix')})` }),
    )
    navigate('/editor')
  }

  if (selected) {
    return (
      <PublishedViewer
        publishedId={selected.id}
        cal={selected.cal}
        onImport={importToEditor}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>{t('published.title')}</h2>
      </div>
      <p className="help">{t('published.help')}</p>
      {error && <p className="inline-note" style={{ color: 'var(--festivo)' }}>{error}</p>}
      {loadingCal && <p className="empty">{t('published.loadingCal')}</p>}
      {entries === null && <p className="empty">{t('common.loading')}</p>}
      {entries && entries.length === 0 && <p className="empty">{t('published.empty')}</p>}
      {entries &&
        entries.map((e) => (
          <div key={e.id} className="list-item" style={{ alignItems: 'center' }}>
            <div className="grow">
              <div style={{ fontWeight: 650 }}>{e.name}</div>
              {e.description && <div className="inline-note">{e.description}</div>}
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => open(e)}>
              {t('published.open')}
            </button>
          </div>
        ))}
    </div>
  )
}
