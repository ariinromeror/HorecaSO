import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Edit,
  LayoutGrid,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import {
  createMesa,
  deleteMesa,
  getMesas,
  updateMesa,
} from '../../services/api'

const INPUT =
  'w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
const CARD_BASE =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl'
const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
const BTN_SECONDARY =
  'h-10 px-4 rounded-lg bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] text-[#111827] dark:text-[#e8eaf0] font-medium transition-colors inline-flex items-center justify-center gap-2'
const BTN_DANGER =
  'h-10 px-4 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed'

const ICON = { strokeWidth: 1.5, className: 'shrink-0' }

const ZONAS = [
  { value: 'interior', label: 'Interior' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'barra', label: 'Barra' },
  { value: 'privado', label: 'Privado' },
  { value: 'jardín', label: 'Jardín' },
]

const FORMAS = [
  { value: 'cuadrada', label: 'Cuadrada' },
  { value: 'redonda', label: 'Redonda' },
  { value: 'rectangular', label: 'Rectangular' },
]

function normZona(z) {
  return String(z || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0300/g, '')
}

function zonaBadgeClass(z) {
  const zl = normZona(z)
  if (zl === 'interior' || zl === 'sala')
    return 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
  if (zl === 'terraza')
    return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
  if (zl === 'barra')
    return 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
  if (zl === 'privado')
    return 'bg-purple-500/10 text-purple-500 dark:text-purple-400'
  if (zl === 'jardin' || zl === 'jardín')
    return 'bg-green-500/10 text-green-500 dark:text-green-400'
  return 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
}

function estadoBadgeClass(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'libre')
    return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
  if (e === 'ocupada')
    return 'bg-red-500/10 text-red-500 dark:text-red-400'
  if (e === 'reservada')
    return 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
  if (e === 'bloqueada')
    return 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
  return 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
}

function estadoLabel(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'libre') return 'Libre'
  if (e === 'ocupada') return 'Ocupada'
  if (e === 'reservada') return 'Reservada'
  if (e === 'bloqueada') return 'Bloqueada'
  return estado || '—'
}

function formaLabel(forma) {
  const f = String(forma || '').toLowerCase()
  const o = FORMAS.find((x) => x.value === f)
  return o ? o.label : forma || '—'
}

function zonaToFormValue(z) {
  const zl = normZona(z)
  const match = ZONAS.find((opt) => normZona(opt.value) === zl)
  return match ? match.value : 'interior'
}

function formaToFormValue(forma) {
  const f = String(forma || '').toLowerCase()
  const match = FORMAS.find((opt) => opt.value === f)
  return match ? match.value : 'cuadrada'
}

const emptyForm = () => ({
  numero: '',
  capacidad: 4,
  zona: 'interior',
  forma: 'cuadrada',
})

export default function GestionSalaPage() {
  const { user } = useAuth()

  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  /** false = cerrado, null = nueva mesa, objeto = editar */
  const [modalMesa, setModalMesa] = useState(false)
  const [formMesa, setFormMesa] = useState(emptyForm)
  const [feedback, setFeedback] = useState({ msg: '', type: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadMesas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await getMesas()
      setMesas(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setMesas([])
      setError(e.response?.data?.detail || 'Error al cargar mesas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMesas()
  }, [loadMesas])

  useEffect(() => {
    if (!feedback.msg) return
    const t = setTimeout(() => setFeedback({ msg: '', type: '' }), 3000)
    return () => clearTimeout(t)
  }, [feedback.msg])

  const resumen = useMemo(() => {
    let interior = 0
    let terraza = 0
    let barra = 0
    for (const m of mesas) {
      const z = normZona(m.zona)
      if (z === 'interior' || z === 'sala') interior += 1
      else if (z === 'terraza') terraza += 1
      else if (z === 'barra') barra += 1
    }
    return {
      total: mesas.length,
      interior,
      terraza,
      barra,
    }
  }, [mesas])

  const outletIdResolved = useMemo(() => {
    if (user?.outlet_id) return user.outlet_id
    const first = mesas.find((m) => m.outlet_id)
    return first?.outlet_id || null
  }, [user?.outlet_id, mesas])

  const openNueva = () => {
    setFormMesa(emptyForm())
    setModalMesa(null)
    setFormError('')
  }

  const openEditar = (m) => {
    setFormMesa({
      numero: String(m.numero ?? ''),
      capacidad: Number(m.capacidad) || 4,
      zona: zonaToFormValue(m.zona),
      forma: formaToFormValue(m.forma),
    })
    setModalMesa(m)
    setFormError('')
  }

  const cerrarModal = () => {
    setModalMesa(false)
    setFormError('')
  }

  const validateForm = (excludeId) => {
    const num = Number(formMesa.numero)
    if (!formMesa.numero || Number.isNaN(num) || num < 1) {
      setFormError('Número de mesa inválido (mínimo 1)')
      return false
    }
    const cap = Number(formMesa.capacidad)
    if (Number.isNaN(cap) || cap < 1 || cap > 20) {
      setFormError('Capacidad entre 1 y 20 pax')
      return false
    }
    const dup = mesas.some(
      (m) =>
        Number(m.numero) === num &&
        (!excludeId || String(m.id) !== String(excludeId))
    )
    if (dup) {
      setFormError('Ya existe una mesa con ese número en el local')
      return false
    }
    setFormError('')
    return true
  }

  const guardarMesa = async () => {
    const editing =
      modalMesa != null &&
      typeof modalMesa === 'object' &&
      Boolean(modalMesa.id)
    if (!validateForm(editing ? modalMesa.id : null)) return

    const num = Number(formMesa.numero)
    const cap = Number(formMesa.capacidad)

    setSaving(true)
    try {
      if (editing) {
        await updateMesa(modalMesa.id, {
          numero: num,
          capacidad: cap,
          zona: formMesa.zona,
          forma: formMesa.forma,
        })
        setFeedback({ msg: 'Mesa actualizada', type: 'ok' })
      } else {
        if (!outletIdResolved) {
          setFormError(
            'No se puede crear la mesa: falta outlet del usuario o mesas de referencia'
          )
          setSaving(false)
          return
        }
        await createMesa({
          numero: num,
          capacidad: cap,
          zona: formMesa.zona,
          forma: formMesa.forma,
          outlet_id: outletIdResolved,
        })
        setFeedback({ msg: 'Mesa creada', type: 'ok' })
      }
      cerrarModal()
      await loadMesas()
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al guardar',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const eliminarMesa = async (m) => {
    if (!confirm(`¿Eliminar mesa Nº ${m.numero}?`)) return
    try {
      await deleteMesa(m.id)
      setFeedback({ msg: 'Mesa eliminada', type: 'ok' })
      await loadMesas()
    } catch (e) {
      const d = e.response?.data?.detail
      const msg =
        typeof d === 'string' && d.toLowerCase().includes('ocupada')
          ? d
          : d || 'No se pudo eliminar la mesa'
      setFeedback({ msg, type: 'error' })
    }
  }

  const rowBusyClass = (m) => {
    const e = String(m.estado || '').toLowerCase()
    if (e === 'ocupada' || e === 'reservada') return 'bg-amber-500/5'
    return ''
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <LayoutGrid
                {...ICON}
                className="h-8 w-8 text-amber-500"
                aria-hidden
              />
              <h1 className="text-2xl font-bold text-[#111827] dark:text-[#f5f5f5]">
                Gestión de Sala
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
              Configura las mesas de tu local
            </p>
          </div>
          <button type="button" onClick={openNueva} className={BTN_PRIMARY}>
            <Plus {...ICON} className="h-5 w-5" />
            Nueva mesa
          </button>
        </div>

        {feedback.msg ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
            role="status"
          >
            {feedback.msg}
          </div>
        ) : null}

        {error ? (
          <div
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            <AlertTriangle {...ICON} className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Total mesas', value: resumen.total },
            { label: 'Sala / Interior', value: resumen.interior },
            { label: 'Terraza', value: resumen.terraza },
            { label: 'Barra', value: resumen.barra },
          ].map((b) => (
            <span
              key={b.label}
              className="inline-flex items-center rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2 text-sm font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
            >
              {b.label}:{' '}
              <span className="ml-1 tabular-nums text-amber-600 dark:text-amber-400">
                {b.value}
              </span>
            </span>
          ))}
        </div>

        {loading ? (
          <Loader />
        ) : mesas.length === 0 ? (
          <EmptyState message="No hay mesas. Crea la primera con «Nueva mesa»." />
        ) : (
          <>
            <div className={`hidden overflow-x-auto md:block ${CARD_BASE}`}>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e2e5ed] text-[#6b7280] dark:border-[#2e3347] dark:text-[#9ca3af]">
                    <th className="px-4 py-3 font-medium">Nº</th>
                    <th className="px-4 py-3 font-medium">Capacidad</th>
                    <th className="px-4 py-3 font-medium">Zona</th>
                    <th className="px-4 py-3 font-medium">Forma</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...mesas]
                    .sort((a, b) => Number(a.numero) - Number(b.numero))
                    .map((m) => {
                      const libre = String(m.estado || '').toLowerCase() === 'libre'
                      return (
                        <tr
                          key={m.id}
                          className={`border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80 ${rowBusyClass(m)}`}
                        >
                          <td className="px-4 py-3 font-bold text-[#111827] dark:text-[#e8eaf0]">
                            {m.numero}
                          </td>
                          <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                            <span className="inline-flex items-center gap-1">
                              <Users size={16} strokeWidth={1.5} />
                              {m.capacidad} pax
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${zonaBadgeClass(m.zona)}`}
                            >
                              {m.zona || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 capitalize text-[#111827] dark:text-[#e8eaf0]">
                            {formaLabel(m.forma)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${estadoBadgeClass(m.estado)}`}
                            >
                              {estadoLabel(m.estado)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditar(m)}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                              >
                                <Edit {...ICON} className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarMesa(m)}
                                disabled={!libre}
                                title={
                                  libre
                                    ? 'Eliminar mesa'
                                    : 'Solo se pueden eliminar mesas libres'
                                }
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 ${
                                  !libre ? 'opacity-40 cursor-not-allowed' : ''
                                }`}
                              >
                                <Trash2 {...ICON} className="h-3.5 w-3.5" />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {[...mesas]
                .sort((a, b) => Number(a.numero) - Number(b.numero))
                .map((m) => {
                  const libre = String(m.estado || '').toLowerCase() === 'libre'
                  return (
                    <div
                      key={m.id}
                      className={`p-4 ${CARD_BASE} ${rowBusyClass(m)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                          Mesa {m.numero}
                        </p>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${estadoBadgeClass(m.estado)}`}
                        >
                          {estadoLabel(m.estado)}
                        </span>
                      </div>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                            Capacidad
                          </dt>
                          <dd className="inline-flex items-center gap-1 font-medium text-[#111827] dark:text-[#e8eaf0]">
                            <Users size={16} strokeWidth={1.5} />
                            {m.capacidad} pax
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                            Zona
                          </dt>
                          <dd>
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${zonaBadgeClass(m.zona)}`}
                            >
                              {m.zona || '—'}
                            </span>
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                            Forma
                          </dt>
                          <dd className="capitalize text-[#111827] dark:text-[#e8eaf0]">
                            {formaLabel(m.forma)}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e2e5ed] pt-3 dark:border-[#2e3347]">
                        <button
                          type="button"
                          onClick={() => openEditar(m)}
                          className={BTN_SECONDARY}
                        >
                          <Edit {...ICON} className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarMesa(m)}
                          disabled={!libre}
                          title={
                            libre
                              ? 'Eliminar mesa'
                              : 'Solo se pueden eliminar mesas libres'
                          }
                          className={`${BTN_DANGER} ${
                            !libre ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                        >
                          <Trash2 {...ICON} className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </div>

      {modalMesa !== false ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`max-h-[90vh] w-full max-w-md overflow-y-auto p-6 ${CARD_BASE}`}
            role="dialog"
            aria-labelledby="modal-mesa-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="modal-mesa-title"
                className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
              >
                {modalMesa === null
                  ? 'Nueva mesa'
                  : `Editar mesa Nº ${modalMesa.numero}`}
              </h2>
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Cerrar"
              >
                <X {...ICON} className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Número de mesa *
                </label>
                <input
                  type="number"
                  min={1}
                  value={formMesa.numero}
                  onChange={(e) =>
                    setFormMesa((f) => ({ ...f, numero: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Capacidad (pax) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formMesa.capacidad}
                  onChange={(e) =>
                    setFormMesa((f) => ({
                      ...f,
                      capacidad: Number(e.target.value) || 0,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Zona *
                </label>
                <select
                  value={formMesa.zona}
                  onChange={(e) =>
                    setFormMesa((f) => ({ ...f, zona: e.target.value }))
                  }
                  className={INPUT}
                >
                  {ZONAS.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Forma *
                </label>
                <select
                  value={formMesa.forma}
                  onChange={(e) =>
                    setFormMesa((f) => ({ ...f, forma: e.target.value }))
                  }
                  className={INPUT}
                >
                  {FORMAS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              {formError ? (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {formError}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={cerrarModal}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarMesa}
                disabled={saving}
                className={BTN_PRIMARY}
              >
                <Check {...ICON} className="h-5 w-5" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
