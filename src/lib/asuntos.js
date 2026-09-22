// Cálculo de los días en que se puede SOLICITAR un permiso por asuntos particulares.
//
// JS plano (ESM), como `icsCore.js`, porque lo usan tanto la app (vía asuntos.d.ts) como
// `scripts/build-feeds.mjs`, que importa sin transpilar.
//
// QUÉ HACE Y QUÉ NO. Aquí solo se responde a «qué es este día y si el calendario lo bloquea».
// El saldo de días, el plazo de solicitud, el cupo diario y la resolución son de quien gestione
// el permiso, no de este módulo. Un día «pedible» NO es un día concedido.
//
// LAS REGLAS NO ESTÁN ESCRITAS AQUÍ. La norma que las motiva es autonómica y las fiestas que
// abren ventana son municipales, así que todo eso vive en la configuración del calendario
// (`cal.asuntos`) y este módulo solo sabe de ventanas de N días lectivos alrededor de un ancla.
// Cambiar de comunidad o de municipio es cambiar el JSON, no el código.

import { addDays, eachDay, parseISO, weekday } from './dateCore.js'
import { eventDates, isLectiveDay, lectiveSets } from './lectiveCore.js'

/**
 * Orden de prioridad de los motivos: cuando un día cae en varios supuestos, `motivoPrincipal`
 * es el primero de esta lista que se cumpla. `motivos` conserva todos.
 */
export const MOTIVO_ORDER = [
  'no_laborable',
  'sesion_evaluacion',
  'ordinaria_extraordinaria',
  'inicio_curso',
  'fin_curso',
  'navidad',
  'pascua',
  'fiesta_local',
]

/** Hitos que cuentan como «sesión de evaluación» si la configuración no dice otra cosa. */
export const DEFAULT_EVALUACION_KEYS = ['sesionEvaluacion', 'evaluacionExtraordinaria']

/** Tipos de evento cuyo título puede salir al fichero público (lista blanca). */
const DESCRIBIBLES = new Set([
  'vacaciones',
  'festivoAutonomico',
  'festivoLocal',
  'noLaborable',
  'festivoALectivo',
])

// Etiquetas por defecto (castellano). La app puede pasar las suyas traducidas.
const DEFAULT_LABELS = {
  inicioCurso: 'Inicio de curso',
  finCurso: 'Fin de curso',
  guided: {
    sesionEvaluacion: 'Sesión de evaluación',
    evaluacionExtraordinaria: 'Sesión de evaluación extraordinaria',
  },
}

const num = (v, def) => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.floor(v) : def)

/** Rellena la configuración con los valores por defecto, tolerante con JSON escrito a mano. */
export function normalizeAsuntosConfig(cfg) {
  const c = cfg && typeof cfg === 'object' ? cfg : {}
  const keys = Array.isArray(c.evaluacionKeys) && c.evaluacionKeys.length
    ? c.evaluacionKeys.filter((k) => typeof k === 'string')
    : DEFAULT_EVALUACION_KEYS.slice()
  return {
    inicioCurso: num(c.inicioCurso, 7),
    finCurso: num(c.finCurso, 7),
    evaluacionKeys: keys,
    tramoIncluyeAnticipacion: !!c.tramoIncluyeAnticipacion,
    ventanas: (Array.isArray(c.ventanas) ? c.ventanas : [])
      .filter((v) => v && typeof v === 'object')
      .map((v) => ({
        code: typeof v.code === 'string' && v.code ? v.code : 'fiesta_local',
        eventIds: Array.isArray(v.eventIds) ? v.eventIds.filter((id) => typeof id === 'string') : [],
        antes: num(v.antes, 7),
        despues: num(v.despues, 7),
      })),
  }
}

/** Marca un día con un motivo, acumulando (un día puede cumplir varios supuestos). */
function marcar(marcas, iso, code, provisional) {
  let m = marcas.get(iso)
  if (!m) {
    m = { codes: new Set(), provisional: false }
    marcas.set(iso, m)
  }
  m.codes.add(code)
  if (provisional) m.provisional = true
}

/** Primer y último día de un hito guiado (puntual o rango). null si no está relleno. */
function guidedSpan(v) {
  if (!v) return null
  if (v.range && v.range.start && v.range.end) return { start: v.range.start, end: v.range.end }
  if (v.date) return { start: v.date, end: v.date }
  return null
}

/**
 * Días en que se puede solicitar el permiso, uno por día natural del periodo de disfrute.
 *
 * Devuelve `{ rango, rows, reglasIncompletas }`. `rango` es null (y `rows` va vacío) si el
 * calendario no tiene fechas de curso: es preferible no publicar nada a publicar un fichero
 * incompleto que alguien se crea.
 *
 * `reglasIncompletas` lista las reglas que NO se han podido calcular (un ancla que ya no existe,
 * una sesión de evaluación sin fecha). Quien consuma el fichero debe avisar si no viene vacía:
 * un calendario a medio rellenar produce días pedibles de más.
 */
export function computeAsuntos(cal, opts) {
  const options = opts || {}
  const cfg = normalizeAsuntosConfig(options.config || cal.asuntos)
  const labels = options.labels || DEFAULT_LABELS
  const guidedLabels = labels.guided || DEFAULT_LABELS.guided
  const reglasIncompletas = []

  if (!cal.courseStart || !cal.courseEnd) {
    return { rango: null, rows: [], reglasIncompletas: ['curso_sin_fechas'] }
  }

  // Periodo de disfrute: del 1 de septiembre del año en que empieza el curso al 31 de julio del
  // año en que acaba. Agosto queda fuera. NO es el periodo lectivo: los días anteriores al
  // inicio de curso y posteriores a su fin son laborables sin clase, y se pueden pedir.
  const desde = `${cal.courseStart.slice(0, 4)}-09-01`
  const hasta = `${cal.courseEnd.slice(0, 4)}-07-31`
  const rango = { desde, hasta }

  const sets = lectiveSets(cal)
  const rest = cal.restWeekdays || []
  const marcas = new Map()

  // --- Días lectivos del curso, en orden. Las ventanas se cuentan sobre esta lista. ---
  const lectivos = eachDay(cal.courseStart, cal.courseEnd).filter((iso) => isLectiveDay(cal, iso, sets))
  const indiceLectivo = new Map(lectivos.map((iso, i) => [iso, i]))

  // (b) Los N primeros y los N últimos días lectivos del curso. El primero y el último cuentan
  // como 1.º: el literal dice «durante los 7 primeros días lectivos».
  lectivos.slice(0, cfg.inicioCurso).forEach((iso) => marcar(marcas, iso, 'inicio_curso', false))
  lectivos.slice(Math.max(0, lectivos.length - cfg.finCurso)).forEach((iso) => marcar(marcas, iso, 'fin_curso', false))

  // --- (c) y (d) Ventanas alrededor de un ancla (Navidad, Pascua, fiestas locales) ---
  // El día lectivo contiguo al ancla es el 1.º de la ventana, a cada lado.
  const eventoPorId = new Map((cal.events || []).map((ev) => [ev.id, ev]))
  for (const v of cfg.ventanas) {
    for (const id of v.eventIds) {
      const ev = eventoPorId.get(id)
      if (!ev) {
        // El ancla ya no existe: lo más probable es que una re-sincronización con el dataset
        // haya sustituido el evento. Callarse aquí sería el peor fallo posible de todo esto.
        reglasIncompletas.push(`ancla_no_encontrada:${v.code}:${id}`)
        continue
      }
      // El ancla se recorta por los días reconvertidos en lectivos, igual que hace `icsCore.js`
      // con los periodos no lectivos: si el 21 de diciembre se recupera como día de clase, el
      // periodo de Navidad empieza el 22 y el 21 pasa a ser el 1.º de la ventana de antes.
      const fechas = eventDates(ev).filter((d) => !sets.overrides.has(d))
      if (!fechas.length) {
        reglasIncompletas.push(`ancla_sin_fechas:${v.code}:${id}`)
        continue
      }
      const inicio = fechas[0]
      const fin = fechas[fechas.length - 1]
      const prov = !!ev.provisional

      // Dentro del ancla: un día de clase en medio del periodo (un festivo recuperado como
      // lectivo) también se bloquea. Proteger los días de alrededor y dejar libre el centro no
      // tiene sentido, y además la misma fiesta daba resultados opuestos según se tecleara: como
      // un evento de rango el centro quedaba libre, y como festivos sueltos las ventanas se
      // solapaban y lo bloqueaban.
      lectivos
        .filter((iso) => parseISO(iso) > parseISO(inicio) && parseISO(iso) < parseISO(fin))
        .forEach((iso) => marcar(marcas, iso, v.code, prov))

      // Hacia atrás: los `antes` últimos días lectivos anteriores al primer día del ancla.
      const previos = lectivos.filter((iso) => parseISO(iso) < parseISO(inicio))
      previos.slice(Math.max(0, previos.length - v.antes)).forEach((iso) => marcar(marcas, iso, v.code, prov))

      // Hacia delante: los `despues` primeros días lectivos posteriores al último día del ancla.
      const posteriores = lectivos.filter((iso) => parseISO(iso) > parseISO(fin))
      posteriores.slice(0, v.despues).forEach((iso) => marcar(marcas, iso, v.code, prov))
    }
  }

  // --- (e) Sesiones de evaluación ---
  // Se recorren todos los trimestres; las fechas repetidas (la Ordinaria puede ir sincronizada
  // con el 3.er trimestre y compartir sesión) se marcan una sola vez, que para eso es un Set.
  const sesiones = [] // { start, end, provisional, label, termName, type, key }
  for (const term of cal.terms || []) {
    if (!term.guided) continue
    for (const key of cfg.evaluacionKeys) {
      const span = guidedSpan(term.guided[key])
      if (!span) continue
      sesiones.push({
        ...span,
        provisional: !!term.guided[key].provisional,
        label: guidedLabels[key] || key,
        termName: term.name,
        type: term.type,
        key,
      })
    }
  }
  for (const s of sesiones) {
    eachDay(s.start, s.end).forEach((iso) => marcar(marcas, iso, 'sesion_evaluacion', s.provisional))
  }

  // --- (f) Tramo entre la evaluación ordinaria y la extraordinaria de fin de curso ---
  // Ambas incluidas, y con todo lo que haya en medio: fines de semana y laborables sin clase.
  // Ojo: la sesión extraordinaria suele caer DESPUÉS del fin de curso, así que este tramo puede
  // bloquear días que, por sí solos, serían pedibles como no lectivos.
  const tiposInicio = cfg.tramoIncluyeAnticipacion ? ['Ordinaria', 'Anticipacion'] : ['Ordinaria']
  const inicioTramo = sesiones
    .filter((s) => tiposInicio.includes(s.type) && s.key === 'sesionEvaluacion')
    .map((s) => s.start)
    .sort()[0]
  const finTramo = sesiones
    .filter((s) => s.type === 'Extraordinaria' && s.key === 'evaluacionExtraordinaria')
    .map((s) => s.end)
    .sort()
    .pop()
  if (!inicioTramo || !finTramo) {
    reglasIncompletas.push(!inicioTramo ? 'tramo_sin_sesion_ordinaria' : 'tramo_sin_sesion_extraordinaria')
  } else if (parseISO(inicioTramo) <= parseISO(finTramo)) {
    const prov = sesiones.some(
      (s) => (s.start === inicioTramo || s.end === finTramo) && s.provisional,
    )
    eachDay(inicioTramo, finTramo).forEach((iso) => marcar(marcas, iso, 'ordinaria_extraordinaria', prov))
  }

  // --- Descripción: SOLO lo que justifica un bloqueo, y de la lista blanca ---
  // Nada de claustros, reuniones ni actividades internas: este fichero se publica sin contraseña.
  const textos = new Map()
  const anota = (iso, texto, prov) => {
    if (!texto) return
    let t = textos.get(iso)
    if (!t) {
      t = { partes: [], provisional: false }
      textos.set(iso, t)
    }
    if (!t.partes.includes(texto)) t.partes.push(texto)
    if (prov) t.provisional = true
  }
  for (const ev of cal.events || []) {
    if (!DESCRIBIBLES.has(ev.kind)) continue
    const titulo = ev.title || ''
    for (const iso of eventDates(ev)) anota(iso, titulo, !!ev.provisional)
  }
  for (const s of sesiones) {
    for (const iso of eachDay(s.start, s.end)) {
      anota(iso, s.termName ? `${s.label} · ${s.termName}` : s.label, s.provisional)
    }
  }
  anota(cal.courseStart, labels.inicioCurso || DEFAULT_LABELS.inicioCurso, false)
  anota(cal.courseEnd, labels.finCurso || DEFAULT_LABELS.finCurso, false)

  // --- Una fila por día natural ---
  const rows = eachDay(desde, hasta).map((fecha) => {
    const lectivo = isLectiveDay(cal, fecha, sets)
    // Cascada: lectivo → no laborable (descanso semanal, festivo, vacaciones) → laborable sin
    // clase. De aquí sale solo que dentro del curso no haya ningún `no_lectivo`.
    let tipoDia
    if (lectivo) tipoDia = 'lectivo'
    else if (sets.overrides.has(fecha)) tipoDia = 'no_lectivo'
    else if (rest.includes(weekday(fecha)) || sets.nonLective.has(fecha)) tipoDia = 'no_laborable'
    else tipoDia = 'no_lectivo'

    const m = marcas.get(fecha)
    const codes = new Set(m ? m.codes : [])
    if (tipoDia === 'no_laborable') codes.add('no_laborable')
    const motivos = MOTIVO_ORDER.filter((c) => codes.has(c))
    // Un motivo configurado con un código que no esté en el orden conocido no debe perderse.
    for (const c of codes) if (!motivos.includes(c)) motivos.push(c)

    const texto = textos.get(fecha)
    // `provisional` mira las dos direcciones: una fecha provisional que bloquea el día y una que
    // lo deja pedible (unas vacaciones sin confirmar que, al confirmarse, lo bloquearían).
    const provisional = !!((m && m.provisional) || (texto && texto.provisional))

    return {
      fecha,
      tipoDia,
      pedible: motivos.length === 0,
      motivoPrincipal: motivos[0] || '',
      motivos,
      provisional,
      descripcion: texto ? texto.partes.join(' · ') : '',
    }
  })

  return { rango, rows, reglasIncompletas }
}

// ---- Serialización ----

const COLUMNAS = ['fecha', 'tipo_dia', 'pedible', 'motivo_no_pedible', 'motivos', 'provisional', 'descripcion']

/** Escapa un campo según RFC 4180: comillas dobles, y dobladas dentro. */
function campo(v) {
  const s = v == null ? '' : String(v)
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * CSV del cálculo: UTF-8 con BOM, CRLF y separador `;`, que es lo que espera un Excel en
 * español tanto al abrirlo a mano como desde Power Query. El BOM es justo lo que evita que los
 * acentos lleguen rotos al pegarlo.
 */
export function buildAsuntosCSV(rows) {
  const lineas = [COLUMNAS.join(';')]
  for (const r of rows) {
    lineas.push(
      [
        campo(r.fecha),
        campo(r.tipoDia),
        r.pedible ? '1' : '0',
        campo(r.pedible ? '' : r.motivoPrincipal),
        campo(r.pedible ? '' : r.motivos.join('|')),
        r.provisional ? '1' : '0',
        campo(r.descripcion),
      ].join(';'),
    )
  }
  return '﻿' + lineas.join('\r\n') + '\r\n'
}

/**
 * Fichero hermano con lo que el consumidor necesita para saber si va con datos viejos.
 *
 * `updatedAt` es la fecha del calendario y solo se mueve cuando alguien lo edita: ese es el que
 * hay que comparar. `generatedAt` cambia en cada despliegue aunque no haya cambiado nada.
 * No lleva el nombre del calendario: el fichero se publica y el nombre puede ser el del centro.
 */
export function buildAsuntosMeta(cal, resultado, generatedAt) {
  return {
    calendarId: cal.id,
    curso: { courseStart: cal.courseStart, courseEnd: cal.courseEnd },
    rango: resultado.rango,
    columnas: COLUMNAS,
    motivos: MOTIVO_ORDER,
    updatedAt: cal.updatedAt || null,
    generatedAt: generatedAt || new Date().toISOString(),
    reglasIncompletas: resultado.reglasIncompletas,
  }
}
