import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Eye, Receipt } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_NOMINAS = ['admin', 'director']

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const INPUT =
  'w-full min-w-0 max-w-full min-h-[48px] rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const SELECT =
  `${INPUT} appearance-none bg-[#f0f2f5] dark:bg-[#222536]`
const BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black hover:bg-amber-600 disabled:opacity-40'
const BTN_GHOST =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] px-3 text-[15px] font-medium text-[#111827] dark:border-[#2e3347] dark:text-[#e8eaf0]'
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
const CARD_SM =
  'rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2 dark:border-[#2e3347] dark:bg-[#0f1117]'

function eur(n) {
  if (n == null || Number.isNaN(Number(n))) return '0.00 €'
  return `${Number(n).toFixed(2)} €`
}

function inferDesgloseFromNomina(n) {
  const td = Number(n.total_devengos) || 0
  const irpf = Number(n.irpf) || 0
  const irpfPct = td > 0 ? (irpf / td) * 100 : 0
  return {
    salario_bruto_mensual_base: n.salario_bruto,
    horas_extra_importe: n.horas_extra_importe,
    plus_festivos: n.plus_festivos,
    otros_devengos: n.otros_devengos,
    total_devengos: n.total_devengos,
    ss_empleado_pct: 6.35,
    ss_empleado: n.ss_empleado,
    irpf_porcentaje_aplicado: irpfPct,
    irpf: n.irpf,
    otras_deducciones: n.otras_deducciones,
    total_deducciones: n.total_deducciones,
    liquido: n.liquido,
    ss_empresa_pct: 29.9,
    ss_empresa: n.ss_empresa,
    coste_total_empresa: n.coste_total_empresa,
  }
}

function DesglosePanel({ titulo, desglose, nominaBase }) {
  const d = desglose || inferDesgloseFromNomina(nominaBase || {})
  const nb = nominaBase || {}

  return (
    <div className={`${SURFACE} p-4 md:p-6`}>
      <h2 className="mb-6 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
        {titulo}
      </h2>

      <section className="mb-6">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
          Devengos
        </h3>
        <ul className="space-y-2 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
          <li className="flex justify-between gap-2">
            <span>Salario base</span>
            <span>{eur(d.salario_bruto_mensual_base ?? nb.salario_bruto)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Horas extra</span>
            <span>{eur(d.horas_extra_importe ?? nb.horas_extra_importe)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Plus festivos</span>
            <span>{eur(d.plus_festivos ?? nb.plus_festivos)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Otros devengos</span>
            <span>{eur(d.otros_devengos ?? nb.otros_devengos)}</span>
          </li>
        </ul>
        <div className="my-3 border-t border-[#e2e5ed] dark:border-[#2e3347]" />
        <div className="flex justify-between gap-2 text-[17px] font-bold text-[#111827] dark:text-[#e8eaf0]">
          <span>TOTAL DEVENGOS</span>
          <span>{eur(d.total_devengos ?? nb.total_devengos)}</span>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
          Deducciones
        </h3>
        <ul className="space-y-2 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
          <li className="flex justify-between gap-2">
            <span>
              SS empleado (
              {(d.ss_empleado_pct ?? 6.35).toFixed(2).replace(/\.00$/, '')}%)
            </span>
            <span>{eur(d.ss_empleado ?? nb.ss_empleado)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>
              IRPF (
              {(d.irpf_porcentaje_aplicado ?? 0).toFixed(2).replace(/\.00$/, '')}
              %)
            </span>
            <span>{eur(d.irpf ?? nb.irpf)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Otras deducciones</span>
            <span>{eur(d.otras_deducciones ?? nb.otras_deducciones)}</span>
          </li>
        </ul>
        <div className="my-3 border-t border-[#e2e5ed] dark:border-[#2e3347]" />
        <div className="flex justify-between gap-2 text-[17px] font-bold text-[#111827] dark:text-[#e8eaf0]">
          <span>TOTAL DEDUCCIONES</span>
          <span>{eur(d.total_deducciones ?? nb.total_deducciones)}</span>
        </div>
      </section>

      <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-4">
        <p className="text-[13px] font-medium uppercase text-[#6b7280] dark:text-[#8b90a7]">
          Líquido a percibir
        </p>
        <p className="mt-1 text-3xl font-bold text-amber-500 md:text-4xl">
          {eur(d.liquido ?? nb.liquido)}
        </p>
      </div>

      <section className="rounded-lg bg-[#f4f6f9] px-3 py-3 text-[13px] text-[#6b7280] dark:bg-[#0f1117] dark:text-[#8b90a7]">
        <h3 className="mb-2 font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Coste empresa
        </h3>
        <ul className="space-y-1">
          <li className="flex justify-between gap-2">
            <span>
              SS empresa (
              {(d.ss_empresa_pct ?? 29.9).toFixed(1).replace(/\.0$/, '')}%)
            </span>
            <span className="text-[#111827] dark:text-[#e8eaf0]">
              {eur(d.ss_empresa ?? nb.ss_empresa)}
            </span>
          </li>
          <li className="flex justify-between gap-2 font-medium text-[#111827] dark:text-[#e8eaf0]">
            <span>Coste total empresa</span>
            <span>{eur(d.coste_total_empresa ?? nb.coste_total_empresa)}</span>
          </li>
        </ul>
      </section>
    </div>
  )
}

export default function NominasPage() {
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

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_NOMINAS.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex items-center gap-3">
        <Receipt className="text-amber-500" size={28} strokeWidth={1.5} />
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Nóminas
        </h1>
      </header>

      {errorEmp ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorEmp}</p>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`min-w-0 ${SURFACE} p-4 md:p-6`}>
          <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Calculadora
          </h2>

          {loadingEmp ? (
            <Loader />
          ) : (
            <>
              <label className="mb-4 block min-w-0">
                <span className="mb-1 block text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                  Empleado
                </span>
                <select
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(e.target.value)}
                  className={SELECT}
                >
                  <option value="">Seleccionar…</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre_empleado || e.nombre_completo || e.id}
                    </option>
                  ))}
                </select>
              </label>

              {empleadoSel ? (
                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className={CARD_SM}>
                    <p className="text-[12px] text-[#6b7280] dark:text-[#8b90a7]">
                      Salario bruto
                    </p>
                    <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {eur(empleadoSel.salario_bruto_mensual)}
                    </p>
                  </div>
                  <div className={CARD_SM}>
                    <p className="text-[12px] text-[#6b7280] dark:text-[#8b90a7]">
                      Jornada (h/sem)
                    </p>
                    <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {empleadoSel.jornada_horas != null
                        ? `${empleadoSel.jornada_horas} h`
                        : '—'}
                    </p>
                  </div>
                  <div className={CARD_SM}>
                    <p className="text-[12px] text-[#6b7280] dark:text-[#8b90a7]">
                      IRPF %
                    </p>
                    <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {empleadoSel.irpf_porcentaje != null
                        ? `${Number(empleadoSel.irpf_porcentaje).toFixed(2)} %`
                        : '—'}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[15px]">Mes</span>
                  <select
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                    className={SELECT}
                  >
                    {MESES.map((m, i) => (
                      <option key={m} value={String(i + 1)}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[15px]">Año</span>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                    className={INPUT}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => setExtrasOpen((o) => !o)}
                className="mb-3 flex w-full min-h-[48px] items-center justify-between rounded-lg border border-[#e2e5ed] px-3 py-2 text-left text-[15px] dark:border-[#2e3347]"
              >
                <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                  Conceptos extra
                </span>
                {extrasOpen ? (
                  <ChevronUp size={20} strokeWidth={1.5} />
                ) : (
                  <ChevronDown size={20} strokeWidth={1.5} />
                )}
              </button>

              {extrasOpen ? (
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                      Horas extra (cantidad)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={horasExtraCant}
                      onChange={(e) => setHorasExtraCant(e.target.value)}
                      className={INPUT}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                      Plus festivos (€)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={plusFest}
                      onChange={(e) => setPlusFest(e.target.value)}
                      className={INPUT}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                      Otros devengos (€)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={otrosDev}
                      onChange={(e) => setOtrosDev(e.target.value)}
                      className={INPUT}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                      Otras deducciones (€)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={otrasDed}
                      onChange={(e) => setOtrasDed(e.target.value)}
                      className={INPUT}
                    />
                  </label>
                </div>
              ) : null}

              {calcError ? (
                <p className="mb-3 text-[15px] text-red-600 dark:text-red-400">
                  {calcError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={calcularNomina}
                disabled={calculando || !empleadoId}
                className={BTN_PRIMARY}
              >
                {calculando ? 'Calculando…' : 'Calcular nómina'}
              </button>
            </>
          )}
        </div>

        <div
          className={`min-w-0 ${mostrarPanelDerecho ? '' : 'hidden lg:block'}`}
        >
          {mostrarPanelDerecho ? (
            <DesglosePanel
              titulo={tituloResultado}
              desglose={resultado.desglose}
              nominaBase={resultado}
            />
          ) : (
            <div
              className={`${SURFACE} flex min-h-[280px] items-center justify-center p-8 text-center text-[15px] text-[#6b7280] dark:text-[#8b90a7]`}
            >
              Calcula una nómina para ver el desglose aquí
            </div>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Historial de nóminas
          {empleadoId
            ? ` — ${nombreEmpleado(empleadoId)}`
            : ' (selecciona empleado)'}
        </h2>

        {!empleadoId ? (
          <EmptyState message="Selecciona un empleado para ver su historial" />
        ) : loadingHist ? (
          <Loader />
        ) : historial.length === 0 ? (
          <EmptyState message="No hay nóminas registradas para este empleado" />
        ) : (
          <>
            <div className={`hidden overflow-x-auto md:block ${SURFACE}`}>
              <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                    <th className="px-4 py-3 font-semibold">Empleado</th>
                    <th className="px-4 py-3 font-semibold">Mes / Año</th>
                    <th className="px-4 py-3 font-semibold">Bruto</th>
                    <th className="px-4 py-3 font-semibold">Líquido</th>
                    <th className="px-4 py-3 font-semibold">Coste empresa</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((n) => (
                    <tr
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => cargarEnPanel(n)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          cargarEnPanel(n)
                        }
                      }}
                      className="cursor-pointer border-b border-[#e2e5ed] hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:hover:bg-[#0f1117]"
                    >
                      <td className="px-4 py-3">
                        {nombreEmpleado(n.empleado_id)}
                      </td>
                      <td className="px-4 py-3">
                        {MESES[n.mes - 1]} {n.anio}
                      </td>
                      <td className="px-4 py-3">{eur(n.total_devengos)}</td>
                      <td className="px-4 py-3">{eur(n.liquido)}</td>
                      <td className="px-4 py-3">
                        {eur(n.coste_total_empresa)}
                      </td>
                      <td className="px-4 py-3">
                        {n.pagada ? (
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Pagada
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirDetalle(n)
                          }}
                          className={BTN_GHOST}
                        >
                          <Eye size={18} strokeWidth={1.5} />
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {historial.map((n) => (
                <div key={n.id} className={`${SURFACE} p-4`}>
                  <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    {nombreEmpleado(n.empleado_id)}
                  </p>
                  <p className="mt-1 text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                    {MESES[n.mes - 1]} {n.anio}
                  </p>
                  <dl className="mt-3 space-y-1 text-[14px]">
                    <div className="flex justify-between">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Bruto
                      </dt>
                      <dd>{eur(n.total_devengos)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Líquido
                      </dt>
                      <dd className="font-medium text-amber-500">
                        {eur(n.liquido)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Coste empresa
                      </dt>
                      <dd>{eur(n.coste_total_empresa)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-center justify-between">
                    {n.pagada ? (
                      <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Pagada
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Pendiente
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        abrirDetalle(n)
                      }}
                      className={BTN_GHOST}
                    >
                      <Eye size={18} strokeWidth={1.5} />
                      Detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {modalNomina ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:rounded-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                Detalle nómina
              </h2>
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg px-3 py-2 text-[14px] text-[#6b7280] dark:text-[#8b90a7]"
              >
                Cerrar
              </button>
            </div>
            {loadingDetalle ? (
              <Loader />
            ) : detalleModal ? (
              <DesglosePanel
                titulo={`Nómina ${MESES[(detalleModal.mes || modalNomina.mes) - 1]} ${detalleModal.anio || modalNomina.anio} — ${detalleModal.empleado?.nombre_empleado || nombreEmpleado(detalleModal.empleado_id || modalNomina.empleado_id)}`}
                desglose={null}
                nominaBase={detalleModal}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
