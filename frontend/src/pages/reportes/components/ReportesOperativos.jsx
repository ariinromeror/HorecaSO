import { useEffect, useState } from 'react'
import { ClipboardList, FileText, Loader2, Printer } from 'lucide-react'
import api from '../../../services/api'
import { descargarPdf } from '../utilsPdf'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
const TIT = 'mb-1 flex items-center gap-2 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]'
const SUB = 'mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]'
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function PdfBtn({ loading, onClick, label }) {
  return (
    <button type="button" className={BTN} disabled={loading} onClick={onClick}>
      {loading ? (
        <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
      ) : (
        <Printer size={18} strokeWidth={1.5} />
      )}
      {label}
    </button>
  )
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

export default function ReportesOperativos() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [empId, setEmpId] = useState('')
  const [mes, setMes] = useState(String(new Date().getMonth() + 1))
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [nominas, setNominas] = useState([])
  const [fechaInv, setFechaInv] = useState(todayIso)
  const [fechaCierre, setFechaCierre] = useState(todayIso)

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

  const onNomina = () => {
    const m = Number(mes)
    const y = Number(anio)
    const n = nominas.find((x) => Number(x.mes) === m && Number(x.anio) === y)
    if (!n?.id) {
      setError('No hay nómina para ese empleado y periodo')
      setTimeout(() => setError(null), 3000)
      return
    }
    descargarPdf(`/reportes/nomina/${n.id}`, setLoading, setError)
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <OpCard Icon={FileText} title="Nómina (PDF)" sub="Descarga la nómina oficial por empleado y mes.">
          <div className="space-y-3">
            <select className={INPUT} value={empId} onChange={(e) => setEmpId(e.target.value)}>
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
            <PdfBtn loading={loading} onClick={onNomina} label="Descargar PDF" />
          </div>
        </OpCard>

        <OpCard Icon={ClipboardList} title="Inventario" sub="Listado de stock a fecha seleccionada.">
          <div className="space-y-3">
            <input
              type="date"
              className={INPUT}
              value={fechaInv}
              onChange={(e) => setFechaInv(e.target.value)}
            />
            <PdfBtn
              loading={loading}
              label="Descargar PDF"
              onClick={() =>
                descargarPdf(
                  `/reportes/inventario?fecha=${encodeURIComponent(fechaInv)}`,
                  setLoading,
                  setError
                )
              }
            />
          </div>
        </OpCard>

        <OpCard Icon={FileText} title="Cierre de caja" sub="Informe del cierre registrado en el local.">
          <div className="space-y-3">
            <input
              type="date"
              className={INPUT}
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
            />
            <PdfBtn
              loading={loading}
              label="Descargar PDF"
              onClick={() =>
                descargarPdf(
                  `/reportes/cierre-caja/${encodeURIComponent(fechaCierre)}`,
                  setLoading,
                  setError
                )
              }
            />
          </div>
        </OpCard>
      </div>
    </div>
  )
}
