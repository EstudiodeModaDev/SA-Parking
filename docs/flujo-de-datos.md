# Flujo de datos

[← Volver al README](../README.md) · [Rutas y páginas](rutas.md)

Este documento describe el recorrido genérico que sigue la app: desde que arranca hasta que una página muestra datos del backend o envía un cambio. Todas las páginas siguen el mismo patrón; solo cambian el service, los tipos y los componentes.

## Diagrama general

```
 Usuario en el navegador
   │
   ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 1. main.tsx                  → inicializa MSAL y recupera la cuenta      │
 │ 2. Providers                 → MSAL, React Query, notificaciones, router │
 │ 3. RequireAuth / RequireRole → sesión activa + rol permitido             │
 │ 4. Página / componente       → usa hooks de consulta y mutación          │
 │ 5. Hook (React Query)        → caché, estados de carga e invalidación    │
 │ 6. Service                   → arma la petición del endpoint             │
 │ 7. api()                     → token MSAL + fetch al backend             │
 └─────────────────────────────────────────────────────────────────────────┘
   │  HTTP + Authorization: Bearer <token Azure AD>
   ▼
 Backend (SA-Parking-Backend)
```

## 1. Arranque de la app

[src/main.tsx](../src/main.tsx) hace dos cosas apenas se carga el módulo, antes de MSAL y React:

- Registra el service worker de la PWA (`registerSW({ immediate: true })`).
- Captura el evento `beforeinstallprompt` y lo guarda en `window.deferredPrompt` (ver [Instalación como PWA](../README.md#instalación-como-pwa)).

Luego ejecuta `iniciarApp()` antes de pintar nada:

1. `pca.initialize()` prepara la instancia de MSAL definida en [src/auth/msal.ts](../src/auth/msal.ts) (`clientId`, `authority`, `redirectUri = window.location.origin` y caché en `localStorage`).
2. `pca.handleRedirectPromise()` procesa la respuesta si el usuario viene del login de Microsoft y deja esa cuenta como **cuenta activa**.
3. Si no viene del login pero ya había una sesión guardada (por ejemplo, recargó la página), toma la primera cuenta guardada como activa.
4. Renderiza la app.

## 2. Providers

La app se envuelve, de afuera hacia adentro, en:

| Provider | Para qué |
| --- | --- |
| `MsalProvider` | Expone la sesión a los hooks `useMsal` y `useIsAuthenticated`. |
| `QueryClientProvider` | Caché compartida de React Query para todas las consultas. |
| `NotificacionProvider` | Pila de notificaciones (ver [paso 8](#8-notificaciones)). |
| `BrowserRouter` | Enrutamiento con `react-router-dom`. |

## 3. Guards del router

[src/router.tsx](../src/router.tsx) anida las rutas dentro de tres componentes de [src/auth/](../src/auth/):

1. **`RequireAuth`** ([requireAuth.tsx](../src/auth/requireAuth.tsx)): mientras MSAL tiene una interacción en curso muestra `PantallaCarga`; si no hay sesión, redirige a `/login`.
2. **`RedirectByRole`** ([redirectByRole.tsx](../src/auth/redirectByRole.tsx)): solo en `/`. Pide el rol y redirige a `/reserva` (Admin) o `/mi-reserva` (Usuario).
3. **`RequireRole`** ([requireRole.tsx](../src/auth/requireRole.tsx)): pide el rol con `useRol` (`GET /usuarios/getRole`) y:
   - Si la petición falla (el backend responde 401 porque el usuario no está registrado) o el rol es desconocido → `/sin-acceso`.
   - Si el rol no está en `roles` → la página de inicio de su rol.
   - Si está permitido → renderiza la ruta hija (`<Outlet />`).

`useRol` usa `staleTime: Infinity` y `retry: false`: el rol se pide una sola vez por sesión y un error se trata de inmediato como "sin acceso".

## 4. Página y componentes

Cada página de [src/pages/](../src/pages/) arma la vista y delega en componentes de [src/components/](../src/components/). Los componentes llaman a los hooks; nunca llaman directamente a los services.

## 5. Hooks de React Query

Los hooks de [src/hooks/](../src/hooks/) envuelven cada endpoint:

- **Consultas** (`useQuery`): se identifican por un `queryKey` (por ejemplo `['celdas', 'get']`), solo se ejecutan si hay una cuenta de MSAL (`enabled: accounts.length > 0`) y la mayoría guarda el resultado 30 minutos (`staleTime`). Las reservas usan `staleTime: 0` para pedirse de nuevo al cambiar de vista.
- **Mutaciones** (`useMutation`): al terminar con éxito invalidan las consultas relacionadas para que se vuelvan a pedir.

| Hook | `queryKey` | Invalida al mutar |
| --- | --- | --- |
| `useRol`, `useInfoMe`, `useUsuarioActual` (combina los dos) | `['usuario', …]` | — |
| `useSettings` / `useEditSettings` | `['settings', 'get']` | `['settings']` |
| `useCeldas` / `useCreateCelda`, `useEditCelda`, `useActivateCelda`, `useDeactivateCelda` | `['celdas', 'get']` | `['celdas', 'get']` |
| `useReservas(vista)` / `useCreateReserva`, `useCreateReservaAdmin`, `useCancelReserva` | `['reserva', vista]` | `['reserva']` |
| `useCreateReservaPuntualAdmin` | — | `['reserva']` y `['celdas', 'get']` |
| `useCompanyUsers` | `['reserva', 'companyUsers']` | — |
| `useColaboradores` / `useCreateColaborador`, `useDeleteColaborador` | `['colaboradores', 'fijos']` | `['colaboradores', 'fijos']` |
| `useUserMailList` / `useAddToMail`, `useRemoveFromMail` | `['colaboradores', 'mail']` | `['colaboradores', 'mail']` |
| `useGetVehiculos` / `useCreateVehiculo`, `useDeleteVehiculo` | `['colaboradores', 'registro']` | `['colaboradores', 'registro']` |

> Como `useCompanyUsers` usa una clave que empieza por `['reserva', …]`, cualquier mutación de reservas también vuelve a pedir la lista de usuarios de la compañía.

Además hay hooks de estado local que no llaman al backend:

| Hook | Qué hace |
| --- | --- |
| `useVistaReservas` | Alterna entre `Proximas` e `Historial`. |
| `useVistaColaboradores` | Alterna entre las pestañas `Fijos`, `UsuariosApp` y `Registrovehicular`. |
| `useTurnoActual` | Calcula, con la hora de Bogotá, si estamos en el turno de mañana, de tarde o fuera de horario. Se actualiza cada minuto. |
| `useNotificacion` | Da acceso a `notificar(mensaje, tipo)`. |

## 6. Services

Los services de [src/services/](../src/services/) son objetos con una función por endpoint. Solo arman la ruta, el método y el body:

| Archivo | Router del backend |
| --- | --- |
| [usuarios.service.ts](../src/services/usuarios.service.ts) | `usuarios` |
| [settings.service.ts](../src/services/settings.service.ts) | `settings` |
| [celdas.service.ts](../src/services/celdas.service.ts) | `parkingSlots` |
| [reservas.service.ts](../src/services/reservas.service.ts) | `reserva` |
| [colaboradores.service.ts](../src/services/colaboradores.service.ts) | `colaboradores` y `registro-vehicular` |
| [companyUsers.service.ts](../src/services/companyUsers.service.ts) | `colaboradores/all` |

Los tipos de cada respuesta y body están en [src/types/](../src/types/).

## 7. Cliente HTTP: `api()`

Todos los services usan `api<T>(path, init)` de [src/services/api.ts](../src/services/api.ts):

1. **Token:** pide un token con `pca.acquireTokenSilent` para el scope `VITE_AZURE_API_SCOPE` y la cuenta activa. Si MSAL necesita interacción (`InteractionRequiredAuthError`), redirige al login de Microsoft.
2. **Petición:** hace `fetch(VITE_API_BASE_URL + path)` con `Content-Type: application/json` y `Authorization: Bearer <token>`.
3. **Errores:** si la respuesta no es `ok`, lanza `Error("Error <status>: <cuerpo>")`. Ese mensaje es el que llega a `onError` de las mutaciones y se muestra en las notificaciones.
4. **Respuesta:** si el `content-type` es JSON devuelve el objeto parseado; si no, el texto plano (por ejemplo `getRole` responde el rol como texto).

## 8. Notificaciones

[src/components/notificacion.component.tsx](../src/components/notificacion.component.tsx) muestra una pila de avisos en la esquina superior derecha. Cada aviso dura 4 segundos o hasta que se cierra. Se usa desde cualquier componente:

```ts
const { notificar } = useNotificacion();
notificar("Reserva creada", "exito");   // o "error"
```

## Patrón de una consulta y una mutación

Todas las páginas siguen esta forma:

```ts
// services/ejemplo.service.ts                                   paso 6
export const ejemploService = {
  getAll: () => api<Array<ejemplo>>("/ejemplo"),
  create: (data: createEjemplo) =>
    api<ejemplo>("/ejemplo/create", { method: "POST", body: JSON.stringify(data) }),
};

// hooks/useEjemplo.ts                                           paso 5
export function useEjemplo() {
  const { accounts } = useMsal();
  return useQuery({
    queryKey: ["ejemplo", "get"],
    queryFn: ejemploService.getAll,
    enabled: accounts.length > 0,
    staleTime: 1000 * 60 * 30,
  });
}
export function useCreateEjemplo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: createEjemplo) => ejemploService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ejemplo", "get"] }),
  });
}

// components/...                                                paso 4
const lista = useEjemplo();
const crear = useCreateEjemplo();
const { notificar } = useNotificacion();
crear.mutate(data, {
  onSuccess: () => notificar("Creado", "exito"),
  onError: (err) => notificar(err.message, "error"),
});
```

---

[← Rutas y páginas](rutas.md) | [Página `login` →](rutas/login.md)
