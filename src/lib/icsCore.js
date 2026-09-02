// Núcleo de generación ICS y expansión de "ocurrencias" (fechas concretas del
// calendario). Escrito en JavaScript plano (ESM) para poder reutilizarse tanto en la
// app (vía icsCore.d.ts) como en scripts/build-feeds.mjs (Node), sin duplicar lógica.

// ---- Helpers de fecha (locales, sin desfase por zona horaria) ----

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function addDays(iso, days) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}
/** Formato de fecha ICS all-day: YYYYMMDD. */
function icsDate(iso) {
  return iso.replace(/-/g, '')
}
/** «HH:MM» → «HHMMSS» para un DTSTART/DTEND con hora. */
function icsTime(hhmm) {
  return hhmm.replace(':', '') + '00'
}

/**
 * Definición de la zona Europe/Madrid (CET/CEST), con las reglas de cambio de hora de la UE.
 * Se incluye en el ICS solo cuando hay eventos con hora, para que las apps los sitúen en la hora
 * local correcta en vez de interpretarlos como hora flotante.
 */
const VTIMEZONE_MADRID = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Madrid',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

// ---- Etiquetas de hitos del modo guiado (debe reflejar lib/guided.ts) ----

// Etiquetas por defecto (castellano). La app puede pasar `labels` traducidas.
const GUIDED_LABELS = {
  pruebaEvaluacionTeorica: 'Prueba de evaluación teórica',
  semanaRevisionCalificaciones: 'Semana de revisión de calificaciones',
  sesionEvaluacion: 'Sesión de evaluación',
  itacaNotasInicio: 'Inicio de notas en ITACA',
  itacaNotasFinDocentes: 'Fin de introducción de notas por docentes',
  itacaNotasFinRectificacion: 'Fin de rectificación de notas por Equipo Directivo',
  webFamiliaVisibilidad: 'Visibilidad de notas en WebFamília',
  impresionActas: 'Impresión de actas',
  firmaActas: 'Firma de actas',
  plazoReclamacion: 'Plazo de reclamación de notas',
  anticipacionSolicitudInicio: 'Inicio de solicitud de anticipación',
  anticipacionSolicitudFin: 'Fin de solicitud de anticipación',
  anticipacionListadoProvisional: 'Listado provisional de anticipación',
  anticipacionListadoDefinitivo: 'Listado definitivo de anticipación',
  examenesExtraordinaria: 'Exámenes (Extraordinaria)',
  revisionExtraordinaria: 'Revisión (Extraordinaria)',
  evaluacionExtraordinaria: 'Evaluación (Extraordinaria)',
}

// Emoji al inicio del título del evento en el ICS (para reconocerlo de un vistazo en la
// app de calendario suscrita). Por tipo de ocurrencia.
export const KIND_EMOJI = {
  vacaciones: '🏖️',
  festivoAutonomico: '🎉',
  festivoLocal: '🎉',
  noLaborable: '🚫',
  festivoALectivo: '📚',
  claustro: '🏛️',
  cocope: '🏛️',
  consejoEscolar: '🏛️',
  pruebaAcceso: '📝',
  otro: '📌',
  guided: '📋',
  termStart: '🚩',
}

// Emoji específico por hito del modo guiado (si falta, se usa 📋).
export const GUIDED_EMOJI = {
  pruebaEvaluacionTeorica: '📝',
  semanaRevisionCalificaciones: '🔍',
  sesionEvaluacion: '🧑‍🏫',
  itacaNotasInicio: '✏️',
  itacaNotasFinDocentes: '✅',
  itacaNotasFinRectificacion: '✒️',
  webFamiliaVisibilidad: '📢',
  impresionActas: '🖨️',
  firmaActas: '✍️',
  plazoReclamacion: '⚖️',
  anticipacionSolicitudInicio: '📨',
  anticipacionSolicitudFin: '📩',
  anticipacionListadoProvisional: '📃',
  anticipacionListadoDefinitivo: '📄',
  examenesExtraordinaria: '📝',
  revisionExtraordinaria: '🔍',
  evaluacionExtraordinaria: '🧑‍🏫',
}

const KIND_TITLES = {
  vacaciones: 'Vacaciones',
  festivoAutonomico: 'Festivo autonómico',
  festivoLocal: 'Festivo local',
  festivoALectivo: 'Día lectivo (festivo recuperado)',
  noLaborable: 'No laborable',
  claustro: 'Claustro',
  cocope: 'COCOPE',
  consejoEscolar: 'Consejo escolar',
  pruebaAcceso: 'Prueba de acceso',
  otro: 'Evento',
}

const DEFAULT_LABELS = { kind: KIND_TITLES, guided: GUIDED_LABELS, startPrefix: 'Inicio' }


/**
 * Expande un calendario a una lista de ocurrencias con fecha concreta, filtradas por
 * perfil (`profileId` null = todos los perfiles).
 * Cada ocurrencia: { startISO, endISO, title, provisional, kind, allDay }.
 * `endISO` es inclusivo (último día del evento).
 */
/**
 * Trozo de UID seguro para un ICS (sin espacios, acentos ni separadores propios del formato).
 */
function safeKey(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Clave estable de una ocurrencia, base del UID del evento en el ICS.
 *
 * Para una app de calendario el UID ES la identidad del evento: si cambia, el evento se borra y
 * se crea otro; y si dos eventos distintos comparten UID en momentos distintos, el segundo pisa
 * al primero (con los recordatorios que el suscriptor le hubiera puesto). Antes se usaba la
 * POSICIÓN en la lista, así que insertar una fecha por el medio desplazaba la identidad de todas
 * las siguientes. Se usa el id del evento o del trimestre, que no cambia al reordenar.
 *
 * `fallback` cubre los JSON escritos a mano que llegan a `scripts/build-feeds.mjs` sin pasar por
 * `coerceCalendar` y pueden no tener ids: se deriva del contenido, que al menos no depende del
 * orden (si el contenido cambia es que es otro evento, y recrearlo es lo correcto).
 */
function occurrenceKey(id, fallback) {
  return safeKey(id || fallback)
}

export function expandOccurrences(calendar, profileId, labels) {
  const L = labels || DEFAULT_LABELS
  const kindTitles = L.kind || KIND_TITLES
  const guidedLabels = L.guided || GUIDED_LABELS
  const startPrefix = L.startPrefix || 'Inicio'
  const out = []
  const visible = (profiles) => !profileId || !profiles || profiles.length === 0 || profiles.includes(profileId)

  // Días reconvertidos en lectivos (festivo→lectivo): se recortarán de los periodos no lectivos.
  const overrides = new Set()
  for (const ev of calendar.events || []) {
    if (ev.kind !== 'festivoALectivo') continue
    if (ev.date) overrides.add(ev.date)
    else if (ev.range && ev.range.start && ev.range.end) {
      let d = ev.range.start
      for (let i = 0; i < 400 && d <= ev.range.end; i++) {
        overrides.add(d)
        d = addDays(d, 1)
      }
    }
  }
  const NONLECTIVE = new Set(['vacaciones', 'festivoAutonomico', 'festivoLocal', 'noLaborable'])

  // 1) Eventos (puntuales o de rango)
  for (const ev of calendar.events || []) {
    if (!visible(ev.profiles)) continue
    let startISO = null
    let endISO = null
    if (ev.date) {
      startISO = ev.date
      endISO = ev.date
    } else if (ev.range && ev.range.start && ev.range.end) {
      startISO = ev.range.start
      endISO = ev.range.end
    }
    if (!startISO) continue
    // Un periodo no lectivo no incluye días reconvertidos en lectivos: recorta los extremos.
    if (NONLECTIVE.has(ev.kind) && overrides.size) {
      while (startISO <= endISO && overrides.has(startISO)) startISO = addDays(startISO, 1)
      while (startISO <= endISO && overrides.has(endISO)) endISO = addDays(endISO, -1)
      if (startISO > endISO) continue // todo el periodo quedó reconvertido en lectivo
    }
    // Horas: solo en eventos de un día (no rangos). `startTime` presente ⇒ evento con hora.
    const timed = !!ev.date && !!ev.startTime
    out.push({
      startISO,
      endISO,
      title: ev.title || kindTitles[ev.kind] || 'Evento',
      provisional: !!ev.provisional,
      kind: ev.kind,
      allDay: !timed,
      ...(timed ? { startTime: ev.startTime, endTime: ev.endTime || ev.startTime } : {}),
      key: occurrenceKey(ev.id, `${ev.kind}-${startISO}-${ev.title || ''}`),
    })
  }

  // 2) Inicios de trimestre e hitos del modo guiado (visibles para todos los perfiles)
  for (const term of calendar.terms || []) {
    if (term.startDate) {
      out.push({
        startISO: term.startDate,
        endISO: term.startDate,
        title: `${startPrefix}: ${term.name}`,
        provisional: false,
        kind: 'termStart',
        allDay: true,
        key: occurrenceKey(term.id && `${term.id}-start`, `termStart-${term.type}-${term.startDate}`),
      })
    }
    if (term.guidedEnabled && term.guided) {
      for (const key of Object.keys(GUIDED_LABELS)) {
        const value = term.guided[key]
        if (!value) continue
        if (!visible(value.profiles)) continue // hito visible solo para ciertos perfiles
        const label = guidedLabels[key] || GUIDED_LABELS[key]
        if (value.range) {
          if (value.range.start && value.range.end) {
            out.push({
              startISO: value.range.start,
              endISO: value.range.end,
              title: `${label} · ${term.name}`,
              provisional: !!value.provisional,
              kind: 'guided',
              guidedKey: key,
              allDay: true,
              key: occurrenceKey(term.id && `${term.id}-${key}`, `guided-${term.type}-${key}`),
            })
          }
        } else if (value.date) {
          out.push({
            startISO: value.date,
            endISO: value.date,
            title: `${label} · ${term.name}`,
            provisional: !!value.provisional,
            kind: 'guided',
            guidedKey: key,
            allDay: true,
            key: occurrenceKey(term.id && `${term.id}-${key}`, `guided-${term.type}-${key}`),
          })
        }
      }
    }
  }

  out.sort((a, b) => (a.startISO < b.startISO ? -1 : a.startISO > b.startISO ? 1 : 0))
  return out
}

// ---- Escapado y plegado de líneas ICS (RFC 5545) ----

function escapeText(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function foldLine(line) {
  // Máximo 75 octetos por línea; continuación con espacio inicial.
  if (line.length <= 75) return line
  const parts = []
  let rest = line
  parts.push(rest.slice(0, 75))
  rest = rest.slice(75)
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74))
    rest = rest.slice(74)
  }
  if (rest.length) parts.push(' ' + rest)
  return parts.join('\r\n')
}

/**
 * Construye un documento ICS (VCALENDAR) para un calendario y perfil.
 * `profileId` null = todos los perfiles. `opts.calName` nombre visible del calendario.
 * `opts.dtstamp` marca temporal ICS (por defecto derivada de updatedAt).
 */
export function buildICS(calendar, profileId, opts = {}) {
  const occ = expandOccurrences(calendar, profileId, opts.labels)
  const calName = opts.calName || calendar.name || 'Calendario'
  const dtstamp = opts.dtstamp || toDtstamp(calendar.updatedAt)
  const lines = []
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//jlmirall.es//Calendari//ES')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push('X-WR-CALNAME:' + escapeText(calName))
  lines.push('X-WR-TIMEZONE:Europe/Madrid')

  // Solo si hay algún evento con hora se incluye la definición de la zona horaria, para que las
  // apps interpreten esas horas en Europe/Madrid (con su cambio de hora) y no floten.
  if (occ.some((o) => o.startTime)) lines.push(...VTIMEZONE_MADRID)

  occ.forEach((o, i) => {
    // Sin clave (JSON antiguo sin ids y sin contenido utilizable) se cae al índice, como antes.
    const uid = `${calendar.id || 'cal'}-${profileId || 'all'}-${o.key || i}@calendari`
    const em = o.kind === 'guided' ? GUIDED_EMOJI[o.guidedKey] || '📋' : KIND_EMOJI[o.kind]
    const emoji = em ? em + ' ' : ''
    const summary = emoji + (o.provisional ? '(Provisional) ' : '') + o.title
    lines.push('BEGIN:VEVENT')
    lines.push('UID:' + uid)
    lines.push('DTSTAMP:' + dtstamp)
    if (o.startTime) {
      // Evento con hora, en la zona Europe/Madrid.
      lines.push('DTSTART;TZID=Europe/Madrid:' + icsDate(o.startISO) + 'T' + icsTime(o.startTime))
      lines.push('DTEND;TZID=Europe/Madrid:' + icsDate(o.startISO) + 'T' + icsTime(o.endTime))
    } else {
      lines.push('DTSTART;VALUE=DATE:' + icsDate(o.startISO))
      // DTEND en all-day es exclusivo: día siguiente al último día del evento.
      lines.push('DTEND;VALUE=DATE:' + icsDate(addDays(o.endISO, 1)))
    }
    lines.push(foldLine('SUMMARY:' + escapeText(summary)))
    if (o.provisional) lines.push('STATUS:TENTATIVE')
    lines.push('TRANSP:TRANSPARENT')
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

function toDtstamp(updatedAt) {
  // Convierte un ISO datetime a formato ICS UTC básico. Si falta, usa una fija estable.
  if (updatedAt && /^\d{4}-\d{2}-\d{2}T/.test(updatedAt)) {
    return updatedAt.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z?$/, 'Z').slice(0, 16)
  }
  return '20000101T000000Z'
}
