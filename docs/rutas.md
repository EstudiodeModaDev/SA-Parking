# Rutas y páginas

[← Volver al README](../README.md) · [Flujo de datos](flujo-de-datos.md)

Las rutas se definen en [src/router.tsx](../src/router.tsx). Todas, salvo `login`, `sin-acceso` y la 404, están dentro de `RequireAuth` (exige sesión de Microsoft). La columna **Roles** indica qué rol acepta el guard `RequireRole` (ver [flujo de datos](flujo-de-datos.md#3-guards-del-router)). Si un usuario entra a una ruta que no es de su rol, se le envía a su página de inicio (`Admin` → `/reserva`, `Usuario` → `/mi-reserva`).

Las rutas de administrador se muestran dentro de `MainLayout` (AppBar + SideBar). La de usuario usa solo el AppBar.

## Rutas públicas

| Ruta | Roles | Página | Descripción |
| --- | --- | --- | --- |
| `/login` | Pública | [Login](rutas/login.md) | Botón de inicio de sesión con Microsoft. |
| `/sin-acceso` | Pública | [MensajeVolver](rutas/login.md#sin-acceso) | El usuario no tiene rol en la app; cierra la sesión al volver. |
| `*` | Pública | [MensajeVolver](rutas/login.md#página-no-encontrada) | Página no encontrada. |

## Redirección inicial

| Ruta | Roles | Componente | Descripción |
| --- | --- | --- | --- |
| `/` | Cualquier sesión | `RedirectByRole` | Consulta el rol y redirige a `/reserva` (Admin) o `/mi-reserva` (Usuario). |

## Rutas de administrador

| Ruta | Roles | Página | Endpoints del backend que consume |
| --- | --- | --- | --- |
| `/reserva` | Admin | [Reservas](rutas/reservas.md) | `GET /reserva`, `GET /reserva/history`, `GET /settings/get` |
| `/celdas` | Admin | [Celdas](rutas/celdas.md) | `GET /parkingSlots/getSlots`, `POST /parkingSlots/createSlot`, `PUT /parkingSlots/editSlot/:id`, `PUT /parkingSlots/activeSlot/:id`, `PUT /parkingSlots/inactiveSlot/:id`, `POST /reserva/createQuickAdm`, `POST /reserva/createPuntAdm`, `GET /colaboradores/all`, `GET /settings/get` |
| `/colaboradores` | Admin | [Colaboradores](rutas/colaboradores.md) | `GET/POST/DELETE /colaboradores/fijos…`, `GET /parkingSlots/getSlots`, `GET /colaboradores/mailList`, `POST /colaboradores/addUser`, `DELETE /colaboradores/remove`, `GET/POST/DELETE /registro-vehicular…` |
| `/configuraciones` | Admin | [Configuraciones](rutas/configuraciones.md) | `GET /settings/get`, `PUT /settings/put` |

## Rutas de usuario

| Ruta | Roles | Página | Endpoints del backend que consume |
| --- | --- | --- | --- |
| `/mi-reserva` | Usuario | [Mi reserva](rutas/mi-reserva.md) | `GET /reserva`, `GET /reserva/history`, `POST /reserva/createQuickUsr`, `PUT /reserva/cancelReserv/:id`, `GET /settings/get` |

## Endpoints comunes a todas las páginas protegidas

| Endpoint | Hook | Dónde se usa |
| --- | --- | --- |
| `GET /usuarios/getRole` | `useRol` | `RedirectByRole` y `RequireRole`, para decidir el acceso. |
| `GET /usuarios/infoMe` | `useInfoMe` (vía `useUsuarioActual`) | `AdminAppBar`, para mostrar nombre y cargo. |
| `GET /settings/get` | `useSettings` | `AdminAppBar` (vía `useTurnoActual`), para mostrar el turno actual. |

La documentación de cada endpoint (validaciones, roles y respuestas) está en el repositorio **SA-Parking-Backend**, en `docs/rutas.md`.

---

[← README](../README.md) | [Flujo de datos →](flujo-de-datos.md)
