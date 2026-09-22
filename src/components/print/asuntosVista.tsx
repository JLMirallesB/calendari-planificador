import { useState } from 'react'
import type { AsuntosRow } from '../../lib/asuntos'
import { ASUNTOS_VIEW_KEY } from '../../config'
import { useI18n } from '../../i18n'

/**
 * Lo que necesita el calendario compacto para enseñar los días de asuntos particulares: una fila
 * por día, y hasta dónde llega el periodo de disfrute (julio, más allá del fin de curso).
 */
export interface AsuntosVista {
  hasta: string
  dias: Map<string, AsuntosRow>
}

export function asuntosVista(rows: AsuntosRow[] | null | undefined): AsuntosVista | null {
  if (!rows || !rows.length) return null
  return { hasta: rows[rows.length - 1].fecha, dias: new Map(rows.map((r) => [r.fecha, r])) }
}

/**
 * Interruptor recordado en el navegador. Apagado por defecto: la mayor parte del curso estorba, y
 * es preferencia de quien mira, no del calendario. Si el almacén no está disponible (ventana
 * privada, datos bloqueados) funciona igual, solo que no se acuerda.
 */
export function useAsuntosVisible(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(ASUNTOS_VIEW_KEY) === '1'
    } catch {
      return false
    }
  })
  const set = (v: boolean) => {
    setOn(v)
    try {
      localStorage.setItem(ASUNTOS_VIEW_KEY, v ? '1' : '0')
    } catch {
      /* sin almacén: se olvida al recargar, y no pasa nada */
    }
  }
  return [on, set]
}

export function AsuntosToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useI18n()
  return (
    <label className="checkbox" style={{ marginTop: 6 }} title={t('asuntos.viewToggleTitle')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {t('asuntos.viewToggle')}
    </label>
  )
}
