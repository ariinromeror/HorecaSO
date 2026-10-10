import {
  ArrowLeft,
  ChefHat,
  Moon,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import KdsColumnaEstado from './components/KdsColumnaEstado'
import { useKdsComandas } from './hooks/useKdsComandas'
import { ICON, tituloKdsPorRol } from './kdsHelpers'

export default function KDSPage() {
  const { isDark, toggleTheme } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const rol = user?.rol || user?.role

  const k = useKdsComandas()

  if (k.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f6f9] dark:bg-[#0f1117]">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#f4f6f9] dark:bg-[#0f1117]">
      <header className="sticky top-0 z-20 shrink-0 border-b border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="h-header-safe grid grid-cols-[3rem_1fr_3rem] items-center px-2 sm:px-3">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => navigate('/menu')}
              className="flex h-12 w-12 items-center justify-center rounded-lg text-[#111827] hover:bg-[#f0f2f5] dark:text-[#e8eaf0] dark:hover:bg-[#222536]"
              aria-label="Volver al menú"
            >
              <ArrowLeft size={20} strokeWidth={1.5} />
              <span className="sr-only">Atrás</span>
            </button>
          </div>
          <h1 className="min-w-0 truncate px-1 text-center text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            {tituloKdsPorRol(rol)}
          </h1>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-12 w-12 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
              aria-label={isDark ? 'Modo diurno' : 'Modo nocturno'}
            >
              {isDark ? (
                <Sun size={20} strokeWidth={1.5} />
              ) : (
                <Moon size={20} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2e5ed] px-3 py-2 dark:border-[#2e3347]">
          <div className="flex items-center gap-2 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
            <ChefHat {...ICON} className="h-5 w-5 text-amber-500" aria-hidden />
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  k.pollError ? 'bg-red-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  k.pollError ? 'bg-red-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span>
              Actualizado hace {k.secText}
              {k.pollError ? (
                <WifiOff
                  {...ICON}
                  className="ml-1 inline h-4 w-4 text-red-400"
                  aria-hidden
                />
              ) : (
                <Wifi
                  {...ICON}
                  className="ml-1 inline h-4 w-4 text-emerald-500"
                  aria-hidden
                />
              )}
            </span>
          </div>
          <p className="text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
            <span className="text-amber-600 dark:text-amber-400">
              {k.stats.platos_pendientes}
            </span>{' '}
            pend. ·{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {k.stats.platos_preparando}
            </span>{' '}
            prep. ·{' '}
            <span className="text-teal-600 dark:text-teal-400">
              {k.stats.platos_listos_recogida}
            </span>{' '}
            listos ·{' '}
            <span className="text-emerald-600 dark:text-emerald-400">
              {k.stats.platos_completados}
            </span>{' '}
            salieron
          </p>
        </div>
        {k.error ? (
          <div
            className="mx-3 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {k.error}
          </div>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-[1920px]">
          <KdsColumnaEstado
            comandas={k.comandas}
            cambiarEstado={k.cambiarEstado}
            rol={rol}
          />
        </div>
      </main>
    </div>
  )
}
