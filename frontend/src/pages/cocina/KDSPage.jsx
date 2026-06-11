import {
  ChefHat,
  Moon,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import KdsColumnaEstado from './components/KdsColumnaEstado'
import { useKdsComandas } from './hooks/useKdsComandas'
import { ICON, tituloKdsPorRol } from './kdsHelpers'

export default function KDSPage() {
  const { isDark, toggleTheme } = useTheme()
  const { user } = useAuth()

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
      <header className="sticky top-0 z-20 shrink-0 border-b border-[#e2e5ed] bg-white px-4 py-3 dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <ChefHat
              {...ICON}
              className="h-8 w-8 text-amber-500"
              aria-hidden
            />
            <h1 className="text-xl font-bold text-[#111827] dark:text-[#f5f5f5]">
              {tituloKdsPorRol(user?.role)}
            </h1>
            <div className="flex items-center gap-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
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
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              <span className="text-amber-600 dark:text-amber-400">
                {k.stats.platos_pendientes}
              </span>{' '}
              pendientes ·{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {k.stats.platos_preparando}
              </span>{' '}
              preparando ·{' '}
              <span className="text-teal-600 dark:text-teal-400">
                {k.stats.platos_listos_recogida}
              </span>{' '}
              listos ·{' '}
              <span className="text-emerald-600 dark:text-emerald-400">
                {k.stats.platos_completados}
              </span>{' '}
              ya salieron
            </p>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] p-2 dark:border-[#2e3347] dark:bg-[#222536]"
              aria-label={isDark ? 'Modo diurno' : 'Modo nocturno'}
            >
              {isDark ? (
                <Sun
                  size={20}
                  strokeWidth={1.5}
                  className="text-[#6b7280] dark:text-[#8b90a7]"
                />
              ) : (
                <Moon
                  size={20}
                  strokeWidth={1.5}
                  className="text-[#6b7280] dark:text-[#8b90a7]"
                />
              )}
            </button>
          </div>
        </div>
        {k.error ? (
          <div
            className="mx-auto mt-2 max-w-[1920px] rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
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
            rol={user?.role}
          />
        </div>
      </main>
    </div>
  )
}
