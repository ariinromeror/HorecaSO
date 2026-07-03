import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../services/api', () => ({
  login: vi.fn(),
  getPerfil: vi.fn(),
  default: { post: vi.fn() },
}))

import api, { getPerfil, login as apiLogin } from '../services/api'

function Probe() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.nombre ?? 'sin-usuario'}</span>
      <button onClick={() => login('admin@test.com', 'secreta')}>
        entrar
      </button>
      <button onClick={logout}>salir</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('arranca sin sesión cuando localStorage está vacío', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    )
    expect(screen.getByTestId('auth')).toHaveTextContent('false')
  })

  it('recupera la sesión guardada en localStorage al montar', async () => {
    localStorage.setItem('horecaso_token', 'token-guardado')
    localStorage.setItem(
      'horecaso_user',
      JSON.stringify({ id: '1', nombre: 'Ana', rol: 'admin' })
    )

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('auth')).toHaveTextContent('true')
    )
    expect(screen.getByTestId('user')).toHaveTextContent('Ana')
  })

  it('un login exitoso persiste el token y actualiza isAuthenticated', async () => {
    const user = userEvent.setup()
    apiLogin.mockResolvedValue({ data: { access_token: 'nuevo-token' } })
    getPerfil.mockResolvedValue({
      data: { id: '2', nombre: 'Bruno', rol: 'camarero' },
    })
    api.post.mockResolvedValue({ data: {} })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    )

    await act(async () => {
      await user.click(screen.getByText('entrar'))
    })

    expect(apiLogin).toHaveBeenCalledWith('admin@test.com', 'secreta')
    expect(localStorage.getItem('horecaso_token')).toBe('nuevo-token')
    expect(JSON.parse(localStorage.getItem('horecaso_user')).nombre).toBe(
      'Bruno'
    )
    expect(screen.getByTestId('auth')).toHaveTextContent('true')
  })

  it('logout limpia localStorage y el estado de sesión', async () => {
    localStorage.setItem('horecaso_token', 'token-guardado')
    localStorage.setItem(
      'horecaso_user',
      JSON.stringify({ id: '1', nombre: 'Ana', rol: 'admin' })
    )
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )
    await waitFor(() =>
      expect(screen.getByTestId('auth')).toHaveTextContent('true')
    )

    await user.click(screen.getByText('salir'))

    expect(localStorage.getItem('horecaso_token')).toBeNull()
    expect(localStorage.getItem('horecaso_user')).toBeNull()
    expect(screen.getByTestId('auth')).toHaveTextContent('false')
  })
})
