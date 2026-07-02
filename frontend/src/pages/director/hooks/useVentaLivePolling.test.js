import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVentaLivePolling } from './useVentaLivePolling'

vi.mock('../../../services/api', () => ({
  getDashboardDirector: vi.fn(),
  getMesas: vi.fn(),
  getTicketDetalle: vi.fn(),
  getTicketsHoy: vi.fn(),
}))

import {
  getDashboardDirector,
  getMesas,
  getTicketsHoy,
} from '../../../services/api'

const DASHBOARD_OK = { ventas_hoy: 1234, top_5_productos_hoy: [] }
const MESAS_OK = [{ id: 'm1', estado: 'libre' }]
const TICKETS_OK = [{ id: 't1' }]

describe('useVentaLivePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    getDashboardDirector.mockResolvedValue({ data: DASHBOARD_OK })
    getMesas.mockResolvedValue({ data: MESAS_OK })
    getTicketsHoy.mockResolvedValue({ data: TICKETS_OK })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('carga los datos al montar', async () => {
    const { result } = renderHook(() => useVentaLivePolling())

    await waitFor(() => expect(result.current.initialLoad).toBe(false))

    expect(result.current.dashboard).toEqual(DASHBOARD_OK)
    expect(result.current.mesas).toEqual(MESAS_OK)
    expect(result.current.ticketsDia).toEqual(TICKETS_OK)
    expect(result.current.error).toBeNull()
  })

  it(
    'un error de red en el polling NO resetea los datos ya cargados ' +
      '(regla explícita del proyecto: no vaciar la pantalla ante un fallo transitorio)',
    async () => {
      const { result } = renderHook(() => useVentaLivePolling())
      await waitFor(() => expect(result.current.initialLoad).toBe(false))

      expect(result.current.dashboard).toEqual(DASHBOARD_OK)

      getDashboardDirector.mockRejectedValue({
        response: { data: { detail: 'Fallo de red simulado' } },
      })

      await act(async () => {
        vi.advanceTimersByTime(30000)
        await Promise.resolve()
        await Promise.resolve()
      })

      await waitFor(() =>
        expect(result.current.error).toBe('Fallo de red simulado')
      )

      // Los datos previamente cargados siguen intactos: NO se resetean a null/[].
      expect(result.current.dashboard).toEqual(DASHBOARD_OK)
      expect(result.current.mesas).toEqual(MESAS_OK)
      expect(result.current.ticketsDia).toEqual(TICKETS_OK)
    }
  )
})
