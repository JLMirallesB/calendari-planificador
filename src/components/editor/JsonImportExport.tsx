import { useMemo, useRef, useState } from 'react'
import type { Calendar } from '../../types'
import { parseCalendar, serializeCalendar } from '../../lib/json'
import { slug } from '../../lib/ics'
import { useI18n } from '../../i18n'
import Section from './Section'

interface Props {
  cal: Calendar
  onImport: (cal: Calendar, opts: { replaceCurrent?: boolean; replaceById?: boolean }) => void
}

/** Contenido del archivo en forma comparable (ignora indentación y saltos). null si no es JSON. */
function normalize(text: string): string | null {
  try {
    return JSON.stringify(JSON.parse(text))
  } catch {
    return null
  }
}

/** Escribe texto en un handle de la File System Access API (el tipado nativo no está en TS DOM). */
async function writeTo(handle: FileSystemFileHandle, text: string): Promise<void> {
  const writable = await (
    handle as unknown as {
      createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }>
    }
  ).createWritable()
  await writable.write(text)
  await writable.close()
}

// La File System Access API (abrir/guardar archivo en su sitio) solo está en Chromium.
const fsaSupported = typeof window !== 'undefined' && 'showOpenFilePicker' in window

export default function JsonImportExport({ cal, onImport }: Props) {
  const { t } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  // Manejador del archivo abierto con la File System Access API (para guardar en su sitio).
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [openedId, setOpenedId] = useState<string | null>(null)
  // Contenido del archivo tal como estaba al abrirlo (o al guardar por última vez), para
  // detectar que ha cambiado por debajo antes de sobrescribirlo.
  const [diskSnapshot, setDiskSnapshot] = useState<string | null>(null)

  // ¿Hay cambios que aún no están en el archivo? Se compara con la huella de lo último escrito,
  // no con la hora: así un cambio y su deshacer no cuentan como pendiente.
  const textoActual = useMemo(() => serializeCalendar(cal), [cal])
  const sinGuardar = !!fileHandle && !!diskSnapshot && normalize(textoActual) !== diskSnapshot

  const download = (data: string, filename: string) => {
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJson = () => {
    download(serializeCalendar(cal), `${slug(cal.name) || 'calendario'}.json`)
  }

  // Exporta con un id aleatorio largo, para publicarlo como calendario NO listado
  // (en calendars-unlisted/): la URL del feed no se puede adivinar.
  const exportUnlisted = () => {
    const rnd =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    download(serializeCalendar({ ...cal, id: `cal_${rnd}` }), `${slug(cal.name) || 'calendario'}-nolistado.json`)
  }

  const onFile = async (file: File, replace: boolean) => {
    try {
      const text = await file.text()
      const imported = parseCalendar(text)
      onImport(imported, { replaceCurrent: replace })
      setMsg(t('jsonio.imported', { name: imported.name }))
    } catch {
      setMsg(t('jsonio.error'))
    }
  }

  // Abre un archivo local y lo carga en el editor, conservando el handle para guardar luego.
  const openFromFile = async () => {
    try {
      const [handle] = await (
        window as unknown as { showOpenFilePicker: (o: unknown) => Promise<FileSystemFileHandle[]> }
      ).showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      })
      const file = await handle.getFile()
      const text = await file.text()
      const imported = parseCalendar(text)
      onImport(imported, { replaceById: true })
      setFileHandle(handle)
      setFileName(file.name)
      setOpenedId(imported.id)
      setDiskSnapshot(normalize(text))
      setMsg(t('jsonio.openedFrom', { name: file.name }))
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') setMsg(t('jsonio.error'))
    }
  }

  // Guarda el calendario actual en el MISMO archivo abierto (sin cambiar nombre/ubicación/id).
  const saveToFile = async () => {
    if (!fileHandle) return
    if (openedId && cal.id !== openedId && !confirm(t('jsonio.saveMismatch'))) return
    // El archivo puede haber cambiado por debajo desde que se abrió (git, otra máquina, otra
    // pestaña). Se relee antes de sobrescribirlo; si no se puede releer, se guarda igualmente.
    try {
      const onDisk = normalize(await (await fileHandle.getFile()).text())
      if (diskSnapshot && onDisk && onDisk !== diskSnapshot && !confirm(t('jsonio.saveChanged')))
        return
    } catch {
      /* no se pudo releer el archivo: seguir con el guardado */
    }
    try {
      const text = textoActual
      await writeTo(fileHandle, text)
      setDiskSnapshot(normalize(text))
      setMsg(t('jsonio.savedTo', { name: fileName || '' }))
    } catch {
      setMsg(t('jsonio.saveError'))
    }
  }

  /**
   * Vincula un archivo y escribe en él SIN leerlo antes. Es la pieza que le faltaba al par
   * abrir/guardar: como «Guardar en el archivo» exige un handle y el único modo de conseguirlo
   * era «Abrir» —que sustituye lo que hay en pantalla por lo del disco—, un calendario que solo
   * vivía en el navegador no tenía manera de llegar a un fichero sin pasar por Exportar.
   */
  const saveAsFile = async () => {
    if (!('showSaveFilePicker' in window)) return
    try {
      const handle = await (
        window as unknown as { showSaveFilePicker: (o: unknown) => Promise<FileSystemFileHandle> }
      ).showSaveFilePicker({
        suggestedName: fileName || `${slug(cal.name) || 'calendario'}.json`,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      })
      const text = textoActual
      await writeTo(handle, text)
      setFileHandle(handle)
      setFileName(handle.name)
      setOpenedId(cal.id)
      setDiskSnapshot(normalize(text))
      setMsg(t('jsonio.savedTo', { name: handle.name }))
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') setMsg(t('jsonio.saveError'))
    }
  }

  return (
    <Section title={t('jsonio.title')} defaultOpen={false} sectionId="json">
      <p className="help">{t('jsonio.help')}</p>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={exportJson}>
          {t('jsonio.exportBtn')}
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          {t('jsonio.importBtn')}
        </button>
        <button className="btn" onClick={exportUnlisted} title={t('jsonio.exportUnlistedTitle')}>
          {t('jsonio.exportUnlistedBtn')}
        </button>
      </div>

      {fsaSupported && (
        <>
          <p className="help" style={{ marginTop: 12, marginBottom: 6 }}>
            {t('jsonio.fileHelp')}
          </p>
          <div className="btn-group" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={openFromFile}>
              📂 {t('jsonio.openFileBtn')}
            </button>
            {/* El resaltado lo lleva siempre la acción que sirve ahora: sin archivo vinculado,
                «Guardar como…»; con archivo, el 💾. Antes el azul estaba fijo en el 💾 aunque
                estuviera deshabilitado, y se pulsaba ahí sin que pasara nada. */}
            <button
              className={`btn ${fileHandle ? 'btn-primary' : ''}`}
              onClick={saveToFile}
              disabled={!fileHandle}
            >
              💾 {t('jsonio.saveFileBtn')}
            </button>
            <button
              className={`btn ${fileHandle ? '' : 'btn-primary'}`}
              onClick={saveAsFile}
              title={t('jsonio.saveAsTitle')}
            >
              💾 {t('jsonio.saveAsBtn')}
            </button>
            {fileName && (
              <span className="inline-note">
                · {fileName}{' '}
                {sinGuardar ? (
                  <strong style={{ color: 'var(--provisional)' }}>{t('jsonio.unsaved')}</strong>
                ) : (
                  <span style={{ color: 'var(--lective)' }}>{t('jsonio.upToDate')}</span>
                )}
              </span>
            )}
          </div>
          {!fileHandle && <p className="inline-note">{t('jsonio.noFileYet')}</p>}
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          const replace = confirm(t('jsonio.importConfirm'))
          onFile(f, replace)
          e.target.value = ''
        }}
      />
      {msg && (
        <p className="inline-note" style={{ marginTop: 10 }}>
          {msg}
        </p>
      )}
    </Section>
  )
}
