import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Error boundary global (Fase 8 del PRD de hardening). Envuelve el árbol de
 * rutas en App.jsx: un error de render en cualquier página muestra esta
 * pantalla de fallback en vez de dejar la app completamente en blanco.
 *
 * Los error boundaries de React solo pueden implementarse como clase
 * (no existe un hook equivalente a getDerivedStateFromError/componentDidCatch).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary capturó un error de render:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6f9] p-6 text-center dark:bg-[#0f1117]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle size={32} strokeWidth={1.5} className="text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Algo ha ido mal
        </h1>
        <p className="max-w-md text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Ha ocurrido un error inesperado al mostrar esta pantalla. Puedes intentar
          recargar la página; si el problema persiste, contacta con soporte.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="flex h-12 items-center gap-2 rounded-lg bg-amber-500 px-6 font-semibold text-black transition-colors hover:bg-amber-600"
        >
          <RefreshCw size={18} strokeWidth={1.5} />
          Recargar página
        </button>
      </div>
    )
  }
}
