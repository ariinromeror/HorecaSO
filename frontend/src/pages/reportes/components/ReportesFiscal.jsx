import { useState } from 'react'
import { getFiscalTrimestre } from '../../../services/api'

export default function ReportesFiscal() {
  const now = new Date()
  const [anio, setAnio] = useState(String(now.getFullYear()))
  const [trimestre, setTrimestre] = useState(
    String(Math.floor(now.getMonth() / 3) + 1)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await getFiscalTrimestre(
        parseInt(anio, 10),
        parseInt(trimestre, 10)
      )
      setData(r.data)
    } catch (e) {
      setData(null)
      setError(e.response?.data?.detail || 'Error al cargar fiscal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
        Resumen trimestral para gestoría (Modelo 303 light): bases y cuotas de
        IVA de ventas.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          Año
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="h-12 w-28 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          Trimestre
          <select
            value={trimestre}
            onChange={(e) => setTrimestre(e.target.value)}
            className="h-12 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
          >
            <option value="1">T1</option>
            <option value="2">T2</option>
            <option value="3">T3</option>
            <option value="4">T4</option>
          </select>
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={cargar}
          className="h-12 rounded-lg bg-amber-500 px-6 font-semibold text-black disabled:opacity-40"
        >
          {loading ? 'Cargando…' : 'Consultar'}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
      {data ? (
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
          <p className="text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
            {data.periodo?.desde} → {data.periodo?.hasta}
          </p>
          <p className="mt-2 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
            Base total: {Number(data.ventas?.base_imponible_total || 0).toFixed(2)} €
          </p>
          <p className="text-[15px] text-[#111827] dark:text-[#e8eaf0]">
            Cuota IVA total: {Number(data.ventas?.cuota_iva_total || 0).toFixed(2)} €
          </p>
          <ul className="mt-3 space-y-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            {(data.ventas?.desglose_iva || []).map((d) => (
              <li key={d.iva_porcentaje}>
                IVA {d.iva_porcentaje}% — base {Number(d.base_imponible).toFixed(2)} € /
                cuota {Number(d.cuota_iva).toFixed(2)} €
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Compras (facturas): {data.compras?.num_facturas || 0} · total{' '}
            {Number(data.compras?.total_facturas || 0).toFixed(2)} €
          </p>
        </div>
      ) : null}
    </div>
  )
}
