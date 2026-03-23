import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Clock, LogIn, LogOut } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_FICHAJES = [
  'admin',
  'director',
  'jefe_sala',
  'camarero',
  'cocina',
  'barra',
  'almacen',
]

const STORAGE_FICHAR_LOGIN = 'horecaso_fichar_al_login'

function readFicharAlLogin() {
  try {
    return localStorage.getItem(STORAGE_FICHAR_LOGIN) !== '0'
  } catch {
    return true
  }
}

function writeFicharAlLogin(v) {
  try {
    localStorage.setItem(STORAGE_FICHAR_LOGIN, v ? '1' : '0')
  } catch {
    /* ignore */
  }
}

const STORAGE_PREFIX = 'horecaso_fichaje_activo_'

function hoyLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fechaTurnoISO(t) {
  if (!t?.fecha) return ''
  return String(t.fecha).slice(0, 10)
}

function parseHoraToToday(horaStr, fechaBase) {
  if (!horaStr) return null
  const part = String(horaStr).slice(0, 8)
  const [hh, mm, ss] = part.split(':').map((x) => parseInt(x, 10) || 0)
  const [y, mo, d] = fechaBase.split('-').map((x) => parseInt(x, 10))
  return new Date(y, mo - 1, d, hh, mm, ss || 0)
}

function formatHora(isoOrTime) {
  if (!isoOrTime) return '—'
  const s = String(isoOrTime)
  if (s.length >= 8 && s.includes(':')) {
    const t = s.includes('T') ? s.split('T')[1] : s
    return t.slice(0, 5)
  }
  try {
    return new Date(s).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function formatHoras(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${Number(n).toFixed(2)} h`
}

function readFichajeStorage(empleadoId) {
  if (!empleadoId) return null
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${empleadoId}`)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (o.fecha !== hoyLocalISO()) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${empleadoId}`)
      return null
    }
    return o
  } catch {
    return null
  }
}

function writeFichajeStorage(empleadoId, payload) {
  sessionStorage.setItem(
    `${STORAGE_PREFIX}${empleadoId}`,
    JSON.stringify(payload)
  )
}

function clearFichajeStorage(empleadoId) {
  sessionStorage.removeItem(`${STORAGE_PREFIX}${empleadoId}`)
}

const SELECT =
  'w-full min-w-0 max-w-full min-h-[48px] rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const INPUT =
  'w-full min-w-0 max-w-full min-h-[48px] rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'

export default function FichajesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [ficharAlLogin, setFicharAlLoginState] = useState(readFicharAlLogin)

  const [empleados, setEmpleados] = useState([])
  const [loadingEmp, setLoadingEmp] = useState(true)
  const [errorEmp, setErrorEmp] = useState(null)

  const [empleadoPanel, setEmpleadoPanel] = useState('')
  const [turnoActivoApi, setTurnoActivoApi] = useState(null)
  const [loadingPanel, setLoadingPanel] = useState(false)
  const [panelError, setPanelError] = useState(null)
  const [fichando, setFichando] = useState(false)
  const [resumenFichaje, setResumenFichaje] = useState(null)
  const [tick, setTick] = useState(0)

  const [fechaHistorial, setFechaHistorial] = useState(() => hoyLocalISO())
  const [empleadoHistorial, setEmpleadoHistorial] = useState('')
  const [turnosHistorial, setTurnosHistorial] = useState([])
  const [loadingHist, setLoadingHist] = useState(true)
  const [errorHist, setErrorHist] = useState(null)
  const [turnosForbidden, setTurnosForbidden] = useState(false)

  const puedeAcceder =
    user && ROLES_FICHAJES.includes(user.rol)

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const cargarEmpleados = useCallback(async () => {
    setLoadingEmp(true)
    setErrorEmp(null)
    try {
      const r = await api.get('/empleados')
      setEmpleados(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErrorEmp(e.response?.data?.detail || 'No se pudo cargar la lista de empleados')
      setEmpleados([])
    } finally {
      setLoadingEmp(false)
    }
  }, [])

  useEffect(() => {
    if (!puedeAcceder) return
    cargarEmpleados()
  }, [puedeAcceder, cargarEmpleados])

  const refrescarTurnoPanel = useCallback(async () => {
    if (!empleadoPanel) {
      setTurnoActivoApi(null)
      return
    }
    setLoadingPanel(true)
    setPanelError(null)
    try {
      const r = await api.get('/turnos', {
        params: {
          fecha: hoyLocalISO(),
          empleado_id: empleadoPanel,
        },
      })
      const list = Array.isArray(r.data) ? r.data : []
      const act = list.find(
        (t) =>
          t.hora_entrada &&
          !t.hora_salida &&
          fechaTurnoISO(t) === hoyLocalISO()
      )
      setTurnoActivoApi(act || null)
      if (act) {
        writeFichajeStorage(empleadoPanel, {
          fecha: hoyLocalISO(),
          hora_entrada: act.hora_entrada,
          empleado_id: empleadoPanel,
        })
      } else {
        clearFichajeStorage(empleadoPanel)
      }
      setTurnosForbidden(false)
    } catch (e) {
      if (e.response?.status === 403) {
        setTurnosForbidden(true)
        setTurnoActivoApi(null)
      } else {
        setPanelError(e.response?.data?.detail || 'Error al consultar turnos')
        setTurnoActivoApi(null)
      }
    } finally {
      setLoadingPanel(false)
    }
  }, [empleadoPanel])

  useEffect(() => {
    if (!empleadoPanel) {
      setTurnoActivoApi(null)
      return
    }
    refrescarTurnoPanel()
  }, [empleadoPanel, refrescarTurnoPanel])

  const storedActivo = useMemo(() => {
    if (!empleadoPanel) return null
    return readFichajeStorage(empleadoPanel)
  }, [empleadoPanel, turnoActivoApi, tick])

  const turnoActivoEfectivo = turnoActivoApi
    ? {
        hora_entrada: turnoActivoApi.hora_entrada,
        desdeApi: true,
      }
    : storedActivo && storedActivo.hora_entrada
      ? {
          hora_entrada: storedActivo.hora_entrada,
          desdeApi: false,
        }
      : null

  const tiempoTranscurrido = useMemo(() => {
    if (!turnoActivoEfectivo?.hora_entrada) return null
    const start = parseHoraToToday(
      turnoActivoEfectivo.hora_entrada,
      hoyLocalISO()
    )
    if (!start || Number.isNaN(start.getTime())) return null
    const diff = Math.max(0, Date.now() - start.getTime())
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [turnoActivoEfectivo, tick])

  const cargarHistorial = useCallback(async () => {
    setLoadingHist(true)
    setErrorHist(null)
    try {
      const params = { fecha: fechaHistorial }
      if (empleadoHistorial) params.empleado_id = empleadoHistorial
      const r = await api.get('/turnos', { params })
      setTurnosHistorial(Array.isArray(r.data) ? r.data : [])
      setTurnosForbidden(false)
    } catch (e) {
      if (e.response?.status === 403) {
        setTurnosForbidden(true)
        setTurnosHistorial([])
        setErrorHist(null)
      } else {
        setErrorHist(e.response?.data?.detail || 'Error al cargar historial')
        setTurnosHistorial([])
      }
    } finally {
      setLoadingHist(false)
    }
  }, [fechaHistorial, empleadoHistorial])

  useEffect(() => {
    if (!puedeAcceder) return
    cargarHistorial()
  }, [puedeAcceder, cargarHistorial])

  const ficharEntrada = async () => {
    if (!empleadoPanel) return
    setFichando(true)
    setPanelError(null)
    setResumenFichaje(null)
    try {
      const r = await api.post('/turnos/fichaje-entrada', {
        empleado_id: empleadoPanel,
      })
      writeFichajeStorage(empleadoPanel, {
        fecha: r.data?.fecha || hoyLocalISO(),
        hora_entrada: r.data?.hora_entrada,
        empleado_id: empleadoPanel,
      })
      setResumenFichaje({
        tipo: 'entrada',
        msg: `Entrada registrada a las ${formatHora(r.data?.hora_entrada)}`,
      })
      await refrescarTurnoPanel()
      cargarHistorial()
    } catch (e) {
      setPanelError(e.response?.data?.detail || 'No se pudo fichar la entrada')
    } finally {
      setFichando(false)
    }
  }

  const ficharSalida = async () => {
    if (!empleadoPanel) return
    setFichando(true)
    setPanelError(null)
    setResumenFichaje(null)
    try {
      const r = await api.post('/turnos/fichaje-salida', {
        empleado_id: empleadoPanel,
      })
      const hx = Number(r.data?.horas_extra || 0)
      clearFichajeStorage(empleadoPanel)
      setResumenFichaje({
        tipo: 'salida',
        horas_trabajadas: r.data?.horas_trabajadas,
        horas_extra: r.data?.horas_extra,
        extraAlto: hx > 0,
        msg: `Jornada cerrada: ${formatHoras(r.data?.horas_trabajadas)} trabajadas`,
      })
      setTurnoActivoApi(null)
      await refrescarTurnoPanel()
      cargarHistorial()
    } catch (e) {
      setPanelError(e.response?.data?.detail || 'No se pudo fichar la salida')
    } finally {
      setFichando(false)
    }
  }

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_FICHAJES.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex items-center gap-3">
        <Clock className="text-amber-500" size={28} strokeWidth={1.5} />
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Control Horario
        </h1>
      </header>

      <div className={`mb-6 ${SURFACE} p-4 md:p-5`}>
        <label className="flex cursor-pointer items-start gap-3 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
          <input
            type="checkbox"
            checked={ficharAlLogin}
            onChange={(e) => {
              const v = e.target.checked
              setFicharAlLoginState(v)
              writeFicharAlLogin(v)
            }}
            className="mt-1 h-5 w-5 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500 dark:border-[#2e3347]"
          />
          <span>
            <span className="font-medium">Fichar al iniciar sesión</span>
            <span className="mt-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
              Si tu usuario tiene empleado vinculado, se registra la entrada al
              entrar (si no había turno abierto hoy). Puedes desactivarlo aquí.
            </span>
          </span>
        </label>
      </div>

      {/* Sección 1 — Fichaje */}
      <section className={`mb-8 ${SURFACE} p-4 md:p-6`}>
        <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Fichaje
        </h2>

        {errorEmp ? (
          <p className="mb-3 text-[15px] text-red-600 dark:text-red-400">
            {errorEmp}
          </p>
        ) : null}

        {loadingEmp ? (
          <Loader />
        ) : (
          <label className="mb-4 block min-w-0 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
            Empleado
            <select
              value={empleadoPanel}
              onChange={(e) => setEmpleadoPanel(e.target.value)}
              className={`${SELECT} mt-1`}
            >
              <option value="">Seleccionar empleado…</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_empleado || e.nombre_completo || e.id}
                </option>
              ))}
            </select>
          </label>
        )}

        {turnosForbidden && empleadoPanel ? (
          <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[14px] text-amber-800 dark:text-amber-300">
            No tienes permiso para listar turnos; el fichaje sigue disponible.
            Si ya fichaste, usa el botón de salida.
          </p>
        ) : null}

        {panelError ? (
          <p className="mb-3 text-[15px] text-red-600 dark:text-red-400">
            {panelError}
          </p>
        ) : null}

        {empleadoPanel && loadingPanel ? (
          <p className="text-[#6b7280] dark:text-[#8b90a7]">Comprobando turno…</p>
        ) : null}

        {empleadoPanel && !loadingPanel ? (
          <div className="flex flex-col gap-4">
            {turnoActivoEfectivo ? (
              <>
                <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-4 py-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                  <p className="text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
                    Entrada:{' '}
                    <span className="text-amber-500">
                      {formatHora(turnoActivoEfectivo.hora_entrada)}
                    </span>
                  </p>
                  {tiempoTranscurrido ? (
                    <p className="mt-1 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
                      Tiempo en turno:{' '}
                      <span className="font-mono text-[#111827] dark:text-[#e8eaf0]">
                        {tiempoTranscurrido}
                      </span>
                    </p>
                  ) : null}
                  {!turnoActivoEfectivo.desdeApi ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Estado recuperado localmente (sin listado de turnos).
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={ficharSalida}
                  disabled={fichando}
                  className="inline-flex h-16 min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-4 text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <LogOut size={24} strokeWidth={1.5} />
                  Fichar Salida
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={ficharEntrada}
                disabled={fichando || !empleadoPanel}
                className="inline-flex h-16 min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-4 text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <LogIn size={24} strokeWidth={1.5} />
                Fichar Entrada
              </button>
            )}
          </div>
        ) : null}

        {resumenFichaje ? (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-[15px] ${
              resumenFichaje.tipo === 'salida' && resumenFichaje.extraAlto
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
            }`}
            role="status"
          >
            <p className="font-medium">{resumenFichaje.msg}</p>
            {resumenFichaje.tipo === 'salida' &&
            resumenFichaje.horas_trabajadas != null ? (
              <p className="mt-1 text-[14px] opacity-90">
                Horas trabajadas:{' '}
                <span className="font-semibold">
                  {formatHoras(resumenFichaje.horas_trabajadas)}
                </span>
                {resumenFichaje.horas_extra != null ? (
                  <>
                    {' '}
                    · Horas extra:{' '}
                    <span
                      className={
                        Number(resumenFichaje.horas_extra) > 0
                          ? 'font-semibold text-amber-600 dark:text-amber-400'
                          : 'font-semibold'
                      }
                    >
                      {formatHoras(resumenFichaje.horas_extra)}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Sección 2 — Historial */}
      <section className={SURFACE}>
        <div className="border-b border-[#e2e5ed] p-4 dark:border-[#2e3347] md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Historial de turnos
          </h2>
          <div className="flex min-w-0 flex-col gap-3 overflow-x-auto md:flex-row md:flex-wrap md:items-end">
            <label className="min-w-0 w-full flex-1 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:min-w-[12rem]">
              Empleado
              <select
                value={empleadoHistorial}
                onChange={(e) => setEmpleadoHistorial(e.target.value)}
                className={`${SELECT} mt-1`}
              >
                <option value="">Todos</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre_empleado || e.nombre_completo || e.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-full min-w-0 max-w-full text-[15px] text-[#111827] dark:text-[#e8eaf0] md:w-48 md:max-w-[12rem]">
              Fecha
              <input
                type="date"
                value={fechaHistorial}
                onChange={(e) => setFechaHistorial(e.target.value)}
                className={`${INPUT} mt-1`}
              />
            </label>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {errorHist ? (
            <p className="mb-3 text-[15px] text-red-600 dark:text-red-400">
              {errorHist}
            </p>
          ) : null}
          {turnosForbidden && !errorHist ? (
            <p className="mb-3 text-[15px] text-amber-700 dark:text-amber-400">
              Tu rol no permite ver el historial de turnos (RDL 8/2019 — consulta
              a dirección).
            </p>
          ) : null}

          {loadingHist ? (
            <Loader />
          ) : turnosHistorial.length === 0 ? (
            <EmptyState message="No hay turnos para esta fecha" />
          ) : (
            <>
              <div
                className={`hidden overflow-x-auto md:block ${SURFACE} border-0`}
              >
                <table className="w-full min-w-[800px] border-collapse text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="px-3 py-2 font-semibold">Empleado</th>
                      <th className="px-3 py-2 font-semibold">Fecha</th>
                      <th className="px-3 py-2 font-semibold">Entrada</th>
                      <th className="px-3 py-2 font-semibold">Salida</th>
                      <th className="px-3 py-2 font-semibold">Horas</th>
                      <th className="px-3 py-2 font-semibold">Extra</th>
                      <th className="px-3 py-2 font-semibold">Incidencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnosHistorial.map((t) => {
                      const activo = t.hora_entrada && !t.hora_salida
                      const hx = Number(t.horas_extra || 0)
                      return (
                        <tr
                          key={t.id}
                          className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                        >
                          <td className="px-3 py-2">
                            {t.nombre_empleado || '—'}
                            {activo ? (
                              <span className="ml-2 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                En turno
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            {fechaTurnoISO(t) || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {formatHora(t.hora_entrada)}
                          </td>
                          <td className="px-3 py-2">
                            {formatHora(t.hora_salida)}
                          </td>
                          <td className="px-3 py-2">
                            {formatHoras(t.horas_trabajadas)}
                          </td>
                          <td
                            className={`px-3 py-2 font-medium ${
                              hx > 0
                                ? 'text-amber-500'
                                : 'text-[#111827] dark:text-[#e8eaf0]'
                            }`}
                          >
                            {formatHoras(t.horas_extra)}
                          </td>
                          <td className="px-3 py-2 text-[#6b7280] dark:text-[#8b90a7]">
                            —
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {turnosHistorial.map((t) => {
                  const activo = t.hora_entrada && !t.hora_salida
                  const hx = Number(t.horas_extra || 0)
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl border border-[#e2e5ed] bg-[#f4f6f9] p-4 dark:border-[#2e3347] dark:bg-[#0f1117]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                          {t.nombre_empleado || '—'}
                        </span>
                        {activo ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            En turno
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                        {fechaTurnoISO(t)} · Entrada {formatHora(t.hora_entrada)}{' '}
                        · Salida {formatHora(t.hora_salida)}
                      </p>
                      <p className="mt-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                        Horas: {formatHoras(t.horas_trabajadas)}
                        <span
                          className={
                            hx > 0
                              ? ' ml-2 font-semibold text-amber-500'
                              : ' ml-2'
                          }
                        >
                          Extra: {formatHoras(t.horas_extra)}
                        </span>
                      </p>
                      <p className="mt-1 text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                        Incidencia: —
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
