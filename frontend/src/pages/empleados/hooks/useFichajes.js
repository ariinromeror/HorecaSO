import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import { ROLES_FICHAJES } from '../constants'
import {
  clearFichajeStorage,
  formatHora,
  formatHoras,
  hoyLocalISO,
  parseHoraToToday,
  readFicharAlLogin,
  readFichajeStorage,
  fechaTurnoISO,
  writeFicharAlLogin,
  writeFichajeStorage,
} from '../utils/fichajesLocal'

export function useFichajes() {
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

  const puedeAcceder = user && ROLES_FICHAJES.includes(user.rol)

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

  return {
    authLoading,
    user,
    puedeAcceder,
    ficharAlLogin,
    setFicharAlLoginState,
    writeFicharAlLogin,
    empleados,
    loadingEmp,
    errorEmp,
    empleadoPanel,
    setEmpleadoPanel,
    turnoActivoApi,
    loadingPanel,
    panelError,
    fichando,
    resumenFichaje,
    turnosForbidden,
    fechaHistorial,
    setFechaHistorial,
    empleadoHistorial,
    setEmpleadoHistorial,
    turnosHistorial,
    loadingHist,
    errorHist,
    turnoActivoEfectivo,
    tiempoTranscurrido,
    ficharEntrada,
    ficharSalida,
    formatHora,
    formatHoras,
    fechaTurnoISO,
    cargarHistorial,
  }
}
