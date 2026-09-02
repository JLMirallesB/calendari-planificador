import { useState } from 'react'
import type { CalEvent, EventKind, Profile } from '../../types'
import { makeId, newEvent } from '../../lib/json'
import { useI18n } from '../../i18n'
import ProfileSelector from './ProfileSelector'
import Section from './Section'
import DateInput from './DateInput'

/** Tipos de evento que admiten hora de inicio/fin (actos puntuales, no periodos). */
const TIMEABLE_KINDS = new Set<EventKind>([
  'claustro',
  'cocope',
  'consejoEscolar',
  'pruebaAcceso',
  'otro',
])

interface Props {
  title: string
  help?: string
  kinds: EventKind[]
  events: CalEvent[]
  profiles: Profile[]
  sectionId?: string
  onChange: (events: CalEvent[]) => void
}

/**
 * Editor reutilizable para una familia de eventos (vacaciones/festivos, institucionales,
 * otros…). Cada evento admite fecha puntual o rango, marca de provisional y perfiles.
 */
export default function EventList({ title, help, kinds, events, profiles, sectionId, onChange }: Props) {
  const { t } = useI18n()
  const mine = events.filter((e) => kinds.includes(e.kind))
  const others = events.filter((e) => !kinds.includes(e.kind))

  const commit = (updated: CalEvent[]) => onChange([...others, ...updated])

  const add = () => {
    const ev = newEvent()
    ev.kind = kinds[0]
    commit([...mine, ev])
  }
  const update = (id: string, patch: Partial<CalEvent>) => {
    commit(mine.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  const remove = (id: string) => commit(mine.filter((e) => e.id !== id))
  // Duplica un evento con id propio y lo inserta justo debajo del original, para editarlo aparte.
  const duplicate = (id: string) => {
    const i = mine.findIndex((e) => e.id === id)
    if (i < 0) return
    const copy = { ...mine[i], id: makeId('ev') }
    commit([...mine.slice(0, i + 1), copy, ...mine.slice(i + 1)])
  }

  return (
    <Section
      title={title}
      sectionId={sectionId}
      headerExtra={
        <button className="btn btn-sm btn-primary" onClick={add}>
          + {t('common.add')}
        </button>
      }
    >
      {help && <p className="help">{help}</p>}
      {mine.length === 0 && <p className="empty">{t('events.empty')}</p>}
      {mine.map((ev) => (
        <EventRow
          key={ev.id}
          ev={ev}
          kinds={kinds}
          profiles={profiles}
          onUpdate={(patch) => update(ev.id, patch)}
          onRemove={() => remove(ev.id)}
          onDuplicate={() => duplicate(ev.id)}
        />
      ))}
    </Section>
  )
}

function EventRow({
  ev,
  kinds,
  profiles,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  ev: CalEvent
  kinds: EventKind[]
  profiles: Profile[]
  onUpdate: (patch: Partial<CalEvent>) => void
  onRemove: () => void
  onDuplicate: () => void
}) {
  const { t, fmt } = useI18n()
  const isRange = !!ev.range
  const [mode, setMode] = useState<'date' | 'range'>(isRange ? 'range' : 'date')
  // Las horas solo tienen sentido en actos concretos: institucionales y «otras fechas».
  const timeable = TIMEABLE_KINDS.has(ev.kind)

  const setModeDate = () => {
    setMode('date')
    onUpdate({ range: null, date: ev.date ?? ev.range?.start ?? null })
  }
  const setModeRange = () => {
    setMode('range')
    const start = ev.range?.start ?? ev.date ?? ''
    const end = ev.range?.end ?? ev.date ?? ''
    // Un rango no lleva horas: se limpian al cambiar de modo.
    onUpdate({
      date: null,
      startTime: null,
      endTime: null,
      range: start && end ? { start, end } : { start: start || end, end: end || start },
    })
  }

  return (
    <div id={`ev-${ev.id}`} className="list-item">
      <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>{t('events.description')}</label>
            <input
              type="text"
              value={ev.title}
              placeholder={t(`events.kind.${ev.kind}`)}
              onChange={(e) => onUpdate({ title: e.target.value })}
            />
          </div>
          {kinds.length > 1 && (
            <div className="field">
              <label>{t('events.type')}</label>
              <select value={ev.kind} onChange={(e) => onUpdate({ kind: e.target.value as EventKind })}>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {t(`events.kind.${k}`)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 'none' }}>
            <label>{t('common.format')}</label>
            <div className="btn-group">
              <button
                className={`btn btn-sm ${mode === 'date' ? 'btn-primary' : ''}`}
                onClick={setModeDate}
                type="button"
              >
                {t('events.punctual')}
              </button>
              <button
                className={`btn btn-sm ${mode === 'range' ? 'btn-primary' : ''}`}
                onClick={setModeRange}
                type="button"
              >
                {t('events.range')}
              </button>
            </div>
          </div>
          {mode === 'date' ? (
            <>
              <div className="field">
                <label>{t('common.date')}</label>
                <DateInput value={ev.date ?? ''} onChange={(e) => onUpdate({ date: e.target.value || null })} />
              </div>
              {/* Horas opcionales, solo en institucionales y otras fechas (no en festivos/vacaciones). */}
              {timeable && (
                <>
                  <div className="field">
                    <label>{t('events.startTime')}</label>
                    <input
                      type="time"
                      value={ev.startTime ?? ''}
                      onChange={(e) =>
                        onUpdate(
                          e.target.value
                            ? { startTime: e.target.value }
                            : { startTime: null, endTime: null }, // sin inicio no hay fin
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>{t('events.endTime')}</label>
                    <input
                      type="time"
                      value={ev.endTime ?? ''}
                      onChange={(e) => onUpdate({ endTime: e.target.value || null })}
                      disabled={!ev.startTime}
                      title={!ev.startTime ? t('events.endTimeNeedsStart') : undefined}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="field">
                <label>{t('common.from')}</label>
                <DateInput
                  value={ev.range?.start ?? ''}
                  onChange={(e) =>
                    onUpdate({ range: { start: e.target.value, end: ev.range?.end || e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>{t('common.to')}</label>
                <DateInput
                  value={ev.range?.end ?? ''}
                  onChange={(e) =>
                    onUpdate({ range: { start: ev.range?.start || e.target.value, end: e.target.value } })
                  }
                />
              </div>
            </>
          )}
        </div>

        <ProfileSelector
          profiles={profiles}
          selected={ev.profiles}
          onChange={(profilesSel) => onUpdate({ profiles: profilesSel })}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={ev.provisional}
              onChange={(e) => onUpdate({ provisional: e.target.checked })}
            />
            {t('common.provisional')}
          </label>
          {ev.provisional && <span className="badge badge-provisional">{t('common.provisional')}</span>}
          {ev.date && (
            <span className="inline-note">
              {fmt.human(ev.date)}
              {ev.startTime ? ` · ${ev.startTime}${ev.endTime && ev.endTime !== ev.startTime ? `–${ev.endTime}` : ''}` : ''}
            </span>
          )}
        </div>
      </div>
      {/* Solo llevan icono: `title` da tooltip, pero no llega al lector de pantalla ni al táctil. */}
      <div className="btn-group">
        <button
          className="btn btn-sm"
          onClick={onDuplicate}
          title={t('events.duplicateTitle')}
          aria-label={t('events.duplicateTitle')}
        >
          <span aria-hidden>⧉</span>
        </button>
        <button
          className="btn btn-sm btn-danger"
          onClick={onRemove}
          title={t('events.removeTitle')}
          aria-label={t('events.removeTitle')}
        >
          <span aria-hidden>✕</span>
        </button>
      </div>
    </div>
  )
}
