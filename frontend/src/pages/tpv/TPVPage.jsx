import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChefHat,
  DollarSign,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import {
  addLinea as apiAddLinea,
  cobrarTicket,
  createTicket,
  deleteLinea as apiDeleteLinea,
  getCartaAgrupada,
  getTicket,
  getTicketsAbiertos,
} from '../../services/api'

function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
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

  const handleDeleteLinea = useCallback(
    async (lineaId) => {
      if (!ticket?.id) return
      try {
        await apiDeleteLinea(ticket.id, lineaId)
        const t = await getTicket(ticket.id)
        setTicket(t.data)
      } catch (e) {
        setError(e.response?.data?.detail || 'Error al eliminar línea')
      }
    },
    [ticket?.id]
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
          Ticket ({lineas.length})
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Columna carta */}
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
            activeTab === 'carta' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#e2e5ed] bg-white p-3 dark:border-[#2e3347] dark:bg-[#1a1d27]">
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
          <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-3 md:grid-cols-3">
            {productosActivos.map((p) => {
              const busy = !!actionLoading[p.id]
              return (
                <div
                  key={p.id}
                  className={`flex flex-col rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27] ${
                    busy ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  <span className="flex-1 text-[15px] font-semibold leading-tight text-[#111827] dark:text-[#e8eaf0]">
                    {p.nombre}
                  </span>
                  <span className="mt-1 text-xl font-bold text-amber-500">
                    {formatEuro(p.precio)}
                  </span>
                  <button
                    type="button"
                    disabled={!ticket || busy}
                    onClick={() => handleAddLinea(p.id)}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-lg bg-amber-500 font-bold text-black transition-colors hover:bg-amber-600 active:bg-amber-700"
                  >
                    <Plus size={18} strokeWidth={1.5} />
                    Añadir
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Columna ticket */}
        <div
          className={`flex w-full shrink-0 flex-col border-l border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:w-80 lg:w-96 ${
            activeTab === 'ticket' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="shrink-0 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
            <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Comanda
            </h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {lineas.length === 0 ? (
              <EmptyState
                Icon={ShoppingCart}
                message="Sin productos aún"
              />
            ) : (
              lineas.map((ln) => (
                <div
                  key={ln.id}
                  className="flex items-center gap-2 border-b border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-tight text-[#111827] dark:text-[#e8eaf0]">
                      {productoNombrePorId.get(String(ln.producto_id)) ||
                        ln.producto_id}
                    </p>
                    <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                      x{ln.cantidad}
                    </p>
                  </div>
                  <span className="text-[15px] font-semibold text-amber-500">
                    {formatEuro(ln.subtotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteLinea(ln.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    aria-label="Quitar línea"
                  >
                    <Minus size={14} strokeWidth={1.5} />
                  </button>
                </div>
              ))
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
            </select>
            <button
              type="button"
              disabled={!lineas.length || cobrarLoading}
              onClick={handleCobrar}
              className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-bold text-black transition-colors hover:bg-amber-600 disabled:opacity-40"
            >
              <DollarSign size={22} strokeWidth={1.5} />
              Cobrar {Number(ticket?.total || 0).toFixed(2)}€
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
