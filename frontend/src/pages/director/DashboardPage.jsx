import { useState } from 'react'
import { BrainCircuit, LayoutDashboard } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import DashboardKPIs from './components/DashboardKPIs'
import PrediccionesIAPanel from './components/PrediccionesIAPanel'
import { useDashboard } from './hooks/useDashboard'

const TABS = [
  { id: 'resumen', label: 'Resumen', Icon: LayoutDashboard },
  { id: 'ia', label: 'Predicciones IA', Icon: BrainCircuit },
]

export default function DashboardPage() {
  const { data, cierre, loading, error } = useDashboard()
  const [tab, setTab] = useState('resumen')

  if (loading) {
    return <Loader />
  }

  if (error || !data || !cierre) {
    return <EmptyState message={error || 'Sin datos'} />
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] dark:bg-[#0f1117]">
      <div className="sticky top-0 z-10 border-b border-[#e2e5ed] bg-[#f4f6f9]/95 px-4 pt-3 backdrop-blur dark:border-[#2e3347] dark:bg-[#0f1117]/95 md:px-7">
        <div className="flex gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'flex h-12 items-center gap-2 rounded-t-lg px-4 text-[15px] font-medium transition-colors',
                tab === id
                  ? 'border-b-2 border-amber-500 text-amber-500'
                  : 'text-[#6b7280] hover:text-[#111827] dark:text-[#8b90a7] dark:hover:text-[#e8eaf0]',
              ].join(' ')}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'resumen' ? (
        <DashboardKPIs data={data} cierre={cierre} />
      ) : (
        <div className="p-4 md:p-7">
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Predicciones IA
          </h1>
          <p className="mb-6 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Previsión de mermas basada en series temporales del inventario
          </p>
          <PrediccionesIAPanel />
        </div>
      )}
    </div>
  )
}
