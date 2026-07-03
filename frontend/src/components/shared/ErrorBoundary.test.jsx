import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function Boom() {
  throw new Error('Fallo forzado de render')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React (y jsdom) vuelcan el error de render por consola; lo silenciamos
    // para no ensuciar la salida del test — el error se sigue propagando y
    // capturando por el boundary normalmente.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza los hijos normalmente cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <div>Contenido normal</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Contenido normal')).toBeInTheDocument()
  })

  it('muestra la pantalla de fallback en vez de una pantalla en blanco ante un error de render', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText('Algo ha ido mal')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /recargar página/i })
    ).toBeInTheDocument()
  })
})
