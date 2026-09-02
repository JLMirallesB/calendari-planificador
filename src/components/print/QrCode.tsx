import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/**
 * QR como SVG vectorial: se imprime nítido a cualquier tamaño, a diferencia de un PNG.
 *
 * Los colores van fijos en blanco y negro a propósito. Un QR necesita contraste alto para que
 * lo lea una cámara, así que no debe seguir el tema claro/oscuro de la app ni las variables de
 * color: en modo oscuro quedaría invertido y muchos lectores fallan.
 */
export default function QrCode({
  value,
  size = 104,
  className,
}: {
  value: string
  size?: number
  className?: string
}) {
  const { path, total } = useMemo(() => {
    const qr = qrcode(0, 'M') // 0 = versión automática según la longitud
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    const margen = 2 // «zona de silencio»: sin ella muchos lectores no enganchan el código
    const d: string[] = []
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d.push(`M${c + margen} ${r + margen}h1v1h-1z`)
      }
    }
    return { path: d.join(''), total: n + margen * 2 }
  }, [value])

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={value}
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  )
}
