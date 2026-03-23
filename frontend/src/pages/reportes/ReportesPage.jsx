import { useState } from 'react'
import { Download } from 'lucide-react'
import ReportesOperativos from './components/ReportesOperativos'
import ReportesVentas from './components/ReportesVentas'
import ReportesRRHH from './components/ReportesRRHH'
import ReportesProveedores from './components/ReportesProveedores'

const TABS = [
  { id: 'op', label: 'Operativos' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'rrhh', label: 'RRHH' },
  { id: 'prov', label: 'Proveedores & APPCC' },
]

export default function ReportesPage() {
  const [tab, setTab] = useState('op')

  return (
    <div className="min-h-screen bg-[#f4f6f9] p-4 dark:bg-[#0f1117] md:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Download
          className="shrink-0 text-amber-500"
          size={24}
          strokeWidth={1.5}
          aria-hidden
        />
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Reportes
        </h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-[#e2e5ed] dark:border-[#2e3347]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={
              tab === t.id
                ? '-mb-px border-b-2 border-amber-500 px-4 py-3 text-[15px] font-semibold text-amber-500'
                : 'px-4 py-3 text-[15px] font-medium text-[#6b7280] dark:text-[#8b90a7]'
            }
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'op' && <ReportesOperativos />}
      {tab === 'ventas' && <ReportesVentas />}
      {tab === 'rrhh' && <ReportesRRHH />}
      {tab === 'prov' && <ReportesProveedores />}
    </div>
  )
}
