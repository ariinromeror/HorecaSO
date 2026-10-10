import { useAuth } from '../../context/AuthContext'
import { getVisibleNavItems } from './constants/navConfig'

/**
 * Lista legacy (drawer). El layout principal usa MenuHubPage.
 * Se conserva por compatibilidad si algún shell lo monta.
 */
export default function SidebarNav({ onClose }) {
  const { user } = useAuth()
  const visibleItems = getVisibleNavItems(user)

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
      {visibleItems.map((item) => {
        const { path, label, Icon } = item
        return (
          <a
            key={path}
            href={path}
            onClick={(e) => {
              e.preventDefault()
              onClose?.()
              window.location.assign(path)
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
          >
            <Icon size={20} strokeWidth={1.5} className="shrink-0" />
            <span>{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
