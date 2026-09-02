import type { Calendar } from '../../types'
import { computeTermStats, isLectiveDay } from '../../lib/lectiveDays'
import { eachDay, weekday, WEEKDAY_ORDER } from '../../lib/dateUtils'
import { useI18n } from '../../i18n'

/** Análisis de días lectivos por día de la semana, por trimestre y total del curso. */
export default function WeekdayAnalysis({ cal }: { cal: Calendar }) {
  const { t, fmt } = useI18n()
  if (!cal.courseStart || !cal.courseEnd) return null

  const stats = computeTermStats(cal)
  // Solo los días de la semana lectivos (se excluyen los días de descanso, p. ej. sáb/dom).
  const activeWeekdays = WEEKDAY_ORDER.filter((wd) => !cal.restWeekdays.includes(wd))

  // Total del curso por día de la semana (independiente de los trimestres).
  const totalByWd = new Map<number, number>()
  WEEKDAY_ORDER.forEach((wd) => totalByWd.set(wd, 0))
  let total = 0
  for (const iso of eachDay(cal.courseStart, cal.courseEnd)) {
    if (isLectiveDay(cal, iso)) {
      total++
      const wd = weekday(iso)
      totalByWd.set(wd, (totalByWd.get(wd) ?? 0) + 1)
    }
  }

  return (
    <div className="weekday-analysis">
      <h2 className="list-block-title">{t('print.analysisTitle')}</h2>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{t('print.analysisPeriod')}</th>
              {activeWeekdays.map((wd) => (
                <th key={wd} className="num">
                  {fmt.weekdayShort(wd)}
                </th>
              ))}
              <th className="num">{t('counter.lectiveDays')}</th>
              <th className="num">{t('counter.weeks')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const byWd = new Map(s.byWeekday.map((w) => [w.weekday, w.count]))
              return (
                <tr key={s.termId}>
                  <td>{s.termName}</td>
                  {activeWeekdays.map((wd) => (
                    <td key={wd} className="num">
                      {byWd.get(wd) ?? 0}
                    </td>
                  ))}
                  <td className="num">
                    <strong>{s.lectiveDays}</strong>
                  </td>
                  <td className="num">{s.weeks}</td>
                </tr>
              )
            })}
            <tr className="total-row">
              <td>
                <strong>{t('print.analysisTotal')}</strong>
              </td>
              {activeWeekdays.map((wd) => (
                <td key={wd} className="num">
                  <strong>{totalByWd.get(wd)}</strong>
                </td>
              ))}
              <td className="num">
                <strong>{total}</strong>
              </td>
              <td className="num" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
