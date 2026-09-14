# Módulo: Arranque de la app (`src/App.tsx`, `src/main.tsx`)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md)

## `src/main.tsx`
Punto de entrada. Monta React (`StrictMode`) envolviendo `<App/>` en `<AuthProvider>` (`src/auth/AuthProvider.tsx`). No hay router: toda la navegación de la app es estado interno de `App.tsx`.

## `src/App.tsx`
Componente raíz de la aplicación. Renderiza tres estados posibles según `useAuth()`:
- `!ready` → pantalla "Conectando…".
- `!account` → pantalla de login con botón "Iniciar sesión" (`signIn()` → `msal.loginPopup`).
- con sesión → monta `<GraphServicesProvider><AppInner/></GraphServicesProvider>`.

### `AppInner` (función interna, no exportada)
- Carga el perfil (`UserService.getMeBasic()`) y el rol/permiso (`SharedServices.getRole(mail)`) en dos `useEffect` secuenciales (primero perfil, luego rol dependiente del perfil).
- `NAVS_ADMIN` (línea 24) define las pestañas visibles para administradores: Reservas, Celdas, Administración, Pico y placa, Colaboradores, Reportes — solo visibles si `userRole === 'admin'`.
- Usuarios no-admin solo ven `ReservationsDisabledNotice` + `MisReservas` (modo de solo lectura de sus propias reservas).
- `useRoleHelpers()` (función local) implementa `changeUser(email)`: alterna el campo `Rol` en la lista `usuariosparking` entre `admin`/`Usuario` — es el mecanismo detrás del botón "Cambiar rol" en la cabecera (`HeaderBar`), visible solo si `Permitidos=true` para ese usuario.
- Envuelve todo el contenido autenticado en `<ToastProvider>` para exponer `useToast()` a los descendientes.

### `HeaderBar` (función local, reutilizable)
Cabecera común a todas las pantallas (logueado o no): muestra avatar/nombre/correo/rol, botón "Cambiar rol" (si aplica) y la acción primaria (Iniciar/Cerrar sesión).

## Patrones de programación
- Composición por render condicional de pestañas (no hay `react-router`); el estado de sesión/rol vive en este único componente y se pasa hacia abajo por props, no por un contexto adicional.
- `useMemo` para instanciar servicios derivados de `useGraphServices()` (`UserService`, `SharedServices`) una sola vez por cambio de `graph`/`usuariosParking`.
- Flags booleanos independientes por cada etapa asíncrona (`userLoading`, `permLoading`, `changingRole`) en vez de una máquina de estados única.

## Notas de calidad
- La normalización de la respuesta de Graph (`normRows`, dentro de `useRoleHelpers`) contempla varias formas (`res?.data`, `res?.value`, array plano) — indicio de que el contrato de retorno de los Services no es 100% uniforme entre sí (ver [Servicios](./services.md)).
- El cambio de rol (`changeUser`) reescribe directamente el campo `Rol` vía Graph con los mismos permisos delegados que el resto de la app — no hay una capa de autorización adicional del lado servidor; ver deuda técnica de autorización en [ARQUITECTURA.md §3.2](../ARQUITECTURA.md#32-autorización-roles).
