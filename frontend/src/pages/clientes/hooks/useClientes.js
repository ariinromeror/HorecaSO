import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import {
  ROLES_ACCESO,
  alergenosFromApi,
  alergenosToApi,
  emptyFormCliente,
} from '../constants'

export function useClientes() {
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

  return {
    authLoading, user, buscarInput, setBuscarInput, puntosMin, setPuntosMin,
    clientes, loading, error, modalCliente, formCliente, setFormCliente,
    modalClienteError, savingCliente, modalHistorial, historialData,
    historialLoading, historialError, modalPuntos, puntosInput, setPuntosInput,
    motivoPuntos, setMotivoPuntos, puntosSaving, puntosError, abrirNuevo,
    abrirEditar, cerrarModalCliente, toggleAlergeno, guardarCliente,
    abrirHistorial, cerrarHistorial, abrirPuntos, cerrarPuntos, enviarPuntos,
  }
}
