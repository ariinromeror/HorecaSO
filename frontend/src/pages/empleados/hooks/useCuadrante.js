import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import { ROLES_CUADRANTE } from '../constants'
import {
  addDays,
  mondayOfDate,
  multisetDiffCount,
  timeToHHMM,
  toISODate,
} from '../utils/cuadranteHelpers'

export function useCuadrante() {
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

  return {
    authLoading,
    user,
    puedeAcceder,
    lunes,
    domingo,
    diasSemana,
    semanaInicioISO,
    semanaFinISO,
    empleados,
    loadingEmp,
    errorEmp,
    asignaciones,
    loadingCuad,
    errorCuad,
    expandedMobile,
    modalAdd,
    modalForm,
    setModalForm,
    modalErr,
    publishError,
    publishing,
    pendientesCount,
    semanaAnterior,
    semanaSiguiente,
    nombreEmpleado,
    asignacionesDeCelda,
    abrirModalAdd,
    cerrarModal,
    guardarModalLocal,
    quitarAsignacion,
    publicarCuadrante,
    toggleExpand,
  }
}
