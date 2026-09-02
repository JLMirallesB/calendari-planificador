import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Calendar } from '../types'
import { BACKUPS_KEY, STORAGE_KEY } from '../config'
import { newCalendar } from '../lib/json'
import { getLang } from '../i18n'
import * as st from './calendarState'
import type { ImportOptions, StoredState } from './calendarState'
import { parseBackups, pushBackup, type Backup } from './backups'
import * as hist from './history'
import type { Histories } from './history'

interface StoreContextValue {
  calendars: Calendar[]
  current: Calendar | null
  currentId: string | null
  selectCalendar: (id: string) => void
  createCalendar: (name?: string) => void
  importCalendar: (cal: Calendar, opts?: ImportOptions) => void
  deleteCalendar: (id: string) => void
  duplicateCalendar: (id: string) => void
  /** Modifica el calendario actual mediante una función productora. */
  patchCurrent: (fn: (c: Calendar) => Calendar) => void
  /** Copias de seguridad guardadas, de la más reciente a la más antigua. */
  backups: Backup[]
  /** Vuelve al estado de una copia (identificada por su marca de tiempo). */
  restoreBackup: (at: string) => void
  /** Deshace la última edición del calendario actual (Ctrl/Cmd+Z). */
  undo: () => void
  /** Rehace la última edición deshecha (Ctrl+Shift+Z). */
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

const StoreContext = createContext<StoreContextValue | null>(null)

/** Lee y normaliza el estado guardado. Las transiciones viven en `calendarState.ts` (puras). */
function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return st.parseStoredState(JSON.parse(raw))
  } catch {
    /* datos corruptos: empezar de cero */
  }
  // Sin calendarios: estado vacío → la app muestra la página de bienvenida.
  return st.EMPTY_STATE
}

function loadBackups(): Backup[] {
  try {
    const raw = localStorage.getItem(BACKUPS_KEY)
    return raw ? parseBackups(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export function CalendarStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(loadState)
  const [backups, setBackups] = useState<Backup[]>(loadBackups)
  // Historial de deshacer/rehacer, por calendario y solo en memoria (ver history.ts).
  const [histories, setHistories] = useState<Histories>({})
  // El estado tal como quedó guardado la última vez: es el que se copia antes de pisarlo.
  const previous = useRef(state)

  // Salvaguarda anti-borrado: NO persistir en el primer render. Ese primer guardado era el
  // que, si la carga fallaba transitoriamente y devolvía vacío, sobrescribía los datos buenos.
  // El estado inicial ya viene del localStorage (o vacío en usuario nuevo), así que no hay nada
  // que guardar al arrancar. Solo se persiste tras cambios reales del usuario.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      previous.current = state
      return
    }
    // Antes de pisar lo guardado, se archiva la versión anterior (el anillo decide si toca).
    setBackups((ring) => {
      const next = pushBackup(ring, previous.current, state, new Date().toISOString())
      if (next !== ring) {
        try {
          localStorage.setItem(BACKUPS_KEY, JSON.stringify(next))
        } catch {
          /* sin sitio para copias: no debe impedir guardar el calendario */
        }
      }
      return next
    })
    previous.current = state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* almacenamiento lleno o no disponible */
    }
  }, [state])

  const selectCalendar = useCallback((id: string) => {
    setState((s) => st.selectCalendar(s, id))
  }, [])

  const createCalendar = useCallback((name?: string) => {
    setState((s) => st.addCalendar(s, newCalendar(name, getLang())))
  }, [])

  const importCalendar = useCallback((cal: Calendar, opts?: ImportOptions) => {
    setState((s) => st.importCalendar(s, cal, opts))
  }, [])

  const deleteCalendar = useCallback((id: string) => {
    setHistories((h) => hist.forget(h, id)) // un calendario borrado no debe dejar historial colgando
    setState((s) => st.deleteCalendar(s, id))
  }, [])

  const duplicateCalendar = useCallback((id: string) => {
    setState((s) => st.duplicateCalendar(s, id))
  }, [])

  const patchCurrent = useCallback((fn: (c: Calendar) => Calendar) => {
    // Antes de aplicar la edición se archiva la versión previa del calendario actual, para poder
    // deshacerla. `previous.current` es el estado ya confirmado (lo actualiza el efecto de guardado).
    const cur = st.currentOf(previous.current)
    if (cur) setHistories((h) => hist.record(h, cur))
    setState((s) => st.patchCurrent(s, fn, new Date().toISOString()))
  }, [])

  // Deshacer/rehacer restauran una versión del calendario actual sin pasar por `patchCurrent`
  // (no deben generar una nueva entrada de historial). Refs para que los atajos de teclado, que
  // se registran una vez, siempre vean el estado y el historial más recientes.
  const historiesRef = useRef(histories)
  historiesRef.current = histories

  const applyHistory = useCallback(
    (step: typeof hist.undo) => {
      const cur = st.currentOf(previous.current)
      if (!cur) return
      const res = step(historiesRef.current, cur)
      if (!res) return
      setHistories(res.histories)
      setState((s) => ({
        ...s,
        calendars: s.calendars.map((c) => (c.id === res.restored.id ? res.restored : c)),
      }))
    },
    [],
  )
  const undo = useCallback(() => applyHistory(hist.undo), [applyHistory])
  const redo = useCallback(() => applyHistory(hist.redo), [applyHistory])

  const restoreBackup = useCallback(
    (at: string) => {
      const b = backups.find((x) => x.at === at)
      if (!b) return
      // Se archiva lo que hay AHORA aunque no toque por tiempo: si no, restaurar sería el único
      // cambio de la app sin vuelta atrás, y el propio diálogo promete que se puede deshacer.
      setBackups((ring) => {
        const next = pushBackup(ring, previous.current, b.state, new Date().toISOString(), {
          force: true,
        })
        if (next !== ring) {
          try {
            localStorage.setItem(BACKUPS_KEY, JSON.stringify(next))
          } catch {
            /* sin sitio para copias */
          }
        }
        return next
      })
      setState(b.state)
    },
    [backups],
  )

  const current = useMemo(() => st.currentOf(state), [state])

  const value: StoreContextValue = {
    calendars: state.calendars,
    current,
    currentId: state.currentId,
    selectCalendar,
    createCalendar,
    importCalendar,
    deleteCalendar,
    duplicateCalendar,
    patchCurrent,
    backups,
    restoreBackup,
    undo,
    redo,
    canUndo: hist.canUndo(histories, state.currentId),
    canRedo: hist.canRedo(histories, state.currentId),
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de CalendarStoreProvider')
  return ctx
}
