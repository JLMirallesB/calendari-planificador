import type { Calendar } from '../../types'
import { trimesterRanges, type TermRange } from '../../lib/lectiveDays'
import { useI18n } from '../../i18n'

/** Resumen de fechas clave: inicio/fin de curso, de cada trimestre y de Anticipación. */
export default function CourseSummary({ cal }: { cal: Calendar }) {
  const { t, fmt } = useI18n()
  if (!cal.courseStart || !cal.courseEnd) return null

  const ranges: TermRange[] = [...trimesterRanges(cal)]
  // Anticipación (periodo aparte de los tres trimestres): su inicio y fin propios.
  const antic = cal.terms.find((x) => x.type === 'Anticipacion' && x.startDate)
  if (antic && antic.startDate) {
    ranges.push({ term: antic, start: antic.startDate, end: antic.endDate ?? antic.startDate })
  }
  ranges.sort((a, b) => (a.start < b.start ? -1 : 1))

  const rangeText = (start: string, end: string) =>
    start === end ? fmt.human(start) : `${fmt.human(start)} – ${fmt.human(end)}`

  return (
    <div className="course-summary">
      <div className="cs-course">
        🎓 <strong>{t('print.courseRange')}:</strong> {fmt.human(cal.courseStart)} – {fmt.human(cal.courseEnd)}
      </div>
      {ranges.length > 0 && (
        <div className="cs-trims">
          {ranges.map((r) => (
            <span key={r.term.id} className="cs-trim">
              <strong>{r.term.name}:</strong> {rangeText(r.start, r.end)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
