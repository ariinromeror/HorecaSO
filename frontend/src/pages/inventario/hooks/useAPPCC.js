import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import {
  emptyFormRegistro,
  isoMinusDays,
  isoToday,
  ROLES_ACCESO_APPCC,
} from '../appccConstants'

export function useAPPCC() {
  const { user, isLoading: authLoading } = useAuth()
  const [mainTab, setMainTab] = useState('registros')

  const [resumen, setResumen] = useState(null)
  const [loadingResumen, setLoadingResumen] = useState(true)
  const [errorResumen, setErrorResumen] = useState(null)

  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroConforme, setFiltroConforme] = useState('')

  const [registros, setRegistros] = useState([])
  const [loadingReg, setLoadingReg] = useState(false)
  const [errorReg, setErrorReg] = useState(null)

  const [ncDesde, setNcDesde] = useState(() => isoMinusDays(29))
  const [ncHasta, setNcHasta] = useState(() => isoToday())
  const [noConformes, setNoConformes] = useState([])
  const [loadingNc, setLoadingNc] = useState(false)
  const [errorNc, setErrorNc] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyFormRegistro)
  const [modalError, setModalError] = useState(null)
  const [saving, setSaving] = useState(false)

  const puedeAcceder = user && ROLES_ACCESO_APPCC.includes(user.rol)
  const puedeVerNoConformesDetalle =
    user && ['admin', 'director'].includes(user.rol)

  const cargarResumen = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingResumen(true)
    setErrorResumen(null)
    try {
      const r = await api.get('/appcc/resumen-dia')
      setResumen(r.data)
    } catch (e) {
      setErrorResumen(e.response?.data?.detail || 'Error al cargar resumen')
      setResumen(null)
    } finally {
      setLoadingResumen(false)
    }
  }, [puedeAcceder])

  const cargarRegistros = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingReg(true)
    setErrorReg(null)
    try {
      const params = {}
      if (filtroTipo) params.tipo_control = filtroTipo
      if (filtroDesde) params.desde = filtroDesde
      if (filtroHasta) params.hasta = filtroHasta
      if (filtroConforme === 'si') params.conforme = true
      if (filtroConforme === 'no') params.conforme = false
      const r = await api.get('/appcc/registros', { params })
      setRegistros(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErrorReg(e.response?.data?.detail || 'Error al cargar registros')
      setRegistros([])
    } finally {
      setLoadingReg(false)
    }
  }, [
    puedeAcceder,
    filtroTipo,
    filtroDesde,
    filtroHasta,
    filtroConforme,
  ])

  const cargarNoConformes = useCallback(async () => {
    if (!puedeAcceder || !puedeVerNoConformesDetalle) return
    setLoadingNc(true)
    setErrorNc(null)
    try {
      const r = await api.get('/appcc/registros/no-conformes', {
        params: { desde: ncDesde, hasta: ncHasta },
      })
      setNoConformes(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      const st = e.response?.status
      setErrorNc(
        st === 403
          ? 'Solo administración puede consultar el detalle de no conformidades.'
          : e.response?.data?.detail || 'Error al cargar no conformidades'
      )
      setNoConformes([])
    } finally {
      setLoadingNc(false)
    }
  }, [puedeAcceder, puedeVerNoConformesDetalle, ncDesde, ncHasta])

  useEffect(() => {
    if (!puedeAcceder) return
    cargarResumen()
  }, [puedeAcceder, cargarResumen])

  useEffect(() => {
    if (!puedeAcceder || mainTab !== 'registros') return
    cargarRegistros()
  }, [puedeAcceder, mainTab, cargarRegistros])

  useEffect(() => {
    if (!puedeAcceder || mainTab !== 'no-conformes') return
    if (puedeVerNoConformesDetalle) cargarNoConformes()
  }, [
    puedeAcceder,
    mainTab,
    puedeVerNoConformesDetalle,
    cargarNoConformes,
  ])

  const abrirModal = () => {
    setForm(emptyFormRegistro())
    setModalError(null)
    setModalOpen(true)
  }

  const cerrarModal = () => {
    if (saving) return
    setModalOpen(false)
    setModalError(null)
  }

  const guardarRegistro = async () => {
    const tc = form.tipo_control
    if (!tc) {
      setModalError('Selecciona un tipo de control')
      return
    }
    if (!form.conforme) {
      const ac = (form.accion_correctora || '').trim()
      if (!ac) {
        setModalError('La acción correctora es obligatoria si no es conforme')
        return
      }
    }

    setSaving(true)
    setModalError(null)
    const body = {
      tipo_control: tc,
      nombre_equipo: (form.nombre_equipo || '').trim() || null,
      conforme: form.conforme,
      observaciones: (form.observaciones || '').trim() || null,
      accion_correctora: form.conforme
        ? null
        : (form.accion_correctora || '').trim(),
    }
    const t = (form.temperatura || '').toString().trim()
    if (t !== '' && !Number.isNaN(Number(t))) {
      body.temperatura = Number(t)
    }

    try {
      await api.post('/appcc/registros', body)
      setModalOpen(false)
      await cargarResumen()
      if (mainTab === 'registros') await cargarRegistros()
      if (mainTab === 'no-conformes' && puedeVerNoConformesDetalle) {
        await cargarNoConformes()
      }
    } catch (e) {
      const det = e.response?.data?.detail
      setModalError(
        typeof det === 'string'
          ? det
          : Array.isArray(det)
            ? det.map((x) => x.msg || x).join(', ')
            : 'No se pudo guardar'
      )
    } finally {
      setSaving(false)
    }
  }

  return {
    user,
    authLoading,
    mainTab,
    setMainTab,
    resumen,
    loadingResumen,
    errorResumen,
    filtroTipo,
    setFiltroTipo,
    filtroDesde,
    setFiltroDesde,
    filtroHasta,
    setFiltroHasta,
    filtroConforme,
    setFiltroConforme,
    registros,
    loadingReg,
    errorReg,
    cargarRegistros,
    ncDesde,
    setNcDesde,
    ncHasta,
    setNcHasta,
    noConformes,
    loadingNc,
    errorNc,
    cargarNoConformes,
    modalOpen,
    form,
    setForm,
    modalError,
    saving,
    puedeAcceder,
    puedeVerNoConformesDetalle,
    abrirModal,
    cerrarModal,
    guardarRegistro,
  }
}
