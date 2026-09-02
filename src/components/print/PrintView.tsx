import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PUBLIC_BASE_URL } from '../../config'
import { useStore } from '../../state/CalendarStore'
import { downloadICS } from '../../lib/ics'
import { occurrenceLabels, useI18n } from '../../i18n'
import PrintSheet from './PrintSheet'

type Mode = 'lista' | 'compacto'

export default function PrintView() {
  const { current } = useStore()
  const { t } = useI18n()
  const [profileId, setProfileId] = useState<string | null>(null) // null = todos
  const [mode, setMode] = useState<Mode>('lista')
  const [showAnalysis, setShowAnalysis] = useState(false)
  // URL de la vista pública de este calendario y perfil, si es que existe.
  const [viewUrl, setViewUrl] = useState<string | undefined>(undefined)
  const token = current ? `${current.id}-${profileId ?? 'all'}` : ''

  // El QR del pie solo debe imprimirse si esa vista está publicada DE VERDAD, así que se pregunta
  // al sitio público (que responde con CORS abierto), no a la carpeta local: un calendario puede
  // existir en `public/v/` de tu máquina y no estar aún desplegado. Y por eso el código apunta
  // siempre a PUBLIC_BASE_URL: un QR a `localhost` en un papel repartido no lo abre nadie.
  useEffect(() => {
    if (!token) return
    let vivo = true
    setViewUrl(undefined)
    fetch(`${PUBLIC_BASE_URL}v/${token}.json`, { method: 'HEAD' })
      .then((r) => {
        if (vivo && r.ok) setViewUrl(`${PUBLIC_BASE_URL}#/ver/${token}`)
      })
      .catch(() => {
        /* sin red o no publicado: sin QR, que es lo honesto */
      })
    return () => {
      vivo = false
    }
  }, [token])

  if (!current) return <Navigate to="/" replace />
  const cal = current
  const profileName = profileId ? cal.profiles.find((p) => p.id === profileId)?.name : t('common.allProfiles')

  // Propone el nombre del calendario como nombre de archivo del PDF (editable en el diálogo).
  // El navegador usa document.title como nombre por defecto al «Guardar como PDF».
  const handlePrint = () => {
    const previous = document.title
    document.title = profileId ? `${cal.name} · ${profileName}` : cal.name
    const restore = () => {
      document.title = previous
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
    setTimeout(restore, 1000) // por si afterprint no dispara
  }

  return (
    <>
      <div className="card no-print">
        <div className="card-header">
          <h2>{t('print.title')}</h2>
          <Link to="/editor" className="btn btn-sm">
            {t('print.backToEditor')}
          </Link>
        </div>
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
                {t('print.formatCompact')}
              </button>
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="checkbox" style={{ marginTop: 6 }}>
              <input type="checkbox" checked={showAnalysis} onChange={(e) => setShowAnalysis(e.target.checked)} />
              {t('print.analysisToggle')}
            </label>
          </div>
          <div className="field" style={{ margin: 0, marginLeft: 'auto', alignSelf: 'flex-end' }}>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={handlePrint}>
                {t('print.printBtn')}
              </button>
              <button className="btn" onClick={() => downloadICS(cal, profileId, occurrenceLabels(t))}>
                {t('print.downloadIcs')}
              </button>
            </div>
          </div>
        </div>
        <p className="inline-note" style={{ marginTop: 10 }}>
          {t('print.headerFooterHint')}
        </p>
      </div>

      <PrintSheet
        cal={cal}
        profileId={profileId}
        profileName={profileName ?? undefined}
        mode={mode}
        showAnalysis={showAnalysis}
        viewUrl={viewUrl}
      />
    </>
  )
}
