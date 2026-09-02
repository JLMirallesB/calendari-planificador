import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Calendar } from '../../types'
import type { Occurrence } from '../../lib/icsCore'
import { KIND_EMOJI, GUIDED_EMOJI } from '../../lib/icsCore'
import { isLectiveDay, trimesterRanges } from '../../lib/lectiveDays'
import { EVENT_KIND_COLOR } from '../../lib/labels'
import { occurrencesByDay, monthsInRange, captionsByMonth, monthKey } from '../../lib/printData'
import { eachDay, parseISO, toISO, WEEKDAY_ORDER } from '../../lib/dateUtils'
import { occurrenceLabels, useI18n, type Formatters, type TFunc } from '../../i18n'
import CourseSummary from './CourseSummary'

// Emoji para la leyenda bajo cada mes (mismo set que el ICS: KIND_EMOJI / GUIDED_EMOJI).
function captionIcon(o: Occurrence): string {
  if (o.kind === 'guided') return GUIDED_EMOJI[o.guidedKey ?? ''] ?? '📋'
  return KIND_EMOJI[o.kind] ?? '📌'
}

interface DayInfo {
  iso: string
  occ: Occurrence[]
  lective: boolean
  termName?: string
  courseEdge?: 'start' | 'end'
}

interface Props {
  cal: Calendar
  profileId: string | null
  interactive?: boolean
  onDayClick?: (iso: string) => void
}

export default function CompactCalendar({ cal, profileId, interactive = false, onDayClick }: Props) {
  const { t, fmt } = useI18n()
  const [hover, setHover] = useState<{ info: DayInfo; x: number; y: number } | null>(null)

  if (!cal.courseStart || !cal.courseEnd) {
    return <p className="empty">{t('print.needDatesCompact')}</p>
  }
  const byDay = occurrencesByDay(cal, profileId, occurrenceLabels(t))
  const monthList = monthsInRange(cal.courseStart, cal.courseEnd)
  const termStarts = new Map<string, string>()
  for (const term of cal.terms) if (term.startDate) termStarts.set(term.startDate, term.name)

  // Leyenda de fechas por mes: eventos del calendario general + hitos del modo guiado
  // (puntuales y periodos). Se excluyen los inicios de trimestre (ya van en la banda/anillo) y
  // un rango se repite en cada mes que toca, para que ningún punto quede sin explicar.
  const captions = captionsByMonth(cal, profileId, occurrenceLabels(t))

  const countLective = (start: string, end: string) => {
    let n = 0
    for (const iso of eachDay(start, end)) if (isLectiveDay(cal, iso)) n++
    return n
  }
  const lectiveInMonth = (y: number, m: number) =>
    countLective(toISO(new Date(y, m, 1)), toISO(new Date(y, m + 1, 0)))

  // Rangos de los tres trimestres (independientes de otros periodos, para las bandas).
  const triRanges = trimesterRanges(cal)
  const triForMonth = (y: number, m: number) => {
    const mid = toISO(new Date(y, m, 15))
    return triRanges.find((r) => mid >= r.start && mid <= r.end) ?? null
  }

  // Agrupa meses consecutivos por trimestre → secciones con banda.
  type Section = { termName: string | null; lective: number; months: typeof monthList }
  const sections: Section[] = []
  for (const mi of monthList) {
    const r = triForMonth(mi.year, mi.month)
    const name = r?.term.name ?? null
    const last = sections[sections.length - 1]
    if (last && last.termName === name) last.months.push(mi)
    else sections.push({ termName: name, lective: r ? countLective(r.start, r.end) : 0, months: [mi] })
  }

  return (
    <>
      <CourseSummary cal={cal} />
      {sections.map((sec, si) => (
        <div key={si} className="compact-section">
          {sec.termName && (
            <div className="compact-term-band">
              <strong>{sec.termName}</strong>
              <span className="inline-note">
                {sec.lective} {t('counter.lectiveDays')}
              </span>
            </div>
          )}
          <div className="compact-grid">
            {sec.months.map((mi) => (
              <MiniMonth
                key={`${mi.year}-${mi.month}`}
                cal={cal}
                year={mi.year}
                month={mi.month}
                byDay={byDay}
                termStarts={termStarts}
                captions={captions.get(monthKey(mi.year, mi.month)) ?? []}
                lectiveCount={lectiveInMonth(mi.year, mi.month)}
                fmt={fmt}
                t={t}
                interactive={interactive}
                onDayClick={onDayClick}
                onHover={(info, x, y) => setHover({ info, x, y })}
                onLeave={() => setHover(null)}
              />
            ))}
          </div>
        </div>
      ))}
      <Legend t={t} />
      {interactive && hover && <DayTooltip hover={hover} t={t} fmt={fmt} />}
    </>
  )
}

function kindColor(kind: string): string {
  return (EVENT_KIND_COLOR as Record<string, string>)[kind] ?? 'var(--accent)'
}

function DayTooltip({
  hover,
  t,
  fmt,
}: {
  hover: { info: DayInfo; x: number; y: number }
  t: TFunc
  fmt: Formatters
}) {
  const { info, x, y } = hover
  const W = typeof window !== 'undefined' ? window.innerWidth : 1200
  const H = typeof window !== 'undefined' ? window.innerHeight : 800
  const TIP_W = 240
  const left = x + 16 + TIP_W > W ? Math.max(8, x - 16 - TIP_W) : x + 16
  const top = Math.min(y + 16, H - 140)
  const status = info.lective ? t('print.legendLective') : null

  const tip = (
    <div className="day-tip" style={{ left, top, maxWidth: TIP_W }}>
      <div className="day-tip-date">{fmt.long(info.iso)}</div>
      {info.courseEdge && (
        <div className="day-tip-row">
          <span className="day-tip-dot" style={{ background: 'var(--accent)' }} />
          <strong>{info.courseEdge === 'start' ? t('course.startLabel') : t('course.endLabel')}</strong>
        </div>
      )}
      {info.termName && (
        <div className="day-tip-row">
          <span className="day-tip-dot" style={{ background: 'var(--provisional)' }} />
          {t('print.legendTermStart')}: <strong>{info.termName}</strong>
        </div>
      )}
      {info.occ.map((o, i) => (
        <div key={i} className="day-tip-row">
          <span className="day-tip-dot" style={{ background: kindColor(o.kind) }} />
          {o.title}
        </div>
      ))}
      {info.occ.length === 0 && !info.termName && status && <div className="day-tip-row">{status}</div>}
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(tip, document.body) : tip
}

function capDate(startISO: string, endISO: string, fmt: Formatters): string {
  const s = parseISO(startISO)
  const e = parseISO(endISO)
  if (startISO === endISO) return String(s.getDate())
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return `${s.getDate()}–${e.getDate()}`
  const mon = (m: number) => fmt.monthName(m).slice(0, 3).toLowerCase()
  return `${s.getDate()} ${mon(s.getMonth())} – ${e.getDate()} ${mon(e.getMonth())}`
}

function MiniMonth({
  cal,
  year,
  month,
  byDay,
  termStarts,
  captions,
  lectiveCount,
  fmt,
  t,
  interactive,
  onDayClick,
  onHover,
  onLeave,
}: {
  cal: Calendar
  year: number
  month: number
  byDay: Map<string, Occurrence[]>
  termStarts: Map<string, string>
  captions: Occurrence[]
  lectiveCount: number
  fmt: Formatters
  t: TFunc
  interactive: boolean
  onDayClick?: (iso: string) => void
  onHover: (info: DayInfo, x: number, y: number) => void
  onLeave: () => void
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // 0 = lunes
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  return (
    <div className="mini-month">
      <h4>
        {fmt.monthName(month)} {year}
        <span className="mini-lective">
          {lectiveCount} {t('counter.lectiveDays')}
        </span>
      </h4>
      <table className="mini">
        <thead>
          <tr>
            {WEEKDAY_ORDER.map((wd) => (
              <th key={wd}>{fmt.weekdayShort(wd).slice(0, 2)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((d, ci) => {
                if (d === null) return <td key={ci} className="out" />
                const iso = toISO(new Date(year, month, d))
                const occ = byDay.get(iso) ?? []
                const hasFest = occ.some(
                  (o) => o.kind === 'festivoAutonomico' || o.kind === 'festivoLocal' || o.kind === 'noLaborable',
                )
                const hasVac = occ.some((o) => o.kind === 'vacaciones')
                const lective = isLectiveDay(cal, iso)
                const hasRecovered = occ.some((o) => o.kind === 'festivoALectivo')
                const hasOther = occ.some(
                  (o) =>
                    !['vacaciones', 'festivoAutonomico', 'festivoLocal', 'festivoALectivo', 'noLaborable'].includes(
                      o.kind,
                    ),
                )
                let cls = ''
                if (lective) cls = ''
                else if (hasFest) cls = 'fest'
                else if (hasVac) cls = 'vac'
                else cls = 'nonlective'
                if (hasRecovered) cls += ' recovered'
                const termName = termStarts.get(iso)
                if (termName) cls += ' term-start'
                const courseEdge = iso === cal.courseStart ? 'start' : iso === cal.courseEnd ? 'end' : undefined
                if (courseEdge) cls += ' course-edge'
                if (interactive) cls += ' clickable'
                const title = interactive ? undefined : [termName, ...occ.map((o) => o.title)].filter(Boolean).join(' · ')
                const info: DayInfo = { iso, occ, lective, termName, courseEdge }
                return (
                  <td
                    key={ci}
                    className={cls}
                    title={title || undefined}
                    onMouseEnter={interactive ? (e) => onHover(info, e.clientX, e.clientY) : undefined}
                    onMouseMove={interactive ? (e) => onHover(info, e.clientX, e.clientY) : undefined}
                    onMouseLeave={interactive ? onLeave : undefined}
                    onClick={interactive && onDayClick ? () => onDayClick(iso) : undefined}
                  >
                    {d}
                    {hasOther && <span className="ev-dot" />}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {captions.length > 0 && (
        <div className="mini-caption">
          {captions.map((o, i) => (
            <div key={i} className="cap-row">
              <span className="cap-icon" aria-hidden>
                {captionIcon(o)}
              </span>
              <span className="cap-day">{capDate(o.startISO, o.endISO, fmt)}</span>
              <span className="cap-title">
                {o.title}
                {o.provisional && <span className="cap-prov"> ({t('common.provisional').toLowerCase()})</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Legend({ t }: { t: TFunc }) {
  return (
    <>
      <div className="tag-legend" style={{ marginTop: 16 }}>
        <span className="swatch">
          <span className="box course-edge-swatch" /> {t('print.legendCourseEdge')}
        </span>
        <span className="swatch">
          <span className="box" style={{ background: 'color-mix(in srgb, var(--vacaciones) 45%, transparent)' }} />{' '}
          {t('print.legendVacaciones')}
        </span>
        <span className="swatch">
          <span className="box" style={{ background: 'color-mix(in srgb, var(--festivo) 40%, transparent)' }} />{' '}
          {t('print.legendFestivo')}
        </span>
        <span className="swatch">
          <span className="box term-start-swatch" /> {t('print.legendTermStart')}
        </span>
        <span className="swatch">
          <span className="box recovered-swatch" /> {t('print.legendRecovered')}
        </span>
        <span className="swatch">
          <span className="box" style={{ background: 'var(--accent)', borderRadius: '50%' }} /> {t('print.legendEvent')}
        </span>
        <span className="swatch">
          <span className="box" style={{ background: 'color-mix(in srgb, var(--text-muted) 20%, transparent)' }} />{' '}
          {t('print.legendNonLective')}
        </span>
      </div>
      <p className="inline-note" style={{ marginTop: 8 }}>{t('print.legendLectiveNote')}</p>
    </>
  )
}
