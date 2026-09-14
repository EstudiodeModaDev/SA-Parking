# Módulo: `Components/PermisosApp` — Usuarios de la app

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Servicios (`GraphUsers.service`)](./services.md) · [Agregar permiso](./components-add-graph-users.md)

Sub-pestaña "Usuarios APP" dentro de "Colaboradores" (`selectedColaborator === 'app'`).

## `usuariosApp.tsx` (210 líneas)
Administra la membresía de un grupo de Microsoft 365/Entra ID que controla quién tiene "acceso a la app" — mecanismo de autorización **independiente** de la lista `usuariosparking` (rol admin/usuario), ver [ARQUITECTURA.md §3.3](../ARQUITECTURA.md#33-persistencia-listas-de-sharepoint).

- `const GroupID = '79012669-3208-412c-bae2-97d79f5f5f15'` — **GUID hardcodeado directamente en el componente** (línea 14), sin documentar a qué grupo corresponde más allá del rótulo de la pestaña.
- Lista miembros vía `useGroupMembers(GroupID)` (ver [Hooks](./hooks.md)); búsqueda, paginación, selector de tamaño de página (de nuevo, con la única opción `5`).
- "Otorgar accesos" abre [`ModalAgregarPermiso`](./components-add-graph-users.md); al guardar llama `addMemberByUserId` y refresca.
- Revocar: `window.confirm`, luego `removeMemberByUserId` (o `removeMemberByEmail` como *fallback* si no hay id resoluble) — importados **directo** de `Services/GraphUsers.service.ts`, no a través de un hook de escritura (mientras la lectura sí pasa por `useGroupMembers`).
- Estado `deletingId` deshabilita solo la fila en proceso de borrado y muestra un glifo de "…" en vez del ícono de papelera mientras espera.

## Notas de calidad (deuda técnica)
- GUID de grupo hardcodeado en el componente — cambiar el grupo objetivo requiere modificar código y redeploy.
- Mezcla de capas: lectura vía hook, escritura llamando servicios directo — inconsistente con el resto de pantallas admin del proyecto.
- Un `alert()` de error expone detalles internos de permisos de Graph directamente al usuario admin: *"Revisa permisos Group.ReadWrite.All y que sea miembro directo."*
- Misma estructura de lista+filtro+tabla+paginación que [`Colaboradores.tsx`](./components-colaboradores-permanentes.md) y [`RegistroVehicular.tsx`](./components-registro-vehicular.md), duplicada sin componente compartido.
