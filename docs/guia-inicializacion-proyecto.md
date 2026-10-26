# Guía: cómo inicializar un proyecto React + MSAL + React Query + React Router

Paso a paso reutilizable para montar un front-end SPA con:

- **Vite + React + TypeScript**
- **Tailwind CSS v4**
- **MSAL** (login con Microsoft Entra ID / Azure AD)
- **TanStack React Query** (peticiones a la API y caché)
- **React Router** (rutas, guards de autenticación y de rol)
- **PWA** (opcional, app instalable)

Está basada en cómo se construyó **SA-Parking**, pero escrita de forma general para cualquier proyecto futuro. Donde dice `MiApp`, `/usuarios/getRole`, `Admin`, etc., cámbialo por lo de tu proyecto.

---

## Índice

1. [Crear el proyecto](#1-crear-el-proyecto)
2. [Instalar dependencias](#2-instalar-dependencias)
3. [Estructura de carpetas](#3-estructura-de-carpetas)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Registrar la app en Azure (Entra ID)](#5-registrar-la-app-en-azure-entra-id)
6. [Configurar MSAL](#6-configurar-msal)
7. [Punto de entrada: `main.tsx` y providers](#7-punto-de-entrada-maintsx-y-providers)
8. [Cliente HTTP con token (`api.ts`)](#8-cliente-http-con-token-apits)
9. [Services: una capa por recurso](#9-services-una-capa-por-recurso)
10. [Hooks con React Query (queries y mutations)](#10-hooks-con-react-query-queries-y-mutations)
11. [Guards: autenticación y roles](#11-guards-autenticación-y-roles)
12. [Router](#12-router)
13. [Login y logout en los componentes](#13-login-y-logout-en-los-componentes)
14. [Usar los hooks en componentes](#14-usar-los-hooks-en-componentes)
15. [Notificaciones globales (Context)](#15-notificaciones-globales-context)
16. [PWA (opcional)](#16-pwa-opcional)
17. [Despliegue en Azure Static Web Apps](#17-despliegue-en-azure-static-web-apps)
18. [Checklist final y errores comunes](#18-checklist-final-y-errores-comunes)

---

## 1. Crear el proyecto

```bash
npm create vite@latest mi-app -- --template react-ts
cd mi-app
npm install
```

Esto genera la base con Vite, React y TypeScript. Verifica que arranca con `npm run dev`.

---

## 2. Instalar dependencias

```bash
# Autenticación con Microsoft
npm install @azure/msal-browser @azure/msal-react

# Peticiones y caché
npm install @tanstack/react-query

# Rutas
npm install react-router-dom

# Estilos
npm install tailwindcss @tailwindcss/vite

# Íconos (opcional)
npm install react-icons

# PWA (opcional)
npm install -D vite-plugin-pwa
```

> **Ojo:** instala `@azure/msal-browser` explícitamente. `@azure/msal-react` lo necesita como *peer dependency* y además lo importas directamente (`PublicClientApplication`, `InteractionStatus`, `InteractionRequiredAuthError`).

### Configurar Tailwind v4

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

`src/index.css`:

```css
@import "tailwindcss";
```

Con Tailwind v4 no hace falta `tailwind.config.js` ni `postcss.config.js`.

---

## 3. Estructura de carpetas

```
src/
├── auth/          # MSAL y guards (msal.ts, requireAuth, requireRole, redirectByRole)
├── services/      # Llamadas HTTP: api.ts + un *.service.ts por recurso
├── hooks/         # Hooks de React Query (useX) y hooks de UI
├── types/         # Interfaces/tipos de TypeScript de la API
├── components/    # Componentes reutilizables
├── layouts/       # Layouts con <Outlet /> (barra lateral, app bar...)
├── pages/         # Una página por ruta
├── utils/         # Funciones puras (fechas, formatos...)
├── router.tsx     # Definición de rutas
├── main.tsx       # Punto de entrada y providers
└── vite-env.d.ts  # Tipado de las variables de entorno
```

El flujo de datos siempre es el mismo:

```
Componente  →  hook (React Query)  →  service  →  api.ts (token + fetch)  →  Backend
```

Cada capa tiene una sola responsabilidad: los componentes nunca llaman `fetch` directamente, y los services nunca saben nada de React.

---

## 4. Variables de entorno

Crea un `.env` en la raíz (y agrégalo a `.gitignore`):

```env
VITE_API_BASE_URL=https://mi-backend.azurewebsites.net/api
VITE_AZURE_CLIENT_ID=<Application (client) ID del front>
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/<Tenant ID>
VITE_AZURE_API_SCOPE=api://<client ID del backend>/<nombre del scope>
```

> Vite solo expone al navegador las variables que empiezan con `VITE_`. Todo lo que pongas aquí **es público** (termina dentro del bundle), así que nunca pongas secretos (client secrets, connection strings, etc.).

Tipa las variables en `src/vite-env.d.ts` para tener autocompletado y evitar errores de escritura:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AZURE_CLIENT_ID: string;
  readonly VITE_AZURE_AUTHORITY: string;
  readonly VITE_AZURE_API_SCOPE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Es buena práctica dejar un `.env.example` con las claves vacías para que otros sepan qué configurar.

---

## 5. Registrar la app en Azure (Entra ID)

Esto se hace una vez en el [portal de Azure](https://portal.azure.com) → **Microsoft Entra ID → App registrations**.

### 5.1 App del backend (la API)

1. **New registration** → nombre `MiApp-API`.
2. **Expose an API** → *Set* el Application ID URI (queda `api://<client-id-backend>`).
3. **Add a scope** → por ejemplo `access_as_user`. Ese es el valor de `VITE_AZURE_API_SCOPE`: `api://<client-id-backend>/access_as_user`.

### 5.2 App del front (la SPA)

1. **New registration** → nombre `MiApp-Front`.
2. **Authentication → Add a platform → Single-page application**.
3. Agrega las **Redirect URIs**:
   - `http://localhost:5173` (desarrollo)
   - `https://<tu-dominio-de-produccion>` (producción)
4. **API permissions → Add a permission → My APIs → MiApp-API** → marca el scope `access_as_user` → *Grant admin consent*.
5. Copia el **Application (client) ID** → `VITE_AZURE_CLIENT_ID`.
6. Copia el **Directory (tenant) ID** → `VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/<tenant-id>`.

> Usar el tenant ID en la authority (en vez de `common`) limita el login a las cuentas de tu organización.

---

## 6. Configurar MSAL

`src/auth/msal.ts` — una única instancia de MSAL para toda la app:

```ts
import { PublicClientApplication, type Configuration } from "@azure/msal-browser";

const configuration: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: import.meta.env.VITE_AZURE_AUTHORITY,
    redirectUri: window.location.origin, // sirve igual en localhost y en producción
  },
  cache: {
    cacheLocation: "localStorage", // la sesión sobrevive a cerrar la pestaña
  },
};

export const pca = new PublicClientApplication(configuration);
```

Puntos clave:

- Se exporta `pca` para poder usarlo **fuera de React** (en `api.ts`, para pedir tokens).
- `redirectUri: window.location.origin` evita tener que cambiar la configuración entre entornos; solo asegúrate de que cada origen esté registrado en Azure.
- `localStorage` mantiene la sesión entre pestañas y reinicios. Usa `sessionStorage` si prefieres que la sesión muera al cerrar la pestaña.

---

## 7. Punto de entrada: `main.tsx` y providers

Aquí pasan dos cosas importantes:

1. **Inicializar MSAL y procesar la respuesta del redirect antes de renderizar.** Si renderizas antes, los guards pueden ver "no autenticado" por un instante y mandar al usuario al login.
2. **Envolver la app con los providers** en el orden correcto.

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { pca } from "./auth/msal";
import AppRouter from "./router";
import "./index.css";

const queryClient = new QueryClient();

const AppProvider = () => (
  <MsalProvider instance={pca}>
    <QueryClientProvider client={queryClient}>
      <StrictMode>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </StrictMode>
    </QueryClientProvider>
  </MsalProvider>
);

async function iniciarApp() {
  await pca.initialize();

  // Si venimos de la página de login de Microsoft, aquí llega la cuenta
  const result = await pca.handleRedirectPromise();

  if (result) {
    pca.setActiveAccount(result.account);
  } else if (!pca.getActiveAccount() && pca.getAllAccounts().length > 0) {
    // Ya había sesión guardada (por ejemplo, el usuario recargó la página)
    pca.setActiveAccount(pca.getAllAccounts()[0]);
  }

  createRoot(document.getElementById("root")!).render(<AppProvider />);
}

iniciarApp();
```

**Orden de los providers (de afuera hacia adentro):**

| Provider | Por qué va ahí |
|---|---|
| `MsalProvider` | Todo lo demás puede necesitar saber si hay sesión. |
| `QueryClientProvider` | Los hooks de datos se usan en cualquier página. |
| Providers propios (notificaciones, tema…) | Necesitan estar disponibles en todas las rutas. |
| `BrowserRouter` | Envuelve directamente al router. |

> **Cuenta activa:** `api.ts` usa `pca.getActiveAccount()` para pedir tokens. Si no fijas la cuenta activa aquí, las peticiones fallan aunque el usuario haya iniciado sesión.

---

## 8. Cliente HTTP con token (`api.ts`)

Una sola función `api<T>()` que todas las peticiones usan. Se encarga de:

- Obtener el access token (silenciosamente si es posible).
- Poner la URL base y los headers.
- Lanzar error si la respuesta no es 2xx (así React Query lo detecta como `isError`).
- Devolver JSON o texto según el `content-type`.

`src/services/api.ts`:

```ts
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { pca } from "../auth/msal";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getToken() {
  const request = {
    scopes: [import.meta.env.VITE_AZURE_API_SCOPE],
    account: pca.getActiveAccount()!,
  };
  try {
    // Usa el token en caché o lo renueva con el refresh token, sin interacción
    const { accessToken } = await pca.acquireTokenSilent(request);
    return accessToken;
  } catch (error) {
    // La sesión expiró o falta consentimiento: hay que volver a Microsoft
    if (error instanceof InteractionRequiredAuthError)
      await pca.acquireTokenRedirect(request);
    throw error;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${await res.text()}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  return (contentType.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}
```

> El scope que se pide es el de **tu API** (`api://.../access_as_user`), no `User.Read`. Así el token que llega al backend tiene como *audience* tu API y el backend puede validarlo.

---

## 9. Services: una capa por recurso

Un archivo por recurso de la API. Son objetos con funciones simples que llaman a `api<T>()`, tipadas con las interfaces de `types/`.

`src/types/usuario.ts`:

```ts
export type Rol = "Usuario" | "Admin";

export interface InfoMe {
  id: string;
  displayName: string;
  mail: string;
}
```

`src/services/usuarios.service.ts`:

```ts
import type { Rol, InfoMe } from "../types/usuario";
import { api } from "./api";

export const usuarioService = {
  getInfoMe: () => api<InfoMe>("/usuarios/infoMe"),
  getRole: () => api<Rol>("/usuarios/getRole"),
};
```

Ejemplo con GET, POST y PUT — `src/services/reservas.service.ts`:

```ts
import type { Reserva, CreateReserva } from "../types/reservas";
import { api } from "./api";

export const reservasService = {
  getAll: () => api<Reserva[]>("/reserva/"),
  create: (data: CreateReserva) =>
    api<Reserva>("/reserva/create", { method: "POST", body: JSON.stringify(data) }),
  cancel: (id: string) =>
    api<Reserva>(`/reserva/cancel/${id}`, { method: "PUT" }),
};
```

---

## 10. Hooks con React Query (queries y mutations)

Los componentes nunca llaman a los services directamente: usan hooks que envuelven React Query. Así se obtiene caché, estados de carga/error, reintentos y refresco automático.

### 10.1 Queries (lectura)

`src/hooks/useUsuario.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { usuarioService } from "../services/usuarios.service";

export function useInfoMe() {
  const { accounts } = useMsal();

  return useQuery({
    queryKey: ["usuario", "infoMe"],
    queryFn: usuarioService.getInfoMe,
    enabled: accounts.length > 0,  // no pedir nada si no hay sesión
    staleTime: 1000 * 60 * 30,     // se considera fresca durante 30 min
  });
}

export function useRol() {
  const { accounts } = useMsal();

  return useQuery({
    queryKey: ["usuario", "rol"],
    queryFn: usuarioService.getRole,
    enabled: accounts.length > 0,
    staleTime: Infinity, // el rol no cambia durante la sesión
    retry: false,        // si el backend dice 403, no insistir
  });
}
```

Opciones que más vas a usar:

| Opción | Para qué |
|---|---|
| `queryKey` | Identifica la caché. Si cambia (p. ej. `["reserva", vista]`), se hace otra petición. |
| `queryFn` | La función del service. |
| `enabled` | Evita peticiones sin sesión (o sin un parámetro necesario). |
| `staleTime` | Cuánto tiempo los datos se consideran frescos (`0` = siempre refrescar, `Infinity` = nunca). |
| `retry` | Reintentos en error. Por defecto 3; pon `false` para errores de permisos. |

**Convención de keys:** empieza siempre por el nombre del recurso (`["reserva", ...]`, `["celdas", ...]`). Así puedes invalidar todo un recurso de una vez.

### 10.2 Mutations (crear, editar, borrar)

Después de una mutación exitosa, **invalida** las queries afectadas para que React Query las vuelva a pedir:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reservasService } from "../services/reservas.service";
import type { CreateReserva } from "../types/reservas";

export function useCreateReserva() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReserva) => reservasService.create(data),
    // refresca todas las listas que empiezan por ["reserva", ...]
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reserva"] }),
  });
}
```

Si la mutación afecta a varios recursos, invalida varias keys:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["reserva"] });
  queryClient.invalidateQueries({ queryKey: ["celdas"] });
},
```

### 10.3 Hooks que combinan otros

Útil para no repetir lógica en los componentes:

```ts
export function useUsuarioActual() {
  const info = useInfoMe();
  const rol = useRol();

  return {
    info: info.data,
    rol: rol.data,
    isLoading: info.isLoading || rol.isLoading,
    isError: info.isError || rol.isError,
  };
}
```

---

## 11. Guards: autenticación y roles

Los guards son componentes de ruta que renderizan `<Outlet />` si se cumple la condición, o redirigen con `<Navigate />` si no. Se usan como **rutas padre** en el router.

Primero, un componente de carga simple (`components/pantallaCarga.component.tsx`) para mostrar mientras se decide.

### 11.1 `RequireAuth` — ¿hay sesión?

`src/auth/requireAuth.tsx`:

```tsx
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { Navigate, Outlet } from "react-router-dom";
import PantallaCarga from "../components/pantallaCarga.component";

function RequireAuth() {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();

  // MSAL está procesando login/logout/redirect: todavía no sabemos
  if (inProgress !== InteractionStatus.None) return <PantallaCarga />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default RequireAuth;
```

> Esperar a `InteractionStatus.None` es lo que evita el "parpadeo" al login justo después de volver de Microsoft.

### 11.2 `RequireRole` — ¿tiene el rol correcto?

El rol lo decide el **backend** (endpoint `/usuarios/getRole`), no el front. El front solo lo usa para mostrar u ocultar rutas; la seguridad real está en la API.

`src/auth/requireRole.tsx`:

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useRol } from "../hooks/useUsuario";
import PantallaCarga from "../components/pantallaCarga.component";
import type { Rol } from "../types/usuario";

// Página de inicio de cada rol
const HOME_BY_ROLE: Record<Rol, string> = {
  Admin: "/reserva",
  Usuario: "/mi-reserva",
};

function RequireRole({ roles }: { roles: Rol[] }) {
  const { data: rol, isPending, isError } = useRol();

  if (isError) return <Navigate to="/sin-acceso" replace />;
  if (isPending) return <PantallaCarga />;
  // rol desconocido: a sin-acceso en vez de "/" (evita bucles de redirección)
  if (!rol || !(rol in HOME_BY_ROLE)) return <Navigate to="/sin-acceso" replace />;
  // tiene un rol válido pero no el de esta sección: a su propio inicio
  if (!roles.includes(rol)) return <Navigate to={HOME_BY_ROLE[rol]} replace />;

  return <Outlet />;
}

export default RequireRole;
```

### 11.3 `RedirectByRole` — ¿a dónde lo mando al entrar a `/`?

`src/auth/redirectByRole.tsx`:

```tsx
import { Navigate } from "react-router-dom";
import { useRol } from "../hooks/useUsuario";
import PantallaCarga from "../components/pantallaCarga.component";

function RedirectByRole() {
  const { isPending, isError, data } = useRol();

  if (isError) return <Navigate to="/sin-acceso" replace />;
  if (isPending) return <PantallaCarga />;
  if (data === "Admin") return <Navigate to="/reserva" replace />;
  if (data === "Usuario") return <Navigate to="/mi-reserva" replace />;
  return <Navigate to="/sin-acceso" replace />;
}

export default RedirectByRole;
```

> Usa siempre `replace` en estas redirecciones para que el botón "atrás" del navegador no devuelva al usuario a una ruta que lo vuelve a redirigir.

---

## 12. Router

Las rutas se anidan: cada nivel de anidación agrega una condición (guard) o una envoltura visual (layout).

`src/router.tsx`:

```tsx
import { Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/requireAuth";
import RequireRole from "./auth/requireRole";
import RedirectByRole from "./auth/redirectByRole";
import MainLayout from "./layouts/mainLayout";
import Login from "./pages/Login";
// ...importa tus páginas

function AppRouter() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="login" element={<Login />} />
      <Route path="sin-acceso" element={<SinAcceso />} />

      {/* Todo lo de aquí abajo requiere sesión */}
      <Route element={<RequireAuth />}>
        <Route index element={<RedirectByRole />} />

        {/* Solo Admin, con layout de administrador */}
        <Route element={<RequireRole roles={["Admin"]} />}>
          <Route element={<MainLayout />}>
            <Route path="reserva" element={<Reservas />} />
            <Route path="colaboradores" element={<Colaboradores />} />
            <Route path="configuraciones" element={<Configuracion />} />
          </Route>
        </Route>

        {/* Solo Usuario, sin layout */}
        <Route element={<RequireRole roles={["Usuario"]} />}>
          <Route path="mi-reserva" element={<ReservaUsuario />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}

export default AppRouter;
```

Así se lee la cadena para `/colaboradores`:

```
RequireAuth  →  RequireRole(["Admin"])  →  MainLayout  →  <Colaboradores />
  ¿sesión?        ¿es Admin?                barra lateral
```

### Layout con `<Outlet />`

`src/layouts/mainLayout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import AppBar from "./appBar";
import SideBar from "./sideBar";

function MainLayout() {
  return (
    <div className="min-h-screen">
      <AppBar />
      <SideBar />
      <main className="pt-16 pl-20 lg:pl-60">
        <div className="p-6">
          <Outlet /> {/* aquí se pinta la página de la ruta hija */}
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
```

Para los enlaces del menú usa `NavLink`, que te da `isActive` para resaltar la opción actual:

```tsx
<NavLink
  to="/reserva"
  className={({ isActive }) => (isActive ? "bg-blue-100 font-bold" : "")}
>
  Reservas
</NavLink>
```

---

## 13. Login y logout en los componentes

### Login

`src/pages/Login.tsx` (simplificado):

```tsx
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { Navigate } from "react-router-dom";

function Login() {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogin = () => {
    instance.loginRedirect({
      scopes: [import.meta.env.VITE_AZURE_API_SCOPE], // consentimiento de la API desde el inicio
    });
  };

  // Si ya hay sesión, no mostrar el login
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <button onClick={handleLogin} disabled={inProgress !== InteractionStatus.None}>
      Iniciar sesión con Microsoft
    </button>
  );
}

export default Login;
```

**¿Redirect o popup?** Se usa `loginRedirect` porque funciona mejor en móviles y PWA instaladas (los popups suelen bloquearse). Si usas redirect, recuerda que `handleRedirectPromise()` en `main.tsx` es obligatorio.

### Logout

```tsx
const { instance } = useMsal();

const handleLogout = () => {
  instance.logoutRedirect({
    account: instance.getActiveAccount(),
    postLogoutRedirectUri: `${window.location.origin}/login`,
  });
};
```

> En la página de "sin acceso" conviene que el botón haga **logout** y no solo navegue a `/login`; si no, el usuario sigue con sesión, `/login` lo manda a `/`, `/` lo manda a `/sin-acceso`… y queda en un bucle.

### Datos de la cuenta sin llamar a la API

MSAL ya tiene el nombre y correo del usuario:

```tsx
const { accounts } = useMsal();
const nombre = accounts[0]?.name;
const correo = accounts[0]?.username;
```

Para datos más completos (cargo, foto, etc.) pídeselos a tu backend, como hace `useInfoMe()`.

---

## 14. Usar los hooks en componentes

### Lectura

```tsx
function ListaReservas() {
  const { data, isPending, isError } = useReservas();

  if (isPending) return <PantallaCarga />;
  if (isError) return <p>No se pudieron cargar las reservas.</p>;

  return (
    <ul>
      {data.map((r) => (
        <li key={r.id}>{r.fecha}</li>
      ))}
    </ul>
  );
}
```

### Escritura

```tsx
function BotonCrear({ datos }: { datos: CreateReserva }) {
  const crear = useCreateReserva();
  const { notificar } = useNotificacion();

  const handleClick = () => {
    crear.mutate(datos, {
      onSuccess: () => notificar("Reserva creada", "exito"),
      onError: (e) => notificar(e.message, "error"),
    });
  };

  return (
    <button onClick={handleClick} disabled={crear.isPending}>
      {crear.isPending ? "Guardando..." : "Reservar"}
    </button>
  );
}
```

Reglas prácticas:

- `isPending` en queries = aún no hay datos; en mutations = la petición está en curso (úsalo para deshabilitar botones).
- Los `onSuccess`/`onError` del **hook** son para lógica de datos (invalidar caché). Los del **`mutate()`** son para la UI (notificaciones, cerrar modales).
- Nunca guardes en `useState` lo que ya te da React Query; usa `data` directamente.

---

## 15. Notificaciones globales (Context)

Patrón para mostrar mensajes de éxito/error desde cualquier componente.

`src/hooks/useNotificacion.ts`:

```ts
import { createContext, useContext } from "react";

export type TipoNotificacion = "exito" | "error";

export interface NotificacionContextValue {
  notificar: (mensaje: string, tipo: TipoNotificacion) => void;
}

export const NotificacionContext = createContext<NotificacionContextValue | null>(null);

export function useNotificacion() {
  const ctx = useContext(NotificacionContext);
  if (!ctx) throw new Error("useNotificacion debe usarse dentro de NotificacionProvider");
  return ctx;
}
```

`src/components/notificacion.component.tsx` (resumen):

```tsx
function NotificacionProvider({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<{ id: number; mensaje: string; tipo: TipoNotificacion }[]>([]);
  const siguienteId = useRef(0);

  const cerrar = useCallback((id: number) => setLista((p) => p.filter((n) => n.id !== id)), []);

  const notificar = useCallback((mensaje: string, tipo: TipoNotificacion) => {
    const id = siguienteId.current++;
    setLista((p) => [...p, { id, mensaje, tipo }]);
    setTimeout(() => cerrar(id), 4000);
  }, [cerrar]);

  // useMemo evita re-renderizar a todos los consumidores en cada notificación
  const value = useMemo(() => ({ notificar }), [notificar]);

  return (
    <NotificacionContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
        {lista.map((n) => (
          <div key={n.id} role={n.tipo === "error" ? "alert" : "status"}>{n.mensaje}</div>
        ))}
      </div>
    </NotificacionContext.Provider>
  );
}
```

Agrégalo en `main.tsx` dentro de `QueryClientProvider` y por fuera de `BrowserRouter`.

---

## 16. PWA (opcional)

Permite instalar la app en el celular/escritorio.

`vite.config.ts`:

```ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate", // se actualiza sola cuando hay versión nueva
      manifest: {
        name: "Mi App",
        short_name: "MiApp",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
});
```

Pon los íconos en `public/`. En `main.tsx`:

```ts
import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });

// El navegador lanza este evento una sola vez y muy temprano,
// por eso se captura antes de montar React
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
  window.dispatchEvent(new Event("pwa-installable"));
});
```

Luego un botón "Instalar app" escucha `pwa-installable` y llama a `deferredPrompt.prompt()`.

Para que TypeScript reconozca `virtual:pwa-register`, agrega en `vite-env.d.ts`:

```ts
/// <reference types="vite-plugin-pwa/client" />
```

---

## 17. Despliegue en Azure Static Web Apps

1. En Azure crea un **Static Web App** conectado al repositorio de GitHub. Azure genera el workflow en `.github/workflows/`.
2. Configuración del build en el workflow:

   ```yaml
   app_location: "/"
   api_location: ""
   output_location: "dist"
   ```

3. Las variables `VITE_*` se leen **en el momento del build**, así que deben existir en el workflow (como `env:` del paso de build, tomadas de *GitHub Secrets/Variables*), no solo en el portal de Azure.
4. Agrega la URL de producción como **Redirect URI** en la app del front en Entra ID.
5. Agrega la URL de producción al **CORS** del backend.
6. Crea `public/staticwebapp.config.json` para que las rutas del SPA no den 404 al recargar:

   ```json
   {
     "navigationFallback": {
       "rewrite": "/index.html",
       "exclude": ["/assets/*", "/*.png", "/*.svg", "/*.ico"]
     }
   }
   ```

---

## 18. Checklist final y errores comunes

### Checklist

- [ ] `.env` creado y en `.gitignore`; `.env.example` en el repo.
- [ ] Variables tipadas en `vite-env.d.ts`.
- [ ] App del front registrada como **SPA** con las redirect URIs de dev y prod.
- [ ] Scope de la API expuesto y con permiso concedido a la app del front.
- [ ] `pca.initialize()` y `handleRedirectPromise()` antes de `createRoot().render()`.
- [ ] Cuenta activa fijada con `setActiveAccount`.
- [ ] Todas las peticiones pasan por `api.ts`.
- [ ] Queries con `enabled: accounts.length > 0`.
- [ ] Mutations invalidan las keys afectadas.
- [ ] Guards esperan a `InteractionStatus.None` / `isPending` antes de decidir.
- [ ] Ruta `*` para 404 y ruta de "sin acceso".
- [ ] Fallback de navegación configurado en el hosting.

### Errores comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Después del login vuelve al login | Se renderiza antes de `handleRedirectPromise()` o el guard no espera a `inProgress` | Ver pasos 7 y 11.1 |
| `AADSTS50011: redirect URI mismatch` | El origen no está registrado en Azure | Agregarlo en *Authentication* de la app del front |
| Error `no_account_error` al pedir token | No hay cuenta activa | `setActiveAccount` en `main.tsx` |
| El backend responde 401 | Se pidió un scope equivocado (p. ej. `User.Read`) | Pedir `api://<backend>/<scope>` |
| Error de CORS | El backend no permite el origen del front | Configurar CORS en el backend |
| 404 al recargar `/reserva` en producción | Falta el fallback del SPA | `staticwebapp.config.json` (paso 17) |
| Bucle `/login` → `/` → `/sin-acceso` | El botón de sin-acceso no cierra sesión | Usar `logoutRedirect` (paso 13) |
| Variables `undefined` en producción | No estaban disponibles durante el build | Pasarlas al workflow de CI |
| La lista no se actualiza tras crear/editar | Falta `invalidateQueries` | Ver paso 10.2 |
