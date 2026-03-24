import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import { ROLES_ACCESO, isoMinusDays, isoToday } from '../constants'

export function useAnalytics() {
  const { user, isLoading: authLoading } = useAuth()
  const [mainTab, setMainTab] = useState('rentabilidad')

  const [desdeRm, setDesdeRm] = useState(() => isoMinusDays(29))
  const [hastaRm, setHastaRm] = useState(() => isoToday())
  const [zonaRm, setZonaRm] = useState('')
  const [dataRm, setDataRm] = useState(null)
  const [loadingRm, setLoadingRm] = useState(false)
  const [errorRm, setErrorRm] = useState(null)

  const [desdeIm, setDesdeIm] = useState(() => isoMinusDays(29))
  const [hastaIm, setHastaIm] = useState(() => isoToday())
  const [dataIm, setDataIm] = useState(null)
  const [loadingIm, setLoadingIm] = useState(false)
  const [errorIm, setErrorIm] = useState(null)

  const [mesCp, setMesCp] = useState(() => new Date().getMonth() + 1)
  const [anioCp, setAnioCp] = useState(() => new Date().getFullYear())
  const [dataCp, setDataCp] = useState(null)
  const [loadingCp, setLoadingCp] = useState(false)
  const [errorCp, setErrorCp] = useState(null)

  const puedeAcceder = user && ROLES_ACCESO.includes(user.rol)

  const cargarRentabilidad = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingRm(true)
    setErrorRm(null)
    try {
      const params = { desde: desdeRm, hasta: hastaRm }
      if (zonaRm.trim()) params.zona = zonaRm.trim()
      const r = await api.get('/dashboard/rentabilidad-mesas', { params })
      setDataRm(r.data)
    } catch (e) {
      setErrorRm(e.response?.data?.detail || 'Error al cargar rentabilidad')
      setDataRm(null)
    } finally {
      setLoadingRm(false)
    }
  }, [puedeAcceder, desdeRm, hastaRm, zonaRm])

  const cargarIngenieria = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingIm(true)
    setErrorIm(null)
    try {
      const r = await api.get('/dashboard/ingenieria-menu', {
        params: { desde: desdeIm, hasta: hastaIm },
      })
      setDataIm(r.data)
    } catch (e) {
      setErrorIm(e.response?.data?.detail || 'Error al cargar ingeniería de menú')
      setDataIm(null)
    } finally {
      setLoadingIm(false)
    }
  }, [puedeAcceder, desdeIm, hastaIm])

  const cargarCostePersonal = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingCp(true)
    setErrorCp(null)
    try {
      const r = await api.get('/dashboard/coste-personal', {
        params: { mes: mesCp, anio: anioCp },
      })
      setDataCp(r.data)
    } catch (e) {
      setErrorCp(e.response?.data?.detail || 'Error al cargar coste personal')
      setDataCp(null)
    } finally {
      setLoadingCp(false)
    }
  }, [puedeAcceder, mesCp, anioCp])

  useEffect(() => {
    if (!puedeAcceder || mainTab !== 'rentabilidad') return
    cargarRentabilidad()
  }, [puedeAcceder, mainTab, cargarRentabilidad])

  useEffect(() => {
    if (!puedeAcceder || mainTab !== 'menu') return
    cargarIngenieria()
  }, [puedeAcceder, mainTab, cargarIngenieria])

  useEffect(() => {
    if (!puedeAcceder || mainTab !== 'personal') return
    cargarCostePersonal()
  }, [puedeAcceder, mainTab, cargarCostePersonal])

  const mesasRm = Array.isArray(dataRm?.mesas) ? dataRm.mesas : []
  const resRm = dataRm?.resumen_outlet

  const productosIm = Array.isArray(dataIm?.productos) ? dataIm.productos : []
  const resumenCls = dataIm?.resumen_por_clasificacion || {}

  const productosPorClasificacion = useMemo(() => {
    const m = {
      estrella: [],
      vaca: [],
      interrogante: [],
      perro: [],
    }
    for (const p of productosIm) {
      const k = String(p.clasificacion || '').toLowerCase()
      if (m[k]) m[k].push(p)
    }
    return m
  }, [productosIm])

  return {
    authLoading,
    user,
    puedeAcceder,
    mainTab,
    setMainTab,
    desdeRm,
    setDesdeRm,
    hastaRm,
    setHastaRm,
    zonaRm,
    setZonaRm,
    dataRm,
    loadingRm,
    errorRm,
    cargarRentabilidad,
    mesasRm,
    resRm,
    desdeIm,
    setDesdeIm,
    hastaIm,
    setHastaIm,
    dataIm,
    loadingIm,
    errorIm,
    cargarIngenieria,
    productosIm,
    resumenCls,
    productosPorClasificacion,
    mesCp,
    setMesCp,
    anioCp,
    setAnioCp,
    dataCp,
    loadingCp,
    errorCp,
    cargarCostePersonal,
  }
}
