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

## Formularios con react-hook-form + zod (Fase 9 del PRD de hardening)

Desde la Fase 9, los formularios nuevos (y los que se toquen por otro motivo)
usan `react-hook-form` + `zod` (+ `@hookform/resolvers`) en vez de validación
manual con `useState` + `if (!campo) setError(...)`. **No es obligatorio
migrar formularios existentes de golpe** — igual que con React Query, es una
adopción incremental.

Hay dos casos de referencia ya migrados:

- `src/pages/LoginPage.jsx` — formulario simple de dos campos.
- `src/pages/admin/usuarios/UsuariosPage.jsx` (`UsuarioCreateModal` /
  `UsuarioEditModal`) — formulario con `select`, un toggle custom (no un
  `<input type="checkbox">` nativo) y dos modos (alta/edición) con esquemas
  `zod` distintos.

### Patrón

```jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: z.string().trim().min(1, 'El email es obligatorio').email('Introduce un email válido'),
})

function MiFormulario({ onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { nombre: '', email: '' } })

  return (
    <div>
      <input {...register('nombre')} className={inputClass} />
      {errors.nombre ? <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p> : null}

      <input {...register('email')} className={inputClass} />
      {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email.message}</p> : null}

      {/* NUNCA <form onSubmit={...}> — handleSubmit se dispara desde onClick, regla `.cursorrules` */}
      <button type="button" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
        {isSubmitting ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}
```

Puntos clave:
- **Nunca `<form onSubmit={...}>`** — el botón de envío es `type="button"`
  con `onClick={handleSubmit(onSubmit)}`. `handleSubmit` ya se encarga de
  validar contra el esquema `zod` antes de invocar `onSubmit` y de poblar
  `formState.errors` si falla.
- Los mensajes de error de `zod` (segundo argumento de cada regla, ej.
  `.min(1, 'El nombre es obligatorio')`) se muestran tal cual, en un `<p>`
  rojo justo debajo del campo — no hace falta un componente de error
  reutilizable todavía con solo dos casos migrados, pero si aparece un
  tercer formulario, considerar extraer un `<FieldError message={...} />`.
- Para controles que **no** son un `<input>`/`<select>` nativo (un toggle a
  medida, un date-picker, etc.), usar `Controller` de `react-hook-form` en
  vez de leer con `watch()` — `watch()` funciona, pero el compilador de React
  (`eslint-plugin-react-hooks` con reglas de pureza) avisa de que `watch()`
  no es memoizable de forma segura. `Controller` no tiene ese problema y es
  el patrón recomendado por la propia librería para este caso.
- `isSubmitting` de `formState` sustituye a un `useState(false)` manual de
  loading del botón — ya tiene en cuenta tanto la validación síncrona de
  `zod` como el tiempo que tarda la promesa de `onSubmit`.

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
