import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CalendarCheck, CheckCircle, Pencil } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_ACCESO = ['admin', 'director', 'jefe_sala']

const INPUT =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
const SELECT = `${INPUT} appearance-none`
const TEXTAREA = `${INPUT} min-h-[100px] resize-y`
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
const BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
const BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40'
const PAGE_BG = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'

const ESTADOS_RESERVA = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'pendiente' },
  { value: 'confirmada', label: 'confirmada' },
  { value: 'sentada', label: 'sentada' },
  { value: 'cancelada', label: 'cancelada' },
  { value: 'no_show', label: 'no_show' },
]

const ORIGENES = [
  { value: 'telefono', label: 'Teléfono' },
  { value: 'web', label: 'Web' },
  { value: 'app', label: 'App' },
  { value: 'walk_in', label: 'Walk-in' },
]

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function horaApiToInput(hora) {
  if (hora == null || hora === '') return ''
  const s = String(hora)
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (m) {
    const h = String(Number(m[1])).padStart(2, '0')
    const min = m[2].padStart(2, '0')
    return `${h}:${min}`
  }
  return s.slice(0, 5)
}

function fechaApiToInput(fecha) {
  if (!fecha) return ''
  return String(fecha).slice(0, 10)
}

function badgeReservaClass(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'pendiente')
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  if (e === 'confirmada')
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  if (e === 'sentada')
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  if (e === 'cancelada')
    return 'bg-red-500/15 text-red-600 dark:text-red-400'
  if (e === 'no_show')
    return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

function badgeListaClass(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'esperando')
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  if (e === 'avisado')
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

function formatFechaCorta(iso) {
  if (!iso) return '—'
  const d = new Date(String(iso).slice(0, 10))
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatHoraDisplay(hora) {
  if (hora == null) return '—'
  return horaApiToInput(hora) || '—'
}

function minutosTranscurridos(iso) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 0) return '0 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return `${h} h ${rest} min`
}

function emptyFormReserva() {
  return {
    nombre_cliente: '',
    telefono: '',
    fecha: todayISO(),
    hora: '',
    num_personas: 2,
    origen: 'telefono',
    notas: '',
  }
}

function emptyFormLista() {
  return {
    nombre_cliente: '',
    telefono: '',
    num_personas: 2,
    tiempo_estimado: '',
  }
}

export default function ReservasPage() {
  const { user, isLoading: authLoading } = useAuth()

  const [mainTab, setMainTab] = useState('reservas')
  const [filtroFecha, setFiltroFecha] = useState(todayISO)
  const [filtroEstado, setFiltroEstado] = useState('')

  const [reservas, setReservas] = useState([])
  const [loadingReservas, setLoadingReservas] = useState(true)
  const [errorReservas, setErrorReservas] = useState(null)

  const [lista, setLista] = useState([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [errorLista, setErrorLista] = useState(null)

  const [listaTick, setListaTick] = useState(0)

  const [modalReserva, setModalReserva] = useState(null)
  const [formReserva, setFormReserva] = useState(emptyFormReserva)
  const [modalReservaError, setModalReservaError] = useState(null)
  const [savingReserva, setSavingReserva] = useState(false)

  const [modalEstado, setModalEstado] = useState(null)
  const [patchingEstado, setPatchingEstado] = useState(false)

  const [formLista, setFormLista] = useState(emptyFormLista)
  const [addingLista, setAddingLista] = useState(false)
  const [patchingListaId, setPatchingListaId] = useState(null)

  const puedeAcceder = user && ROLES_ACCESO.includes(user.rol)

  const cargarReservas = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingReservas(true)
    setErrorReservas(null)
    try {
      const params = {}
      if (filtroFecha) params.fecha = filtroFecha
      if (filtroEstado) params.estado = filtroEstado
      const r = await api.get('/reservas', { params })
      setReservas(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErrorReservas(e.response?.data?.detail || 'Error al cargar reservas')
      setReservas([])
    } finally {
      setLoadingReservas(false)
    }
  }, [puedeAcceder, filtroFecha, filtroEstado])

  const cargarLista = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingLista(true)
    setErrorLista(null)
    try {
      const r = await api.get('/lista-espera')
      setLista(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErrorLista(e.response?.data?.detail || 'Error al cargar lista de espera')
      setLista([])
    } finally {
      setLoadingLista(false)
    }
  }, [puedeAcceder])

  useEffect(() => {
    if (!puedeAcceder) return
    cargarReservas()
  }, [puedeAcceder, cargarReservas])

  useEffect(() => {
    if (!puedeAcceder || mainTab !== 'lista') return
    cargarLista()
  }, [puedeAcceder, mainTab, cargarLista])

  useEffect(() => {
    if (mainTab !== 'lista') return
    const id = setInterval(() => setListaTick((x) => x + 1), 30000)
    return () => clearInterval(id)
  }, [mainTab])

  const abrirNuevaReserva = () => {
    setFormReserva(emptyFormReserva())
    setModalReservaError(null)
    setModalReserva({ modo: 'nuevo' })
  }

  const abrirEditarReserva = (row) => {
    setModalReservaError(null)
    setModalReserva({ modo: 'editar', id: row.id })
    setFormReserva({
      nombre_cliente: row.nombre_cliente || '',
      telefono: row.telefono || '',
      fecha: fechaApiToInput(row.fecha) || todayISO(),
      hora: horaApiToInput(row.hora),
      num_personas: Number(row.num_personas) || 1,
      origen: row.origen || 'telefono',
      notas: row.notas || '',
    })
  }

  const cerrarModalReserva = () => {
    if (savingReserva) return
    setModalReserva(null)
    setModalReservaError(null)
  }

  const guardarReserva = async () => {
    const nom = (formReserva.nombre_cliente || '').trim()
    const tel = (formReserva.telefono || '').trim()
    if (!nom) {
      setModalReservaError('El nombre del cliente es obligatorio')
      return
    }
    if (!tel) {
      setModalReservaError('El teléfono es obligatorio')
      return
    }
    if (!formReserva.fecha) {
      setModalReservaError('La fecha es obligatoria')
      return
    }
    if (!formReserva.hora || !/^\d{1,2}:\d{2}$/.test(formReserva.hora.trim())) {
      setModalReservaError('La hora es obligatoria (HH:MM)')
      return
    }
    const np = Number(formReserva.num_personas)
    if (Number.isNaN(np) || np < 1) {
      setModalReservaError('Número de personas mínimo 1')
      return
    }

    setSavingReserva(true)
    setModalReservaError(null)
    try {
      if (modalReserva.modo === 'nuevo') {
        await api.post('/reservas', {
          nombre_cliente: nom,
          telefono: tel,
          fecha: formReserva.fecha,
          hora: formReserva.hora.trim(),
          num_personas: np,
          origen: formReserva.origen,
          notas: (formReserva.notas || '').trim() || null,
        })
      } else {
        await api.put(`/reservas/${modalReserva.id}`, {
          nombre_cliente: nom,
          telefono: tel,
          fecha: formReserva.fecha,
          hora: formReserva.hora.trim(),
          num_personas: np,
          origen: formReserva.origen,
          notas: (formReserva.notas || '').trim() || null,
        })
      }
      setModalReserva(null)
      cargarReservas()
    } catch (e) {
      const det = e.response?.data?.detail
      setModalReservaError(
        typeof det === 'string'
          ? det
          : Array.isArray(det)
            ? det.map((x) => x.msg || x).join(', ')
            : 'No se pudo guardar'
      )
    } finally {
      setSavingReserva(false)
    }
  }

  const abrirModalEstado = (row) => {
    setModalEstado(row)
  }

  const cerrarModalEstado = () => {
    if (patchingEstado) return
    setModalEstado(null)
  }

  const aplicarEstadoReserva = async (estado) => {
    if (!modalEstado?.id) return
    setPatchingEstado(true)
    try {
      await api.patch(`/reservas/${modalEstado.id}/estado`, { estado })
      setModalEstado(null)
      cargarReservas()
    } catch (e) {
      const det = e.response?.data?.detail
      alert(typeof det === 'string' ? det : 'Error al cambiar estado')
    } finally {
      setPatchingEstado(false)
    }
  }

  const confirmarRapido = async (row) => {
    try {
      await api.patch(`/reservas/${row.id}/estado`, { estado: 'confirmada' })
      cargarReservas()
    } catch (e) {
      const det = e.response?.data?.detail
      alert(typeof det === 'string' ? det : 'Error')
    }
  }

  const anadirLista = async () => {
    const nom = (formLista.nombre_cliente || '').trim()
    const tel = (formLista.telefono || '').trim()
    const np = Number(formLista.num_personas)
    if (!nom || !tel) {
      alert('Nombre y teléfono son obligatorios')
      return
    }
    if (Number.isNaN(np) || np < 1) {
      alert('Personas mínimo 1')
      return
    }
    const te = formLista.tiempo_estimado
    const body = {
      nombre_cliente: nom,
      telefono: tel,
      num_personas: np,
    }
    if (te !== '' && te != null && !Number.isNaN(Number(te))) {
      body.tiempo_estimado = Number(te)
    }
    setAddingLista(true)
    try {
      await api.post('/lista-espera', body)
      setFormLista(emptyFormLista())
      cargarLista()
    } catch (e) {
      const det = e.response?.data?.detail
      alert(typeof det === 'string' ? det : 'Error al añadir')
    } finally {
      setAddingLista(false)
    }
  }

  const patchListaEstado = async (id, estado) => {
    setPatchingListaId(id)
    try {
      await api.patch(`/lista-espera/${id}/estado`, { estado })
      cargarLista()
    } catch (e) {
      const det = e.response?.data?.detail
      alert(typeof det === 'string' ? det : 'Error')
    } finally {
      setPatchingListaId(null)
    }
  }

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_ACCESO.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div
      className={`${PAGE_BG} min-w-0 overflow-x-hidden px-4 py-6 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:px-6`}
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck
            className="shrink-0 text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Reservas
          </h1>
        </div>
        <button
          type="button"
          onClick={abrirNuevaReserva}
          className={`${BTN_PRIMARY} w-full sm:w-auto`}
        >
          Nueva reserva
        </button>
      </header>

      <div className="mb-6 flex gap-2 border-b border-[#e2e5ed] dark:border-[#2e3347]">
        <button
          type="button"
          onClick={() => setMainTab('reservas')}
          className={`h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors ${
            mainTab === 'reservas'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Reservas
        </button>
        <button
          type="button"
          onClick={() => setMainTab('lista')}
          className={`h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors ${
            mainTab === 'lista'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Lista de espera
        </button>
      </div>

      {mainTab === 'reservas' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-auto sm:min-w-[180px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Fecha
              </label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="w-full min-w-0 sm:max-w-[240px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className={SELECT}
              >
                {ESTADOS_RESERVA.map((o) => (
                  <option key={o.value || 'todos'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorReservas ? (
            <p className="mb-4 text-red-600 dark:text-red-400">{errorReservas}</p>
          ) : null}

          {loadingReservas ? (
            <Loader />
          ) : reservas.length === 0 ? (
            <EmptyState message="No hay reservas para esta fecha y filtros" />
          ) : (
            <>
              <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
                <table className="w-full min-w-[800px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Cliente
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Teléfono
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Fecha
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Hora
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Personas
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Mesa
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Estado
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservas.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        <td className="px-4 py-3 font-medium">{r.nombre_cliente}</td>
                        <td className="px-4 py-3">{r.telefono}</td>
                        <td className="px-4 py-3">{formatFechaCorta(r.fecha)}</td>
                        <td className="px-4 py-3">{formatHoraDisplay(r.hora)}</td>
                        <td className="px-4 py-3">{r.num_personas}</td>
                        <td className="px-4 py-3">
                          {r.mesa_numero != null ? `#${r.mesa_numero}` : '—'}
                          {r.zona ? (
                            <span className="ml-1 text-[#6b7280] dark:text-[#8b90a7]">
                              ({r.zona})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeReservaClass(r.estado)}`}
                          >
                            {r.estado || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => abrirModalEstado(r)}
                              className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-emerald-600 dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-emerald-400"
                              title="Cambiar estado"
                            >
                              <CheckCircle size={20} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirEditarReserva(r)}
                              className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-amber-500 dark:border-[#2e3347] dark:bg-[#0f1117]"
                              title="Editar"
                            >
                              <Pencil size={18} strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {reservas.map((r) => (
                  <div
                    key={r.id}
                    className={`${SURFACE} p-4 shadow-sm`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                        {r.nombre_cliente}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeReservaClass(r.estado)}`}
                      >
                        {r.estado}
                      </span>
                    </div>
                    <p className="mb-2 text-[#6b7280] dark:text-[#8b90a7]">
                      {formatFechaCorta(r.fecha)} · {formatHoraDisplay(r.hora)} ·{' '}
                      {r.num_personas} pers.
                    </p>
                    <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                      Mesa:{' '}
                      {r.mesa_numero != null ? `#${r.mesa_numero}` : '—'}
                      {r.zona ? ` · ${r.zona}` : ''}
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => confirmarRapido(r)}
                        className={`${BTN_PRIMARY} w-full bg-blue-600 text-white hover:bg-blue-700`}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEditarReserva(r)}
                        className={`${BTN_SECONDARY} w-full border-amber-500/40 text-amber-500`}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <span className="sr-only" aria-live="polite">
            {listaTick}
          </span>
          <div
            className={`${SURFACE} mb-6 p-4 dark:bg-[#1a1d27]`}
          >
            <p className="mb-3 text-sm font-semibold text-[#6b7280] dark:text-[#8b90a7]">
              Añadir a lista de espera
            </p>
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="min-w-0 flex-1 lg:max-w-[200px]">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formLista.nombre_cliente}
                  onChange={(e) =>
                    setFormLista((f) => ({
                      ...f,
                      nombre_cliente: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div className="min-w-0 flex-1 lg:max-w-[160px]">
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={formLista.telefono}
                  onChange={(e) =>
                    setFormLista((f) => ({ ...f, telefono: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div className="w-full sm:w-28">
                <input
                  type="number"
                  min={1}
                  placeholder="Pers."
                  value={formLista.num_personas}
                  onChange={(e) =>
                    setFormLista((f) => ({
                      ...f,
                      num_personas: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div className="w-full sm:w-36">
                <input
                  type="number"
                  min={0}
                  placeholder="Min. estimados"
                  value={formLista.tiempo_estimado}
                  onChange={(e) =>
                    setFormLista((f) => ({
                      ...f,
                      tiempo_estimado: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <button
                type="button"
                onClick={anadirLista}
                disabled={addingLista}
                className={`${BTN_PRIMARY} w-full lg:w-auto`}
              >
                Añadir a lista
              </button>
            </div>
          </div>

          {errorLista ? (
            <p className="mb-4 text-red-600 dark:text-red-400">{errorLista}</p>
          ) : null}

          {loadingLista ? (
            <Loader />
          ) : lista.length === 0 ? (
            <EmptyState message="Lista de espera vacía" />
          ) : (
            <>
              <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
                <table className="w-full min-w-[900px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Cliente
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Tel
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Personas
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Llegada
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Transcurrido
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Espera estimada
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Estado
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        <td className="px-4 py-3 font-medium">
                          {row.nombre_cliente}
                        </td>
                        <td className="px-4 py-3">{row.telefono}</td>
                        <td className="px-4 py-3">{row.num_personas}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.hora_llegada
                            ? new Date(row.hora_llegada).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {minutosTranscurridos(row.hora_llegada)}
                        </td>
                        <td className="px-4 py-3">
                          {row.tiempo_estimado != null
                            ? `${row.tiempo_estimado} min`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeListaClass(row.estado)}`}
                          >
                            {row.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={patchingListaId === row.id}
                              onClick={() => patchListaEstado(row.id, 'avisado')}
                              className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-3 text-sm font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
                            >
                              Avisar
                            </button>
                            <button
                              type="button"
                              disabled={patchingListaId === row.id}
                              onClick={() => patchListaEstado(row.id, 'sentado')}
                              className="h-12 min-h-[48px] rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                            >
                              Sentar
                            </button>
                            <button
                              type="button"
                              disabled={patchingListaId === row.id}
                              onClick={() =>
                                patchListaEstado(row.id, 'cancelado')
                              }
                              className="h-12 min-h-[48px] rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {lista.map((row) => (
                  <div key={row.id} className={`${SURFACE} p-4`}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-lg font-bold">{row.nombre_cliente}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeListaClass(row.estado)}`}
                      >
                        {row.estado}
                      </span>
                    </div>
                    <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                      {row.telefono} · {row.num_personas} pers.
                    </p>
                    <p className="mt-1 text-sm">
                      Llegada:{' '}
                      {row.hora_llegada
                        ? new Date(row.hora_llegada).toLocaleString('es-ES')
                        : '—'}
                    </p>
                    <p className="text-sm text-amber-500">
                      Esperando: {minutosTranscurridos(row.hora_llegada)}
                    </p>
                    {row.tiempo_estimado != null ? (
                      <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                        Estimado: {row.tiempo_estimado} min
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={patchingListaId === row.id}
                        onClick={() => patchListaEstado(row.id, 'avisado')}
                        className={`${BTN_PRIMARY} w-full`}
                      >
                        Avisar
                      </button>
                      <button
                        type="button"
                        disabled={patchingListaId === row.id}
                        onClick={() => patchListaEstado(row.id, 'sentado')}
                        className="h-12 w-full rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        Sentar
                      </button>
                      <button
                        type="button"
                        disabled={patchingListaId === row.id}
                        onClick={() => patchListaEstado(row.id, 'cancelado')}
                        className="h-12 w-full rounded-lg bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {modalReserva ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
        >
          <div
            className={`${SURFACE} max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl dark:bg-[#1a1d27]`}
          >
            <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              {modalReserva.modo === 'nuevo' ? 'Nueva reserva' : 'Editar reserva'}
            </h2>
            {modalReservaError ? (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {modalReservaError}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Nombre cliente *
                </label>
                <input
                  type="text"
                  value={formReserva.nombre_cliente}
                  onChange={(e) =>
                    setFormReserva((f) => ({
                      ...f,
                      nombre_cliente: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={formReserva.telefono}
                  onChange={(e) =>
                    setFormReserva((f) => ({ ...f, telefono: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formReserva.fecha}
                  onChange={(e) =>
                    setFormReserva((f) => ({ ...f, fecha: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Hora *
                </label>
                <input
                  type="time"
                  value={formReserva.hora}
                  onChange={(e) =>
                    setFormReserva((f) => ({ ...f, hora: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Personas
                </label>
                <input
                  type="number"
                  min={1}
                  value={formReserva.num_personas}
                  onChange={(e) =>
                    setFormReserva((f) => ({
                      ...f,
                      num_personas: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Origen
                </label>
                <select
                  value={formReserva.origen}
                  onChange={(e) =>
                    setFormReserva((f) => ({ ...f, origen: e.target.value }))
                  }
                  className={SELECT}
                >
                  {ORIGENES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Notas
                </label>
                <textarea
                  value={formReserva.notas}
                  onChange={(e) =>
                    setFormReserva((f) => ({ ...f, notas: e.target.value }))
                  }
                  className={TEXTAREA}
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModalReserva}
                disabled={savingReserva}
                className={`${BTN_SECONDARY} w-full sm:w-auto`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarReserva}
                disabled={savingReserva}
                className={`${BTN_PRIMARY} w-full sm:w-auto`}
              >
                {savingReserva ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalEstado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`${SURFACE} w-full max-w-md p-6 shadow-xl dark:bg-[#1a1d27]`}
          >
            <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              Cambiar estado — {modalEstado.nombre_cliente}
            </h2>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={patchingEstado}
                onClick={() => aplicarEstadoReserva('confirmada')}
                className="h-12 w-full rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Confirmar
              </button>
              <button
                type="button"
                disabled={patchingEstado}
                onClick={() => aplicarEstadoReserva('sentada')}
                className="h-12 w-full rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Sentar
              </button>
              <button
                type="button"
                disabled={patchingEstado}
                onClick={() => aplicarEstadoReserva('cancelada')}
                className="h-12 w-full rounded-lg bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              >
                Cancelar reserva
              </button>
              <button
                type="button"
                disabled={patchingEstado}
                onClick={() => aplicarEstadoReserva('no_show')}
                className="h-12 w-full rounded-lg bg-gray-600 font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
              >
                No show
              </button>
              <button
                type="button"
                disabled={patchingEstado}
                onClick={cerrarModalEstado}
                className={`${BTN_SECONDARY} mt-2 w-full`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
