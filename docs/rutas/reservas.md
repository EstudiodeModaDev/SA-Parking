# Página `reserva`

[← Rutas y páginas](../rutas.md) · [Flujo de datos](../flujo-de-datos.md)

Vista del administrador para supervisar las reservas. Es la página de inicio del rol `Admin`. Solo consulta: las reservas a nombre de terceros se crean desde [Celdas](celdas.md).

**Ruta:** `/reserva` · **Roles:** Admin · **Layout:** `MainLayout`

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| [pages/Reservas.tsx](../../src/pages/Reservas.tsx) | Encabezado y contenedor de la tabla. |
| [components/vistaAdmin/reservas/reserv.component.tsx](../../src/components/vistaAdmin/reservas/reserv.component.tsx) | Tabla de reservas con pestañas Próximas / Historial. |
| [hooks/useReserva.ts](../../src/hooks/useReserva.ts) | `useReservas(vista)`. |
| [hooks/useVistaReservas.ts](../../src/hooks/useVistaReservas.ts) | Estado de la pestaña activa. |
| [services/reservas.service.ts](../../src/services/reservas.service.ts) | Llamadas a `/reserva`. |
| [types/reservas.ts](../../src/types/reservas.ts) | `reserva`, `Turno`, `Status`, `VehicleType`. |

## Componente `ReservActive`

- **Ubicación:** [reserv.component.tsx:23](../../src/components/vistaAdmin/reservas/reserv.component.tsx#L23)
- **Lógica:**
  - `useVistaReservas` guarda la pestaña (`Proximas` por defecto).
  - `useReservas(vista)` pide la lista según la pestaña. Como la `queryKey` incluye la vista y `staleTime` es `0`, cada cambio de pestaña vuelve a consultar.
  - `useSettings` aporta los horarios para mostrar el rango de cada turno (`SetHorarios`): Mañana, Tarde o Día completo (inicio de la mañana a fin de la tarde).
  - Cada fila muestra usuario, celda, fecha, turno, tipo de vehículo y estado (`Activa`, `Terminada` o `Cancelada`).

## Endpoints consumidos

| Pestaña | Service | Endpoint | Respuesta para Admin |
| --- | --- | --- | --- |
| Próximas | `getReserva` | `GET /reserva` | Todas las reservas activas. |
| Historial | `getReservasHistory` | `GET /reserva/history` | Todas las reservas. |
| — | `getSettings` | `GET /settings/get` | Horarios de los turnos. |

## Modelo `reserva`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `ID` | string | ID del ítem. |
| `Title` | string | Correo del usuario de la reserva. |
| `NombreUsuario` | string | Nombre del usuario. |
| `Turn` | `"Manana" \| "Tarde" \| "Día completo"` | Turno. |
| `SpotId` | string | `Title` de la celda reservada. |
| `Status` | `"Activa" \| "Cancelada" \| "Terminada"` | Estado. |
| `VehicleType` | `"Carro" \| "Moto"` | Tipo de vehículo. |
| `Date` | Date | Fecha de la reserva. |
| `Codigo` | string | Código de la reserva. |
| `Notify` | string | Si se notifica al usuario. |

---

[← Página `login`](login.md) | [Página `celdas` →](celdas.md)
