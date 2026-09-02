import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useStore } from '../../state/CalendarStore'
import { useI18n } from '../../i18n'
import { resolveEditTarget } from '../../lib/editTarget'
import { EditorFocusProvider, useEditorFocus } from './EditorFocus'
import CalendarBar from './CalendarBar'
import CevSyncPanel from './CevSyncPanel'
import CourseDates from './CourseDates'
import ProfilesEditor from './ProfilesEditor'
import EventList from './EventList'
import TermsEditor from './TermsEditor'
import JsonImportExport from './JsonImportExport'
import BackupsPanel from './BackupsPanel'
import ValidationPanel from './ValidationPanel'
import LectiveCounter from '../counter/LectiveCounter'
import TermWeekdayStats from '../counter/TermWeekdayStats'
import CompactCalendar from '../print/CompactCalendar'

export default function EditorPage() {
  const { current } = useStore()
  // Sin calendario activo (p. ej. tras borrar el último): volver a la bienvenida.
  if (!current) return <Navigate to="/" replace />
  return (
    <EditorFocusProvider>
      <EditorInner />
    </EditorFocusProvider>
  )
}

function EditorInner() {
  const { current, patchCurrent, importCalendar, undo, redo } = useStore()
  const { t } = useI18n()
  const { request, focus } = useEditorFocus()

  // Atajos de teclado deshacer/rehacer. Se ignoran cuando el foco está en un campo de texto, para
  // no pisar el deshacer nativo de escritura (Ctrl+Z dentro de un input sigue deshaciendo letras).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // Al pedir un salto: espera a que la sección se abra, hace scroll y resalta la fila.
  useEffect(() => {
    if (!request) return
    const timer = setTimeout(() => {
      const el = document.getElementById(request.anchorId)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.remove('edit-flash')
      void el.offsetWidth // reinicia la animación en clics repetidos
      el.classList.add('edit-flash')
    }, 90)
    return () => clearTimeout(timer)
  }, [request])

  if (!current) return <Navigate to="/" replace />
  const cal = current

  const onDayClick = (iso: string) => {
    const target = resolveEditTarget(cal, iso)
    if (target) focus(target.sectionId, target.anchorId)
  }

  return (
    <>
      <CalendarBar />
      <ValidationPanel cal={cal} />
      <div className="editor-grid">
        <aside className="editor-left">
          <div className="card">
            <div className="section-title">{t('print.formatCompact')}</div>
            <CompactCalendar cal={cal} profileId={null} interactive onDayClick={onDayClick} />
          </div>
        </aside>

        <div>
          <CevSyncPanel cal={cal} />

          <CourseDates cal={cal} onChange={(patch) => patchCurrent((c) => ({ ...c, ...patch }))} />

          <ProfilesEditor cal={cal} onChange={(profiles) => patchCurrent((c) => ({ ...c, profiles }))} />

          <EventList
            title={t('events.vacTitle')}
            help={t('events.vacHelp')}
            kinds={['vacaciones', 'festivoAutonomico', 'festivoLocal', 'festivoALectivo', 'noLaborable']}
            events={cal.events}
            profiles={cal.profiles}
            sectionId="events-vac"
            onChange={(events) => patchCurrent((c) => ({ ...c, events }))}
          />

          <TermsEditor cal={cal} onChange={(terms) => patchCurrent((c) => ({ ...c, terms }))} />

          <EventList
            title={t('events.instTitle')}
            help={t('events.instHelp')}
            kinds={['claustro', 'cocope', 'consejoEscolar', 'pruebaAcceso']}
            events={cal.events}
            profiles={cal.profiles}
            sectionId="events-inst"
            onChange={(events) => patchCurrent((c) => ({ ...c, events }))}
          />

          <EventList
            title={t('events.otherTitle')}
            help={t('events.otherHelp')}
            kinds={['otro']}
            events={cal.events}
            profiles={cal.profiles}
            sectionId="events-otro"
            onChange={(events) => patchCurrent((c) => ({ ...c, events }))}
          />

          <JsonImportExport
            cal={cal}
            onImport={(imported, opts) => importCalendar(imported, opts)}
          />
          <BackupsPanel />
        </div>

        <aside className="sidebar">
          <LectiveCounter cal={cal} />
          <div className="card" style={{ textAlign: 'center' }}>
            <Link className="btn btn-primary" to="/print" style={{ width: '100%', justifyContent: 'center' }}>
              {t('counter.printButton')}
            </Link>
          </div>
          <TermWeekdayStats cal={cal} />
        </aside>
      </div>
    </>
  )
}
