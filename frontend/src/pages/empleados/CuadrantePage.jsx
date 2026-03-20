import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_CUADRANTE = ['admin', 'director', 'jefe_sala']

const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const PUESTO_OPTIONS = [
  { value: 'sala', label: 'Sala' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'barra', label: 'Barra' },
  { value: 'almacen', label: 'Almacén' },
]

function puestoPillClass(puesto) {
  const p = String(puesto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0300/g, '')
  if (p === 'sala')
    return 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
  if (p === 'cocina')
    return 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
  if (p === 'barra')
    return 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
  if (p === 'almacen' || p === 'almacén')
    return 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
  return 'bg-[#e2e5ed]/40 text-[#374151] dark:bg-[#2e3347]/60 dark:text-[#9ca3af]'
}

const SELECT =
  'w-full min-h-[48px] rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const INPUT =
  'w-full min-h-[48px] rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black hover:bg-amber-600 disabled:opacity-40'
const BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0]'
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'

function mondayOfDate(ref) {
  const d = new Date(ref)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  x.setHours(0, 0, 0, 0)
  return x
}

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDM(d) {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

function timeToHHMM(t) {
  if (t == null || t === '') return ''
  const s = String(t)
  if (s.includes('T')) return s.split('T')[1].slice(0, 5)
  return s.slice(0, 5)
}

function displayHora(t) {
  const h = timeToHHMM(t)
  return h || '—'
}

function normalizeAssignment(a) {
  return {
    empleado_id: String(a.empleado_id),
    fecha: String(a.fecha).slice(0, 10),
    hi: timeToHHMM(a.hora_inicio),
    hf: timeToHHMM(a.hora_fin),
    puesto: String(a.puesto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\u0300/g, ''),
  }
}

function multisetDiffCount(baseline, current) {
  const key = (x) => JSON.stringify(x)
  const countMap = (arr) => {
    const m = new Map()
    for (const raw of arr) {
      const k = key(normalizeAssignment(raw))
      m.set(k, (m.get(k) || 0) + 1)
    }
    return m
  }
  const mb = countMap(baseline)
  const mc = countMap(current)
  const all = new Set([...mb.keys(), ...mc.keys()])
  let diff = 0
  for (const k of all) {
    diff += Math.abs((mb.get(k) || 0) - (mc.get(k) || 0))
  }
  return diff
}

export default function CuadrantePage() {
  const { user, isLoading: authLoading } = useAuth()

  const [lunes, setLunes] = useState(() => mondayOfDate(new Date()))
  const [empleados, setEmpleados] = useState([])
  const [loadingEmp, setLoadingEmp] = useState(true)
  const [errorEmp, setErrorEmp] = useState(null)

  const [asignaciones, setAsignaciones] = useState([])
  const [baseline, setBaseline] = useState([])
  const [loadingCuad, setLoadingCuad] = useState(true)
  const [errorCuad, setErrorCuad] = useState(null)

  const [expandedMobile, setExpandedMobile] = useState({})
  const [modalAdd, setModalAdd] = useState(null)
  const [modalForm, setModalForm] = useState({
    hora_inicio: '',
    hora_fin: '',
    puesto: 'sala',
  })
  const [modalErr, setModalErr] = useState(null)
  const [publishError, setPublishError] = useState(null)
  const [publishing, setPublishing] = useState(false)

  const domingo = useMemo(() => addDays(lunes, 6), [lunes])
  const diasSemana = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(lunes, i)),
    [lunes]
  )

  const semanaInicioISO = toISODate(lunes)
  const semanaFinISO = toISODate(domingo)

  const puedeAcceder = user && ROLES_CUADRANTE.includes(user.rol)

  const pendientesCount = useMemo(
    () => multisetDiffCount(baseline, asignaciones),
    [baseline, asignaciones]
  )

  const cargarEmpleados = useCallback(async () => {
    setLoadingEmp(true)
    setErrorEmp(null)
    try {
      const r = await api.get('/empleados', { params: { activo: true } })
      setEmpleados(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErrorEmp(e.response?.data?.detail || 'Error al cargar empleados')
      setEmpleados([])
    } finally {
      setLoadingEmp(false)
    }
  }, [])

  const cargarCuadrante = useCallback(async () => {
    setLoadingCuad(true)
    setErrorCuad(null)
    try {
      const r = await api.get('/cuadrantes', {
        params: { semana_inicio: semanaInicioISO },
      })
      const data = r.data
      const list = data?.asignaciones
        ? data.asignaciones.map((a) => ({
            ...a,
            _key: a.id,
          }))
        : []
      setAsignaciones(list)
      setBaseline(JSON.parse(JSON.stringify(list)))
    } catch (e) {
      setErrorCuad(e.response?.data?.detail || 'Error al cargar cuadrante')
      setAsignaciones([])
      setBaseline([])
    } finally {
      setLoadingCuad(false)
    }
  }, [semanaInicioISO])

  useEffect(() => {
    if (!puedeAcceder) return
    cargarEmpleados()
  }, [puedeAcceder, cargarEmpleados])

  useEffect(() => {
    if (!puedeAcceder) return
    cargarCuadrante()
  }, [puedeAcceder, cargarCuadrante])

  const semanaAnterior = () => {
    if (pendientesCount > 0) {
      const ok = window.confirm(
        'Hay cambios sin publicar. ¿Descartar y cambiar de semana?'
      )
      if (!ok) return
    }
    setLunes((d) => addDays(d, -7))
  }

  const semanaSiguiente = () => {
    if (pendientesCount > 0) {
      const ok = window.confirm(
        'Hay cambios sin publicar. ¿Descartar y cambiar de semana?'
      )
      if (!ok) return
    }
    setLunes((d) => addDays(d, 7))
  }

  const nombreEmpleado = (id) => {
    const e = empleados.find((x) => x.id === id)
    return e?.nombre_empleado || e?.nombre_completo || id
  }

  const asignacionesDeCelda = (empleadoId, fechaISO) =>
    asignaciones.filter(
      (a) =>
        String(a.empleado_id) === String(empleadoId) &&
        String(a.fecha).slice(0, 10) === fechaISO
    )

  const abrirModalAdd = (empleadoId, fechaISO) => {
    setModalAdd({ empleado_id: empleadoId, fecha: fechaISO })
    setModalForm({ hora_inicio: '09:00', hora_fin: '17:00', puesto: 'sala' })
    setModalErr(null)
  }

  const cerrarModal = () => {
    setModalAdd(null)
  }

  const guardarModalLocal = () => {
    if (!modalAdd) return
    const { hora_inicio, hora_fin, puesto } = modalForm
    if (!hora_inicio || !hora_fin) {
      setModalErr('Indica hora de inicio y fin')
      return
    }
    const nuevo = {
      _key: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      empleado_id: modalAdd.empleado_id,
      fecha: modalAdd.fecha,
      hora_inicio: hora_inicio.length === 5 ? `${hora_inicio}:00` : hora_inicio,
      hora_fin: hora_fin.length === 5 ? `${hora_fin}:00` : hora_fin,
      puesto,
      nombre_empleado: nombreEmpleado(modalAdd.empleado_id),
    }
    setAsignaciones((prev) => [...prev, nuevo])
    setPublishError(null)
    cerrarModal()
  }

  const quitarAsignacion = (key) => {
    setAsignaciones((prev) => prev.filter((a) => (a._key || a.id) !== key))
  }

  const publicarCuadrante = async () => {
    setPublishing(true)
    setPublishError(null)
    try {
      const body = {
        semana_inicio: semanaInicioISO,
        semana_fin: semanaFinISO,
        asignaciones: asignaciones.map((a) => ({
          empleado_id: String(a.empleado_id),
          fecha: String(a.fecha).slice(0, 10),
          hora_inicio: timeToHHMM(a.hora_inicio) || null,
          hora_fin: timeToHHMM(a.hora_fin) || null,
          puesto: a.puesto || null,
        })),
      }
      await api.post('/cuadrantes', body)
      await cargarCuadrante()
    } catch (e) {
      setPublishError(
        e.response?.data?.detail || 'No se pudo publicar el cuadrante'
      )
    } finally {
      setPublishing(false)
    }
  }

  const toggleExpand = (id) => {
    setExpandedMobile((m) => ({ ...m, [id]: !m[id] }))
  }

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_CUADRANTE.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div className="min-h-full text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarDays
            className="text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Cuadrante Semanal
          </h1>
          {pendientesCount > 0 ? (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[13px] font-semibold text-amber-700 dark:text-amber-400">
              Sin publicar ({pendientesCount}{' '}
              {pendientesCount === 1 ? 'cambio' : 'cambios'})
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={publicarCuadrante}
          disabled={publishing || pendientesCount === 0}
          className={BTN_PRIMARY}
        >
          {publishing ? 'Publicando…' : 'Publicar cuadrante'}
        </button>
      </header>

      {publishError ? (
        <p className="mb-4 text-[15px] text-red-600 dark:text-red-400">
          {publishError}
        </p>
      ) : null}

      <div
        className={`mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between ${SURFACE} p-4`}
      >
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <button
            type="button"
            onClick={semanaAnterior}
            className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={semanaSiguiente}
            className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={22} strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-center text-[16px] font-semibold text-[#111827] dark:text-[#e8eaf0] sm:text-left">
          Semana del {formatDM(lunes)} al {formatDM(domingo)}
        </p>
      </div>

      {errorEmp ? (
        <p className="mb-3 text-red-600 dark:text-red-400">{errorEmp}</p>
      ) : null}
      {errorCuad ? (
        <p className="mb-3 text-red-600 dark:text-red-400">{errorCuad}</p>
      ) : null}

      {loadingEmp || loadingCuad ? (
        <Loader />
      ) : empleados.length === 0 ? (
        <EmptyState message="No hay empleados activos" />
      ) : (
        <>
          {/* Desktop */}
          <div
            className={`hidden overflow-x-auto md:block ${SURFACE} p-2 lg:p-4`}
          >
            <table className="w-full min-w-[900px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="sticky left-0 z-10 min-w-[140px] bg-white px-2 py-2 font-semibold dark:bg-[#1a1d27]">
                    Empleado
                  </th>
                  {diasSemana.map((dia, i) => (
                    <th
                      key={toISODate(dia)}
                      className="px-1 py-2 text-center font-semibold text-[#111827] dark:text-[#e8eaf0]"
                    >
                      <div>{DIAS_CORTO[i]}</div>
                      <div className="text-[12px] font-normal text-[#6b7280] dark:text-[#8b90a7]">
                        {formatDM(dia)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empleados.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="sticky left-0 z-10 bg-white px-2 py-2 font-medium text-[#111827] dark:bg-[#1a1d27] dark:text-[#e8eaf0]">
                      {emp.nombre_empleado || emp.nombre_completo || emp.id}
                    </td>
                    {diasSemana.map((dia) => {
                      const f = toISODate(dia)
                      const celdas = asignacionesDeCelda(emp.id, f)
                      return (
                        <td key={f} className="align-top px-1 py-2">
                          <div className="flex min-h-[72px] flex-col gap-1">
                            {celdas.map((a) => (
                              <div
                                key={a._key || a.id}
                                className={`group relative flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium ${puestoPillClass(a.puesto)}`}
                              >
                                <span className="flex-1 truncate">
                                  {displayHora(a.hora_inicio)}-
                                  {displayHora(a.hora_fin)}{' '}
                                  <span className="opacity-80">
                                    {a.puesto || '—'}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    quitarAsignacion(a._key || a.id)
                                  }
                                  className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
                                  aria-label="Quitar turno"
                                >
                                  <X size={14} strokeWidth={1.5} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => abrirModalAdd(emp.id, f)}
                              className="mt-auto inline-flex h-8 w-8 items-center justify-center self-center rounded-lg border border-dashed border-[#e2e5ed] text-[#6b7280] dark:border-[#2e3347] dark:text-[#8b90a7]"
                              aria-label="Añadir turno"
                            >
                              <Plus size={16} strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <div className="flex flex-col gap-3 md:hidden">
            {empleados.map((emp) => {
              const exp = expandedMobile[emp.id]
              const turnosEmp = asignaciones
                .filter((a) => String(a.empleado_id) === String(emp.id))
                .sort(
                  (a, b) =>
                    String(a.fecha).localeCompare(String(b.fecha)) ||
                    String(a.hora_inicio).localeCompare(String(b.hora_inicio))
                )
              return (
                <div key={emp.id} className={SURFACE}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(emp.id)}
                    className="flex w-full min-h-[48px] items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {emp.nombre_empleado || emp.nombre_completo || emp.id}
                    </span>
                    <ChevronRight
                      size={20}
                      strokeWidth={1.5}
                      className={`shrink-0 text-[#6b7280] transition-transform dark:text-[#8b90a7] ${exp ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {exp ? (
                    <div className="border-t border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]">
                      {turnosEmp.length === 0 ? (
                        <p className="text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                          Sin turnos esta semana
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {turnosEmp.map((a) => (
                            <li
                              key={a._key || a.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e5ed] px-3 py-2 dark:border-[#2e3347]"
                            >
                              <div>
                                <p className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                                  {String(a.fecha).slice(0, 10)
                                    .split('-')
                                    .reverse()
                                    .join('/')}
                                </p>
                                <p
                                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[13px] ${puestoPillClass(a.puesto)}`}
                                >
                                  {displayHora(a.hora_inicio)} -{' '}
                                  {displayHora(a.hora_fin)} · {a.puesto || '—'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  quitarAsignacion(a._key || a.id)
                                }
                                className="shrink-0 rounded-lg p-2 text-red-600 dark:text-red-400"
                                aria-label="Quitar"
                              >
                                <X size={18} strokeWidth={1.5} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {diasSemana.map((dia) => {
                          const f = toISODate(dia)
                          return (
                            <button
                              key={f}
                              type="button"
                              onClick={() => abrirModalAdd(emp.id, f)}
                              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[#e2e5ed] px-3 py-2 text-[13px] dark:border-[#2e3347]"
                            >
                              <Plus size={16} strokeWidth={1.5} />
                              {DIAS_CORTO[diasSemana.findIndex((d) => toISODate(d) === f)]}{' '}
                              {formatDM(dia)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      )}

      {modalAdd ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:rounded-xl"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              Añadir turno
            </h2>
            <div className="mb-3 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
              <p>
                <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                  Empleado:
                </span>{' '}
                {nombreEmpleado(modalAdd.empleado_id)}
              </p>
              <p className="mt-1">
                <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                  Fecha:
                </span>{' '}
                {modalAdd.fecha.split('-').reverse().join('/')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-[15px]">
                <span className="text-[#111827] dark:text-[#e8eaf0]">
                  Hora inicio
                </span>
                <input
                  type="time"
                  value={modalForm.hora_inicio}
                  onChange={(e) =>
                    setModalForm((f) => ({
                      ...f,
                      hora_inicio: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px]">
                <span className="text-[#111827] dark:text-[#e8eaf0]">
                  Hora fin
                </span>
                <input
                  type="time"
                  value={modalForm.hora_fin}
                  onChange={(e) =>
                    setModalForm((f) => ({ ...f, hora_fin: e.target.value }))
                  }
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px]">
                <span className="text-[#111827] dark:text-[#e8eaf0]">
                  Puesto
                </span>
                <select
                  value={modalForm.puesto}
                  onChange={(e) =>
                    setModalForm((f) => ({ ...f, puesto: e.target.value }))
                  }
                  className={SELECT}
                >
                  {PUESTO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {modalErr ? (
              <p className="mt-3 text-[14px] text-red-600 dark:text-red-400">
                {modalErr}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModal}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarModalLocal}
                className={BTN_PRIMARY}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
