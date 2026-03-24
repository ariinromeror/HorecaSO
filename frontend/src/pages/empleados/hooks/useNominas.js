import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import { MESES, ROLES_NOMINAS } from '../constants'

export function useNominas() {
  const { user, isLoading: authLoading } = useAuth()

  const [empleados, setEmpleados] = useState([])
  const [loadingEmp, setLoadingEmp] = useState(true)
  const [errorEmp, setErrorEmp] = useState(null)

  const [empleadoId, setEmpleadoId] = useState('')
  const [mes, setMes] = useState(String(new Date().getMonth() + 1))
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [horasExtraCant, setHorasExtraCant] = useState('0')
  const [plusFest, setPlusFest] = useState('0')
  const [otrosDev, setOtrosDev] = useState('0')
  const [otrasDed, setOtrasDed] = useState('0')

  const [resultado, setResultado] = useState(null)
  const [calcError, setCalcError] = useState(null)
  const [calculando, setCalculando] = useState(false)

  const [historial, setHistorial] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)

  const [modalNomina, setModalNomina] = useState(null)
  const [detalleModal, setDetalleModal] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  const puedeAcceder = user && ROLES_NOMINAS.includes(user.rol)

  const empleadoSel = useMemo(
    () => empleados.find((e) => e.id === empleadoId),
    [empleados, empleadoId]
  )

  const nombreEmpleado = (id) => {
    const e = empleados.find((x) => x.id === id)
    return e?.nombre_empleado || e?.nombre_completo || 'Empleado'
  }

  const cargarEmpleados = useCallback(async () => {
    setLoadingEmp(true)
    setErrorEmp(null)
    try {
      const r = await api.get('/empleados')
      setEmpleados(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErrorEmp(e.response?.data?.detail || 'Error al cargar empleados')
      setEmpleados([])
    } finally {
      setLoadingEmp(false)
    }
  }, [])

  const cargarHistorial = useCallback(async (eid) => {
    if (!eid) {
      setHistorial([])
      return
    }
    setLoadingHist(true)
    try {
      const r = await api.get(`/nominas/${eid}`)
      setHistorial(Array.isArray(r.data) ? r.data : [])
    } catch {
      setHistorial([])
    } finally {
      setLoadingHist(false)
    }
  }, [])

  useEffect(() => {
    if (!puedeAcceder) return
    cargarEmpleados()
  }, [puedeAcceder, cargarEmpleados])

  useEffect(() => {
    if (!empleadoId) {
      setHistorial([])
      return
    }
    cargarHistorial(empleadoId)
  }, [empleadoId, cargarHistorial])

  useEffect(() => {
    setResultado(null)
    setCalcError(null)
  }, [empleadoId])

  const calcularNomina = async () => {
    if (!empleadoId) {
      setCalcError('Selecciona un empleado')
      return
    }
    setCalculando(true)
    setCalcError(null)
    try {
      const body = {
        empleado_id: empleadoId,
        mes: Number(mes),
        anio: Number(anio),
        horas_extra_cantidad: Number(horasExtraCant) || 0,
        plus_festivos: Number(plusFest) || 0,
        otros_devengos: Number(otrosDev) || 0,
        otras_deducciones: Number(otrasDed) || 0,
      }
      const r = await api.post('/nominas/calcular', body)
      setResultado(r.data)
      await cargarHistorial(empleadoId)
    } catch (e) {
      const det = e.response?.data?.detail
      setCalcError(typeof det === 'string' ? det : 'Error al calcular')
      setResultado(null)
    } finally {
      setCalculando(false)
    }
  }

  const abrirDetalle = async (row) => {
    setModalNomina(row)
    setLoadingDetalle(true)
    setDetalleModal(null)
    try {
      const r = await api.get(`/nominas/${row.id}/detalle`)
      setDetalleModal(r.data)
    } catch {
      setDetalleModal(row)
    } finally {
      setLoadingDetalle(false)
    }
  }

  const cerrarModal = () => {
    setModalNomina(null)
    setDetalleModal(null)
  }

  const tituloResultado =
    resultado &&
    `Nómina ${MESES[Number(resultado.mes) - 1] || resultado.mes} ${resultado.anio} — ${nombreEmpleado(resultado.empleado_id)}`

  const mostrarPanelDerecho = !!resultado

  const cargarEnPanel = (n) => {
    setResultado({ ...n, desglose: undefined })
    setCalcError(null)
  }

  return {
    authLoading,
    user,
    puedeAcceder,
    empleados,
    loadingEmp,
    errorEmp,
    empleadoId,
    setEmpleadoId,
    empleadoSel,
    mes,
    setMes,
    anio,
    setAnio,
    extrasOpen,
    setExtrasOpen,
    horasExtraCant,
    setHorasExtraCant,
    plusFest,
    setPlusFest,
    otrosDev,
    setOtrosDev,
    otrasDed,
    setOtrasDed,
    resultado,
    calcError,
    calculando,
    calcularNomina,
    historial,
    loadingHist,
    modalNomina,
    detalleModal,
    loadingDetalle,
    abrirDetalle,
    cerrarModal,
    tituloResultado,
    mostrarPanelDerecho,
    cargarEnPanel,
    nombreEmpleado,
  }
}
