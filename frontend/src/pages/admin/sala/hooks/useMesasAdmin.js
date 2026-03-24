import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import {
  createMesa,
  deleteMesa,
  getMesas,
  updateMesa,
} from '../../../../services/api'
import {
  emptyForm,
  formaToFormValue,
  normZona,
  zonaToFormValue,
} from '../constants'

export function useMesasAdmin() {
  const { user } = useAuth()

  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  /** false = cerrado, null = nueva mesa, objeto = editar */
  const [modalMesa, setModalMesa] = useState(false)
  const [formMesa, setFormMesa] = useState(emptyForm)
  const [feedback, setFeedback] = useState({ msg: '', type: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadMesas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await getMesas()
      setMesas(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setMesas([])
      setError(e.response?.data?.detail || 'Error al cargar mesas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMesas()
  }, [loadMesas])

  useEffect(() => {
    if (!feedback.msg) return
    const t = setTimeout(() => setFeedback({ msg: '', type: '' }), 3000)
    return () => clearTimeout(t)
  }, [feedback.msg])

  const resumen = useMemo(() => {
    let interior = 0
    let terraza = 0
    let barra = 0
    for (const m of mesas) {
      const z = normZona(m.zona)
      if (z === 'interior' || z === 'sala') interior += 1
      else if (z === 'terraza') terraza += 1
      else if (z === 'barra') barra += 1
    }
    return {
      total: mesas.length,
      interior,
      terraza,
      barra,
    }
  }, [mesas])

  const outletIdResolved = useMemo(() => {
    if (user?.outlet_id) return user.outlet_id
    const first = mesas.find((m) => m.outlet_id)
    return first?.outlet_id || null
  }, [user?.outlet_id, mesas])

  const openNueva = () => {
    setFormMesa(emptyForm())
    setModalMesa(null)
    setFormError('')
  }

  const openEditar = (m) => {
    setFormMesa({
      numero: String(m.numero ?? ''),
      capacidad: Number(m.capacidad) || 4,
      zona: zonaToFormValue(m.zona),
      forma: formaToFormValue(m.forma),
    })
    setModalMesa(m)
    setFormError('')
  }

  const cerrarModal = () => {
    setModalMesa(false)
    setFormError('')
  }

  const validateForm = (excludeId) => {
    const num = Number(formMesa.numero)
    if (!formMesa.numero || Number.isNaN(num) || num < 1) {
      setFormError('Número de mesa inválido (mínimo 1)')
      return false
    }
    const cap = Number(formMesa.capacidad)
    if (Number.isNaN(cap) || cap < 1 || cap > 20) {
      setFormError('Capacidad entre 1 y 20 pax')
      return false
    }
    const dup = mesas.some(
      (m) =>
        Number(m.numero) === num &&
        (!excludeId || String(m.id) !== String(excludeId))
    )
    if (dup) {
      setFormError('Ya existe una mesa con ese número en el local')
      return false
    }
    setFormError('')
    return true
  }

  const guardarMesa = async () => {
    const editing =
      modalMesa != null &&
      typeof modalMesa === 'object' &&
      Boolean(modalMesa.id)
    if (!validateForm(editing ? modalMesa.id : null)) return

    const num = Number(formMesa.numero)
    const cap = Number(formMesa.capacidad)

    setSaving(true)
    try {
      if (editing) {
        await updateMesa(modalMesa.id, {
          numero: num,
          capacidad: cap,
          zona: formMesa.zona,
          forma: formMesa.forma,
        })
        setFeedback({ msg: 'Mesa actualizada', type: 'ok' })
      } else {
        if (!outletIdResolved) {
          setFormError(
            'No se puede crear la mesa: falta outlet del usuario o mesas de referencia'
          )
          setSaving(false)
          return
        }
        await createMesa({
          numero: num,
          capacidad: cap,
          zona: formMesa.zona,
          forma: formMesa.forma,
          outlet_id: outletIdResolved,
        })
        setFeedback({ msg: 'Mesa creada', type: 'ok' })
      }
      cerrarModal()
      await loadMesas()
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al guardar',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const eliminarMesa = async (m) => {
    if (!confirm(`¿Eliminar mesa Nº ${m.numero}?`)) return
    try {
      await deleteMesa(m.id)
      setFeedback({ msg: 'Mesa eliminada', type: 'ok' })
      await loadMesas()
    } catch (e) {
      const d = e.response?.data?.detail
      const msg =
        typeof d === 'string' && d.toLowerCase().includes('ocupada')
          ? d
          : d || 'No se pudo eliminar la mesa'
      setFeedback({ msg, type: 'error' })
    }
  }

  const rowBusyClass = (m) => {
    const e = String(m.estado || '').toLowerCase()
    if (e === 'ocupada' || e === 'reservada') return 'bg-amber-500/5'
    return ''
  }

  return {
    mesas,
    loading,
    error,
    modalMesa,
    formMesa,
    setFormMesa,
    feedback,
    saving,
    formError,
    resumen,
    openNueva,
    openEditar,
    cerrarModal,
    guardarMesa,
    eliminarMesa,
    rowBusyClass,
  }
}
