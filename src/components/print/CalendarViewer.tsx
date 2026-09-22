import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Calendar } from '../../types'
import { coerceCalendar } from '../../lib/json'
import { PUBLIC_BASE_URL } from '../../config'
import { downloadICS, feedWebcalUrl } from '../../lib/ics'
import { occurrenceLabels, useI18n } from '../../i18n'
import PrintSheet from './PrintSheet'
import type { AsuntosRow } from '../../lib/asuntos'
import { AsuntosToggle, asuntosVista, useAsuntosVisible } from './asuntosVista'

const BASE = import.meta.env.BASE_URL

type Mode = 'lista' | 'compacto'

/**
 * Vista de solo lectura de un calendario, cargada por URL (#/ver/<id>-<perfil>). Lee un JSON
 * ya filtrado por perfil publicado en public/v/. Similar a Imprimir: lista/compacto, PDF, ICS.
 */
export default function CalendarViewer() {
  const { token = '' } = useParams()
  const { t, fmt } = useI18n()
  const [cal, setCal] = useState<Calendar | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [mode, setMode] = useState<Mode>('lista')
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [copied, setCopied] = useState(false)
  const [asuntosRows, setAsuntosRows] = useState<AsuntosRow[] | null>(null)
  const [verAsuntos, setVerAsuntos] = useAsuntosVisible()

  useEffect(() => {
    let active = true
    fetch(`${BASE}v/${token}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('no view')
        return r.json()
      })
      .then((j) => {
        if (active) {
          setCal(coerceCalendar(j))
          setStatus('ok')
        }
      })
      .catch(() => active && setStatus('error'))
    return () => {
      active = false
    }
  }, [token])

  // Asuntos particulares: se leen del fichero publicado y NO se recalculan aquí. Esta vista trae
  // el calendario filtrado por perfil, y filtrar esconde las sesiones de evaluación (son solo de
  // docentes y gestión): recalcular con él daría por solicitables días que están bloqueados.
  // El fichero se calcula una vez, sobre el calendario completo, y es el mismo para todos.
  useEffect(() => {
    let active = true
    const calId = token.slice(0, token.lastIndexOf('-'))
    setAsuntosRows(null)
    if (!calId) return
    fetch(`${BASE}feeds/${calId}-asuntos.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!active || !Array.isArray(j)) return
        setAsuntosRows(j)
        // Quien lo dejó encendido la última vez quiere verlo, y solo se ve en el compacto.
        if (verAsuntos) setMode('compacto')
      })
      .catch(() => {
        /* calendario sin asuntos, o sin red: simplemente no se ofrece el interruptor */
      })
    return () => {
      active = false
    }
  }, [token])

  if (status === 'loading') return <p className="empty">{t('common.loading')}</p>
  if (status === 'error' || !cal) return <p className="empty">{t('viewer.notFound')}</p>

  const profToken = token.slice(token.lastIndexOf('-') + 1)
  const profileName =
    profToken === 'all' ? t('common.allProfiles') : cal.profiles.find((p) => p.id === profToken)?.name ?? ''

  // El token de la vista nombra también su .ics (build-feeds escribe los dos a la vez), así que
  // la suscripción sale de la propia URL. No revela nada nuevo: es el mismo id impredecible que
  // quien tiene este enlace ya conoce.
  const subscribeUrl = feedWebcalUrl(token)
  const viewUrl = `${PUBLIC_BASE_URL}#/ver/${token}`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(subscribeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard no disponible */
    }
  }

  const handlePrint = () => {
    const previous = document.title
    document.title = `${cal.name} · ${profileName}`
    const restore = () => {
      document.title = previous
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
    setTimeout(restore, 1000)
  }

  return (
    <>
      <div className="card no-print">
        <div className="card-header">
          <h2>
            {cal.name} · {profileName}
          </h2>
          {/* Quien abre un enlace compartido no tiene forma de saber si mira algo de hace un año. */}
          <span className="inline-note">{t('viewer.updatedAt', { date: fmt.short(cal.updatedAt) })}</span>
        </div>
        <div className="print-controls">
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
          {asuntosRows && (
            <div className="field" style={{ margin: 0 }}>
              <AsuntosToggle
                checked={verAsuntos}
                onChange={(v) => {
                  setVerAsuntos(v)
                  if (v) setMode('compacto')
                }}
              />
            </div>
          )}
          <div className="field" style={{ margin: 0, marginLeft: 'auto', alignSelf: 'flex-end' }}>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={handlePrint}>
                {t('print.printBtn')}
              </button>
              <button className="btn" onClick={() => downloadICS(cal, null, occurrenceLabels(t))}>
                {t('print.downloadIcs')}
              </button>
              <a className="btn" href={subscribeUrl}>
                🔔 {t('published.subscribe')}
              </a>
              <button className="btn" onClick={copyUrl}>
                {copied ? t('published.copied') : t('published.copyUrl')}
              </button>
            </div>
          </div>
        </div>
        <p className="inline-note" style={{ marginTop: 10 }}>
          {t('viewer.subscribeHelp')}
        </p>
        <p className="inline-note" style={{ marginTop: 4 }}>
          {t('print.headerFooterHint')}
        </p>
      </div>

      <PrintSheet
        cal={cal}
        profileId={null}
        profileName={profileName}
        mode={mode}
        showAnalysis={showAnalysis}
        viewUrl={viewUrl}
        asuntos={verAsuntos ? asuntosVista(asuntosRows) : null}
      />
    </>
  )
}
