import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FacturacionPage from './FacturacionPage'

vi.mock('../../../services/api', () => ({
  getBillingEstado: vi.fn(),
  createBillingCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
}))

import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  getBillingEstado,
} from '../../../services/api'

function renderPage(initialEntries = ['/facturacion']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <FacturacionPage />
    </MemoryRouter>
  )
}

describe('FacturacionPage (Fase 11: Stripe Billing SaaS)', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    delete window.location
    window.location = { ...originalLocation, href: '' }
  })

  it('muestra el plan actual y el estado de la suscripción', async () => {
    getBillingEstado.mockResolvedValue({
      data: {
        tenant_id: 't1',
        plan: 'profesional',
        plan_price_id: 'price_123',
        subscription_status: 'active',
        current_period_end: '2026-08-01T00:00:00Z',
        tiene_cliente_stripe: true,
      },
    })
    renderPage()

    expect(await screen.findByText('Profesional')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
  })

  it('muestra un aviso cuando la suscripción está en past_due', async () => {
    getBillingEstado.mockResolvedValue({
      data: {
        tenant_id: 't1',
        plan: 'basico',
        subscription_status: 'past_due',
        current_period_end: null,
        tiene_cliente_stripe: true,
      },
    })
    renderPage()

    expect(
      await screen.findByText('Hay un pago pendiente en tu suscripción')
    ).toBeInTheDocument()
  })

  it('deshabilita "Gestionar facturación" si el tenant aún no tiene cliente de Stripe', async () => {
    getBillingEstado.mockResolvedValue({
      data: {
        tenant_id: 't1',
        plan: null,
        subscription_status: null,
        current_period_end: null,
        tiene_cliente_stripe: false,
      },
    })
    renderPage()

    const boton = await screen.findByRole('button', {
      name: /gestionar facturación/i,
    })
    expect(boton).toBeDisabled()
  })

  it('al elegir un plan, crea la checkout session y redirige a la URL de Stripe', async () => {
    const user = userEvent.setup()
    getBillingEstado.mockResolvedValue({
      data: {
        tenant_id: 't1',
        plan: 'basico',
        subscription_status: 'active',
        current_period_end: null,
        tiene_cliente_stripe: true,
      },
    })
    createBillingCheckoutSession.mockResolvedValue({
      data: { checkout_url: 'https://checkout.stripe.com/session/abc' },
    })
    renderPage()

    await screen.findByText('Básico')
    const botonesElegir = await screen.findAllByRole('button', {
      name: 'Elegir plan',
    })
    await user.click(botonesElegir[0])

    await waitFor(() =>
      expect(createBillingCheckoutSession).toHaveBeenCalledWith('profesional')
    )
    expect(window.location.href).toBe('https://checkout.stripe.com/session/abc')
  })

  it('al volver de Stripe con checkout=success muestra el feedback correspondiente', async () => {
    getBillingEstado.mockResolvedValue({
      data: {
        tenant_id: 't1',
        plan: 'profesional',
        subscription_status: 'active',
        current_period_end: null,
        tiene_cliente_stripe: true,
      },
    })
    renderPage(['/facturacion?checkout=success'])

    expect(
      await screen.findByText(/pago confirmado/i)
    ).toBeInTheDocument()
  })
})
