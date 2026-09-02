import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../state/CalendarStore'
import { useI18n } from '../../i18n'
import {
  buildCalendarFromCev,
  fetchCourse,
  fetchManifest,
  type CevCourse,
  type CevManifest,
} from '../../lib/cev'

const DEFAULT_ENS = 'musica_dansa' // esta app es para conservatorios

export default function CevLoaderPage() {
  const { importCalendar } = useStore()
  const { t, lang } = useI18n()
  const navigate = useNavigate()

  const [manifest, setManifest] = useState<CevManifest | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [course, setCourse] = useState('')
  const [ens, setEns] = useState('')
  const [muni, setMuni] = useState('')
  const [busy, setBusy] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchManifest()
      .then((m) => {
        if (!active) return
        setManifest(m)
        setCourse(m.courses[0] ?? '')
        setEns(m.ensenyances.some((e) => e.code === DEFAULT_ENS) ? DEFAULT_ENS : (m.ensenyances[0]?.code ?? ''))
      })
      .catch(() => active && setLoadError(true))
    return () => {
      active = false
    }
  }, [])

  const municipios = useMemo(() => {
    if (!manifest) return []
    return [...manifest.municipios].sort((a, b) => a.name.localeCompare(b.name, lang))
  }, [manifest, lang])

  const create = async () => {
    if (!manifest || !course || !ens || !muni) return
    setBusy(true)
    setBuildError(null)
    try {
      const data: CevCourse = await fetchCourse(course)
      const municipio = manifest.municipios.find((m) => m.code === muni)
      const ensenyanca = manifest.ensenyances.find((e) => e.code === ens)
      if (!municipio || !ensenyanca) throw new Error('selección no válida')
      const cal = buildCalendarFromCev(data, manifest, { municipio, ensenyanca }, lang)
      importCalendar(cal) // se añade como nuevo y pasa a ser el actual
      navigate('/editor')
    } catch {
      setBuildError(t('cev.buildError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="welcome" style={{ maxWidth: 640 }}>
      <div className="card">
        <div className="card-header">
          <h2>{t('cev.title')}</h2>
          <Link to="/" className="btn btn-sm">
            {t('common.back')}
          </Link>
        </div>
        <p className="help">{t('cev.help')}</p>

        {loadError && (
          <p className="inline-note" style={{ color: 'var(--festivo)' }}>
            {t('cev.loadError')}
          </p>
        )}
        {!manifest && !loadError && <p className="empty">{t('common.loading')}</p>}

        {manifest && (
          <>
            <div className="field">
              <label>{t('cev.course')}</label>
              <select value={course} onChange={(e) => setCourse(e.target.value)}>
                {manifest.courses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>{t('cev.ensenyanca')}</label>
              <select value={ens} onChange={(e) => setEns(e.target.value)}>
                {manifest.ensenyances.map((e) => (
                  <option key={e.code} value={e.code}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>{t('cev.municipio')}</label>
              <select value={muni} onChange={(e) => setMuni(e.target.value)}>
                <option value="">{t('cev.municipioPlaceholder')}</option>
                {municipios.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="inline-note">{t('cev.localNote')}</p>

            {buildError && (
              <p className="inline-note" style={{ color: 'var(--festivo)' }}>
                {buildError}
              </p>
            )}

            <div className="btn-group" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={create} disabled={!muni || busy}>
                {busy ? t('cev.creating') : t('cev.create')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
