import { useI18n, type Lang } from '../../i18n'

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'es', label: 'ES' },
  { value: 'ca', label: 'VA' },
]

export default function LanguageSelect() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="btn-group" role="group" aria-label={t('header.langLabel')} style={{ gap: 2 }}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          className={`btn btn-sm ${lang === o.value ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setLang(o.value)}
          title={t('header.langTitle')}
          aria-pressed={lang === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
