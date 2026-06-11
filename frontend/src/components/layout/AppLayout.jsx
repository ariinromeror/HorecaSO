import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9] dark:bg-[#0f1117]">
      <Sidebar />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:ml-64">
        <header className="h-header-safe sticky top-0 z-30 flex items-center gap-3 border-b border-[#e2e5ed] bg-white px-4 dark:border-[#2e3347] dark:bg-[#1a1d27] md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1 hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
            aria-label="Abrir menú"
          >
            <Menu
              size={22}
              strokeWidth={1.5}
              className="text-[#6b7280] dark:text-[#8b90a7]"
            />
          </button>
          <span className="text-lg font-bold text-amber-500">HorecaSO</span>
        </header>
        <main className="pb-safe min-h-0 flex-1 overflow-y-auto p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
