// Ayudantes de fecha en JS plano (ESM), isomórficos: los usan la app (vía dateCore.d.ts y
// los re-exports de dateUtils.ts), `src/lib/icsCore.js` y los scripts Node de `scripts/`.
//
// Viven aquí, y no en dateUtils.ts, porque `scripts/build-feeds.mjs` importa sin transpilar:
// todo lo que necesite un script de Node tiene que ser JavaScript plano. Antes estaban
// duplicados en icsCore.js, con el riesgo de que las dos copias divergieran.
//
// Todas las fechas son cadenas ISO `YYYY-MM-DD` y los objetos Date se construyen en horario
// LOCAL, nunca UTC: en España, `new Date('2026-09-08')` cae en el día anterior a medianoche.

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso, days) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** getDay(): 0=domingo … 6=sábado. */
export function weekday(iso) {
  return parseISO(iso).getDay()
}

/** Devuelve todas las fechas (inclusive) entre start y end. */
export function eachDay(start, end) {
  const out = []
  if (parseISO(start) > parseISO(end)) return out
  let cur = start
  // Límite de seguridad para evitar bucles infinitos por datos corruptos.
  for (let i = 0; i < 5000 && parseISO(cur) <= parseISO(end); i++) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}
