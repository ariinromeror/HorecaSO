import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import DashboardKPIs from './components/DashboardKPIs'
import { useDashboard } from './hooks/useDashboard'

export default function DashboardPage() {
  const { data, cierre, loading, error } = useDashboard()

  if (loading) {
    return <Loader />
  }

  if (error || !data || !cierre) {
    return <EmptyState message={error || 'Sin datos'} />
  }

  return <DashboardKPIs data={data} cierre={cierre} />
}
