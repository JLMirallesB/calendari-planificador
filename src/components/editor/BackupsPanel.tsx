import { useStore } from '../../state/CalendarStore'
import { describeBackup } from '../../state/backups'
import { useI18n } from '../../i18n'
import Section from './Section'

/**
 * Lista de copias de seguridad guardadas en este navegador, con su botón de restaurar.
 *
 * Restaurar no destruye nada sin remedio: el estado actual se archiva como una copia más antes de
 * ser sustituido, así que se puede deshacer la propia restauración.
 */
export default function BackupsPanel() {
  const { backups, restoreBackup } = useStore()
  const { t, fmt } = useI18n()

  return (
    <Section title={t('backups.title')} defaultOpen={false} sectionId="backups">
      <p className="help">{t('backups.help')}</p>
      {backups.length === 0 ? (
        <p className="inline-note">{t('backups.empty')}</p>
      ) : (
        backups.map((b) => {
          const { calendars, dates } = describeBackup(b)
          return (
            <div key={b.at} className="list-item" style={{ alignItems: 'center' }}>
              <div className="grow">
                <div style={{ fontWeight: 650 }}>{fmt.dateTime(b.at)}</div>
                <div className="inline-note">{t('backups.summary', { calendars, dates })}</div>
              </div>
              <button
                className="btn btn-sm"
                onClick={() => {
                  if (confirm(t('backups.confirm', { when: fmt.dateTime(b.at) }))) restoreBackup(b.at)
                }}
              >
                {t('backups.restore')}
              </button>
            </div>
          )
        })
      )}
    </Section>
  )
}
