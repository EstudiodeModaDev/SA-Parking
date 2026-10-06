# SA-Parking Frontend

Aplicación web (PWA) del sistema de parqueadero de **Estudio de Moda**. Está construida con [React](https://react.dev/) + [Vite](https://vite.dev/) y no guarda datos propios: inicia sesión con **Microsoft Entra ID (Azure AD)** mediante MSAL y consume la API REST de **SA-Parking-Backend**, que a su vez lee y escribe en SharePoint.

## Documentación

| Documento | Contenido |
| --- | --- |
| [Rutas y páginas](docs/rutas.md) | Listado de rutas de la app: path, roles permitidos, página y endpoints del backend que consume. |
| [Flujo de datos](docs/flujo-de-datos.md) | Recorrido genérico desde que la app arranca hasta que una página pinta datos del backend. |
| [Página `login`](docs/rutas/login.md) | Inicio de sesión con Microsoft, pantalla `sin-acceso` y 404. |
| [Página `reserva`](docs/rutas/reservas.md) | Gestión de reservas para el administrador (próximas e historial). |
| [Página `celdas`](docs/rutas/celdas.md) | Celdas de parqueo, ocupación por turno y reservas a nombre de terceros. |
| [Página `colaboradores`](docs/rutas/colaboradores.md) | Colaboradores fijos, usuarios de la app (grupo de Microsoft) y registro vehicular. |
| [Página `configuraciones`](docs/rutas/configuraciones.md) | Días visibles, horarios de turnos y términos y condiciones. |
| [Página `mi-reserva`](docs/rutas/mi-reserva.md) | Vista del usuario final: reserva rápida y sus reservas. |

## Arquitectura en resumen

```
Navegador ──login MSAL──▶ Azure AD ──token──▶ Frontend (SA-Parking) ──Bearer token──▶ Backend NestJS ──▶ Graph / SharePoint
```

1. `main.tsx` inicializa MSAL y recupera la cuenta (si el usuario viene del login de Microsoft o ya tenía sesión).
2. El router protege las rutas con `RequireAuth` (sesión activa) y `RequireRole` (rol `Admin` o `Usuario`, consultado al backend).
3. Cada página usa **hooks** de React Query que llaman a los **services**.
4. Los services usan `api()` ([src/services/api.ts](src/services/api.ts)), que obtiene el token con MSAL y lo envía en el header `Authorization`.
5. Las mutaciones invalidan la caché de React Query para que las listas se vuelvan a pedir.

El detalle está en [docs/flujo-de-datos.md](docs/flujo-de-datos.md).

## Estructura del proyecto

```
src/
├── main.tsx                    # Arranque: MSAL, React Query, notificaciones y router
├── router.tsx                  # Definición de rutas y guards
├── index.css                   # Tailwind CSS
├── auth/                       # Autenticación y control de acceso
│   ├── msal.ts                 # Instancia de MSAL (PublicClientApplication)
│   ├── requireAuth.tsx         # Guard: exige sesión de Microsoft
│   ├── requireRole.tsx         # Guard: exige un rol
│   └── redirectByRole.tsx      # Redirige "/" a la página de inicio según el rol
├── layouts/                    # Estructura visual de las vistas de administrador
│   ├── mainLayout.tsx          # AppBar + SideBar + contenido
│   ├── adminAppBar.tsx         # Logo, turno actual, usuario y cerrar sesión
│   └── sideBar.tsx             # Menú lateral
├── pages/                      # Una página por ruta
├── components/                 # Componentes compartidos y por vista
│   ├── vistaAdmin/             # Componentes de las páginas de administrador
│   └── vistaUsuario/           # Componentes de la página del usuario final
├── hooks/                      # Hooks de React Query (consultas y mutaciones) y de estado de vista
├── services/                   # Llamadas HTTP al backend (un archivo por router)
├── types/                      # Tipos de los datos que van y vienen del backend
└── utils/                      # Utilidades (fechas)
```

## Variables de entorno

Vite las carga desde un archivo `.env` en la raíz. Solo se exponen al código las que empiezan por `VITE_`.

| Variable | Uso |
| --- | --- |
| `VITE_API_BASE_URL` | URL base del backend (ej. `http://localhost:3000`). |
| `VITE_AZURE_CLIENT_ID` | ID de la app registrada en Azure (cliente SPA). |
| `VITE_AZURE_AUTHORITY` | Authority de Azure AD (`https://login.microsoftonline.com/<tenant>`). |
| `VITE_AZURE_API_SCOPE` | Scope expuesto por la API del backend (ej. `api://<client-id>/<scope>`). Se pide al iniciar sesión y en cada token. |

> Estas variables quedan incrustadas en el bundle que se publica, así que nunca deben contener secretos.

## Scripts

```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo de Vite
npm run build     # compilar TypeScript y generar dist/
npm run preview   # servir localmente la versión compilada
npm run lint      # eslint
```

## Despliegue

Cada push a `main` dispara los workflows de [.github/workflows/](.github/workflows/), que compilan la app y la publican en **Azure Static Web Apps** (`app_location: "/"`, `output_location: "dist"`). La app se registra como PWA con `vite-plugin-pwa` ([vite.config.ts](vite.config.ts)) y se actualiza sola cuando hay una versión nueva.

## Agregar una página nueva

1. Si consume un endpoint nuevo, agregar sus tipos en `src/types/` y la llamada en el service correspondiente de `src/services/`.
2. Crear los hooks en `src/hooks/` siguiendo el patrón descrito en [docs/flujo-de-datos.md](docs/flujo-de-datos.md#patrón-de-una-consulta-y-una-mutación).
3. Crear la página en `src/pages/` y sus componentes en `src/components/vistaAdmin/` o `src/components/vistaUsuario/`.
4. Registrar la ruta en [src/router.tsx](src/router.tsx) dentro del `RequireRole` adecuado y, si es de administrador, agregarla a `links` en [src/layouts/sideBar.tsx](src/layouts/sideBar.tsx).
5. Documentarla en [docs/rutas.md](docs/rutas.md) y crear su archivo en `docs/rutas/`.

---

[Empezar: Rutas y páginas →](docs/rutas.md)
