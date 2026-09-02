import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Evita la «pantalla en negro»: si un componente falla al renderizar, muestra el error. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
          <h2>Se ha producido un error al mostrar la aplicación</h2>
          <p className="help">
            Tus datos siguen guardados en este navegador. Copia este mensaje (nos ayuda a arreglarlo) y recarga.
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              overflowX: 'auto',
            }}
          >
            {/* Safari no incluye el mensaje en `stack`, así que se antepone: sin él, un informe
                de error copiado desde Safari llega sin la línea que dice qué ha fallado. */}
            {[
              `${this.state.error?.name || 'Error'}: ${this.state.error?.message || ''}`,
              this.state.error?.stack,
            ]
              .filter(Boolean)
              .join('\n')}
          </pre>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
