import { useCallback } from 'react'
import {
  addLinea as apiAddLinea,
  addTicketPago,
  cobrarTicket,
  deleteLinea as apiDeleteLinea,
  deleteTicketPago,
  getTicket,
  patchMesaEstado,
} from '../../../services/api'
import { splitImporteEnNPartes } from '../../../utils/pagos'

export function useTpvTicketHandlers({
  mesaId,
  ticket,
  setTicket,
  setError,
  navigate,
  metodoPago,
  setCobrarLoading,
  setActionLoading,
  setBorradorPartesPagos,
  setLiberarMesaLoading,
  setTpvReloadKey,
  importePago,
  metodoPagoDivision,
  setLoadingPago,
  setDivisionError,
  setImportePago,
  setModoDivision,
  loadPagosDivision,
  numPartesInput,
  pendienteDivision,
  borradorPartesPagos,
}) {
  const handleLiberarMesa = useCallback(async () => {
    if (!mesaId) return
    if (
      !window.confirm(
        '¿Marcar esta mesa como libre? Solo si no hubo pedido o fue un error.'
      )
    ) {
      return
    }
    setLiberarMesaLoading(true)
    try {
      await patchMesaEstado(mesaId, { estado: 'libre' })
      setError('')
      setTpvReloadKey((k) => k + 1)
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          e.message ||
          'No se pudo liberar la mesa'
      )
    } finally {
      setLiberarMesaLoading(false)
    }
  }, [mesaId, setError, setLiberarMesaLoading, setTpvReloadKey])

  const handleAddLinea = useCallback(
    async (productoId) => {
      if (!ticket?.id) return
      setActionLoading((p) => ({ ...p, [productoId]: true }))
      try {
        await apiAddLinea(ticket.id, productoId, 1)
        const t = await getTicket(ticket.id)
        setTicket(t.data)
      } catch (e) {
        setError(e.response?.data?.detail || 'Error al añadir línea')
      } finally {
        setActionLoading((p) => ({ ...p, [productoId]: false }))
      }
    },
    [ticket?.id, setActionLoading, setError, setTicket]
  )

  const handleRestarUnidadGrupo = useCallback(
    async (productoId) => {
      if (!ticket?.id) return
      const pid = String(productoId)
      const groupLines = (ticket.lineas || [])
        .filter((l) => String(l.producto_id) === pid)
        .sort((a, b) => String(b.id).localeCompare(String(a.id)))
      if (!groupLines.length) return
      const ln = groupLines[0]
      const q = Number(ln.cantidad) || 0
      setActionLoading((p) => ({ ...p, [`grp-${pid}`]: true }))
      try {
        await apiDeleteLinea(ticket.id, ln.id)
        if (q > 1) {
          await apiAddLinea(ticket.id, productoId, q - 1)
        }
        const t = await getTicket(ticket.id)
        setTicket(t.data)
        setBorradorPartesPagos(null)
      } catch (e) {
        setError(e.response?.data?.detail || 'Error al quitar unidad')
      } finally {
        setActionLoading((p) => ({ ...p, [`grp-${pid}`]: false }))
      }
    },
    [ticket, setActionLoading, setBorradorPartesPagos, setError, setTicket]
  )

  const handleCobrar = useCallback(async () => {
    if (!ticket?.id || !(ticket.lineas || []).length) return
    setCobrarLoading(true)
    try {
      await cobrarTicket(ticket.id, metodoPago)
      navigate('/mesas')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cobrar')
    } finally {
      setCobrarLoading(false)
    }
  }, [ticket, metodoPago, navigate, setCobrarLoading, setError])

  const iniciarDivision = useCallback(async () => {
    setModoDivision(true)
    setImportePago('')
    setDivisionError('')
    setBorradorPartesPagos(null)
    await loadPagosDivision()
  }, [
    loadPagosDivision,
    setBorradorPartesPagos,
    setDivisionError,
    setImportePago,
    setModoDivision,
  ])

  const handleAnadirPagoDivision = useCallback(async () => {
    if (!ticket?.id) return
    const raw = String(importePago).replace(',', '.').trim()
    const imp = parseFloat(raw)
    if (Number.isNaN(imp) || imp < 0.01) {
      setDivisionError('Indica un importe válido (mín. 0,01 €)')
      return
    }
    setLoadingPago(true)
    setDivisionError('')
    try {
      const r = await addTicketPago(ticket.id, {
        importe: imp,
        metodo_pago: metodoPagoDivision,
      })
      await loadPagosDivision()
      setImportePago('')
      setBorradorPartesPagos(null)
      if (r.data?.completado) {
        navigate('/mesas')
        return
      }
    } catch (e) {
      setDivisionError(
        e.response?.data?.detail || 'Error al registrar el pago'
      )
    } finally {
      setLoadingPago(false)
    }
  }, [
    ticket?.id,
    importePago,
    metodoPagoDivision,
    loadPagosDivision,
    navigate,
    setBorradorPartesPagos,
    setDivisionError,
    setImportePago,
    setLoadingPago,
  ])

  const handleEliminarPagoDivision = useCallback(
    async (pagoId) => {
      if (!ticket?.id) return
      setLoadingPago(true)
      setDivisionError('')
      try {
        await deleteTicketPago(ticket.id, pagoId)
        await loadPagosDivision()
      } catch (e) {
        setDivisionError(
          e.response?.data?.detail || 'Error al eliminar el pago'
        )
      } finally {
        setLoadingPago(false)
      }
    },
    [ticket?.id, loadPagosDivision, setDivisionError, setLoadingPago]
  )

  const handleCompletarDivision = useCallback(async () => {
    if (!ticket?.id) return
    try {
      const t = await getTicket(ticket.id)
      if (t.data?.estado === 'cobrado') {
        navigate('/mesas')
        return
      }
      setDivisionError('El ticket aún no está cobrado en el servidor')
    } catch {
      setDivisionError('No se pudo verificar el ticket')
    }
  }, [ticket?.id, navigate, setDivisionError])

  const rellenarPendiente = useCallback(() => {
    if (pendienteDivision > 0) {
      setImportePago(String(pendienteDivision))
    }
  }, [pendienteDivision, setImportePago])

  const handleDividirRestanteEnPartes = useCallback(() => {
    const n = parseInt(String(numPartesInput).trim(), 10)
    if (Number.isNaN(n) || n < 2 || n > 20) {
      setDivisionError('Indica un número de partes entre 2 y 20')
      return
    }
    if (pendienteDivision <= 0) {
      setDivisionError('No hay importe pendiente para repartir')
      return
    }
    setDivisionError('')
    const partes = splitImporteEnNPartes(pendienteDivision, n)
    setBorradorPartesPagos(
      partes.map((importe, i) => ({
        importe,
        metodo_pago: 'efectivo',
        persona: i + 1,
      }))
    )
  }, [
    numPartesInput,
    pendienteDivision,
    setBorradorPartesPagos,
    setDivisionError,
  ])

  const handleConfirmarPartesPagos = useCallback(async () => {
    if (!ticket?.id || !borradorPartesPagos?.length) return
    setLoadingPago(true)
    setDivisionError('')
    try {
      for (const row of borradorPartesPagos) {
        const r = await addTicketPago(ticket.id, {
          importe: row.importe,
          metodo_pago: row.metodo_pago,
        })
        if (r.data?.completado) {
          setBorradorPartesPagos(null)
          await loadPagosDivision()
          navigate('/mesas')
          return
        }
      }
      await loadPagosDivision()
      setBorradorPartesPagos(null)
    } catch (e) {
      setDivisionError(
        e.response?.data?.detail || 'Error al confirmar los pagos'
      )
    } finally {
      setLoadingPago(false)
    }
  }, [
    ticket?.id,
    borradorPartesPagos,
    loadPagosDivision,
    navigate,
    setBorradorPartesPagos,
    setDivisionError,
    setLoadingPago,
  ])

  return {
    handleLiberarMesa,
    handleAddLinea,
    handleRestarUnidadGrupo,
    handleCobrar,
    iniciarDivision,
    handleAnadirPagoDivision,
    handleEliminarPagoDivision,
    handleCompletarDivision,
    rellenarPendiente,
    handleDividirRestanteEnPartes,
    handleConfirmarPartesPagos,
  }
}
