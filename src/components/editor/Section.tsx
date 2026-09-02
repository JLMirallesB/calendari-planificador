import { useEffect, useState, type ReactNode } from 'react'
import { useEditorFocus } from './EditorFocus'

interface Props {
  title: ReactNode
  /** Contenido a la derecha de la cabecera (p. ej. un botón de acción). */
  headerExtra?: ReactNode
  defaultOpen?: boolean
  /** Identificador para el salto desde el calendario compacto (auto-abre la sección). */
  sectionId?: string
  children: ReactNode
}

/** Tarjeta de sección del editor con cabecera plegable. */
export default function Section({ title, headerExtra, defaultOpen = true, sectionId, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const { request } = useEditorFocus()

  // Si esta sección es el destino de un salto, ábrela para que el ancla sea visible.
  useEffect(() => {
    if (request && sectionId && request.sectionId === sectionId) setOpen(true)
  }, [request, sectionId])

  return (
    <div className={`card section${open ? '' : ' section-collapsed'}`}>
      <div className="card-header">
        <button
          type="button"
          className="section-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
          <h2>{title}</h2>
        </button>
        {headerExtra}
      </div>
      {open && children}
    </div>
  )
}
