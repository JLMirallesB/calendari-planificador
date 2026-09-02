import changelogRaw from '../../../CHANGELOG.md?raw'

// Render mínimo de Markdown (encabezados, listas, negrita y enlaces) suficiente para el
// changelog, sin dependencias externas. El contenido es de confianza (fichero del repo).

function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function toHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inList = false
  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }
  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      closeList()
      out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`)
    } else if (/^##\s+/.test(line)) {
      closeList()
      out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`)
    } else if (/^#\s+/.test(line)) {
      closeList()
      out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`)
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`)
    } else if (line.trim() === '') {
      closeList()
    } else {
      closeList()
      out.push(`<p>${inline(line)}</p>`)
    }
  }
  closeList()
  return out.join('\n')
}

export default function ChangelogView() {
  return (
    <div className="card">
      <div
        className="changelog-body"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: toHtml(changelogRaw) }}
      />
    </div>
  )
}
