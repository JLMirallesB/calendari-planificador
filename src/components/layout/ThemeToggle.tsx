import { useTheme } from '../../lib/theme'
import { useI18n } from '../../i18n'

export default function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const { t } = useI18n()
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={toggle}
      title={theme === 'dark' ? t('header.themeToLight') : t('header.themeToDark')}
      aria-label={t('header.themeToggle')}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
