# Módulo: `Components/RegistroVehicular` — Registro vehicular

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Servicios](./services.md) · [Utils (`SendEmail`)](./utils.md) · [Agregar registro](./components-agregar-registro-vehicular.md)

Sub-pestaña "Registro vehicular" dentro de "Colaboradores" (`selectedColaborator === 'registro'`).

## `RegistroVehicular.tsx` (199 líneas)
Tabla de solicitudes de registro vehicular (Cédula, Nombre, Tipo, Placa, correo de reporte) con alta/baja y envío de notificación por correo al crear.

- Usa `useGraphServices()` para `registroVeh` **y** el cliente `graph` crudo (necesario para enviar el correo directamente, sin un método dedicado en el servicio). `useRegistroVehicular(registrosVehSvc)` da filas/búsqueda/paginación/alta/baja (ver [Hooks](./hooks.md)).
- `useWorkers()` se consume con un cast `as any` (línea 22) — inusual, ya que otros componentes consumen el mismo hook sin necesidad de ese cast.
- Al guardar desde `ModalAgregarRegistro`, intenta enviar el correo (`sendRegistroVehicularEmail`) envuelto en try/catch que solo registra en consola si falla — el propio comentario del código reconoce el hueco: `// TIP: mostrar toast pero no bloquear el alta`.
- Contiene un segundo bloque, comentado, de una implementación alterna (envío desde un buzón dedicado vía `resolveUserUpnOrId`) dejado en el archivo, con un typo `;2` al final de una línea.
- El selector de tamaño de página aquí sí ofrece 3 opciones (`5/10/20`), a diferencia de las pantallas hermanas que solo ofrecen `5`.

## Patrones de programación
Misma receta de lista+filtro+búsqueda+paginación que [`Colaboradores.tsx`](./components-colaboradores-permanentes.md) y [`usuariosApp.tsx`](./components-permisos-app.md).

## Notas de calidad (deuda técnica)
- Bloque de código alterno comentado, con typo, dejado en el archivo en vez de removido o llevado a una nota/ticket de diseño.
- Falla de envío de correo silenciada (solo `console.error`), sin ningún indicio visual al usuario admin — gap reconocido en un comentario propio pero no resuelto.
- Cast `useWorkers() as any` sin razón aparente frente a otros consumidores del mismo hook.
