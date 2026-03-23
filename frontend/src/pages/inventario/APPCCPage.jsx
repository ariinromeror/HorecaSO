import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_ACCESO = ['admin', 'director', 'almacen', 'cocina']

const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
const SELECT = `${INPUT} appearance-none`
const TEXTAREA = `${INPUT} min-h-[88px] resize-y`
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
const BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
const BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40'
const PAGE_BG = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'
const TAB_BTN =
  'h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors'

const TIPOS_CONTROL = [
  { value: '', label: 'Todos' },
  { value: 'temperatura', label: 'Temperatura' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'recepcion', label: 'Recepción' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'apertura', label: 'Apertura' },
  { value: 'cierre', label: 'Cierre' },
]

const TIPOS_MODAL = TIPOS_CONTROL.filter((t) => t.value)

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function isoMinusDays(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function formatFechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelTipo(t) {
  const x = TIPOS_CONTROL.find((o) => o.value === t)
  return x ? x.label : t || '—'
}

function emptyFormRegistro() {
  return {
    tipo_control: 'temperatura',
    nombre_equipo: '',
    temperatura: '',
    conforme: true,
    observaciones: '',
    accion_correctora: '',
  }
}

export default function APPCCPage() {
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

  const puedeAcceder = user && ROLES_ACCESO.includes(user.rol)
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

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_ACCESO.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  const pct = resumen != null ? Number(resumen.porcentaje_conformidad) : null
  const pctOk = pct != null && !Number.isNaN(pct) && pct >= 90

  const filaRegistro = (row, { extraCorrectora = false, forceNoBadge = false } = {}) => (
    <>
      <td className="px-4 py-3 text-sm">{formatFechaHora(row.created_at)}</td>
      <td className="px-4 py-3 font-medium capitalize">
        {labelTipo(row.tipo_control)}
      </td>
      <td className="px-4 py-3">{row.nombre_equipo || '—'}</td>
      <td className="px-4 py-3">
        {row.temperatura != null && row.temperatura !== ''
          ? `${Number(row.temperatura).toFixed(1)} °C`
          : '—'}
      </td>
      <td className="px-4 py-3">
        {forceNoBadge ? (
          <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
            No conforme
          </span>
        ) : row.conforme ? (
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Conforme
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
            No conforme
          </span>
        )}
      </td>
      <td className="max-w-[200px] truncate px-4 py-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
        {row.observaciones || '—'}
      </td>
      <td className="px-4 py-3 text-sm">{row.nombre_usuario || '—'}</td>
      {extraCorrectora ? (
        <td className="max-w-[220px] px-4 py-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          {row.accion_correctora || '—'}
        </td>
      ) : null}
    </>
  )

  return (
    <div
      className={`${PAGE_BG} px-4 py-6 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:px-6`}
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck
            className="shrink-0 text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            APPCC
          </h1>
        </div>
        <button
          type="button"
          onClick={abrirModal}
          className={`${BTN_PRIMARY} w-full sm:w-auto`}
        >
          Nuevo registro
        </button>
      </header>

      <section className="mb-6">
        {errorResumen ? (
          <p className="mb-2 text-sm text-red-600 dark:text-red-400">
            {errorResumen}
          </p>
        ) : null}
        {loadingResumen && !resumen ? (
          <Loader />
        ) : resumen ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
            <div className={`${SURFACE} p-3`}>
              <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                Total registros hoy
              </p>
              <p className="mt-1 text-xl font-bold text-[#111827] dark:text-[#e8eaf0]">
                {resumen.total_registros ?? 0}
              </p>
            </div>
            <div className={`${SURFACE} p-3`}>
              <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                Conformes
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {resumen.conformes ?? 0}
              </p>
            </div>
            <div className={`${SURFACE} p-3`}>
              <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                No conformes
              </p>
              <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                {resumen.no_conformes ?? 0}
              </p>
            </div>
            <div className={`${SURFACE} p-3`}>
              <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                % Conformidad
              </p>
              <p
                className={`mt-1 text-xl font-bold ${
                  pctOk
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {pct != null && !Number.isNaN(pct)
                  ? `${pct.toFixed(2)} %`
                  : '—'}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[#e2e5ed] dark:border-[#2e3347] pb-px">
        <button
          type="button"
          onClick={() => setMainTab('registros')}
          className={`${TAB_BTN} shrink-0 ${
            mainTab === 'registros'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Registros
        </button>
        <button
          type="button"
          onClick={() => setMainTab('no-conformes')}
          className={`${TAB_BTN} shrink-0 ${
            mainTab === 'no-conformes'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          No conformidades
        </button>
      </div>

      {mainTab === 'registros' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="w-full min-w-0 lg:max-w-[200px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className={SELECT}
              >
                {TIPOS_CONTROL.map((t) => (
                  <option key={t.value || 'all'} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full min-w-0 sm:max-w-[160px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Desde
              </label>
              <input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="w-full min-w-0 sm:max-w-[160px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Hasta
              </label>
              <input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="w-full min-w-0 lg:max-w-[160px]">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Conforme
              </label>
              <select
                value={filtroConforme}
                onChange={(e) => setFiltroConforme(e.target.value)}
                className={SELECT}
              >
                <option value="">Todos</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
            <button
              type="button"
              onClick={cargarRegistros}
              disabled={loadingReg}
              className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
            >
              Actualizar
            </button>
          </div>

          {errorReg ? (
            <p className="mb-4 text-red-600 dark:text-red-400">{errorReg}</p>
          ) : null}

          {loadingReg && registros.length === 0 ? (
            <Loader />
          ) : registros.length === 0 ? (
            <EmptyState message="No hay registros para los filtros" />
          ) : (
            <>
              <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
                <table className="w-full min-w-[900px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Fecha/Hora
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Tipo
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Equipo
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Temperatura
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Conforme
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Observaciones
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Usuario
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        {filaRegistro(row)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {registros.map((row) => (
                  <div key={row.id} className={`${SURFACE} p-4`}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold capitalize">
                        {labelTipo(row.tipo_control)}
                      </span>
                      {row.conforme ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Conforme
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                          No conforme
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                      {formatFechaHora(row.created_at)}
                    </p>
                    <p className="mt-1 text-sm">
                      Equipo: {row.nombre_equipo || '—'}
                      {row.temperatura != null && row.temperatura !== ''
                        ? ` · ${Number(row.temperatura).toFixed(1)} °C`
                        : ''}
                    </p>
                    {row.observaciones ? (
                      <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                        {row.observaciones}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                      {row.nombre_usuario}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : null}

      {mainTab === 'no-conformes' ? (
        <>
          {!puedeVerNoConformesDetalle ? (
            <EmptyState message="El detalle de no conformidades solo está disponible para administración." />
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="w-full min-w-0 sm:max-w-[160px]">
                  <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={ncDesde}
                    onChange={(e) => setNcDesde(e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div className="w-full min-w-0 sm:max-w-[160px]">
                  <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={ncHasta}
                    onChange={(e) => setNcHasta(e.target.value)}
                    className={INPUT}
                  />
                </div>
                <button
                  type="button"
                  onClick={cargarNoConformes}
                  disabled={loadingNc}
                  className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
                >
                  Actualizar
                </button>
              </div>

              {errorNc ? (
                <p className="mb-4 text-red-600 dark:text-red-400">{errorNc}</p>
              ) : null}

              {loadingNc && noConformes.length === 0 ? (
                <Loader />
              ) : noConformes.length === 0 ? (
                <EmptyState message="No hay no conformidades en el periodo" />
              ) : (
                <>
                  <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
                    <table className="w-full min-w-[1000px] text-left text-[15px]">
                      <thead>
                        <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Fecha/Hora
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Tipo
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Equipo
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Temperatura
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Conforme
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Observaciones
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Usuario
                          </th>
                          <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Acción correctora
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {noConformes.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                          >
                            {filaRegistro(row, {
                              extraCorrectora: true,
                              forceNoBadge: true,
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 md:hidden">
                    {noConformes.map((row) => (
                      <div key={row.id} className={`${SURFACE} p-4`}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold capitalize">
                            {labelTipo(row.tipo_control)}
                          </span>
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                            No conforme
                          </span>
                        </div>
                        <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                          {formatFechaHora(row.created_at)}
                        </p>
                        <p className="mt-1 text-sm">
                          Equipo: {row.nombre_equipo || '—'}
                          {row.temperatura != null && row.temperatura !== ''
                            ? ` · ${Number(row.temperatura).toFixed(1)} °C`
                            : ''}
                        </p>
                        {row.observaciones ? (
                          <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                            {row.observaciones}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                          Acción: {row.accion_correctora || '—'}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                          {row.nombre_usuario}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`${SURFACE} max-h-[92vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl dark:bg-[#1a1d27]`}
          >
            <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              Nuevo registro APPCC
            </h2>
            {modalError ? (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {modalError}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Tipo de control *
                </label>
                <select
                  value={form.tipo_control}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tipo_control: e.target.value }))
                  }
                  className={SELECT}
                >
                  {TIPOS_MODAL.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Nombre equipo
                </label>
                <input
                  type="text"
                  value={form.nombre_equipo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre_equipo: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Temperatura (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperatura}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, temperatura: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="mb-2 flex cursor-pointer items-center gap-3 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                  <input
                    type="checkbox"
                    checked={form.conforme}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        conforme: e.target.checked,
                        accion_correctora: e.target.checked
                          ? ''
                          : f.accion_correctora,
                      }))
                    }
                    className="h-5 w-5 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500 dark:border-[#2e3347]"
                  />
                  Conforme
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Observaciones
                </label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, observaciones: e.target.value }))
                  }
                  className={TEXTAREA}
                  rows={3}
                />
              </div>
              {!form.conforme ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    Acción correctora *
                  </label>
                  <textarea
                    value={form.accion_correctora}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accion_correctora: e.target.value,
                      }))
                    }
                    className={TEXTAREA}
                    rows={3}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={saving}
                className={`${BTN_SECONDARY} w-full sm:w-auto`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarRegistro}
                disabled={saving}
                className={`${BTN_PRIMARY} w-full sm:w-auto`}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
