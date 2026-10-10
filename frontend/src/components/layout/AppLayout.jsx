import { Outlet, useLocation } from 'react-router-dom'
import ModuleTopBar from './ModuleTopBar'

export default function AppLayout() {
  const location = useLocation()
  const isHub = location.pathname === '/menu'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f6f9] dark:bg-[#0f1117]">
      {isHub ? null : <ModuleTopBar />}
      <main
        className={`pb-safe min-h-0 flex-1 overflow-y-auto ${
          isHub ? 'px-4 pb-4 pt-0 md:px-8 md:pb-8' : 'p-4 md:p-7'
        }`}
      >
        <Outlet />
      </main>
    </div>
  )
}
