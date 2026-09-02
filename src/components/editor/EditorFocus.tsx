import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export interface FocusRequest {
  sectionId: string
  anchorId: string
  nonce: number
}

interface EditorFocusValue {
  request: FocusRequest | null
  focus: (sectionId: string, anchorId: string) => void
}

// Valor por defecto no-op: `Section` puede usar el hook aunque no haya proveedor.
const EditorFocusContext = createContext<EditorFocusValue>({ request: null, focus: () => {} })

export function EditorFocusProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<FocusRequest | null>(null)
  const nonce = useRef(0)
  const focus = useCallback((sectionId: string, anchorId: string) => {
    nonce.current += 1
    setRequest({ sectionId, anchorId, nonce: nonce.current })
  }, [])
  const value = useMemo(() => ({ request, focus }), [request, focus])
  return <EditorFocusContext.Provider value={value}>{children}</EditorFocusContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditorFocus(): EditorFocusValue {
  return useContext(EditorFocusContext)
}
