import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  BarChart3,
  Clock,
  Euro,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import StatCard from '../../components/shared/StatCard'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_ACCESO = ['admin', 'director']

const INPUT =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
const SELECT = `${INPUT} appearance-none`
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
const PAGE_BG = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'
const TAB_BTN =
  'h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors'

const ZONAS = [
  { value: '', label: 'Todas' },
  { value: 'interior', label: 'Interior' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'barra', label: 'Barra' },
  { value: 'jardín', label: 'Jardín' },
]

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

function isoToday() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function isoMinusDays(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function fmtEuro(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '0.00 €'
  return `${x.toFixed(2)} €`
}

function fmtNum(n, suffix = '') {
  const x = Number(n)
  if (Number.isNaN(x)) return `0${suffix}`
  return `${x.toFixed(2)}${suffix}`
}

function badgeClasificacion(cls) {
  const c = String(cls || '').toLowerCase()
  if (c === 'estrella')
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  if (c === 'vaca')
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  if (c === 'interrogante')
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  if (c === 'perro')
    return 'bg-red-500/15 text-red-600 dark:text-red-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

const BCG_ORDER = ['interrogante', 'estrella', 'perro', 'vaca']

const BCG_META = {
  interrogante: {
    label: 'Interrogante',
    sub: 'Baja popularidad · Alto margen',
    cellClass:
      'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10',
    titleClass: 'text-blue-600 dark:text-blue-400',
  },
  estrella: {
    label: 'Ganador',
    sub: 'Alta popularidad · Alto margen',
    cellClass:
      'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10',
    titleClass: 'text-emerald-600 dark:text-emerald-400',
  },
  perro: {
    label: 'Bajo rendimiento',
    sub: 'Baja popularidad · Bajo margen',
    cellClass: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
    titleClass: 'text-red-600 dark:text-red-400',
  },
  vaca: {
    label: 'Motor de ventas',
    sub: 'Alta popularidad · Bajo margen',
    cellClass:
      'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10',
    titleClass: 'text-amber-600 dark:text-amber-400',
  },
}

/** Etiqueta visible para claves API estrella|vaca|perro|interrogante */
function labelClasificacion(cls) {
  const c = String(cls || '').toLowerCase()
  return BCG_META[c]?.label || (cls ? String(cls) : '—')
}

export default function AnalyticsPage() {
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

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_ACCESO.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div
      className={`${PAGE_BG} min-w-0 overflow-x-hidden px-4 py-6 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:px-6`}
    >
      <header className="mb-6 flex items-center gap-3">
        <BarChart3
          className="shrink-0 text-amber-500"
          size={28}
          strokeWidth={1.5}
        />
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Analytics
        </h1>
      </header>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[#e2e5ed] dark:border-[#2e3347] pb-px">
        <button
          type="button"
          onClick={() => setMainTab('rentabilidad')}
          className={`${TAB_BTN} shrink-0 ${
            mainTab === 'rentabilidad'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Rentabilidad Mesas
        </button>
        <button
          type="button"
          onClick={() => setMainTab('menu')}
          className={`${TAB_BTN} shrink-0 ${
            mainTab === 'menu'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Ingeniería Menú
        </button>
        <button
          type="button"
          onClick={() => setMainTab('personal')}
          className={`${TAB_BTN} shrink-0 ${
            mainTab === 'personal'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Coste Personal
        </button>
      </div>

      {mainTab === 'rentabilidad' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="w-full min-w-0 sm:max-w-[180px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Desde
              </label>
              <input
                type="date"
                value={desdeRm}
                onChange={(e) => setDesdeRm(e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="w-full min-w-0 sm:max-w-[180px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Hasta
              </label>
              <input
                type="date"
                value={hastaRm}
                onChange={(e) => setHastaRm(e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="w-full min-w-0 sm:max-w-[200px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Zona
              </label>
              <select
                value={zonaRm}
                onChange={(e) => setZonaRm(e.target.value)}
                className={SELECT}
              >
                {ZONAS.map((z) => (
                  <option key={z.value || 'all'} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={cargarRentabilidad}
              className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
              disabled={loadingRm}
            >
              Actualizar
            </button>
          </div>

          {errorRm ? (
            <p className="mb-4 text-red-600 dark:text-red-400">{errorRm}</p>
          ) : null}

          {loadingRm && !dataRm ? (
            <Loader />
          ) : (
            <>
              {resRm ? (
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Total visitas"
                    value={String(resRm.total_visitas ?? 0)}
                    Icon={Users}
                    color="white"
                  />
                  <StatCard
                    label="Ingreso total"
                    value={fmtEuro(resRm.total_ingresos)}
                    Icon={Wallet}
                    color="amber"
                  />
                  <StatCard
                    label="€/hora promedio"
                    value={fmtEuro(resRm.ingreso_medio_hora)}
                    Icon={Euro}
                    color="white"
                  />
                  <StatCard
                    label="Tiempo medio ocupación (min)"
                    value={fmtNum(resRm.tiempo_medio_ocupacion_minutos, ' min')}
                    Icon={Clock}
                    color="white"
                  />
                </div>
              ) : null}

              {mesasRm.length === 0 && !loadingRm ? (
                <EmptyState message="Sin datos de rentabilidad por mesa en el periodo" />
              ) : (
                <>
                  <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
                    <table className="w-full min-w-[900px] text-left text-[15px]">
                      <thead>
                        <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Mesa
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Zona
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Visitas
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Ingreso total
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            €/hora medio
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            €/comensal medio
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            T. ocupación medio
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mesasRm.map((row, idx) => (
                          <tr
                            key={row.mesa_id}
                            className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">
                                  #{row.mesa_numero}
                                </span>
                                {idx < 3 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                                    <Trophy
                                      size={14}
                                      className="text-amber-500"
                                      strokeWidth={1.5}
                                    />
                                    Top 3
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">{row.zona || '—'}</td>
                            <td className="px-4 py-3">{row.total_visitas}</td>
                            <td className="px-4 py-3 font-medium">
                              {fmtEuro(row.total_ingresos)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtEuro(row.ingreso_medio_hora)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtEuro(row.ingreso_medio_comensal)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtNum(row.tiempo_medio_ocupacion_minutos, ' min')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 md:hidden">
                    {mesasRm.map((row, idx) => (
                      <div key={row.mesa_id} className={`${SURFACE} p-4`}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-lg font-bold">
                            Mesa #{row.mesa_numero}
                          </p>
                          {idx < 3 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                              <Trophy
                                size={14}
                                strokeWidth={1.5}
                                className="text-amber-500"
                              />
                              Top 3
                            </span>
                          ) : null}
                        </div>
                        <p className="mb-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                          Zona: {row.zona || '—'}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                            <p className="text-[#6b7280] dark:text-[#8b90a7]">
                              Visitas
                            </p>
                            <p className="font-bold">{row.total_visitas}</p>
                          </div>
                          <div className="rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                            <p className="text-[#6b7280] dark:text-[#8b90a7]">
                              Ingreso total
                            </p>
                            <p className="font-bold text-amber-500">
                              {fmtEuro(row.total_ingresos)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                            <p className="text-[#6b7280] dark:text-[#8b90a7]">
                              €/hora
                            </p>
                            <p className="font-bold">
                              {fmtEuro(row.ingreso_medio_hora)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                            <p className="text-[#6b7280] dark:text-[#8b90a7]">
                              €/comensal
                            </p>
                            <p className="font-bold">
                              {fmtEuro(row.ingreso_medio_comensal)}
                            </p>
                          </div>
                          <div className="col-span-2 rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                            <p className="text-[#6b7280] dark:text-[#8b90a7]">
                              Tiempo ocupación medio
                            </p>
                            <p className="font-bold">
                              {fmtNum(row.tiempo_medio_ocupacion_minutos, ' min')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      ) : null}

      {mainTab === 'menu' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full min-w-0 sm:max-w-[180px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Desde
              </label>
              <input
                type="date"
                value={desdeIm}
                onChange={(e) => setDesdeIm(e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="w-full min-w-0 sm:max-w-[180px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Hasta
              </label>
              <input
                type="date"
                value={hastaIm}
                onChange={(e) => setHastaIm(e.target.value)}
                className={INPUT}
              />
            </div>
            <button
              type="button"
              onClick={cargarIngenieria}
              className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
              disabled={loadingIm}
            >
              Actualizar
            </button>
          </div>

          {errorIm ? (
            <p className="mb-4 text-red-600 dark:text-red-400">{errorIm}</p>
          ) : null}

          {loadingIm && !dataIm ? (
            <Loader />
          ) : (
            <>
              <p className="mb-2 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                Eje horizontal: popularidad (unidades). Eje vertical: margen %.
                Medianas periodo: {fmtNum(dataIm?.mediana_unidades_vendidas, ' u.')} ·{' '}
                {fmtNum(dataIm?.mediana_margen_porcentaje, ' %')}
              </p>

              <div className="mb-6 hidden md:grid md:min-h-[320px] md:grid-cols-2 md:grid-rows-2 md:gap-2">
                {BCG_ORDER.map((key) => {
                  const meta = BCG_META[key]
                  const list = productosPorClasificacion[key] || []
                  return (
                    <div
                      key={key}
                      className={`flex flex-col rounded-xl border-2 p-3 ${meta.cellClass}`}
                    >
                      <p
                        className={`text-center text-xs font-bold uppercase tracking-wide ${meta.titleClass}`}
                      >
                        {meta.label}
                      </p>
                      <p className="mb-2 text-center text-[10px] text-[#6b7280] dark:text-[#8b90a7]">
                        {meta.sub}
                      </p>
                      <div className="flex flex-1 flex-wrap content-start justify-center gap-1.5 overflow-y-auto">
                        {list.length === 0 ? (
                          <span className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                            —
                          </span>
                        ) : (
                          list.map((p) => (
                            <span
                              key={p.producto_id}
                              className="max-w-full truncate rounded-lg border border-[#e2e5ed] bg-white px-2 py-1 text-xs font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0]"
                              title={p.nombre}
                            >
                              {p.nombre}{' '}
                              <span className="text-amber-500">
                                {fmtNum(p.margen_porcentaje, '%')}
                              </span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BCG_ORDER.map((k) => {
                  const meta = BCG_META[k]
                  const r = resumenCls[k] || { count: 0, ingreso_total: 0 }
                  return (
                    <div
                      key={k}
                      className={`${SURFACE} p-3 text-center`}
                    >
                      <p
                        className={`text-xs font-bold uppercase tracking-wide ${meta?.titleClass || 'text-[#6b7280] dark:text-[#8b90a7]'}`}
                      >
                        {meta?.label ?? k}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
                        {r.count ?? 0}
                      </p>
                      <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                        Ingreso
                      </p>
                      <p className="text-sm font-semibold text-amber-500">
                        {fmtEuro(r.ingreso_total)}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
                <table className="w-full min-w-[960px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Producto
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Ventas
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Ingreso
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Coste
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Margen
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        %
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Clasificación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosIm.map((p) => (
                      <tr
                        key={p.producto_id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        <td className="px-4 py-3 font-medium">{p.nombre}</td>
                        <td className="px-4 py-3">
                          {fmtNum(p.unidades_vendidas, '')}
                        </td>
                        <td className="px-4 py-3">{fmtEuro(p.ingreso_total)}</td>
                        <td className="px-4 py-3">{fmtEuro(p.coste_total)}</td>
                        <td className="px-4 py-3">{fmtEuro(p.margen_total)}</td>
                        <td className="px-4 py-3">{fmtNum(p.margen_porcentaje, '%')}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasificacion(p.clasificacion)}`}
                          >
                            {labelClasificacion(p.clasificacion)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {productosIm.map((p) => (
                  <div key={p.producto_id} className={`${SURFACE} p-4`}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-bold">{p.nombre}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClasificacion(p.clasificacion)}`}
                      >
                        {labelClasificacion(p.clasificacion)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">Ventas</p>
                        <p className="font-semibold">{fmtNum(p.unidades_vendidas, '')}</p>
                      </div>
                      <div>
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">Margen %</p>
                        <p className="font-semibold text-amber-500">
                          {fmtNum(p.margen_porcentaje, '%')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">Ingreso</p>
                        <p className="font-semibold">{fmtEuro(p.ingreso_total)}</p>
                      </div>
                      <div>
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">Coste</p>
                        <p className="font-semibold">{fmtEuro(p.coste_total)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {productosIm.length === 0 && !loadingIm ? (
                <EmptyState message="Sin ventas en el periodo seleccionado" />
              ) : null}
            </>
          )}
        </>
      ) : null}

      {mainTab === 'personal' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full min-w-0 sm:max-w-[200px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Mes
              </label>
              <select
                value={mesCp}
                onChange={(e) => setMesCp(Number(e.target.value))}
                className={SELECT}
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full min-w-0 sm:max-w-[140px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Año
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={anioCp}
                onChange={(e) => setAnioCp(Number(e.target.value))}
                className={INPUT}
              />
            </div>
            <button
              type="button"
              onClick={cargarCostePersonal}
              className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
              disabled={loadingCp}
            >
              Actualizar
            </button>
          </div>

          {errorCp ? (
            <p className="mb-4 text-red-600 dark:text-red-400">{errorCp}</p>
          ) : null}

          {loadingCp && !dataCp ? (
            <Loader />
          ) : dataCp ? (
            <>
              <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <StatCard
                    label="Ratio personal / ingresos"
                    value={`${fmtNum(dataCp.ratio_personal_porcentaje, '%')}`}
                    Icon={BarChart3}
                    color={dataCp.benchmark_ok ? 'green' : 'red'}
                  />
                  <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    Benchmark hostelería: &lt; 35%
                  </p>
                </div>
                <StatCard
                  label="Coste total empresa"
                  value={fmtEuro(dataCp.coste_total_empresa)}
                  Icon={Wallet}
                  color="amber"
                />
                <StatCard
                  label="Total salarios"
                  value={fmtEuro(dataCp.total_salarios)}
                  Icon={Euro}
                  color="white"
                />
                <StatCard
                  label="Nº empleados en nómina"
                  value={String(dataCp.num_empleados ?? 0)}
                  Icon={Users}
                  color="white"
                />
              </div>

              <div className={`${SURFACE} p-4 md:p-6`}>
                <p className="mb-3 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  Coste personal vs ingresos del periodo
                </p>
                <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-[#e2e5ed] dark:bg-[#2e3347]">
                  {(() => {
                    const ing = Number(dataCp.ingresos_periodo) || 0
                    const coste = Number(dataCp.coste_total_empresa) || 0
                    const pctCoste =
                      ing > 0 ? Math.min(100, (coste / ing) * 100) : 0
                    const pctIngreso = ing > 0 ? 100 - pctCoste : 0
                    return (
                      <div className="flex h-full w-full">
                        <div
                          className="h-full bg-red-500/80 transition-all"
                          style={{ width: `${pctCoste}%` }}
                          title="Coste empresa"
                        />
                        <div
                          className="h-full bg-emerald-500/70"
                          style={{ width: `${pctIngreso}%` }}
                          title="Resto ingresos"
                        />
                      </div>
                    )
                  })()}
                </div>
                <div className="mb-4 flex flex-wrap gap-4 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500/80" />
                    Coste empresa ({fmtEuro(dataCp.coste_total_empresa)})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                    Ingresos cobrados ({fmtEuro(dataCp.ingresos_periodo)})
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[#6b7280] dark:text-[#8b90a7]">
                  El ratio compara el coste total empresa (salarios + SS empresa
                  u otros conceptos de nómina) frente a los ingresos de tickets
                  cobrados en el mismo mes. Un ratio inferior al 35% suele
                  indicar un peso del personal acorde al sector hostelero.
                </p>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
