import { AUTHOR, IS_ORIGIN, ORIGIN, REPO_URL } from '../../config'
import { useI18n } from '../../i18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <div className="inner">
        <span>
          {t('footer.designedBy')}{' '}
          <a href={ORIGIN.site} target="_blank" rel="noreferrer">
            {ORIGIN.author} (jlmirall.es)
          </a>{' '}
          {t('footer.withClaude')}
        </span>
        {/* En un fork, quien lo mantiene no es el autor original: se dicen los dos. */}
        {!IS_ORIGIN && (
          <>
            <span className="sep">·</span>
            <span>{t('footer.maintainedBy', { name: AUTHOR.name })}</span>
          </>
        )}
        <span className="sep">·</span>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          {t('footer.repo')}
        </a>
        <span className="sep">·</span>
        <a href={`mailto:${AUTHOR.email}`}>{t('footer.contact')}</a>
        <span className="sep">·</span>
        <a href={ORIGIN.kofi} target="_blank" rel="noreferrer">
          {t('footer.kofi')}
        </a>
      </div>
    </footer>
  )
}
