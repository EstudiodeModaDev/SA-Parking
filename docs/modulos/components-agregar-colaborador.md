# Módulo: `Components/AgregarColaborador` — Alta de colaborador fijo

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Colaboradores](./components-colaboradores-permanentes.md) · [Servicios (`Name.Service`)](./services.md)

Modal invocado desde [`Colaboradores.tsx`](./components-colaboradores-permanentes.md) para dar de alta un colaborador con celda fija.

## `ModalAgregarColaborador.tsx` (296 líneas)
`Props = {isOpen, onClose, onSave?, slots?, slotsLoading?, workers?, workersLoading?}` — **`slots`/`slotsLoading` se declaran pero nunca se destructuran/usan en el cuerpo del componente** (prop muerta confirmada).

- Combobox (filtro de texto libre `colabTerm` + `<select>`) sobre `workers`, comparando de forma normalizada (sin acentos/mayúsculas) nombre+correo+cargo.
- Al elegir un trabajador, ejecuta `nameProve(nombre)` (async) antes de aceptar el nombre — si falla el filtro de lista negra, limpia el campo Nombre **sin mensaje de error visible** que explique por qué.
- Guard de carrera `lastPickRef` (`Symbol()`) para descartar resoluciones obsoletas de `nameProve` si el usuario re-selecciona rápido — mismo patrón usado en [`slotDetailsModal.tsx`](./components-admincells.md).
- Valida `nombre` (requerido) y `correo` (regex de email) vía `errors` derivado con `useMemo`; envío deshabilitado mientras haya errores o esté guardando.
- La placa se auto-mayuriza al escribir.
- Cierre con Escape y foco automático al primer input al abrir.

## Patrones de programación
Formulario controlado + objeto de validación derivado (`errors`) recomputado en cada cambio — patrón repetido en los otros modales "Agregar" del proyecto ([`ModalAgregarPermiso`](./components-add-graph-users.md), [`ModalAgregarRegistro`](./components-agregar-registro-vehicular.md)).

## Notas de calidad (deuda técnica)
- Props muertas `slots`/`slotsLoading` (ver arriba) — la API del componente promete una capacidad de selección de celda que no existe en este formulario; los campos `codigoCelda`/`IdSpot` de `NewCollaborator` nunca se llenan desde ningún input aquí.
- Un nombre inválido/en lista negra limpia el campo silenciosamente, sin explicación — inconsistente con `nombre`/`correo`, que sí muestran mensajes de error inline propios.
- `errors.placa` se referencia en el JSX (línea 267) pero el objeto `errors` **nunca calcula esa clave** — la validación de placa está "presente" visualmente pero nunca se activa (bug latente).
- Un comentario en el código describe una intención de validar el formato de placa ("3 letras + 3 números, ajústalo a tu realidad") que nunca se implementó.
