import { useRef, type InputHTMLAttributes } from 'react'

/**
 * Campo de fecha que abre el calendario nativo al pulsar en cualquier punto del campo.
 *
 * Por defecto, Chrome y Edge solo lo abren desde el iconito de la derecha; Safari lo abre al
 * tocar el campo entero. El resultado era que en Chrome parecía que no hubiera calendario y
 * había que teclear la fecha a mano.
 *
 * `showPicker()` exige un gesto del usuario y no existe en todos los navegadores, así que va
 * dentro de un try/catch: si falla, queda exactamente el comportamiento nativo de siempre.
 */
export default function DateInput({
  onClick,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <input
      {...props}
      ref={ref}
      type="date"
      onClick={(e) => {
        onClick?.(e)
        const el = ref.current
        if (!el || el.disabled || el.readOnly) return
        try {
          el.showPicker?.()
        } catch {
          /* el navegador lo ha rechazado: sigue funcionando como siempre */
        }
      }}
    />
  )
}
