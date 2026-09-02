/**
 * Adopción de las claves antiguas de `localStorage` (las que no llevaban prefijo por despliegue).
 *
 * `localStorage` es **por origen**, no por ruta: `usuario.github.io/calendario/` y
 * `usuario.github.io/otra-cosa/` comparten almacén. Desde que la app se publica en dos sitios del
 * mismo usuario, las claves llevan prefijo (ver `storagePrefix` en `lib/site.js`) para que no se
 * pisen. Esto migra lo que ya había guardado a las claves nuevas.
 */

/** Lo mínimo que se necesita de `localStorage`, para poder probarlo sin navegador. */
export interface AlmacenSimple {
  getItem(clave: string): string | null
  setItem(clave: string, valor: string): void
}

/**
 * Copia cada clave antigua a su clave nueva **si la nueva no existe todavía**. Nunca sobrescribe y
 * nunca borra el original: si algo sale mal, los datos siguen donde estaban. Devuelve las claves
 * nuevas que se han rellenado.
 */
export function adoptarClavesAntiguas(
  almacen: AlmacenSimple,
  parejas: { antigua: string; nueva: string }[],
): string[] {
  const adoptadas: string[] = []
  for (const { antigua, nueva } of parejas) {
    if (antigua === nueva) continue
    try {
      if (almacen.getItem(nueva) !== null) continue
      const valor = almacen.getItem(antigua)
      if (valor === null) continue
      almacen.setItem(nueva, valor)
      adoptadas.push(nueva)
    } catch {
      /* almacén lleno o bloqueado: mejor seguir sin datos que romper el arranque */
    }
  }
  return adoptadas
}
