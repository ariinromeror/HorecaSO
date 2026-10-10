import { useEffect, useState } from 'react'
import { ClipboardList, Eye, FileText, Loader2, Printer } from 'lucide-react'
import api from '../../../services/api'
import { descargarPdf } from '../utilsPdf'
import ReportesPreviewTable, {
  BTN_PRIMARY,
  BTN_SECONDARY,
  euro,
} from './ReportesPreviewTable'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const TIT =
  'mb-1 flex items-center gap-2 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]'
const SUB = 'mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]'
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

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function OpCard({ Icon, title, sub, children }) {
  return (
    <div className={CARD}>
      <h2 className={TIT}>
        <Icon size={20} strokeWidth={1.5} aria-hidden />
        {title}
      </h2>
      <p className={SUB}>{sub}</p>
      {children}
    </div>
  )
}

function ActionPair({ loadingVer, loadingPdf, onVer, onPdf, disabled }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        className={BTN_SECONDARY}
        disabled={disabled || loadingVer || loadingPdf}
        onClick={onVer}
      >
        {loadingVer ? (
          <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
        ) : (
          <Eye size={18} strokeWidth={1.5} />
        )}
        Ver en pantalla
      </button>
      <button
        type="button"
        className={BTN_PRIMARY}
        disabled={disabled || loadingVer || loadingPdf}
        onClick={onPdf}
      >
        {loadingPdf ? (
          <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
        ) : (
          <Printer size={18} strokeWidth={1.5} />
        )}
        Generar PDF
      </button>
    </div>
  )
}

export default function ReportesOperativos() {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [empId, setEmpId] = useState('')
  const [mes, setMes] = useState(String(new Date().getMonth() + 1))
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [nominas, setNominas] = useState([])
  const [fechaInv, setFechaInv] = useState(todayIso)
  const [fechaCierre, setFechaCierre] = useState(todayIso)

  const [previewKind, setPreviewKind] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [nominaData, setNominaData] = useState(null)
  const [invData, setInvData] = useState(null)
  const [cierreData, setCierreData] = useState(null)

  useEffect(() => {
    let ok = true
    ;(async () => {
      try {
        const r = await api.get('/empleados')
        if (ok) setEmpleados(Array.isArray(r.data) ? r.data : [])
      } catch {
        if (ok) setEmpleados([])
      }
    })()
    return () => {
      ok = false
    }
  }, [])

  useEffect(() => {
    if (!empId) {
      setNominas([])
      return
    }
    let ok = true
    ;(async () => {
      try {
        const r = await api.get(`/nominas/${empId}`)
        if (ok) setNominas(Array.isArray(r.data) ? r.data : [])
      } catch {
        if (ok) setNominas([])
      }
    })()
    return () => {
      ok = false
    }
  }, [empId])

  const resolveNominaId = () => {
    const m = Number(mes)
    const y = Number(anio)
    const n = nominas.find((x) => Number(x.mes) === m && Number(x.anio) === y)
    return n?.id || null
  }

  const flashErr = (msg) => {
    setError(msg)
    setTimeout(() => setError(null), 3000)
  }

  const onNominaVer = async () => {
    const id = resolveNominaId()
    if (!id) {
      flashErr('No hay nómina para ese empleado y periodo')
      return
    }
    setPreviewLoading(true)
    setError(null)
    setPreviewKind('nomina')
    try {
      const r = await api.get(`/reportes/nomina/${id}/datos`)
      setNominaData(r.data)
    } catch (e) {
      setNominaData(null)
      flashErr(e.response?.data?.detail || 'Error al cargar nómina')
    } finally {
      setPreviewLoading(false)
    }
  }

  const onNominaPdf = () => {
    const id = resolveNominaId()
    if (!id) {
      flashErr('No hay nómina para ese empleado y periodo')
      return
    }
    descargarPdf(`/reportes/nomina/${id}`, setPdfLoading, setError)
  }

  const onInvVer = async () => {
    setPreviewLoading(true)
    setError(null)
    setPreviewKind('inventario')
    try {
      const r = await api.get('/reportes/inventario/datos', {
        params: { fecha: fechaInv },
      })
      setInvData(r.data)
    } catch (e) {
      setInvData(null)
      flashErr(e.response?.data?.detail || 'Error al cargar inventario')
    } finally {
      setPreviewLoading(false)
    }
  }

  const onCierreVer = async () => {
    setPreviewLoading(true)
    setError(null)
    setPreviewKind('cierre')
    try {
      const r = await api.get(
        `/reportes/cierre-caja/${encodeURIComponent(fechaCierre)}/datos`
      )
      setCierreData(r.data)
    } catch (e) {
      setCierreData(null)
      flashErr(e.response?.data?.detail || 'Error al cargar cierre')
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <OpCard
          Icon={FileText}
          title="Nómina"
          sub="Consulta o descarga la nómina por empleado y mes."
        >
          <div className="space-y-3">
            <select
              className={INPUT}
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
            >
              <option value="">Empleado…</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_completo || e.nombre || e.id}
                </option>
              ))}
            </select>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <select
                className={`${INPUT} min-w-0`}
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              >
                {MESES.map((l, i) => (
                  <option key={l} value={String(i + 1)}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className={INPUT}
                min={2000}
                max={2100}
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              />
            </div>
            <ActionPair
              loadingVer={previewLoading && previewKind === 'nomina'}
              loadingPdf={pdfLoading}
              onVer={onNominaVer}
              onPdf={onNominaPdf}
              disabled={!empId}
            />
          </div>
        </OpCard>

        <OpCard
          Icon={ClipboardList}
          title="Inventario"
          sub="Listado de stock a fecha seleccionada."
        >
          <div className="space-y-3">
            <input
              type="date"
              className={INPUT}
              value={fechaInv}
              onChange={(e) => setFechaInv(e.target.value)}
            />
            <ActionPair
              loadingVer={previewLoading && previewKind === 'inventario'}
              loadingPdf={pdfLoading}
              onVer={onInvVer}
              onPdf={() =>
                descargarPdf(
                  `/reportes/inventario?fecha=${encodeURIComponent(fechaInv)}`,
                  setPdfLoading,
                  setError
                )
              }
            />
          </div>
        </OpCard>

        <OpCard
          Icon={FileText}
          title="Cierre de caja"
          sub="Informe del cierre registrado en el local."
        >
          <div className="space-y-3">
            <input
              type="date"
              className={INPUT}
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
            />
            <ActionPair
              loadingVer={previewLoading && previewKind === 'cierre'}
              loadingPdf={pdfLoading}
              onVer={onCierreVer}
              onPdf={() =>
                descargarPdf(
                  `/reportes/cierre-caja/${encodeURIComponent(fechaCierre)}`,
                  setPdfLoading,
                  setError
                )
              }
            />
          </div>
        </OpCard>
      </div>

      {previewKind === 'nomina' ? (
        <ReportesPreviewTable
          loading={previewLoading}
          title={
            nominaData
              ? `Nómina — ${nominaData.empleado_nombre} (${nominaData.mes}/${nominaData.anio})`
              : 'Nómina'
          }
          emptyMessage="Sin datos de nómina."
          columns={[
            { key: 'concepto', label: 'Concepto' },
            { key: 'importe', label: 'Importe', align: 'right' },
          ]}
          rows={
            nominaData
              ? [
                  {
                    _key: 'bruto',
                    concepto: 'Salario bruto',
                    importe: euro(nominaData.salario_bruto),
                  },
                  {
                    _key: 'dev',
                    concepto: 'Total devengos',
                    importe: euro(nominaData.total_devengos),
                  },
                  {
                    _key: 'ss',
                    concepto: 'SS empleado',
                    importe: euro(nominaData.ss_empleado),
                  },
                  {
                    _key: 'irpf',
                    concepto: 'IRPF',
                    importe: euro(nominaData.irpf),
                  },
                  {
                    _key: 'ded',
                    concepto: 'Total deducciones',
                    importe: euro(nominaData.total_deducciones),
                  },
                  {
                    _key: 'liq',
                    concepto: 'Líquido',
                    importe: euro(nominaData.liquido),
                  },
                  {
                    _key: 'sse',
                    concepto: 'SS empresa',
                    importe: euro(nominaData.ss_empresa),
                  },
                  {
                    _key: 'cte',
                    concepto: 'Coste total empresa',
                    importe: euro(nominaData.coste_total_empresa),
                  },
                ]
              : []
          }
          summary={
            nominaData ? (
              <span>
                Cargo: {nominaData.cargo || '—'} · DNI: {nominaData.dni || '—'}{' '}
                · {nominaData.pagada ? 'Pagada' : 'Pendiente de pago'}
              </span>
            ) : null
          }
        />
      ) : null}

      {previewKind === 'inventario' ? (
        <ReportesPreviewTable
          loading={previewLoading}
          title={`Inventario — ${invData?.fecha || fechaInv}`}
          emptyMessage="No hay artículos de inventario."
          summary={
            invData ? (
              <span>{invData.total || 0} artículos</span>
            ) : null
          }
          columns={[
            { key: 'nombre', label: 'Artículo' },
            { key: 'sku', label: 'SKU' },
            { key: 'categoria_almacen', label: 'Categoría' },
            {
              key: 'stock_actual',
              label: 'Stock',
              align: 'right',
              format: (v, row) =>
                `${v != null ? Number(v) : '—'} ${row.unidad_medida || ''}`.trim(),
            },
            {
              key: 'coste_unitario',
              label: 'Coste',
              align: 'right',
              format: (v) => euro(v),
            },
          ]}
          rows={invData?.articulos || []}
        />
      ) : null}

      {previewKind === 'cierre' ? (
        <ReportesPreviewTable
          loading={previewLoading}
          title={`Cierre de caja — ${cierreData?.fecha || fechaCierre}`}
          emptyMessage="No hay cierre para esa fecha."
          summary={
            cierreData ? (
              <span>
                Total ventas {euro(cierreData.total_ventas)} ·{' '}
                {cierreData.num_tickets || 0} tickets · ticket medio{' '}
                {euro(cierreData.ticket_medio)}
              </span>
            ) : null
          }
          columns={[
            { key: 'metodo', label: 'Método' },
            { key: 'importe', label: 'Importe', align: 'right' },
          ]}
          rows={
            cierreData
              ? [
                  {
                    _key: 'ef',
                    metodo: 'Efectivo',
                    importe: euro(cierreData.total_efectivo),
                  },
                  {
                    _key: 'tj',
                    metodo: 'Tarjeta',
                    importe: euro(cierreData.total_tarjeta),
                  },
                  {
                    _key: 'bz',
                    metodo: 'Bizum',
                    importe: euro(cierreData.total_bizum),
                  },
                  {
                    _key: 'tr',
                    metodo: 'Transferencia',
                    importe: euro(cierreData.total_transferencia),
                  },
                  {
                    _key: 'inv',
                    metodo: 'Invitaciones',
                    importe: euro(cierreData.total_invitaciones),
                  },
                ]
              : []
          }
        />
      ) : null}
    </div>
  )
}
