# Convenciones de frontend — HorecaSO

Este documento complementa el `README.md` de la raíz del repo y `.cursorrules`.
Recoge convenciones específicas del código de `frontend/` que no encajan en
ninguno de los dos.

## Hooks de datos con React Query (Fase 8 del PRD de hardening)

Desde la Fase 8, el proyecto usa `@tanstack/react-query` como capa de
fetch/cache para hooks de datos nuevos. **No es obligatorio migrar hooks
existentes de golpe** — la migración es incremental, hook a hook, cuando se
toque ese código por otro motivo (bug, nueva funcionalidad) o cuando el hook
sea especialmente sensible a duplicación de requests/cache.

Hay dos patrones de referencia ya migrados que sirven de plantilla:

- **Listado "estático"** (se recarga por acción del usuario: búsqueda, filtro,
  o tras guardar/borrar): `src/pages/proveedores/hooks/useProveedores.js`.
- **Polling cada 30s** (pantallas "live" tipo Venta Live/KDS):
  `src/pages/director/hooks/useVentaLivePolling.js`.

### Patrón para un listado estático

```jsx
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useAlgo(filtros) {
  const queryClient = useQueryClient()

  const { data: items = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['algo', filtros],
    queryFn: async () => {
      const r = await getAlgo(filtros)
      return Array.isArray(r.data) ? r.data : []
    },
  })

  const error = queryError
    ? queryError.response?.data?.detail || 'Error al cargar'
    : null

  // Tras un POST/PUT/DELETE que afecte a este listado:
  const recargar = () => queryClient.invalidateQueries({ queryKey: ['algo'] })

  return { items, loading, error, recargar }
}
```

Puntos clave:
- `queryKey` incluye cualquier filtro que cambie el resultado (búsqueda,
  paginación, flags) — React Query cachea y refetchea automáticamente cuando
  cambia.
- Las mutaciones (crear/editar/borrar) siguen siendo llamadas `api.post/put/
  delete` normales seguidas de `queryClient.invalidateQueries(...)`; no hace
  falta migrarlas a `useMutation` para obtener el beneficio principal (cache +
  fetch/loading/error compartidos).
- El shape de retorno del hook (`loading`, `error`, `items`) se mantiene igual
  que con el patrón manual anterior — los componentes que consumen el hook no
  necesitan cambios.

### Patrón para pantallas con polling (regla `.cursorrules`: cada 30s, nunca resetear datos en error)

```jsx
import { useQuery } from '@tanstack/react-query'

const POLL_MS = 30000

export function useAlgoLive() {
  const { data, error: queryError, isLoading, isFetching } = useQuery({
    queryKey: ['algo-live'],
    queryFn: fetchAlgoLive,
    refetchInterval: POLL_MS,
    retry: false, // un fallo de polling se refleja de inmediato, sin reintentos ocultos
  })

  return {
    datos: data ?? null,
    initialLoad: isLoading,
    isRefreshing: isFetching,
    error: queryError
      ? queryError.response?.data?.detail || 'No se pudieron actualizar los datos'
      : null,
  }
}
```

Por qué esto cumple la regla del proyecto sin código extra:
- React Query **mantiene `data` intacto** cuando un refetch en background
  falla — no es necesario un `try/catch` manual que evite pisar el estado.
- `refetchInterval` sustituye al `setInterval` + `useEffect` manual.
- `retry: false` evita reintentos silenciosos que compliquen razonar "cada
  cuánto se reintenta realmente" — un fallo de polling se ve en `error` de
  inmediato, en el siguiente tick se reintenta solo.

### `QueryClient` compartido

Configurado una única vez en `src/lib/queryClient.js` e inyectado en
`src/App.jsx` con `<QueryClientProvider client={queryClient}>` envolviendo
toda la app (dentro del `ErrorBoundary` global, fuera de `ThemeProvider`/
`AuthProvider`). No crear más instancias de `QueryClient` en el código de
producción — solo en tests, donde cada test debe usar su propio `QueryClient`
para aislar la caché (ver `useVentaLivePolling.test.jsx`).

### Testing de hooks migrados

Cualquier hook que use `useQuery`/`useMutation` necesita un
`QueryClientProvider` en el árbol al testear con `renderHook`/`render`. Patrón:

```jsx
function renderWithClient(hook) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(hook, { wrapper })
}
```

## Code-splitting por ruta

Todas las páginas en `src/App.jsx` se importan con `React.lazy(() =>
import(...))` y las rutas están envueltas en `<Suspense fallback={<Loader
/>}>`. Al añadir una página nueva, seguir el mismo patrón — no volver a
imports estáticos, o el bundle inicial vuelve a crecer con cada página nueva.

## ErrorBoundary global

`src/components/shared/ErrorBoundary.jsx` envuelve toda la app en
`src/App.jsx` (fuera de `QueryClientProvider`/`ThemeProvider`/`AuthProvider`,
para que un fallo en cualquiera de esos providers también quede cubierto).
Si necesitas un fallback más granular para una sección concreta (p. ej. un
widget dentro de un dashboard que no debería tirar toda la pantalla), se
puede anidar otro `<ErrorBoundary>` alrededor de ese subárbol.
