# Módulo: `Components/Reservar` — Crear reserva (no montado actualmente)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Hooks (`useReservar`)](./hooks.md) · [Modals](./components-modals.md) · [AdminCells](./components-admincells.md)

## `Reservar.tsx` (185 líneas, exportado como `Availability`)
Pantalla completa de creación de reserva: elegir vehículo/turno/fecha, ver ventana de disponibilidad, confirmar vía modal de Términos y Condiciones ([`Components/Modals/modals.tsx`](./components-modals.md)), y recibir feedback por toast. Internamente reutiliza el mismo hook central de reserva, `useReservar()` (ver [Hooks](./hooks.md)).

**Este componente no está montado en ningún punto de la aplicación**. Se verificó por búsqueda en todo `src/` que `App.tsx` no lo referencia (no hay pestaña "reservar" en `NAVS_ADMIN`, y la vista no-admin solo renderiza `ReservationsDisabledNotice` + `MisReservas`) y que ningún otro archivo lo importa salvo su propia exportación por defecto. El flujo real de creación de reserva en la app hoy vive dentro de [`AdminCells/slotDetailsModal.tsx`](./components-admincells.md), que comparte el mismo hook `useReservar` pero sí respeta el flag de bloqueo global.

- El comentario de cabecera del archivo aún referencia una ruta antigua (`// src/components/Availability/Availability.tsx`), evidencia de que el archivo fue movido/renombrado a `Components/Reservar/Reservar.tsx` sin actualizarse a sí mismo.
- `Props = {userEmail: string; userName: string}` (tipo no exportado).
- Confirmación vía `<Modal>` con `showTerms`, `termsField="TerminosyCondiciones"`: éxito cierra el modal + `toast.success`; fallo mantiene el modal abierto con `modalError` inline + `toast.error`.

## Notas de calidad (deuda técnica)
- **Código muerto a nivel de pantalla completa** — representa una segunda superficie de "crear reserva" junto a la que vive en `AdminCells`/`slotDetailsModal.tsx`.
- **No respeta el flag `RESERVATIONS_DISABLED`** (ver [Notices](./components-notices.md)) — si este componente se volviera a montar alguna vez, permitiría crear reservas incluso mientras el resto de la app muestra el aviso de "reservas deshabilitadas".
- `catch (e: any)` sin tipar.
- Identidad confusa: archivo `Reservar.tsx`, componente `Availability`, comentario de cabecera con una tercera ruta — tres nombres distintos para el mismo archivo a lo largo de su historia.
- La lógica de negocio real (búsqueda/orden de celdas, generación de código secuencial, verificación de reserva duplicada) vive correctamente en el hook `useReservar`, no en este componente — buena separación en ese aspecto, aunque el propio hook conserva `console.log`/`console.warn` de depuración (ver [Hooks](./hooks.md)).
