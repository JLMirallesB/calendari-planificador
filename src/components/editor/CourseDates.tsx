import type { Calendar } from '../../types'
import { WEEKDAY_ORDER } from '../../lib/dateUtils'
import { useI18n } from '../../i18n'
import Section from './Section'
import DateInput from './DateInput'

interface Props {
  cal: Calendar
  onChange: (patch: Partial<Calendar>) => void
}

export default function CourseDates({ cal, onChange }: Props) {
  const { t, fmt } = useI18n()
  const toggleRest = (wd: number) => {
    const set = new Set(cal.restWeekdays)
    set.has(wd) ? set.delete(wd) : set.add(wd)
    onChange({ restWeekdays: [...set].sort((a, b) => a - b) })
  }

  // Reescala el logo (máx. 400px) para no inflar el localStorage y lo guarda como data URL.
  const onLogoFile = (file: File) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const maxDim = 400
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h)
        onChange({ logo: canvas.toDataURL('image/png') })
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }
  return (
    <Section title={t('course.title')} sectionId="course">
      <div className="field-row">
        <div className="field" style={{ flex: 2 }}>
          <label>{t('course.nameLabel')}</label>
          <input type="text" value={cal.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>{t('course.communityLabel')}</label>
          <input
            type="text"
            value={cal.community}
            placeholder={t('course.communityPlaceholder')}
            onChange={(e) => onChange({ community: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label>{t('course.logoLabel')}</label>
        {cal.logo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={cal.logo}
              alt="logo"
              style={{ maxHeight: 48, maxWidth: 140, border: '1px solid var(--border)', borderRadius: 6, background: '#fff', padding: 3 }}
            />
            <button className="btn btn-sm btn-danger" onClick={() => onChange({ logo: undefined })}>
              {t('course.logoRemove')}
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onLogoFile(f)
              e.target.value = ''
            }}
          />
        )}
        <p className="inline-note">{t('course.logoHelp')}</p>
      </div>
      <div className="field-row" id="course-dates">
        <div className="field">
          <label>{t('course.startLabel')}</label>
          <DateInput
            value={cal.courseStart ?? ''}
            onChange={(e) => onChange({ courseStart: e.target.value || null })}
          />
        </div>
        <div className="field">
          <label>{t('course.endLabel')}</label>
          <DateInput
            value={cal.courseEnd ?? ''}
            onChange={(e) => onChange({ courseEnd: e.target.value || null })}
          />
        </div>
      </div>
      <div className="field">
        <label>{t('course.restDaysLabel')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {WEEKDAY_ORDER.map((wd) => (
            <label key={wd} className="profile-pill" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={cal.restWeekdays.includes(wd)}
                onChange={() => toggleRest(wd)}
              />
              {fmt.weekdayLong(wd)}
            </label>
          ))}
        </div>
      </div>
    </Section>
  )
}
