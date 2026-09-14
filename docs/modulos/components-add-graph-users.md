# Módulo: `Components/AddGraphUsers` — Otorgar acceso a la app

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Usuarios de la app](./components-permisos-app.md)

Modal invocado desde [`usuariosApp.tsx`](./components-permisos-app.md) para elegir un usuario del directorio y otorgarle acceso a la app (agregarlo al grupo de Microsoft 365 correspondiente).

## `ModalAgregarPermiso.tsx` (196 líneas)
`Props = {isOpen, onClose, onSave?, slotsLoading?, workers: any[], workersLoading?}` — solo devuelve al padre `{userId, name, mail}`; la escritura real en el grupo la hace el componente padre.

- Clon estructural casi idéntico a [`ModalAgregarColaborador`](./components-agregar-colaborador.md) (mismo patrón de combobox, efectos, botones de pie).
- Nombre/Correo son **de solo lectura** (`readOnly`) — solo se llenan eligiendo del directorio, a diferencia del modal de colaboradores donde siguen editables tras el prellenado.
- Valida además que se haya elegido explícitamente un `selectedUserId` (no basta con nombre/correo no vacíos) antes de habilitar "Guardar".
- **No** llama `nameProve()` — a diferencia de `ModalAgregarColaborador` y del selector de reserva de `slotDetailsModal.tsx`, esta pantalla no filtra cuentas genéricas/de rol al otorgar acceso.

## Notas de calidad (deuda técnica)
- `workers: any[]` (línea 11) — el único punto del proyecto donde el directorio de trabajadores no se tipa como `Worker[]`.
- `slotsLoading?: boolean` es una prop irrelevante para este dominio (otorgar acceso no tiene nada que ver con celdas de parqueo) y tampoco se usa en el cuerpo — residuo de copiar el modal de colaboradores como plantilla.
- Ausencia de `nameProve()` aquí, presente en otros dos puntos de selección de trabajador, es una inconsistencia real de la regla de negocio "no permitir cuentas genéricas": un admin podría otorgar acceso de app a una cuenta como `"facturacion"` aunque la misma elección sería rechazada en el alta de colaboradores.
