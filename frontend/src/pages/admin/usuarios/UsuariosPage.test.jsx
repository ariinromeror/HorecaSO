import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UsuariosPage from './UsuariosPage'

vi.mock('../../../services/api', () => ({
  getAdminUsuarios: vi.fn(),
  createAdminUsuario: vi.fn(),
  patchAdminUsuario: vi.fn(),
  getMesas: vi.fn(),
}))

import {
  createAdminUsuario,
  getAdminUsuarios,
  getMesas,
  patchAdminUsuario,
} from '../../../services/api'

const USUARIO_FILA = {
  id: 'u1',
  nombre: 'Ana Camarera',
  email: 'ana@restaurante.com',
  rol: 'camarero',
  outlet_id: null,
  activo: true,
}

describe('UsuariosPage — modal de alta (Fase 9: react-hook-form + zod)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminUsuarios.mockResolvedValue({ data: { items: [] } })
    getMesas.mockResolvedValue({ data: [] })
  })

  it('muestra errores de validación y no llama a la API si el formulario es inválido', async () => {
    const user = userEvent.setup()
    render(<UsuariosPage />)

    await user.click(
      await screen.findByRole('button', { name: /nuevo usuario/i })
    )

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Crear' }))

    expect(
      await within(dialog).findByText('El nombre es obligatorio')
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('El email es obligatorio')
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        'La contraseña debe tener al menos 8 caracteres'
      )
    ).toBeInTheDocument()
    expect(createAdminUsuario).not.toHaveBeenCalled()
  })

  it('crea el usuario cuando el formulario es válido', async () => {
    const user = userEvent.setup()
    createAdminUsuario.mockResolvedValue({ data: { id: 'u1' } })
    render(<UsuariosPage />)

    await user.click(
      await screen.findByRole('button', { name: /nuevo usuario/i })
    )
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText('Nombre'), 'Ana Camarera')
    await user.type(
      within(dialog).getByLabelText('Email'),
      'ana@restaurante.com'
    )
    await user.type(
      within(dialog).getByLabelText('Contraseña (mín. 8 caracteres)'),
      'password123'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Crear' }))

    await waitFor(() =>
      expect(createAdminUsuario).toHaveBeenCalledWith({
        nombre: 'Ana Camarera',
        email: 'ana@restaurante.com',
        password: 'password123',
        rol: 'camarero',
        outlet_id: null,
      })
    )
  })
})

describe('UsuariosPage — modal de edición (toggle "activo" con react-hook-form Controller)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminUsuarios.mockResolvedValue({ data: { items: [USUARIO_FILA] } })
    getMesas.mockResolvedValue({ data: [] })
  })

  it('el switch "Usuario activo" parte de true y al pulsarlo se envía false al guardar', async () => {
    const user = userEvent.setup()
    patchAdminUsuario.mockResolvedValue({ data: {} })
    render(<UsuariosPage />)

    await user.click(await screen.findByText('Ana Camarera'))
    const dialog = screen.getByRole('dialog')

    const toggle = within(dialog).getByRole('switch', {
      name: /usuario activo/i,
    })
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(patchAdminUsuario).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ activo: false })
      )
    )
  })
})
