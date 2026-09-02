import { useMemo } from 'react'
import type { Calendar } from '../../types'
import { validateCalendar } from '../../lib/validate'
import { useI18n } from '../../i18n'
import { useEditorFocus } from './EditorFocus'
import Section from './Section'

/**
 * Panel de avisos del editor. Lista las incoherencias y descuidos que detecta `validateCalendar`,
 * cada uno con un enlace que salta a la fila afectada. Es informativo: nunca bloquea nada.
 *
 * Los parámetros de fecha se localizan aquí (la validación es pura y no formatea); el resto del
 * mensaje viene de i18n por su `messageKey`.
 */
export default function ValidationPanel({ cal }: { cal: Calendar }) {
  const { t, fmt } = useI18n()
  const { focus } = useEditorFocus()
  const issues = useMemo(() => validateCalendar(cal), [cal])

  if (!issues.length) return null

  const errors = issues.filter((i) => i.severity === 'error').length

  // Los valores con forma de fecha ISO se muestran en formato corto; el resto (horas, nombres,
  // claves de hito) tal cual. Guardar por la forma evita formatear una hora «17:00» como fecha.
  const isISODate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  const localize = (params?: Record<string, string | number>) => {
    if (!params) return undefined
    const out: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(params)) out[k] = isISODate(v) ? fmt.short(v) : v
    return out
  }

  return (
    <Section
      title={`${t('validate.title')} (${issues.length})`}
      defaultOpen={errors > 0}
      sectionId="validate"
    >
      <p className="help">{t('validate.help')}</p>
      {issues.map((issue, i) => (
        <div key={`${issue.code}-${i}`} className="list-item" style={{ alignItems: 'baseline' }}>
          <span
            className="badge"
            style={{
              flex: 'none',
              color: issue.severity === 'error' ? 'var(--festivo)' : 'var(--provisional)',
            }}
          >
            {issue.severity === 'error' ? t('validate.error') : t('validate.warning')}
          </span>
          <span className="grow">{t(issue.messageKey, localize(issue.params))}</span>
          {issue.target && (
            <button
              className="btn btn-sm"
              onClick={() => focus(issue.target!.sectionId, issue.target!.anchorId)}
            >
              {t('validate.goto')}
            </button>
          )}
        </div>
      ))}
    </Section>
  )
}
