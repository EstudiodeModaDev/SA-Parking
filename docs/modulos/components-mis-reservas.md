# Módulo: `Components/Mis-Reservas` — Mis reservas

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Hooks (`useMisReservas`)](./hooks.md) · [Notices](./components-notices.md)

Se monta dos veces desde `App.tsx`: siempre para usuarios no-admin (bajo `ReservationsDisabledNotice`), y como pestaña por defecto "Reservas" para administradores.

## `mis-reservas.tsx` (165 líneas)
`Props = {userMail: string; isAdmin: boolean}`. Tabla de reservas del usuario (o de todos, si `isAdmin`), con filtro y cancelación por fila.

- Delega casi todo el estado (`rows, loading, error, range, pageSize, pageIndex, hasNext, filterMode` + acciones) al hook `useMisReservas(reservations, userMail, isAdmin)` (ver [Hooks](./hooks.md)).
- Dos modos de filtro: `upcoming-active` (reservas futuras y activas) e `history` (rango de fechas libre, cualquier estado) — este último revela un formulario de fecha desde/hasta.
- Cancelar una reserva `Activa` llama `cancelReservation(r.Id)` **sin pedir confirmación previa** — a diferencia de casi todas las demás eliminaciones del proyecto, que sí usan `window.confirm`.
- Resuelve nombres de celda de forma perezosa: un `useEffect` separado (líneas 21-45) busca `parkingSlots.get(id)` por cada id de celda no cacheado en `spotNames`, silenciando errores individuales con un placeholder `Celda {id}`.

## Patrones de programación
- Componente "delgado": la mayor parte de la lógica de filtro/OData vive correctamente en el hook, no aquí — de los mejor separados del proyecto en ese sentido.
- Caché local (`spotNames: Record<string,string>`) poblada bajo demanda.

## Notas de calidad (deuda técnica)
- **La paginación es solo decorativa**: `pageIndex`/`pageSize`/`hasNext` controlan los botones Prev/Next y el selector de tamaño, pero la tabla siempre renderiza el arreglo completo obtenido (hasta 2000 filas vía OData `top`); cambiar de página dispara además un **refetch completo al servidor** en vez de un simple recorte en cliente.
- Errores de resolución de nombre de celda se silencian por completo (`catch` con placeholder), sin estado de error visible para ese caso puntual.
- Textos hardcodeados en español, sin capa de i18n (consistente con el resto de la app).
