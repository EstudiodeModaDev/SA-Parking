# Módulo: `Components/ToggleSwitch` — Switch accesible genérico

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [AdminCells](./components-admincells.md)

## `ToggleSwitch.tsx` (40 líneas)
Toggle/switch genérico y accesible: `Props = {checked, onChange, disabled?, id?}`. Usa `role="switch"`, `aria-checked`, y soporta teclado (Espacio/Enter) además de clic; llama `onChange(!checked)`.

## Patrones de programación
Es la implementación de mejor práctica de accesibilidad (rol ARIA correcto, manejo de teclado, estado deshabilitado) de todo el proyecto — un buen modelo a seguir para futuros controles booleanos.

## Notas de calidad (deuda técnica)
- **Código muerto confirmado**: una búsqueda en todo `src/` no encuentra ningún import de este componente fuera de su propia definición.
- Ninguna de las pantallas que conceptualmente necesitarían un booleano con affordance de UI lo usa — por ejemplo, activar/desactivar una celda (`toggleEstado` existe en `useCeldas` pero no tiene UI en [`AdminCells`](./components-admincells.md)) usa hoy un `<select>` en el formulario de creación y ningún control en la vista de lista/detalle. Este componente sería el candidato natural para cubrir ese hueco.
