# Página `mi-reserva`

[← Rutas y páginas](../rutas.md) · [Flujo de datos](../flujo-de-datos.md)

Vista del usuario final. Es la página de inicio del rol `Usuario` y la única a la que tiene acceso. Permite hacer una reserva rápida y ver o cancelar sus reservas.

**Ruta:** `/mi-reserva` · **Roles:** Usuario · **Layout:** solo `AdminAppBar` (sin menú lateral)

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| [pages/ReservaUsuario.tsx](../../src/pages/ReservaUsuario.tsx) | AppBar, reserva rápida y tabla de reservas. |
| [components/vistaUsuario/quickReserv.component.tsx](../../src/components/vistaUsuario/quickReserv.component.tsx) | Formulario de reserva rápida con términos y condiciones. |
| [components/vistaUsuario/reservTable.component.tsx](../../src/components/vistaUsuario/reservTable.component.tsx) | Tabla "Mis reservas" con cancelación. |
| [hooks/useReserva.ts](../../src/hooks/useReserva.ts) | `useReservas`, `useCreateReserva`, `useCancelReserva`. |
| [hooks/useVistaReservas.ts](../../src/hooks/useVistaReservas.ts) | Pestaña Próximas / Historial. |
| [utils/fechas.ts](../../src/utils/fechas.ts) | `sumarDias` para los límites de fecha. |

## Reserva rápida

- **Componente:** `QuickReserv` — [quickReserv.component.tsx:13](../../src/components/vistaUsuario/quickReserv.component.tsx#L13)
- **Campos:** fecha (`fechaReserv`), turno (`Turno`: Mañana, Tarde o Día completo, con sus horarios) y tipo de vehículo (`VehType`).
- **Fechas permitidas:** desde mañana hasta hoy + `VisibleDays`.
- **Términos y condiciones:** el usuario debe marcar la casilla de aceptación; el enlace abre un popup con `TerminosyCondiciones`. Sin aceptarlos el botón queda deshabilitado.
- **Hook / endpoint:** `useCreateReserva` → `POST /reserva/createQuickUsr`. El backend toma el correo y el nombre del token y asigna una celda libre al azar. Se envía `Codigo = ""` y `Notify = false`.
- **Resultado:** notifica "Reserva creada" o el mensaje de error del backend (por ejemplo, que no hay celdas libres). Al crearla se invalidan las listas `['reserva', …]` y la tabla se refresca.

## Mis reservas

- **Componente:** `ReservTable` — [reservTable.component.tsx:23](../../src/components/vistaUsuario/reservTable.component.tsx#L23)
- **Lógica:**
  - Pestaña **Próximas** → `GET /reserva` (sus reservas activas).
  - Pestaña **Historial** → `GET /reserva/history` (todas sus reservas).
  - Cada fila muestra celda, fecha, turno con horario, tipo de vehículo y estado.
- **Cancelar:** solo en la pestaña Próximas. `useCancelReserva` → `PUT /reserva/cancelReserv/:id`. El backend solo permite cancelar reservas propias. Al terminar se invalidan todas las listas `['reserva', …]`, así que la reserva pasa de Próximas a Historial.

## Endpoints consumidos

| Acción | Hook | Endpoint |
| --- | --- | --- |
| Configuración (fechas, turnos, términos) | `useSettings` | `GET /settings/get` |
| Reservas activas | `useReservas("Proximas")` | `GET /reserva` |
| Historial | `useReservas("Historial")` | `GET /reserva/history` |
| Crear reserva | `useCreateReserva` | `POST /reserva/createQuickUsr` |
| Cancelar reserva | `useCancelReserva` | `PUT /reserva/cancelReserv/:id` |

El modelo `reserva` está descrito en [Página `reserva`](reservas.md#modelo-reserva).

---

[← Página `configuraciones`](configuraciones.md) | [Volver al README ↑](../../README.md)
