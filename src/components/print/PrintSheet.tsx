import type { Calendar } from '../../types'
import { useI18n } from '../../i18n'
import ListLayout from './ListLayout'
import QrCode from './QrCode'
import CompactCalendar from './CompactCalendar'
import WeekdayAnalysis from './WeekdayAnalysis'

/** Hoja imprimible (cabecera + lista/compacto + análisis). Compartida por Imprimir y Ver. */
export default function PrintSheet({
  cal,
  profileId,
  profileName,
  mode,
  showAnalysis,
  viewUrl,
}: {
  cal: Calendar
  profileId: string | null
  profileName?: string
  mode: 'lista' | 'compacto'
  showAnalysis: boolean
  /**
   * URL pública de la vista de este mismo perfil, si la hay. Solo la tienen los calendarios
   * publicados (la vista `#/ver/<token>`); un calendario del editor vive únicamente en el
   * navegador y no hay ninguna dirección que enseñar, así que no se pinta el QR.
   */
  viewUrl?: string
}) {
  const { t, fmt } = useI18n()
  return (
    <div className="print-sheet">
      <div className="print-head">
        {cal.logo && <img src={cal.logo} className="print-logo" alt="" />}
        <div>
          <h1>{cal.name}</h1>
          <div className="subtitle">
            {cal.community && <>{cal.community} · </>}
            {profileName}
            {cal.courseStart && cal.courseEnd && (
              <>
                {' '}
                · {t('print.courseRange')} {fmt.long(cal.courseStart)} – {fmt.long(cal.courseEnd)}
              </>
            )}
          </div>
        </div>
      </div>
      {mode === 'lista' ? (
        <ListLayout cal={cal} profileId={profileId} />
      ) : (
        <CompactCalendar cal={cal} profileId={profileId} />
      )}
      {showAnalysis && <WeekdayAnalysis cal={cal} />}
      {viewUrl && (
        <div className="print-qr">
          <QrCode value={viewUrl} size={104} />
          <div className="print-qr-text">
            <strong>{t('print.qrTitle')}</strong>
            <p>{t('print.qrHelp')}</p>
            <p>{t('print.qrUpdated', { date: fmt.short(cal.updatedAt) })}</p>
            <span className="print-qr-url">{viewUrl}</span>
          </div>
        </div>
      )}
    </div>
  )
}
