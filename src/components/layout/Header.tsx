import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { APP_EMOJI, APP_NAME, APP_VERSION } from '../../config'
import { useI18n } from '../../i18n'
import { useStore } from '../../state/CalendarStore'
import ThemeToggle from './ThemeToggle'
import LanguageSelect from './LanguageSelect'

export default function Header() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { current } = useStore()
  const location = useLocation()
  // Vista de solo lectura (para alumnado/familias): header sin navegación, solo idioma y tema.
  const minimal = location.pathname.startsWith('/ver/')

  return (
    <header className="site-header">
      <div className="inner">
        <div className="brand">
          <span className="emoji" aria-hidden>
            {APP_EMOJI}
          </span>
          <span>{APP_NAME}</span>
          <span className="tagline">{t('header.tagline')}</span>
          {!minimal && (
            <button className="version-tag" title={t('header.changelogTitle')} onClick={() => navigate('/changelog')}>
              v{APP_VERSION}
            </button>
          )}
        </div>
        <nav className="header-nav">
          {!minimal && (
            <>
              <NavLink to="/" end>
                {t('header.home')}
              </NavLink>
              {current && <NavLink to="/editor">{t('header.editor')}</NavLink>}
              {current && <NavLink to="/print">{t('header.print')}</NavLink>}
              <NavLink to="/publicados">{t('header.published')}</NavLink>
            </>
          )}
          <LanguageSelect />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
