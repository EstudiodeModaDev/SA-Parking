# Módulo: `Components/PicoPlaca` — Pico y Placa

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Servicios (`PicoPlaca.ts`)](./services.md) · [Ports](./ports.md) · [Hooks (`utils.ts`)](./hooks.md)

Pestaña "Pico y placa" (`selected === 'pyp'` en `App.tsx`, solo admin).

## `PicoPlaca.tsx` (395 líneas)
Pantalla de configuración de las reglas de restricción vehicular por día (listas de dígitos, separadas por coma, para Moto y Carro) más un toggle global de habilitación (`Settings.PicoPlaca`) y un botón de "notificar cambio" sin implementar.

- Sin props. Llama `useGraphServices()` directo para `picoYPlaca` y `settings` — **no usa ningún hook dedicado** (a diferencia de casi todas las demás pantallas admin); toda la carga/mutación/validación vive inline en el componente. Existe un archivo `Hooks/usePicoPlaca.ts`, pero en realidad exporta un hook no relacionado (`useRecipients`) y esta pantalla no lo usa.
- Al montar, carga en paralelo todas las filas de `PicoYPlaca` (`orderby: 'fields/Title asc', top: 100`) y el registro de Settings.
- El toggle de habilitación (componente `Toggle` propio, líneas 30-111) tiene *debounce* de 400 ms implementado dentro de un `useMemo` que sostiene un `setTimeout` — patrón inusual (un `useMemo` con efecto colateral mutable; lo idiomático sería `useRef`+`useCallback`). Revierte el estado del toggle si falla el guardado.
- Cada fila (Moto/Carro) es texto libre de dígitos separados por coma, validado en cliente con `isValidPattern` (reimplementado localmente en este archivo, duplicando la función de igual nombre exportada por `Hooks/utils.ts`).
- Un overlay (`position:absolute; inset:0`) grisa la tabla completa cuando `pypEnabled` es falso.
- "Notificar cambio de pico y placa" llama `NotifyPicoPlaca()`, que es literalmente `alert('Se enviará una notificación...')` — no envía nada realmente, pese a existir tanto un `ToastProvider` como un util de envío de correo (`utils/SendEmail.ts`) en el proyecto.

## Patrones de programación
- *Debounce* local por temporizador, actualización optimista de UI con reversión ante fallo, overlay de "deshabilitado" superpuesto.

## Notas de calidad (deuda técnica)
- **La restricción configurada aquí no se aplica en ningún punto de la reserva**: el flujo de creación de reserva (`Hooks/useReservar.ts`) nunca consulta `picoYPlaca`/dígitos de placa — la pantalla edita una tabla de reglas que hoy es puramente decorativa. Ver [ARQUITECTURA.md §5.1, punto 5](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos).
- Tipado `any` extendido: `(x: any)`, `(cfg as any)`, `{ PicoPlaca: next } as any`, `{ Moto, Carro } as any`.
- 100% estilos inline (`style={{...}}`), no CSS Modules — el único componente grande del proyecto, junto con `slotDetailsModal.tsx`, con este enfoque.
- `alert()` nativo en vez del `ToastProvider` ya disponible; `NotifyPicoPlaca` sin implementar realmente.
- Un componente de 396 líneas mezclando fetch, mutación, validación y estilos inline extensos en un solo archivo — candidato claro a extraer un hook dedicado (`usePicoPlaca` real) más subcomponentes con estilos en CSS Module.
