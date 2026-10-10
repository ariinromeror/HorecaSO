import { useState } from 'react'
import ReportesOperativos from './components/ReportesOperativos'
import ReportesVentas from './components/ReportesVentas'
import ReportesRRHH from './components/ReportesRRHH'
import ReportesProveedores from './components/ReportesProveedores'
import ReportesFiscal from './components/ReportesFiscal'

const TABS = [
  { id: 'op', label: 'Operativos' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'fiscal', label: 'Fiscal 303' },
  { id: 'rrhh', label: 'RRHH' },
  { id: 'prov', label: 'Proveedores & APPCC' },
]

export default function ReportesPage() {
  const [tab, setTab] = useState('op')

  return (
    <div>
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
      {tab === 'fiscal' && <ReportesFiscal />}
      {tab === 'rrhh' && <ReportesRRHH />}
      {tab === 'prov' && <ReportesProveedores />}
    </div>
  )
}
