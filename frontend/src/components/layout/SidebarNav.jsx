import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isNavActive, NAV_ITEMS, navScrollStyle } from './constants/navConfig'

export default function SidebarNav({ onClose }) {
  const { user } = useAuth()
  const location = useLocation()
  const rol = user?.rol

  const visibleItems = NAV_ITEMS.filter(
    (item) => rol && item.roles.includes(rol)
  )

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-4"
      style={navScrollStyle}
    >
      {visibleItems.map((item) => {
        const { path, label, Icon } = item
        return (
          <NavLink
            key={path}
            to={path}
            onClick={() => onClose?.()}
            isActive={() => isNavActive(location.pathname, item)}
            className={({ isActive }) =>
              [
                'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium transition-colors',
                isActive
                  ? 'border-l-[3px] border-amber-500 bg-amber-500/10 pl-[13px] text-amber-500'
                  : 'border-l-[3px] border-transparent pl-4 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]',
              ].join(' ')
            }
          >
            <Icon size={20} strokeWidth={1.5} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
