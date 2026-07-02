import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import PrivateRoute from './PrivateRoute'

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: useAuthMock,
}))

function renderWithRoute({ allowedRoles, initialEntry = '/protegido' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Página de login</div>} />
        <Route path="/mesas" element={<div>Página de mesas</div>} />
        <Route
          path="/protegido"
          element={
            <PrivateRoute allowedRoles={allowedRoles}>
              <div>Contenido protegido</div>
            </PrivateRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('PrivateRoute', () => {
  it('muestra el loader mientras isLoading es true', () => {
    useAuthMock.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
    })
    renderWithRoute()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('redirige a /login si el usuario no está autenticado', () => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    })
    renderWithRoute()
    expect(screen.getByText('Página de login')).toBeInTheDocument()
  })

  it('renderiza el contenido si no hay restricción de rol', () => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { rol: 'camarero' },
    })
    renderWithRoute()
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('redirige a /mesas si el rol del usuario no está en allowedRoles', () => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { rol: 'cocina' },
    })
    renderWithRoute({ allowedRoles: ['admin', 'director'] })
    expect(screen.getByText('Página de mesas')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('renderiza el contenido si el rol del usuario está en allowedRoles', () => {
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { rol: 'director' },
    })
    renderWithRoute({ allowedRoles: ['admin', 'director'] })
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })
})
