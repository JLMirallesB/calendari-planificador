import { useMemo } from 'react'
import type { AsuntosConfig, Calendar } from '../../types'
import { computeAsuntos, normalizeAsuntosConfig, DEFAULT_EVALUACION_KEYS } from '../../lib/asuntos'
import { buildAsuntosCSV } from '../../lib/asuntos'
import { slug } from '../../lib/ics'
import { useI18n } from '../../i18n'
import Section from './Section'

interface Props {
  cal: Calendar
  onChange: (asuntos: AsuntosConfig | undefined) => void
}

/** Tipos de evento que pueden abrir una ventana (periodos no lectivos y fiestas). */
const ANCLABLES = ['vacaciones', 'festivoLocal', 'festivoAutonomico']

/** Códigos de ventana que se ofrecen. Son los motivos que entiende quien consume el fichero. */
const CODES = ['navidad', 'pascua', 'fiesta_local']

/**
 * Etiquetas propias para los hitos de la extraordinaria: dentro de su trimestre basta con
 * «Evaluación» o «Exámenes», pero aquí van mezclados con los de todos y no se sabe de cuál son.
 */
const EVAL_LABEL: Record<string, string> = {
  evaluacionExtraordinaria: 'asuntos.evalExtraLabel',
  examenesExtraordinaria: 'asuntos.examsExtraLabel',
  revisionExtraordinaria: 'asuntos.revisionExtraLabel',
}

/** Hitos que se pueden marcar como «evaluación». Los dos primeros son los de por defecto. */
const EVAL_KEYS = [
  'sesionEvaluacion',
  'evaluacionExtraordinaria',
  'pruebaEvaluacionTeorica',
  'semanaRevisionCalificaciones',
  'examenesExtraordinaria',
  'revisionExtraordinaria',
]

/**
 * Configuración de los asuntos particulares. Las reglas son de cada centro y de cada comunidad,
 * así que se editan aquí y viajan en el JSON del calendario, no en el código.
 *
 * Las ventanas se anclan al **id del evento**, no a su título ni a su clave de procedencia: la de
 * las fiestas locales del dataset CEV lleva la fecha dentro y cambiaría cada curso. Si el evento
 * desaparece, el panel de avisos lo dice.
 */
export default function AsuntosPanel({ cal, onChange }: Props) {
  const { t, fmt } = useI18n()
  const cfg = cal.asuntos
  const resultado = useMemo(() => (cfg ? computeAsuntos(cal) : null), [cal, cfg])

  const anclables = cal.events.filter((ev) => ANCLABLES.includes(ev.kind))

  const patch = (p: Partial<AsuntosConfig>) => onChange({ ...(cfg as AsuntosConfig), ...p })

  const codeOf = (eventId: string) =>
    cfg?.ventanas.find((v) => v.eventIds.includes(eventId))?.code ?? ''

  const setCode = (eventId: string, code: string) => {
    if (!cfg) return
    const ventanas = cfg.ventanas.map((v) => ({ ...v, eventIds: v.eventIds.filter((id) => id !== eventId) }))
    if (code) {
      const ya = ventanas.find((v) => v.code === code)
      if (ya) ya.eventIds = [...ya.eventIds, eventId]
      else ventanas.push({ code, eventIds: [eventId], antes: 7, despues: 7 })
    }
    patch({ ventanas: ventanas.filter((v) => v.eventIds.length) })
  }

  const setVentana = (code: string, p: { antes?: number; despues?: number }) => {
    if (!cfg) return
    patch({ ventanas: cfg.ventanas.map((v) => (v.code === code ? { ...v, ...p } : v)) })
  }

  const toggleEval = (key: string) => {
    if (!cfg) return
    const keys = cfg.evaluacionKeys.includes(key)
      ? cfg.evaluacionKeys.filter((k) => k !== key)
      : [...cfg.evaluacionKeys, key]
    patch({ evaluacionKeys: keys })
  }

  const descargar = () => {
    if (!resultado) return
    const blob = new Blob([buildAsuntosCSV(resultado.rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug(cal.name)}-asuntos.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Section
      title={t('asuntos.title')}
      sectionId="asuntos"
      defaultOpen={false}
      headerExtra={
        cfg ? (
          <button className="btn btn-sm" onClick={() => onChange(undefined)} title={t('asuntos.disableTitle')}>
            {t('asuntos.disable')}
          </button>
        ) : (
          <button className="btn btn-sm btn-primary" onClick={() => onChange(normalizeAsuntosConfig(null))}>
            {t('asuntos.enable')}
          </button>
        )
      }
    >
      <p className="help" id="asuntos-panel">
        {t('asuntos.help')}
      </p>

      {!cfg ? (
        <p className="help">{t('asuntos.off')}</p>
      ) : (
        <>
          <div className="list-item" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label className="grow">
              {t('asuntos.inicioCurso')}{' '}
              <input
                type="number"
                min={0}
                max={30}
                value={cfg.inicioCurso}
                onChange={(e) => patch({ inicioCurso: Math.max(0, Number(e.target.value) || 0) })}
                style={{ width: 70 }}
              />
            </label>
            <label className="grow">
              {t('asuntos.finCurso')}{' '}
              <input
                type="number"
                min={0}
                max={30}
                value={cfg.finCurso}
                onChange={(e) => patch({ finCurso: Math.max(0, Number(e.target.value) || 0) })}
                style={{ width: 70 }}
              />
            </label>
          </div>
          <p className="help">{t('asuntos.countHelp')}</p>

          <div className="section-title">{t('asuntos.evalTitle')}</div>
          <p className="help">{t('asuntos.evalHelp')}</p>
          {EVAL_KEYS.map((key) => (
            <label key={key} className="list-item" style={{ alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={cfg.evaluacionKeys.includes(key)}
                onChange={() => toggleEval(key)}
              />
              <span className="grow">{t(EVAL_LABEL[key] ?? `guided.items.${key}`)}</span>
              {DEFAULT_EVALUACION_KEYS.includes(key) && <span className="badge">{t('common.default')}</span>}
            </label>
          ))}

          <div className="section-title">{t('asuntos.tramoTitle')}</div>
          <label className="list-item" style={{ alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={cfg.tramoIncluyeAnticipacion}
              onChange={(e) => patch({ tramoIncluyeAnticipacion: e.target.checked })}
            />
            <span className="grow">{t('asuntos.tramoAnticipacion')}</span>
          </label>
          <p className="help">{t('asuntos.tramoHelp')}</p>

          <div className="section-title">{t('asuntos.anchorsTitle')}</div>
          <p className="help">{t('asuntos.anchorsHelp')}</p>
          {!anclables.length && <p className="help">{t('asuntos.noEvents')}</p>}
          {anclables.map((ev) => (
            <div key={ev.id} className="list-item" style={{ alignItems: 'center' }}>
              <span className="grow" style={{ minWidth: 0 }}>
                {ev.title || `(${ev.kind})`}
              </span>
              {/* Sin esto el desplegable se come el ancho y el título se parte palabra a palabra. */}
              <select
                value={codeOf(ev.id)}
                onChange={(e) => setCode(ev.id, e.target.value)}
                style={{ width: 'auto', flex: 'none', maxWidth: '50%' }}
              >
                <option value="">{t('asuntos.anchorNone')}</option>
                {CODES.map((c) => (
                  <option key={c} value={c}>
                    {t(`asuntos.motivo.${c}`)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {cfg.ventanas.map((v) => (
            <div key={v.code} className="list-item" style={{ alignItems: 'center', gap: 10 }}>
              <span className="grow">{t(`asuntos.motivo.${v.code}`)}</span>
              <label>
                {t('asuntos.anchorBefore')}{' '}
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={v.antes}
                  onChange={(e) => setVentana(v.code, { antes: Math.max(0, Number(e.target.value) || 0) })}
                  style={{ width: 70 }}
                />
              </label>
              <label>
                {t('asuntos.anchorAfter')}{' '}
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={v.despues}
                  onChange={(e) => setVentana(v.code, { despues: Math.max(0, Number(e.target.value) || 0) })}
                  style={{ width: 70 }}
                />
              </label>
            </div>
          ))}

          {resultado && resultado.rango ? (
            <>
              <p className="help" style={{ marginBottom: 2 }}>
                {t('asuntos.rangeLabel', {
                  desde: fmt.short(resultado.rango.desde),
                  hasta: fmt.short(resultado.rango.hasta),
                })}
              </p>
              <p className="help">
                {t('asuntos.counts', {
                  pedibles: resultado.rows.filter((r) => r.pedible).length,
                  total: resultado.rows.length,
                })}
              </p>
              {resultado.reglasIncompletas.length > 0 && (
                <p className="help">{t('asuntos.incomplete', { n: resultado.reglasIncompletas.length })}</p>
              )}
              <button className="btn btn-sm" onClick={descargar} title={t('asuntos.downloadTitle')}>
                {t('asuntos.download')}
              </button>
            </>
          ) : (
            <p className="help">{t('asuntos.noCourse')}</p>
          )}
        </>
      )}
    </Section>
  )
}
