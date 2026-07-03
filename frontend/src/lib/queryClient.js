import { QueryClient } from '@tanstack/react-query'

/**
 * Cliente de React Query compartido por toda la app (Fase 8 del PRD de
 * hardening). Ver `frontend/README.md` para el patrón estándar a seguir al
 * escribir nuevos hooks de datos con esta librería.
 *
 * Defaults pensados para el proyecto:
 * - `retry: 1`: un solo reintento automático — suficiente para blips de red
 *   sin machacar el backend (SlowAPI aplica rate limiting).
 * - `refetchOnWindowFocus: false`: las pantallas operativas (Venta Live, KDS)
 *   ya usan `refetchInterval` explícito de 30s por regla del proyecto; no
 *   necesitamos un refetch adicional al cambiar de pestaña.
 * - `staleTime: 10_000`: evita refetch inmediato al remontar un componente
 *   que comparte query key con otro ya montado (ej. navegar y volver atrás).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
})
