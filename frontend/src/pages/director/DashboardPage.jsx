import { useMemo, useState } from 'react'
import { LayoutDashboard, PackageX } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import { isModuloActivo } from '../../utils/tenantModulos'
import DashboardKPIs from './components/DashboardKPIs'
import PrediccionesIAPanel from './components/PrediccionesIAPanel'
import { useDashboard } from './hooks/useDashboard'

const ALL_TABS = [
  { id: 'resumen', label: 'Resumen', Icon: LayoutDashboard },
  {
    id: 'ia',
    label: 'Previsión mermas',
    Icon: PackageX,
    modulo: 'predicciones',
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, cierre, loading, error } = useDashboard()
  const [tab, setTab] = useState('resumen')

  const tabs = useMemo(() => {
    return ALL_TABS.filter((t) => isModuloActivo(user?.modulos, t.modulo))
  }, [user?.modulos])

  if (loading) {
    return <Loader />
  }

  if (error || !data || !cierre) {
    return <EmptyState message={error || 'Sin datos'} />
  }

  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'resumen'

  return (
    <div>
      {tabs.length > 1 ? (
        <div className="mb-4 border-b border-[#e2e5ed] dark:border-[#2e3347]">
          <div className="flex gap-1">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={[
                  'flex h-12 items-center gap-2 rounded-t-lg px-4 text-[15px] font-medium transition-colors',
                  activeTab === id
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
      ) : null}

      {activeTab === 'resumen' ? (
        <DashboardKPIs data={data} cierre={cierre} />
      ) : (
        <div>
          <p className="mb-6 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
            Calcula cuánto puedes perder en mermas los próximos días según lo
            que ya has registrado en Inventario. Necesitas histórico de mermas
            para que salgan números útiles.
          </p>
          <PrediccionesIAPanel />
        </div>
      )}
    </div>
  )
}
