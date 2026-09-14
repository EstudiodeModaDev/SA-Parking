# Módulo: `Components/AdminCells` — Administración de celdas

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Hooks](./hooks.md) · [Servicios](./services.md)

Pestaña "Celdas" (`selected === 'celdas'` en `App.tsx`). Es el módulo más grande del proyecto (1801 líneas en total) y el que concentra más deuda técnica de UI.

## `admin-cells.tsx` (634 líneas) — pantalla principal
Dashboard de capacidad ("Capacidad hoy": disponibles Carro/Moto, % de aforo, turno actual), formulario de "Reserva rápida" (combobox tipo *typeahead* sobre el directorio `workers`, filtrado a 10 resultados en cliente, gateado por `RESERVATIONS_DISABLED`), filtros (Tipo Carro/Moto, Tipo de usuario/Itinerancia, **Estado** Activa/Inactiva/Todas — adición reciente sin commitear al momento de esta revisión, búsqueda por código con Enter, selector de tamaño de página), grilla de tarjetas con badges AM/PM de ocupación (`renderTurnBadge`), paginación y modal de creación de celda.

- No tiene props (`React.FC`); combina el estado de `useAdminCells()` con ~10 variables de estado propias para el formulario de reserva rápida (`qrDate, qrTurn, qrVehicle, qrUserEmail, qrUserName, qrSaving, qrMsg, qrErr, qrQuery, showList, activeIdx`).
- También llama directamente `useGraphServices()`, `useSettingsHours()`, `useReservar()` y `useReporteria()` — es decir, no obtiene *todos* sus datos a través de `useAdminCells`.
- Combobox con navegación por teclado (`ArrowDown/Up/Enter/Escape`) y cierre diferido en `onBlur` (`setTimeout(..., 120)`) — un combobox accesible construido a mano, no un componente compartido.

**Hallazgos de calidad**:
- `submitQuickReserve()` usa `console.log(...)` de depuración y un `alert()` bloqueante como única confirmación — no usa el `ToastProvider` ya disponible en la app.
- Cast `as any` sobre el payload de reserva (línea 152).
- Recalcula `turnNow` de forma independiente en vez de reusar `currentTurn` que ya calcula `useAdminCells`.
- `toggleEstado` (disponible en `useCeldas`) no tiene ninguna afordancia de UI en este archivo — no hay forma de activar/desactivar una celda desde la grilla.
- Mezcla tres responsabilidades (reserva rápida, filtros/paginación, render de badges) en un único archivo de 634 líneas.

## `slotDetailsModal.tsx` (955 líneas) — modal de detalle de celda
El componente más grande del proyecto. Se abre desde `admin-cells.tsx` al pulsar "Detalles" sobre una celda. `Props = {open, slot: SlotUI|null, onClose, onChanged?, workers?, workersLoading?}`.

Deriva el **modo** de operación de `Itinerancia`: `mode = 'reserva'` si contiene "itinerante", si no `'fijar'`.
- **Modo fijar**: busca colaborador sin celda (`useAsignarCeldas`), permite asignar/desasignar.
- **Modo reserva**: formulario de reserva puntual, con prellenado desde el directorio pasando por `nameProve()` (protección de guard `lastPickRef` con `Symbol()` para descartar respuestas obsoletas si el usuario elige rápido dos veces), y verificación de disponibilidad por turno (`countReservations`) antes de crear — esta verificación es la implementación concreta del commit *"Se estaba dejando reservar en celdas ocupadas desde el panel de admin"*.
- **Eliminar celda**: borra en cascada todas las reservas no canceladas de la celda (`Promise.allSettled`) y luego la celda misma.
- **Editar celda**: sub-modal anidado para cambiar `Itinerancia`/`Title`.

**Hallazgos de calidad**:
- Instancia **sus propios** `ReservationsService`/`ColaboradoresFijosService`/`ParkingSlotsService` con constantes de sitio/lista hardcodeadas, en paralelo a los ya disponibles vía `useGraphServices()` (que este mismo archivo también importa para otro uso) — ver [ARQUITECTURA.md §5.2, punto 12](../ARQUITECTURA.md#52-alta--duplicación-estructural-y-decisiones-de-arquitectura).
- Estilos 100% en un objeto inline `S` (líneas 26-185), no CSS Modules — el único archivo grande del proyecto con este enfoque.
- El select de edición de celda contiene una opción con typo, `"Directico"` en vez de `"Directivo"` (usado en el resto de la app) — si se selecciona, escribe un valor de `Itinerancia` que ningún filtro reconoce.
- Ramas de error de `onCreateReservation` construyen `{ok:false, message}` que **el llamador nunca consume** — el único feedback real ante "sin disponibilidad" es un `alert()`.
- Varios `useCallback` con arrays de dependencias ajustados a mano e imprecisos (comentario propio: "quita lo que no usas", pero deja variables no usadas y omite otras que sí se usan).
- `finally { setRvSaving(false) }` en `onDeleteCell`/`onEditCell` sin que ninguna de las dos funciones jamás ponga `rvSaving` en `true` — no hay indicador de carga real para borrar/editar.

## `useAdminCells.ts` (212 líneas) — hook de composición
Combina `useCeldas`, `useSettingsHours`, `useTodayOccupancy`, `useWorkers`; construye sus propias instancias de servicio (con las mismas constantes hardcodeadas que `slotDetailsModal.tsx`); fusiona filas con ocupación (`rowsWithOcc`); calcula capacidad "ahora mismo" (`capacidadAhora`, filtrando solo celdas `Activa`); gestiona un temporizador de auto-refresco de 5 minutos, pausado cuando la pestaña está oculta (`visibilitychange`).

**Hallazgo crítico**: invoca hooks de React de forma **condicional**:
```ts
const c = slotsSvc ? useCeldas(slotsSvc) : { /* objeto de reemplazo */ };
const occ = reservationsSvc ? useTodayOccupancy(reservationsSvc) : { /* ... */ };
```
Esto viola las Reglas de los Hooks (el número/orden de hooks invocados puede cambiar entre renders si `ready`/`slotsSvc` cambian) — ver [ARQUITECTURA.md §5.1, punto 7](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos). Funciona hoy porque `ready` se estabiliza pronto tras el login y no vuelve a cambiar en la vida de la sesión.

Otros hallazgos: los objetos de reemplazo (líneas 50-82) duplican a mano toda la forma de retorno de `useCeldas`, sin verificación de tipos contra el hook real; `toggleEstado` no se reexpone desde este hook pese a estar disponible en `useCeldas`; `error: c.error || s.error || null` descarta silenciosamente `occ.error`.

## Patrones de programación
- *Derived state* vía `useMemo` (fechas mínimas/máximas, opciones de trabajador, turno actual).
- Auto-refresco con `setInterval` + `visibilitychange` para pausar el polling en segundo plano.
- Cascada de borrado implementada del lado cliente (reservas → celda) con `Promise.allSettled`.

## Deuda técnica destacada de este módulo
Ver el detalle priorizado (incluye este módulo como el de mayor riesgo de regresión) en [ARQUITECTURA.md §5](../ARQUITECTURA.md#5-deuda-técnica), puntos 7 y 12.
