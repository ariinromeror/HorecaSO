import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, Pencil, Star, Users } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_ACCESO = ['admin', 'director', 'jefe_sala']

const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
const TEXTAREA = `${INPUT} min-h-[88px] resize-y`
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
const BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
const BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40'
const PAGE_BG = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'

/** Slugs alineados con etiquetado alérgenos UE (valores en TEXT[]). */
const ALERGENOS = [
  { slug: 'gluten', label: 'Gluten' },
  { slug: 'crustaceos', label: 'Crustáceos', aliases: ['crustaceos'] },
  { slug: 'huevo', label: 'Huevo' },
  { slug: 'pescado', label: 'Pescado' },
  { slug: 'cacahuetes', label: 'Cacahuetes' },
  { slug: 'soja', label: 'Soja' },
  { slug: 'lacteos', label: 'Lácteos' },
  {
    slug: 'frutos_cascara',
    label: 'Frutos de cáscara',
    aliases: ['frutos de cascara', 'frutos_de_cascara'],
  },
  { slug: 'apio', label: 'Apio' },
  { slug: 'mostaza', label: 'Mostaza' },
  { slug: 'sesamo', label: 'Sésamo', aliases: ['sesamo'] },
  { slug: 'sulfitos', label: 'Sulfitos' },
  { slug: 'moluscos', label: 'Moluscos' },
  { slug: 'altramuces', label: 'Altramuces' },
]

function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function slugFromApiValue(val) {
  const n = normKey(val)
  for (const a of ALERGENOS) {
    if (normKey(a.slug) === n) return a.slug
    if (normKey(a.label) === n) return a.slug
    for (const al of a.aliases || []) {
      if (normKey(al) === n) return a.slug
    }
  }
  return null
}

function emptyAlergenosSet() {
  return new Set()
}

function alergenosFromApi(arr) {
  const s = emptyAlergenosSet()
  for (const x of arr || []) {
    const sl = slugFromApiValue(x)
    if (sl) s.add(sl)
  }
  return s
}

function alergenosToApi(set) {
  return ALERGENOS.filter((a) => set.has(a.slug)).map((a) => a.slug)
}

function formatEuroFromApi(val) {
  if (val == null || val === '') return '0.00 €'
  const n = Number(val)
  if (Number.isNaN(n)) return `${String(val)} €`
  return `${n.toFixed(2)} €`
}

function formatFechaHumana(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatFechaTicket(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function emptyFormCliente() {
  return {
    nombre: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    preferencias: '',
    notas: '',
    alergenos: emptyAlergenosSet(),
  }
}

export default function ClientesPage() {
  const { user, isLoading: authLoading } = useAuth()

  const [buscarInput, setBuscarInput] = useState('')
  const [buscarDebounced, setBuscarDebounced] = useState('')
  const [puntosMin, setPuntosMin] = useState('')

  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalCliente, setModalCliente] = useState(null)
  const [formCliente, setFormCliente] = useState(emptyFormCliente)
  const [modalClienteError, setModalClienteError] = useState(null)
  const [savingCliente, setSavingCliente] = useState(false)

  const [modalHistorial, setModalHistorial] = useState(null)
  const [historialData, setHistorialData] = useState(null)
  const [historialLoading, setHistorialLoading] = useState(false)
  const [historialError, setHistorialError] = useState(null)

  const [modalPuntos, setModalPuntos] = useState(null)
  const [puntosInput, setPuntosInput] = useState('')
  const [motivoPuntos, setMotivoPuntos] = useState('')
  const [puntosSaving, setPuntosSaving] = useState(false)
  const [puntosError, setPuntosError] = useState(null)

  const puedeAcceder = user && ROLES_ACCESO.includes(user.rol)

  useEffect(() => {
    const t = setTimeout(() => setBuscarDebounced(buscarInput.trim()), 350)
    return () => clearTimeout(t)
  }, [buscarInput])

  const cargar = useCallback(async () => {
    if (!puedeAcceder) return
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (buscarDebounced) params.buscar = buscarDebounced
      if (puntosMin !== '' && puntosMin != null && !Number.isNaN(Number(puntosMin))) {
        params.puntos_min = Number(puntosMin)
      }
      const r = await api.get('/clientes', { params })
      setClientes(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar clientes')
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [puedeAcceder, buscarDebounced, puntosMin])

  useEffect(() => {
    if (!puedeAcceder) return
    cargar()
  }, [puedeAcceder, cargar])

  const abrirNuevo = () => {
    setFormCliente(emptyFormCliente())
    setModalClienteError(null)
    setModalCliente({ modo: 'nuevo' })
  }

  const abrirEditar = (c) => {
    setModalClienteError(null)
    setModalCliente({ modo: 'editar', id: c.id })
    setFormCliente({
      nombre: c.nombre || '',
      email: c.email || '',
      telefono: c.telefono || '',
      fecha_nacimiento: c.fecha_nacimiento
        ? String(c.fecha_nacimiento).slice(0, 10)
        : '',
      preferencias: c.preferencias || '',
      notas: c.notas || '',
      alergenos: alergenosFromApi(c.alergenos),
    })
  }

  const cerrarModalCliente = () => {
    if (savingCliente) return
    setModalCliente(null)
    setModalClienteError(null)
  }

  const toggleAlergeno = (slug) => {
    setFormCliente((f) => {
      const next = new Set(f.alergenos)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return { ...f, alergenos: next }
    })
  }

  const guardarCliente = async () => {
    const nom = (formCliente.nombre || '').trim()
    if (!nom) {
      setModalClienteError('El nombre es obligatorio')
      return
    }
    const alArr = alergenosToApi(formCliente.alergenos)
    setSavingCliente(true)
    setModalClienteError(null)
    const bodyBase = {
      nombre: nom,
      email: (formCliente.email || '').trim() || null,
      telefono: (formCliente.telefono || '').trim() || null,
      fecha_nacimiento: formCliente.fecha_nacimiento || null,
      preferencias: (formCliente.preferencias || '').trim() || null,
      notas: (formCliente.notas || '').trim() || null,
      alergenos: alArr,
    }
    try {
      if (modalCliente.modo === 'nuevo') {
        await api.post('/clientes', bodyBase)
      } else {
        await api.put(`/clientes/${modalCliente.id}`, bodyBase)
      }
      setModalCliente(null)
      cargar()
    } catch (e) {
      const det = e.response?.data?.detail
      setModalClienteError(
        typeof det === 'string'
          ? det
          : Array.isArray(det)
            ? det.map((x) => x.msg || x).join(', ')
            : 'No se pudo guardar'
      )
    } finally {
      setSavingCliente(false)
    }
  }

  const abrirHistorial = async (c) => {
    setModalHistorial({ id: c.id, nombre: c.nombre })
    setHistorialData(null)
    setHistorialError(null)
    setHistorialLoading(true)
    try {
      const r = await api.get(`/clientes/${c.id}/historial`)
      setHistorialData(r.data)
    } catch (e) {
      setHistorialError(e.response?.data?.detail || 'Error al cargar historial')
    } finally {
      setHistorialLoading(false)
    }
  }

  const cerrarHistorial = () => {
    setModalHistorial(null)
    setHistorialData(null)
    setHistorialError(null)
  }

  const abrirPuntos = (c) => {
    setModalPuntos({
      id: c.id,
      nombre: c.nombre,
      puntos_actuales: Number(c.puntos_fidelidad) || 0,
    })
    setPuntosInput('')
    setMotivoPuntos('')
    setPuntosError(null)
  }

  const cerrarPuntos = () => {
    if (puntosSaving) return
    setModalPuntos(null)
    setPuntosError(null)
  }

  const enviarPuntos = async (sign) => {
    if (!modalPuntos?.id) return
    const motivo = (motivoPuntos || '').trim()
    if (!motivo) {
      setPuntosError('El motivo es obligatorio')
      return
    }
    const raw = Number(puntosInput)
    if (Number.isNaN(raw) || raw === 0) {
      setPuntosError('Indica una cantidad distinta de 0')
      return
    }
    const delta = sign * Math.abs(raw)
    setPuntosSaving(true)
    setPuntosError(null)
    try {
      await api.post(`/clientes/${modalPuntos.id}/puntos`, {
        puntos: delta,
        motivo,
      })
      setModalPuntos(null)
      cargar()
    } catch (e) {
      const det = e.response?.data?.detail
      setPuntosError(typeof det === 'string' ? det : 'Error al actualizar puntos')
    } finally {
      setPuntosSaving(false)
    }
  }

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_ACCESO.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  const clienteHistorial = historialData?.cliente
  const ticketsHistorial = Array.isArray(historialData?.tickets)
    ? historialData.tickets
    : []

  return (
    <div
      className={`${PAGE_BG} px-4 py-6 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:px-6`}
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users
            className="shrink-0 text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Clientes
          </h1>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className={`${BTN_PRIMARY} w-full sm:w-auto`}
        >
          Nuevo cliente
        </button>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:max-w-md sm:flex-1">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Buscar (nombre, email, teléfono)
          </label>
          <input
            type="search"
            value={buscarInput}
            onChange={(e) => setBuscarInput(e.target.value)}
            placeholder="Buscar…"
            className={INPUT}
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Puntos mín.
          </label>
          <input
            type="number"
            min={0}
            value={puntosMin}
            onChange={(e) => setPuntosMin(e.target.value)}
            placeholder="—"
            className={INPUT}
          />
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading ? (
        <Loader />
      ) : clientes.length === 0 ? (
        <EmptyState message="No hay clientes con estos filtros" />
      ) : (
        <>
          <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
            <table className="w-full min-w-[960px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Visitas
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Gasto total
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Puntos
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Última visita
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-3 font-medium">{c.nombre}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {c.email || '—'}
                    </td>
                    <td className="px-4 py-3">{c.telefono || '—'}</td>
                    <td className="px-4 py-3">{c.total_visitas ?? 0}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatEuroFromApi(c.gasto_total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                        <Star
                          size={14}
                          className="text-amber-500"
                          strokeWidth={1.5}
                        />
                        {c.puntos_fidelidad ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatFechaHumana(c.ultima_visita)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirHistorial(c)}
                          className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-[#111827] dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]"
                          title="Ver historial"
                        >
                          <Eye size={18} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEditar(c)}
                          className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-amber-500 dark:border-[#2e3347] dark:bg-[#0f1117]"
                          title="Editar"
                        >
                          <Pencil size={18} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirPuntos(c)}
                          className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-amber-500 dark:border-[#2e3347] dark:bg-[#0f1117]"
                          title="Puntos"
                        >
                          <Star size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {clientes.map((c) => (
              <div key={c.id} className={`${SURFACE} p-4`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                    {c.nombre}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Star size={14} className="text-amber-500" strokeWidth={1.5} />
                    {c.puntos_fidelidad ?? 0} pts
                  </span>
                </div>
                <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {c.email || '—'} · {c.telefono || '—'}
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Visitas:{' '}
                  </span>
                  {c.total_visitas ?? 0}
                  <span className="mx-2 text-[#e2e5ed] dark:text-[#2e3347]">|</span>
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Gasto:{' '}
                  </span>
                  {formatEuroFromApi(c.gasto_total)}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => abrirHistorial(c)}
                    className={`${BTN_SECONDARY} w-full border-[#e2e5ed] dark:border-[#2e3347]`}
                  >
                    <Eye className="mr-2 shrink-0" size={18} strokeWidth={1.5} />
                    Ver historial
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirEditar(c)}
                    className={`${BTN_PRIMARY} w-full`}
                  >
                    <Pencil className="mr-2 shrink-0" size={18} strokeWidth={1.5} />
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalCliente ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`${SURFACE} max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 shadow-xl dark:bg-[#1a1d27]`}
          >
            <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              {modalCliente.modo === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}
            </h2>
            {modalClienteError ? (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {modalClienteError}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formCliente.nombre}
                  onChange={(e) =>
                    setFormCliente((f) => ({ ...f, nombre: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Email
                </label>
                <input
                  type="email"
                  value={formCliente.email}
                  onChange={(e) =>
                    setFormCliente((f) => ({ ...f, email: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formCliente.telefono}
                  onChange={(e) =>
                    setFormCliente((f) => ({ ...f, telefono: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={formCliente.fecha_nacimiento}
                  onChange={(e) =>
                    setFormCliente((f) => ({
                      ...f,
                      fecha_nacimiento: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Preferencias
                </label>
                <textarea
                  value={formCliente.preferencias}
                  onChange={(e) =>
                    setFormCliente((f) => ({
                      ...f,
                      preferencias: e.target.value,
                    }))
                  }
                  className={TEXTAREA}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Notas
                </label>
                <textarea
                  value={formCliente.notas}
                  onChange={(e) =>
                    setFormCliente((f) => ({ ...f, notas: e.target.value }))
                  }
                  className={TEXTAREA}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  Alérgenos
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ALERGENOS.map((a) => (
                    <label
                      key={a.slug}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2 dark:border-[#2e3347] dark:bg-[#0f1117]"
                    >
                      <input
                        type="checkbox"
                        checked={formCliente.alergenos.has(a.slug)}
                        onChange={() => toggleAlergeno(a.slug)}
                        className="h-4 w-4 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500 dark:border-[#2e3347]"
                      />
                      <span className="text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                        {a.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModalCliente}
                disabled={savingCliente}
                className={`${BTN_SECONDARY} w-full sm:w-auto`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarCliente}
                disabled={savingCliente}
                className={`${BTN_PRIMARY} w-full sm:w-auto`}
              >
                {savingCliente ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalHistorial ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`${SURFACE} max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 shadow-xl dark:bg-[#1a1d27]`}
          >
            <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              Historial — {modalHistorial.nombre}
            </h2>
            {historialLoading ? (
              <Loader />
            ) : historialError ? (
              <p className="text-red-600 dark:text-red-400">{historialError}</p>
            ) : (
              <>
                {clienteHistorial ? (
                  <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                      <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                        Visitas
                      </p>
                      <p className="text-lg font-bold">
                        {clienteHistorial.total_visitas ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                      <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                        Gasto total
                      </p>
                      <p className="text-lg font-bold">
                        {formatEuroFromApi(clienteHistorial.gasto_total)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                      <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                        Gasto medio
                      </p>
                      <p className="text-lg font-bold">
                        {formatEuroFromApi(clienteHistorial.gasto_medio)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                      <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                        Última visita
                      </p>
                      <p className="text-sm font-bold leading-tight">
                        {formatFechaHumana(clienteHistorial.ultima_visita)}
                      </p>
                    </div>
                  </div>
                ) : null}

                {ticketsHistorial.length === 0 ? (
                  <EmptyState message="Sin tickets en el historial reciente" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-[15px]">
                      <thead>
                        <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                          <th className="py-2 pr-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Fecha
                          </th>
                          <th className="py-2 pr-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Total
                          </th>
                          <th className="py-2 pr-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Método pago
                          </th>
                          <th className="py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Comensales
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticketsHistorial.map((t) => (
                          <tr
                            key={t.id}
                            className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                          >
                            <td className="py-2 pr-3">
                              {formatFechaTicket(t.cobrado_at || t.created_at)}
                            </td>
                            <td className="py-2 pr-3 font-medium">
                              {formatEuroFromApi(t.total)}
                            </td>
                            <td className="py-2 pr-3">
                              {t.metodo_pago || '—'}
                            </td>
                            <td className="py-2">
                              {t.num_comensales ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            <button
              type="button"
              onClick={cerrarHistorial}
              className={`${BTN_SECONDARY} mt-6 w-full sm:w-auto`}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      {modalPuntos ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`${SURFACE} w-full max-w-md p-6 shadow-xl dark:bg-[#1a1d27]`}
          >
            <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              Puntos — {modalPuntos.nombre} — {modalPuntos.puntos_actuales} pts
            </h2>
            {puntosError ? (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {puntosError}
              </p>
            ) : null}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Puntos (cantidad)
                </label>
                <input
                  type="number"
                  value={puntosInput}
                  onChange={(e) => setPuntosInput(e.target.value)}
                  placeholder="Ej. 50"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Motivo *
                </label>
                <input
                  type="text"
                  value={motivoPuntos}
                  onChange={(e) => setMotivoPuntos(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={puntosSaving}
                onClick={() => enviarPuntos(1)}
                className="h-12 w-full rounded-lg bg-emerald-600 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
              >
                Sumar puntos
              </button>
              <button
                type="button"
                disabled={puntosSaving}
                onClick={() => enviarPuntos(-1)}
                className="h-12 w-full rounded-lg bg-red-600 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                Restar puntos
              </button>
              <button
                type="button"
                disabled={puntosSaving}
                onClick={cerrarPuntos}
                className={`${BTN_SECONDARY} w-full`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
