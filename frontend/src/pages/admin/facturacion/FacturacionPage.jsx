import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  getBillingEstado,
} from '../../../services/api'

/**
 * Fase 11 del PRD de hardening — Stripe Billing SaaS.
 *
 * Página de autoservicio para que `admin`/`director` del tenant consulten su
 * plan/estado de suscripción y gestionen el pago sin salir de HorecaSO. El
 * backend nunca procesa tarjetas: los botones redirigen a páginas alojadas
 * por Stripe (Checkout y Customer Portal) — ver `backend/routers/billing.py`.
 */

const PLANES = [
  {
    value: 'basico',
    nombre: 'Básico',
    descripcion: 'Sala, TPV y carta digital para un único local.',
  },
  {
    value: 'profesional',
    nombre: 'Profesional',
    descripcion: 'Añade inventario, recetas, proveedores y reservas.',
  },
  {
    value: 'premium',
    nombre: 'Premium',
    descripcion: 'Analytics avanzado, RRHH completo y Verifactu.',
  },
  {
    value: 'enterprise',
    nombre: 'Enterprise',
    descripcion: 'Múltiples locales, soporte prioritario y a medida.',
  },
]

const ESTADO_INFO = {
  active: {
    label: 'Activa',
    className:
      'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400',
  },
  trialing: {
    label: 'Periodo de prueba',
    className:
      'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400',
  },
  past_due: {
    label: 'Pago pendiente',
    className:
      'bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400',
  },
  canceled: {
    label: 'Cancelada',
    className:
      'bg-[#e5e7eb] text-[#374151] border border-[#e2e5ed] dark:bg-[#2e3347] dark:text-[#c4c9d4] dark:border-[#2e3347]',
  },
  unpaid: {
    label: 'Impagada',
    className:
      'bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400',
  },
  incomplete: {
    label: 'Incompleta',
    className:
      'bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400',
  },
}

function estadoBadge(estado) {
  if (!estado) {
    return {
      label: 'Sin suscripción de Stripe',
      className:
        'bg-[#e5e7eb] text-[#374151] border border-[#e2e5ed] dark:bg-[#2e3347] dark:text-[#c4c9d4] dark:border-[#2e3347]',
    }
  }
  return (
    ESTADO_INFO[estado] || {
      label: estado,
      className:
        'bg-[#e5e7eb] text-[#374151] border border-[#e2e5ed] dark:bg-[#2e3347] dark:text-[#c4c9d4] dark:border-[#2e3347]',
    }
  )
}

function planLabel(plan) {
  return PLANES.find((p) => p.value === plan)?.nombre || plan || '—'
}

function formatFecha(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function apiErrorMessage(err) {
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x.msg || x).join(', ')
  return err.message || 'Error'
}

export default function FacturacionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [estado, setEstado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [planEnCurso, setPlanEnCurso] = useState(null)
  const [portalEnCurso, setPortalEnCurso] = useState(false)

  const cargarEstado = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getBillingEstado()
      setEstado(res.data)
    } catch (e) {
      setError(apiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarEstado()
  }, [cargarEstado])

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (!checkout) return
    if (checkout === 'success') {
      setFeedback({
        type: 'ok',
        msg: 'Pago confirmado. Puede tardar unos segundos en reflejarse aquí.',
      })
    } else if (checkout === 'cancel') {
      setFeedback({ type: 'err', msg: 'Has cancelado el proceso de pago.' })
    }
    const next = new URLSearchParams(searchParams)
    next.delete('checkout')
    setSearchParams(next, { replace: true })
    // Stripe puede tardar en entregar el webhook: reintenta la carga.
    const t = setTimeout(cargarEstado, 3000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleElegirPlan = async (plan) => {
    setFeedback(null)
    setPlanEnCurso(plan)
    try {
      const res = await createBillingCheckoutSession(plan)
      window.location.href = res.data.checkout_url
    } catch (e) {
      setFeedback({ type: 'err', msg: apiErrorMessage(e) })
      setPlanEnCurso(null)
    }
  }

  const handleGestionarFacturacion = async () => {
    setFeedback(null)
    setPortalEnCurso(true)
    try {
      const res = await createBillingPortalSession()
      window.location.href = res.data.portal_url
    } catch (e) {
      setFeedback({ type: 'err', msg: apiErrorMessage(e) })
      setPortalEnCurso(false)
    }
  }

  const badge = estadoBadge(estado?.subscription_status)
  const bloqueado =
    estado?.subscription_status === 'canceled' ||
    estado?.subscription_status === 'unpaid' ||
    estado?.subscription_status === 'incomplete'
  const enGracia = estado?.subscription_status === 'past_due'

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <CreditCard className="text-amber-500" size={28} strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold text-[#111827] dark:text-[#e8eaf0] sm:text-2xl">
            Mi plan / Facturación
          </h1>
          <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Gestiona el plan de suscripción y los datos de pago del negocio
          </p>
        </div>
      </div>

      {feedback?.msg ? (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
          }`}
          role="status"
        >
          {feedback.type === 'ok' ? (
            <Check size={18} strokeWidth={1.5} />
          ) : (
            <AlertTriangle size={18} strokeWidth={1.5} />
          )}
          {feedback.msg}
        </div>
      ) : null}

      {error ? (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          <AlertTriangle size={18} strokeWidth={1.5} />
          {error}
        </div>
      ) : null}

      {enGracia ? (
        <div
          className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
          role="alert"
        >
          <ShieldAlert size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Hay un pago pendiente en tu suscripción</p>
            <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">
              Actualiza el método de pago desde &quot;Gestionar facturación&quot;
              para evitar la suspensión del acceso.
            </p>
          </div>
        </div>
      ) : null}

      {bloqueado ? (
        <div
          className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          <ShieldAlert size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Suscripción inactiva</p>
            <p className="mt-0.5 text-red-700/80 dark:text-red-400/80">
              El acceso a los módulos operativos está bloqueado. Elige un plan
              más abajo para reactivar la cuenta.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]">
        {loading ? (
          <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Cargando estado de la suscripción…
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
                Plan actual
              </p>
              <p className="mt-1 text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
                {planLabel(estado?.plan)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
                {estado?.current_period_end ? (
                  <span className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Renueva el {formatFecha(estado.current_period_end)}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGestionarFacturacion}
              disabled={portalEnCurso || !estado?.tiene_cliente_stripe}
              title={
                !estado?.tiene_cliente_stripe
                  ? 'Elige un plan primero para crear tu cuenta de facturación'
                  : undefined
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-6 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] dark:hover:bg-[#2e3347]"
            >
              {portalEnCurso ? (
                <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <ExternalLink size={18} strokeWidth={1.5} />
              )}
              Gestionar facturación
            </button>
          </div>
        )}
      </div>

      <h2 className="mb-3 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
        Cambiar de plan
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANES.map((p) => {
          const esActual = estado?.plan === p.value
          return (
            <div
              key={p.value}
              className={`flex flex-col gap-3 rounded-xl border p-4 ${
                esActual
                  ? 'border-amber-500 bg-amber-500/5'
                  : 'border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  size={18}
                  strokeWidth={1.5}
                  className={esActual ? 'text-amber-500' : 'text-[#6b7280] dark:text-[#8b90a7]'}
                />
                <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  {p.nombre}
                </p>
              </div>
              <p className="min-h-[2.5rem] text-sm text-[#6b7280] dark:text-[#8b90a7]">
                {p.descripcion}
              </p>
              <button
                type="button"
                disabled={esActual || planEnCurso === p.value}
                onClick={() => handleElegirPlan(p.value)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {planEnCurso === p.value ? (
                  <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />
                ) : null}
                {esActual ? 'Plan actual' : 'Elegir plan'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
