# Módulo: `Components/Notices` — Aviso de reservas deshabilitadas

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [AdminCells](./components-admincells.md) · [Reservar](./components-reservar.md)

## `ReservationsDisabledNotice.tsx` (22 líneas)
Banner de aviso **y**, en el mismo archivo, el *feature flag* que efectivamente bloquea la creación de reservas en toda la aplicación:
```ts
export const RESERVATIONS_DISABLED = true;
export const RESERVATIONS_DISABLED_SINCE = '4 de septiembre'; // sin año
```
- `Props = {compact?: boolean}` (default `false`). Componente puramente presentacional, sin hooks ni servicios.
- Se monta en `App.tsx` (versión completa, para no-admins, sobre [`MisReservas`](./components-mis-reservas.md)) y, en versión `compact`, dentro de [`AdminCells/admin-cells.tsx`](./components-admincells.md) y `AdminCells/slotDetailsModal.tsx`, donde ambas pantallas condicionan la UI de creación de reserva a `RESERVATIONS_DISABLED`.

## Patrones de programación
Co-ubicar la constante del *feature flag* con su propio banner de UI es un patrón razonable en sí mismo (activar/desactivar reservas es, en teoría, un cambio de una línea) — ver más abajo por qué en la práctica es más limitado de lo que parece.

## Notas de calidad (deuda técnica)
- El prop `compact` es un **no-op**: `{compact ? '.' : '.'}` — ambas ramas producen el mismo string, pese a que las dos pantallas que lo consumen pasan `compact` esperando un render distinto (más condensado).
- `RESERVATIONS_DISABLED_SINCE` es un string hardcodeado **sin año** ("4 de septiembre") — ambiguo con el paso del tiempo, y no se deriva de ningún util de fecha del proyecto (`utils/date.ts`).
- Activar/desactivar reservas hoy requiere un cambio de código y un redeploy — no hay ninguna UI de administración para este flag, a diferencia del toggle equivalente de Pico y Placa, que sí vive en la lista `Settings` y es editable desde [`Components/PicoPlaca/PicoPlaca.tsx`](./components-picoplaca.md). Ver [ARQUITECTURA.md §5.1, punto 6](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos).
- Usa clases globales (`className="noticeBanner"`) en vez de CSS Modules, inconsistente con el resto de las pantallas de reserva/reportes.
