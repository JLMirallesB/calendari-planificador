import type { Calendar, GuidedValue } from '../../types'
import { useStore } from '../../state/CalendarStore'
import { useI18n } from '../../i18n'

/**
 * Fechas del calendario: los eventos más los hitos del modo guiado. Contar solo `events`
 * engaña, porque el grueso de un calendario de curso vive en `terms[].guided`.
 */
function dateCount(cal: Calendar): number {
  const puesta = (v: GuidedValue | null | undefined) =>
    !!v && (!!v.date || !!(v.range && v.range.start))
  const eventos = cal.events.filter((e) => e.date || (e.range && e.range.start)).length
  const hitos = cal.terms.reduce(
    (n, t) => n + Object.values(t.guided ?? {}).filter(puesta).length,
    0,
  )
  return eventos + hitos
}

export default function CalendarBar() {
  const {
    calendars,
    currentId,
    selectCalendar,
    createCalendar,
    duplicateCalendar,
    deleteCalendar,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useStore()
  const { t, fmt } = useI18n()

  // Con varios calendarios de nombre parecido (p. ej. una copia local y el JSON de un archivo),
  // el nombre solo no basta para distinguirlos: se añaden eventos y última modificación.
  const meta = (c: Calendar) =>
    t('calendarBar.optionMeta', { n: dateCount(c), date: fmt.short(c.updatedAt) })

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <label style={{ margin: 0 }}>{t('calendarBar.label')}</label>
      <select
        value={currentId ?? ''}
        onChange={(e) => selectCalendar(e.target.value)}
        style={{ maxWidth: 420 }}
      >
        {calendars.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {meta(c)}
          </option>
        ))}
      </select>
      <div className="btn-group" style={{ marginLeft: 'auto' }}>
        <button
          className="btn btn-sm"
          onClick={undo}
          disabled={!canUndo}
          title={t('common.undoTitle')}
          aria-label={t('common.undo')}
        >
          ↶ {t('common.undo')}
        </button>
        <button
          className="btn btn-sm"
          onClick={redo}
          disabled={!canRedo}
          title={t('common.redoTitle')}
          aria-label={t('common.redo')}
        >
          ↷ {t('common.redo')}
        </button>
        <button className="btn btn-sm" onClick={() => createCalendar()}>
          + {t('common.new')}
        </button>
        <button className="btn btn-sm" onClick={() => currentId && duplicateCalendar(currentId)}>
          ⧉ {t('common.duplicate')}
        </button>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            if (currentId && confirm(t('calendarBar.confirmDelete'))) {
              deleteCalendar(currentId)
            }
          }}
        >
          🗑 {t('common.delete')}
        </button>
      </div>
      {calendars.length > 1 && (
        <p className="help" style={{ flexBasis: '100%', margin: 0 }}>
          {t('calendarBar.countHelp', { n: calendars.length })}
        </p>
      )}
    </div>
  )
}
