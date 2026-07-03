import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const { useAuthMock, useThemeMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useThemeMock: vi.fn(),
}))

vi.mock('../context/AuthContext', () => ({ useAuth: useAuthMock }))
vi.mock('../context/ThemeContext', () => ({ useTheme: useThemeMock }))

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  let loginMock

  beforeEach(() => {
    loginMock = vi.fn()
    navigateMock.mockClear()
    useAuthMock.mockReturnValue({
      login: loginMock,
      isAuthenticated: false,
      isLoading: false,
    })
    useThemeMock.mockReturnValue({ isDark: true, toggleTheme: vi.fn() })
  })

  it('muestra errores de validación de zod sin llamar a login si los campos están vacíos', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Introduce tu email')).toBeInTheDocument()
    expect(screen.getByText('Introduce tu contraseña')).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('muestra un error de formato si el email no es válido', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'no-es-un-email')
    await user.type(screen.getByLabelText('Contraseña'), 'algo')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByText('Introduce un email válido')
    ).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('llama a login con los datos del formulario cuando la validación pasa', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValue(undefined)
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'admin@prueba.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Admin1234!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith('admin@prueba.com', 'Admin1234!')
    )
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/mesas', { replace: true })
    )
  })

  it('muestra el error de la API sin romper el formulario si login falla', async () => {
    const user = userEvent.setup()
    loginMock.mockRejectedValue({
      response: { data: { detail: 'Credenciales incorrectas' } },
    })
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'admin@prueba.com')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByText('Credenciales incorrectas')
    ).toBeInTheDocument()
  })
})
