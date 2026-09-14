# Módulo: `Components/Colaboradores-Permanentes` — Colaboradores fijos

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Hooks](./hooks.md) · [Agregar colaborador](./components-agregar-colaborador.md) · [Detalles colaborador](./components-detalles-colaborador.md)

Sub-pestaña "Colaboradores Fijos" dentro de la pestaña "Colaboradores" de `App.tsx` (`selectedColaborator === 'fijos'`).

## `Colaboradores.tsx` (268 líneas)
Sin props. Consume `useGraphServices().colaboradoresFijos`, luego `useCollaborators(colaboradoresSvc)` (ver [Hooks](./hooks.md)) para filas/búsqueda/paginación/alta/baja, y `useWorkers()` para el *typeahead* del directorio compartido con el modal de alta.

- Filtro segmentado por tipo de vehículo (`all`/`Carro`/`Moto`) — filtrado 100% en cliente sobre filas ya obtenidas (`useMemo`), no vuelve a consultar el servidor.
- Búsqueda conectada directo a `search`/`setSearch` del hook.
- Columnas de tabla: Nombre, Correo, Tipo de vehículo, Placa, **Celda Asignada** (`CodigoCelda`), Acciones (solo eliminar).
- Alta: `openAddModal` recarga el directorio de trabajadores si aún no se cargó, luego abre [`ModalAgregarColaborador`](./components-agregar-colaborador.md).
- Baja: `window.confirm(...)` antes de `deleteCollaborator`.

## Patrones de programación
Receta de pantalla repetida en este proyecto: filtro segmentado + búsqueda + botón de alta + tabla + barra de paginación — con las mismas clases de CSS Module (`styles.card`, `styles.topBarGrid`, `styles.table`, `styles.pageBtn`, etc.) reutilizadas casi idénticamente en [`PermisosApp/usuariosApp.tsx`](./components-permisos-app.md) y [`RegistroVehicular/RegistroVehicular.tsx`](./components-registro-vehicular.md).

## Notas de calidad (deuda técnica)
- El botón "Ver detalles" que abriría [`ModalVerColaborador`](./components-detalles-colaborador.md) está **comentado** en el JSX (líneas 178-185), pero el estado (`isOpenDetails`, `selected`) y el propio modal siguen montados — código y modal muertos en producción.
- `freeSlots`/`slotsLoading` se pasan hardcodeados (`[]`/`false`) a `ModalAgregarColaborador` como props `slots`/`slotsLoading`, que ese modal ni siquiera lee — vestigio de una función de "asignar celda libre al crear" que quedó a medio implementar en ambos lados.
- La tabla muestra `CodigoCelda` (celda asignada) pero no hay ninguna UI en este componente ni en su modal de alta para asignar/cambiar esa celda — solo se puede hacer desde la dirección opuesta, vía el modal de detalle de celda ([`AdminCells/slotDetailsModal.tsx`](./components-admincells.md)) — hueco de UX real.
- El selector de tamaño de página solo ofrece una opción fija (`5`) — control no funcional como "elección".
