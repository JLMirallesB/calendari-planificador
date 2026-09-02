import { useMemo, useState } from 'react'
import type { Calendar, CalEvent } from '../../types'
import { useStore } from '../../state/CalendarStore'
import { useI18n } from '../../i18n'
import { fetchCourse, fetchManifest } from '../../lib/cev'
import { applyCevDiff, diffCev, type CevDiffItem, type CevSyncMeta } from '../../lib/cevSync'
import Section from './Section'

type Status = 'idle' | 'checking' | 'uptodate' | 'review' | 'applied' | 'error'

interface Props {
  cal: Calendar
}

export default function CevSyncPanel({ cal }: Props) {
  const { patchCurrent } = useStore()
  const { t, fmt } = useI18n()
  const [status, setStatus] = useState<Status>('idle')
  const [items, setItems] = useState<CevDiffItem[]>([])
  const [meta, setMeta] = useState<CevSyncMeta | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const src = cal.source
  if (!src || src.provider !== 'cev-legis') return null

  const fmtEvent = (e: CalEvent | null): string => {
    if (!e) return ''
    if (e.date) return fmt.long(e.date)
    if (e.range) return `${fmt.long(e.range.start)} – ${fmt.long(e.range.end)}`
    return ''
  }

  const check = async () => {
    setStatus('checking')
    try {
      const [manifest, course] = await Promise.all([fetchManifest(), fetchCourse(src.course)])
      const diff = diffCev(cal, course)
      setMeta({ seenUpdated: manifest.updated, version: course.version })
      if (diff.length === 0) {
        setStatus('uptodate')
        return
      }
      setItems(diff)
      // Por defecto: altas y cambios marcados; bajas desmarcadas.
      setSelected(new Set(diff.filter((d) => d.kind !== 'remove').map((d) => d.srcKey)))
      setStatus('review')
    } catch {
      setStatus('error')
    }
  }

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const apply = () => {
    if (!meta) return
    const chosen = items.filter((i) => selected.has(i.srcKey))
    if (chosen.length === 0) {
      // Nada seleccionado: solo marca como revisado.
      patchCurrent((c) => (c.source ? { ...c, source: { ...c.source, ...meta } } : c))
    } else {
      patchCurrent((c) => applyCevDiff(c, chosen, meta))
    }
    setStatus('applied')
    setItems([])
  }

  const counts = useMemo(() => {
    return {
      add: items.filter((i) => i.kind === 'add').length,
      change: items.filter((i) => i.kind === 'change').length,
      remove: items.filter((i) => i.kind === 'remove').length,
    }
  }, [items])

  return (
    <Section
      title={`🏛️ ${t('cevSync.title')}`}
      sectionId="cev"
      headerExtra={<span className="inline-note">{src.municipioName} · {src.course}</span>}
    >
      <p className="help">
        {t('cevSync.origin', { updated: src.seenUpdated })}
      </p>

      {status !== 'review' && (
        <div className="btn-group">
          <button className="btn" onClick={check} disabled={status === 'checking'}>
            {status === 'checking' ? t('cevSync.checking') : t('cevSync.checkBtn')}
          </button>
        </div>
      )}

      {status === 'uptodate' && <p className="inline-note" style={{ marginTop: 8 }}>✓ {t('cevSync.upToDate')}</p>}
      {status === 'applied' && <p className="inline-note" style={{ marginTop: 8 }}>✓ {t('cevSync.applied')}</p>}
      {status === 'error' && (
        <p className="inline-note" style={{ marginTop: 8, color: 'var(--festivo)' }}>{t('cevSync.error')}</p>
      )}

      {status === 'review' && (
        <>
          <p className="help" style={{ marginTop: 8 }}>
            {t('cevSync.reviewHelp', { add: counts.add, change: counts.change, remove: counts.remove })}
          </p>
          {items.map((it) => {
            const label =
              it.kind === 'add'
                ? t('cevSync.add')
                : it.kind === 'change'
                  ? t('cevSync.change')
                  : t('cevSync.remove')
            const ev = it.next ?? it.current
            const kindTitle = ev ? t(`events.kindTitle.${ev.kind}`) : ''
            return (
              <label key={it.srcKey} className="list-item" style={{ alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selected.has(it.srcKey)}
                  onChange={() => toggle(it.srcKey)}
                  style={{ marginTop: 3 }}
                />
                <div className="grow">
                  <div>
                    <span
                      className="badge"
                      style={{ marginRight: 8, color: it.kind === 'remove' ? 'var(--festivo)' : 'var(--accent)' }}
                    >
                      {label}
                    </span>
                    <strong>{(it.next ?? it.current)?.title}</strong>
                    <span className="inline-note" style={{ marginLeft: 6 }}>· {kindTitle}</span>
                  </div>
                  <div className="inline-note">
                    {it.kind === 'change'
                      ? `${fmtEvent(it.current)} → ${fmtEvent(it.next)}`
                      : fmtEvent(it.next ?? it.current)}
                  </div>
                </div>
              </label>
            )
          })}
          <div className="btn-group" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={apply}>
              {t('cevSync.applyBtn', { n: selected.size })}
            </button>
            <button className="btn" onClick={() => setStatus('idle')}>
              {t('common.back')}
            </button>
          </div>
        </>
      )}
    </Section>
  )
}
