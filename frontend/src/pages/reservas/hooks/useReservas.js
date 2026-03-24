import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import {
  ROLES_ACCESO,
  emptyFormLista,
  emptyFormReserva,
  fechaApiToInput,
  horaApiToInput,
  todayISO,
} from '../constants'

export function useReservas() {
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

  return {
    authLoading, user, mainTab, setMainTab, filtroFecha, setFiltroFecha,
    filtroEstado, setFiltroEstado, reservas, loadingReservas, errorReservas,
    lista, loadingLista, errorLista, listaTick, modalReserva, formReserva,
    setFormReserva, modalReservaError, savingReserva, modalEstado,
    patchingEstado, formLista, setFormLista, addingLista, patchingListaId,
    abrirNuevaReserva, abrirEditarReserva, cerrarModalReserva, guardarReserva,
    abrirModalEstado, cerrarModalEstado, aplicarEstadoReserva, confirmarRapido,
    anadirLista, patchListaEstado,
  }
}
