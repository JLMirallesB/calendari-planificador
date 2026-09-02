import type { Calendar, Profile } from '../../types'
import { makeId } from '../../lib/json'
import { useI18n } from '../../i18n'
import Section from './Section'

interface Props {
  cal: Calendar
  onChange: (profiles: Profile[]) => void
}

const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#db2777', '#65a30d']

export default function ProfilesEditor({ cal, onChange }: Props) {
  const { t } = useI18n()
  const add = () => {
    const color = PALETTE[cal.profiles.length % PALETTE.length]
    onChange([...cal.profiles, { id: makeId('prof'), name: t('profiles.newProfile'), color }])
  }
  const update = (id: string, patch: Partial<Profile>) =>
    onChange(cal.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const remove = (id: string) => onChange(cal.profiles.filter((p) => p.id !== id))

  return (
    <Section
      title={t('profiles.title')}
      sectionId="profiles"
      headerExtra={
        <button className="btn btn-sm btn-primary" onClick={add}>
          {t('profiles.add')}
        </button>
      }
    >
      <p className="help">{t('profiles.help')}</p>
      {cal.profiles.map((p) => (
        <div key={p.id} className="list-item" style={{ alignItems: 'center' }}>
          <input
            type="color"
            value={p.color}
            onChange={(e) => update(p.id, { color: e.target.value })}
            style={{ width: 40, height: 34, padding: 2, flex: 'none' }}
            title={t('profiles.colorTitle')}
          />
          <input
            type="text"
            className="grow"
            value={p.name}
            onChange={(e) => update(p.id, { name: e.target.value })}
          />
          <button
            className="btn btn-sm btn-danger"
            onClick={() => remove(p.id)}
            disabled={cal.profiles.length <= 1}
            title={cal.profiles.length <= 1 ? t('profiles.minOne') : t('profiles.removeTitle')}
            aria-label={t('profiles.removeTitle')}
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
      ))}
    </Section>
  )
}
