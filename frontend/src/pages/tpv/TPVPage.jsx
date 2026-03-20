import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChefHat,
  DollarSign,
  Minus,
  Plus,
  ShoppingCart,
  SplitSquareHorizontal,
  X,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import {
  addLinea as apiAddLinea,
  addTicketPago,
  cobrarTicket,
  createTicket,
  deleteLinea as apiDeleteLinea,
  deleteTicketPago,
  getCartaAgrupada,
  getTicket,
  getTicketPagos,
  getTicketsAbiertos,
} from '../../services/api'

function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
}

const INPUT_COBR =
  'h-10 w-full min-w-0 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'

/** Select reparto por persona (design system; evita colapso en fila flex) */
const SELECT_METODO_PARTE =
  'block h-auto min-h-[2.25rem] w-full min-w-0 bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-2 py-1 text-[14px] text-[#111827] dark:text-[#e8eaf0]'

const METODOS_DIVISION = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'tarjeta_debito', label: 'Tarjeta débito' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'invitacion', label: 'Invitación' },
]

function labelMetodoPago(codigo) {
  const m = METODOS_DIVISION.find((x) => x.value === codigo)
  return m ? m.label : codigo || '—'
}

/** Reparte total (€) en N partes en céntimos; el resto se reparte +1 cént. a las primeras partes. */
function splitImporteEnNPartes(totalEuros, n) {
  const cents = Math.round(Number(totalEuros) * 100)
  if (n < 2 || cents <= 0) return []
  const base = Math.floor(cents / n)
  const rem = cents % n
  const out = []
  for (let i = 0; i < n; i++) {
    const c = base + (i < rem ? 1 : 0)
    out.push(c / 100)
  }
  return out
}

export default function TPVPage() {
  const { mesaId } = useParams()
  const navigate = useNavigate()

  const [carta, setCarta] = useState([])
  const [categActiva, setCategActiva] = useState(0)
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [activeTab, setActiveTab] = useState('carta')
  const [actionLoading, setActionLoading] = useState({})
  const [cobrarLoading, setCobrarLoading] = useState(false)
  const [modoDivision, setModoDivision] = useState(false)
  const [pagosRegistrados, setPagosRegistrados] = useState([])
  const [importePago, setImportePago] = useState('')
  const [metodoPagoDivision, setMetodoPagoDivision] = useState('efectivo')
  const [loadingPago, setLoadingPago] = useState(false)
  const [divisionError, setDivisionError] = useState('')
  const [numPartesInput, setNumPartesInput] = useState('2')
  const [borradorPartesPagos, setBorradorPartesPagos] = useState(null)

  const productoNombrePorId = useMemo(() => {
    const map = new Map()
    for (const bloque of carta) {
      for (const p of bloque.productos || []) {
        map.set(String(p.id), p.nombre)
      }
    }
    return map
  }, [carta])

  const categorias = useMemo(
    () => carta.map((b) => b.categoria).filter(Boolean),
    [carta]
  )

  const productosActivos = carta[categActiva]?.productos || []

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const cartaRes = await getCartaAgrupada()
        if (cancelled) return
        const cartaData = Array.isArray(cartaRes.data) ? cartaRes.data : []
        setCarta(cartaData)
        setCategActiva(0)

        const abiertosRes = await getTicketsAbiertos()
        if (cancelled) return
        const abiertos = Array.isArray(abiertosRes.data)
          ? abiertosRes.data
          : []
        const existente = abiertos.find(
          (t) => String(t.mesa_id) === String(mesaId)
        )

        if (existente) {
          const full = await getTicket(existente.id)
          if (!cancelled) setTicket(full.data)
        } else {
          try {
            const created = await createTicket(mesaId)
            if (cancelled) return
            const full = await getTicket(created.data.id)
            if (!cancelled) setTicket(full.data)
          } catch (e) {
            if (
              e.response?.data?.detail === 'Mesa ya ocupada' &&
              !cancelled
            ) {
              const again = await getTicketsAbiertos()
              const lista = Array.isArray(again.data) ? again.data : []
              const t = lista.find(
                (x) => String(x.mesa_id) === String(mesaId)
              )
              if (t) {
                const full = await getTicket(t.id)
                if (!cancelled) setTicket(full.data)
              } else {
                setError('Mesa ocupada sin ticket abierto visible')
              }
            } else if (!cancelled) {
              setError(
                e.response?.data?.detail ||
                  e.message ||
                  'No se pudo crear el ticket'
              )
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.detail || 'Error al cargar el TPV')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [mesaId])

  useEffect(() => {
    if (!divisionError) return
    const t = setTimeout(() => setDivisionError(''), 3000)
    return () => clearTimeout(t)
  }, [divisionError])

  useEffect(() => {
    setModoDivision(false)
    setPagosRegistrados([])
    setImportePago('')
    setDivisionError('')
    setNumPartesInput('2')
    setBorradorPartesPagos(null)
  }, [ticket?.id])

  const loadPagosDivision = useCallback(async () => {
    if (!ticket?.id) return
    try {
      const r = await getTicketPagos(ticket.id)
      const list = Array.isArray(r.data?.pagos) ? r.data.pagos : []
      setPagosRegistrados(
        list.map((p) => ({
          id: p.id,
          importe: Number(p.importe),
          metodo_pago: p.metodo_pago,
        }))
      )
    } catch {
      setPagosRegistrados([])
    }
  }, [ticket?.id])

  const totalPagado = useMemo(
    () =>
      pagosRegistrados.reduce((s, p) => s + (Number(p.importe) || 0), 0),
    [pagosRegistrados]
  )

  const pendienteDivision = useMemo(() => {
    const total = Number(ticket?.total) || 0
    const raw = Math.round((total - totalPagado) * 100) / 100
    return raw < 0 ? 0 : raw
  }, [ticket?.total, totalPagado])

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
    [ticket?.id]
  )

  const lineasAgrupadas = useMemo(() => {
    const map = new Map()
    for (const ln of ticket?.lineas || []) {
      const key = String(ln.producto_id)
      if (!map.has(key)) {
        map.set(key, {
          producto_id: ln.producto_id,
          cantidad: 0,
          subtotal: 0,
        })
      }
      const g = map.get(key)
      g.cantidad += Number(ln.cantidad) || 0
      g.subtotal += Number(ln.subtotal) || 0
    }
    return Array.from(map.values())
  }, [ticket?.lineas])

  const totalUnidadesComanda = useMemo(
    () =>
      (ticket?.lineas || []).reduce(
        (s, ln) => s + (Number(ln.cantidad) || 0),
        0
      ),
    [ticket?.lineas]
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
    [ticket]
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
  }, [ticket, metodoPago, navigate])

  const iniciarDivision = useCallback(async () => {
    setModoDivision(true)
    setImportePago('')
    setDivisionError('')
    setBorradorPartesPagos(null)
    await loadPagosDivision()
  }, [loadPagosDivision])

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
    [ticket?.id, loadPagosDivision]
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
  }, [ticket?.id, navigate])

  const rellenarPendiente = useCallback(() => {
    if (pendienteDivision > 0) {
      setImportePago(String(pendienteDivision))
    }
  }, [pendienteDivision])

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
  }, [numPartesInput, pendienteDivision])

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
  }, [ticket?.id, borradorPartesPagos, loadPagosDivision, navigate])

  const lineas = ticket?.lineas || []
  const mesaIdShort = mesaId?.slice(0, 8) ?? '—'

  if (loading) {
    return <Loader />
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f6f9] dark:bg-[#0f1117]">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#e2e5ed] bg-white px-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <button
          type="button"
          onClick={() => navigate('/mesas')}
          className="flex items-center gap-1 text-[#6b7280] hover:text-[#111827] dark:text-[#8b90a7] dark:hover:text-[#e8eaf0]"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
          <span className="text-[15px]">Sala</span>
        </button>
        <span className="flex-1 text-center text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
          TPV · Mesa {mesaIdShort}
        </span>
      </header>

      {error ? (
        <div
          className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex h-12 shrink-0 border-b border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('carta')}
          className={`flex flex-1 items-center justify-center gap-2 text-[14px] font-medium ${
            activeTab === 'carta'
              ? 'border-b-2 border-amber-500 text-amber-500'
              : 'text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          <ChefHat size={16} strokeWidth={1.5} />
          Carta
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ticket')}
          className={`flex flex-1 items-center justify-center gap-2 text-[14px] font-medium ${
            activeTab === 'ticket'
              ? 'border-b-2 border-amber-500 text-amber-500'
              : 'text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          <ShoppingCart size={16} strokeWidth={1.5} />
          Ticket ({totalUnidadesComanda})
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Columna carta */}
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#1a1d27] ${
            activeTab === 'carta' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="sticky top-0 z-10 flex shrink-0 gap-2 overflow-x-auto border-b border-[#e2e5ed] bg-white p-3 dark:border-[#2e3347] dark:bg-[#1a1d27]">
            {categorias.map((cat, i) => {
              const active = i === categActiva
              return (
                <button
                  key={cat.id || i}
                  type="button"
                  onClick={() => setCategActiva(i)}
                  className={[
                    'whitespace-nowrap rounded-lg px-4 py-2 text-[14px]',
                    active
                      ? 'border border-amber-500/30 bg-amber-500/10 font-medium text-amber-500'
                      : 'text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]',
                  ].join(' ')}
                >
                  {cat.nombre}
                </button>
              )
            })}
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {productosActivos.map((p) => {
                  const busy = !!actionLoading[p.id]
                  const disabled = !ticket || busy
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      aria-disabled={disabled}
                      aria-label={`Añadir ${p.nombre}`}
                      onClick={() => {
                        if (!disabled) handleAddLinea(p.id)
                      }}
                      onKeyDown={(e) => {
                        if (
                          !disabled &&
                          (e.key === 'Enter' || e.key === ' ')
                        ) {
                          e.preventDefault()
                          handleAddLinea(p.id)
                        }
                      }}
                      className={[
                        'group flex h-auto cursor-pointer flex-col gap-1.5 rounded-xl border border-[#e2e5ed] bg-white p-3 transition-all duration-150 dark:border-[#2e3347] dark:bg-[#1a1d27]',
                        disabled
                          ? 'pointer-events-none cursor-not-allowed opacity-40'
                          : 'hover:border-amber-500 hover:shadow-md active:scale-95',
                      ].join(' ')}
                    >
                      <span className="min-h-[2.5rem] text-[14px] font-medium leading-tight text-[#111827] line-clamp-2 dark:text-[#e8eaf0]">
                        {p.nombre}
                      </span>
                      <span className="text-sm font-bold text-amber-500">
                        {formatEuro(p.precio)}
                      </span>
                      <span
                        className="flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-amber-500 text-xs font-semibold text-black transition-colors pointer-events-none select-none group-hover:bg-amber-600 dark:bg-amber-500 dark:group-hover:bg-amber-600"
                        aria-hidden
                      >
                        <Plus size={12} strokeWidth={1.5} />
                        Añadir
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Columna ticket: altura limitada + scroll interno (comanda + cobro) */}
        <div
          className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border-l border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:h-full md:w-80 md:shrink-0 md:flex-none lg:w-96 ${
            activeTab === 'ticket' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="shrink-0 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
            <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Comanda
            </h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <div className="shrink-0">
              {lineas.length === 0 ? (
                <EmptyState
                  Icon={ShoppingCart}
                  message="Sin productos aún"
                />
              ) : (
                lineasAgrupadas.map((g) => {
                  const nombre =
                    productoNombrePorId.get(String(g.producto_id)) ||
                    g.producto_id
                  const busy = !!actionLoading[`grp-${String(g.producto_id)}`]
                  return (
                    <div
                      key={String(g.producto_id)}
                      className="flex items-center gap-2 border-b border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-tight text-[#111827] dark:text-[#e8eaf0]">
                          {nombre} x{g.cantidad} — {formatEuro(g.subtotal)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRestarUnidadGrupo(g.producto_id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-40"
                        aria-label="Quitar una unidad"
                      >
                        <Minus size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            <div className="shrink-0 border-t border-[#e2e5ed] p-4 dark:border-[#2e3347]">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Total
                </span>
                <span className="text-4xl font-bold text-amber-500">
                  {formatEuro(ticket?.total)}
                </span>
              </div>

              {divisionError ? (
                <div
                  className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {divisionError}
                </div>
              ) : null}

              {!modoDivision ? (
                <>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="h-12 w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta_credito">Tarjeta crédito</option>
                    <option value="tarjeta_debito">Tarjeta débito</option>
                    <option value="bizum">Bizum</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="invitacion">Invitación</option>
                  </select>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={!lineas.length || cobrarLoading}
                      onClick={handleCobrar}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-black transition-colors hover:bg-amber-600 disabled:opacity-40"
                    >
                      <DollarSign size={18} strokeWidth={1.5} />
                      Cobro simple
                    </button>
                    <button
                      type="button"
                      disabled={!lineas.length || cobrarLoading}
                      onClick={iniciarDivision}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] text-sm font-semibold text-[#111827] transition-colors hover:bg-[#e8eaef] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] dark:hover:bg-[#2e3347] disabled:opacity-40"
                    >
                      <SplitSquareHorizontal size={18} strokeWidth={1.5} />
                      Dividir cuenta
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                <div className="rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] p-3 dark:border-[#2e3347] dark:bg-[#222536]">
                  <p className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                    Total: {formatEuro(ticket?.total)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Pagado: {formatEuro(totalPagado)}
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      pendienteDivision > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    Pendiente: {formatEuro(pendienteDivision)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Importe..."
                      value={importePago}
                      onChange={(e) => setImportePago(e.target.value)}
                      className={INPUT_COBR}
                    />
                    <button
                      type="button"
                      onClick={rellenarPendiente}
                      disabled={pendienteDivision <= 0}
                      className="h-10 shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-semibold text-amber-700 disabled:opacity-40 dark:text-amber-400"
                    >
                      Pendiente
                    </button>
                  </div>
                  <select
                    value={metodoPagoDivision}
                    onChange={(e) =>
                      setMetodoPagoDivision(e.target.value)
                    }
                    className={INPUT_COBR}
                  >
                    {METODOS_DIVISION.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={loadingPago || !lineas.length}
                    onClick={handleAnadirPagoDivision}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-black transition-colors hover:bg-amber-600 disabled:opacity-40"
                  >
                    <Plus size={18} strokeWidth={1.5} />
                    Añadir pago
                  </button>
                </div>

                <div className="rounded-lg border border-[#e2e5ed] bg-[#f0f2f5]/80 p-3 dark:border-[#2e3347] dark:bg-[#1e2130]">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
                    Dividir restante en partes
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-[#111827] dark:text-[#e8eaf0]">
                      <span className="text-[#6b7280] dark:text-[#8b90a7]">
                        ¿En cuántas partes?
                      </span>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={numPartesInput}
                        onChange={(e) => setNumPartesInput(e.target.value)}
                        className={INPUT_COBR}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={
                        loadingPago ||
                        pendienteDivision <= 0 ||
                        !lineas.length
                      }
                      onClick={handleDividirRestanteEnPartes}
                      className="h-10 shrink-0 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 text-sm font-semibold text-amber-800 dark:text-amber-400 disabled:opacity-40"
                    >
                      Dividir restante
                    </button>
                  </div>

                  {borradorPartesPagos?.length ? (
                    <div className="mt-3 space-y-2 border-t border-[#e2e5ed] pt-3 dark:border-[#2e3347]">
                      {borradorPartesPagos.map((row, idx) => (
                        <div
                          key={`parte-${idx}`}
                          className="flex flex-col gap-2 rounded-md bg-white/80 p-2 dark:bg-[#222536]/90 sm:flex-row sm:items-center sm:gap-3"
                        >
                          <span className="shrink-0 text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
                            Persona {row.persona}: {formatEuro(row.importe)}
                          </span>
                          <div className="min-w-0 w-full flex-1 sm:min-w-[10rem]">
                            <select
                              value={row.metodo_pago}
                              onChange={(e) => {
                                const v = e.target.value
                                setBorradorPartesPagos((prev) =>
                                  prev
                                    ? prev.map((r, i) =>
                                        i === idx
                                          ? { ...r, metodo_pago: v }
                                          : r
                                      )
                                    : prev
                                )
                              }}
                              className={SELECT_METODO_PARTE}
                              aria-label={`Método de pago persona ${row.persona}`}
                            >
                              <option value="efectivo">Efectivo</option>
                              <option value="tarjeta_credito">
                                Tarjeta crédito
                              </option>
                              <option value="tarjeta_debito">
                                Tarjeta débito
                              </option>
                              <option value="bizum">Bizum</option>
                              <option value="transferencia">
                                Transferencia
                              </option>
                              <option value="invitacion">Invitación</option>
                            </select>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        disabled={loadingPago}
                        onClick={handleConfirmarPartesPagos}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                      >
                        <Check size={18} strokeWidth={1.5} />
                        Confirmar todos
                      </button>
                    </div>
                  ) : null}
                </div>

                {pagosRegistrados.length > 0 ? (
                  <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#e2e5ed] p-2 dark:border-[#2e3347]">
                    {pagosRegistrados.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-[#f0f2f5] px-2 py-1.5 text-sm dark:bg-[#222536]"
                      >
                        <span className="min-w-0 truncate text-[#111827] dark:text-[#e8eaf0]">
                          {formatEuro(p.importe)} —{' '}
                          {labelMetodoPago(p.metodo_pago)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEliminarPagoDivision(p.id)}
                          disabled={loadingPago}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                          aria-label="Eliminar pago"
                        >
                          <X size={16} strokeWidth={1.5} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {pendienteDivision <= 0 && pagosRegistrados.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleCompletarDivision}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-sm font-bold text-emerald-700 dark:text-emerald-400"
                  >
                    <Check size={18} strokeWidth={1.5} />
                    Cobro completado — Sala
                  </button>
                ) : null}

                {pagosRegistrados.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModoDivision(false)
                      setDivisionError('')
                    }}
                    className="h-10 w-full rounded-lg border border-[#e2e5ed] text-sm font-medium text-[#6b7280] hover:bg-[#f0f2f5] dark:border-[#2e3347] dark:text-[#9ca3af] dark:hover:bg-[#222536]"
                  >
                    Cancelar división
                  </button>
                ) : null}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
