import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import { ROLES_EMPLEADOS, emptyFormEmpleado } from '../constants'

export function useEmpleados() {
  const { user, isLoading: authLoading } = useAuth()

  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscarDebounced, setBuscarDebounced] = useState('')
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(() => emptyFormEmpleado())
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [saving, setSaving] = useState(false)

  const puedeAcceder = user && ROLES_EMPLEADOS.includes(user.rol)

  useEffect(() => {
    const t = setTimeout(() => setBuscarDebounced(buscarInput.trim()), 350)
    return () => clearTimeout(t)
  }, [buscarInput])

  const cargosUnicos = useMemo(() => {
    const s = new Set()
    empleados.forEach((e) => {
      if (e.cargo && String(e.cargo).trim()) s.add(String(e.cargo).trim())
    })
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'es'))
  }, [empleados])

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (buscarDebounced) params.buscar = buscarDebounced
      if (filtroActivo === 'activo') params.activo = true
      if (filtroActivo === 'inactivo') params.activo = false
      if (filtroCargo.trim()) params.cargo = filtroCargo.trim()
      const r = await api.get('/empleados', { params })
      setEmpleados(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar empleados')
      setEmpleados([])
    } finally {
      setLoading(false)
    }
  }, [buscarDebounced, filtroActivo, filtroCargo])

  useEffect(() => {
    if (!puedeAcceder) return
    cargar()
  }, [puedeAcceder, cargar])

  const abrirNuevo = () => {
    setForm(emptyFormEmpleado())
    setModalError(null)
    setModal({ modo: 'nuevo' })
  }

  const abrirEditar = async (emp) => {
    setModalError(null)
    setModal({ modo: 'editar', id: emp.id })
    setModalLoading(true)
    setForm(emptyFormEmpleado())
    try {
      const r = await api.get(`/empleados/${emp.id}`)
      const d = r.data
      setForm({
        nombre_completo:
          d.nombre_completo ?? d.nombre_empleado ?? '',
        dni: d.dni ?? '',
        nss: d.nss ?? '',
        cargo: d.cargo ?? '',
        contrato: d.contrato ?? '',
        jornada_horas:
          d.jornada_horas != null ? Number(d.jornada_horas) : 40,
        salario_bruto_mensual:
          d.salario_bruto_mensual != null
            ? String(d.salario_bruto_mensual)
            : '',
        irpf_porcentaje:
          d.irpf_porcentaje != null ? String(d.irpf_porcentaje) : '',
        fecha_inicio: d.fecha_inicio
          ? String(d.fecha_inicio).slice(0, 10)
          : '',
        iban: d.iban ?? '',
        activo: d.activo !== false,
      })
    } catch (e) {
      setModalError(e.response?.data?.detail || 'Error al cargar empleado')
      setModal(null)
    } finally {
      setModalLoading(false)
    }
  }

  const cerrarModal = () => {
    if (saving) return
    setModal(null)
    setModalError(null)
  }

  const guardar = async () => {
    const nombre = (form.nombre_completo || '').trim()
    if (!nombre) {
      setModalError('El nombre completo es obligatorio')
      return
    }
    const irpf = form.irpf_porcentaje === '' ? null : Number(form.irpf_porcentaje)
    if (irpf != null && (Number.isNaN(irpf) || irpf < 0 || irpf > 45)) {
      setModalError('IRPF debe estar entre 0 y 45')
      return
    }

    setSaving(true)
    setModalError(null)

    const body = {
      nombre_completo: nombre,
      dni: form.dni.trim() || null,
      nss: form.nss.trim() || null,
      cargo: form.cargo.trim() || null,
      contrato: form.contrato.trim() || null,
      jornada_horas:
        form.jornada_horas === '' || form.jornada_horas == null
          ? null
          : Number(form.jornada_horas),
      salario_bruto_mensual:
        form.salario_bruto_mensual === '' || form.salario_bruto_mensual == null
          ? null
          : Number(form.salario_bruto_mensual),
      irpf_porcentaje: irpf,
      fecha_inicio: form.fecha_inicio || null,
      iban: form.iban.trim() || null,
    }

    try {
      if (modal.modo === 'nuevo') {
        await api.post('/empleados', body)
      } else {
        await api.put(`/empleados/${modal.id}`, {
          ...body,
          activo: form.activo,
        })
      }
      setModal(null)
      cargar()
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
    authLoading,
    user,
    puedeAcceder,
    empleados,
    loading,
    error,
    buscarInput,
    setBuscarInput,
    filtroActivo,
    setFiltroActivo,
    filtroCargo,
    setFiltroCargo,
    cargosUnicos,
    modal,
    form,
    setForm,
    modalLoading,
    modalError,
    saving,
    abrirNuevo,
    abrirEditar,
    cerrarModal,
    guardar,
  }
}
