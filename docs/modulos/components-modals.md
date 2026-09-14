# Módulo: `Components/Modals` — Modal genérico de confirmación

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Reservar](./components-reservar.md) · [Admin Settings](./components-admin-settings.md)

## `modals.tsx` (163 líneas)
Componente `Modal` genérico de confirmación/cancelación, con soporte **opcional** para incrustar una sección de Términos y Condiciones cargada desde Settings antes de habilitar la confirmación.

`ModalProps = reserveModal & {showTerms?, settingsItemId?='1', termsField?='TerminosyCondiciones'}` (`reserveModal` viene de `Models/ModalModel.ts`).

- Chrome estándar de diálogo de confirmación (título, contenido, pie con cancelar/confirmar).
- Si `showTerms` es verdadero: al abrir, llama `settings.get(settingsItemId)`, lee `rec[termsField] ?? rec.TerminosyCondiciones`, y lo renderiza vía `dangerouslySetInnerHTML`.
- `canConfirm = !showTerms || (accepted && !termsLoading && !termsError)` — el botón de confirmar queda deshabilitado hasta que los términos cargan sin error y el checkbox de aceptación está marcado.

**Nota de ubicación**: aunque conceptualmente está cerca de las pantallas de administración (lee contenido configurado por un admin en Settings), en la práctica lo consume el flujo de reserva de empleados ([`Reservar.tsx`](./components-reservar.md)), no ninguna pantalla admin — se documenta aquí como su propio módulo por vivir en `Components/Modals`.

## Patrones de programación
Modal de una sola responsabilidad con manejo explícito de estados de carga/error para la carga de términos (`termsLoading`, `termsError`) — mejor cobertura de estados que la mayoría de los otros modales del proyecto.

## Notas de calidad (deuda técnica)
- `dangerouslySetInnerHTML={{ __html: termsHtml }}` (línea 122) renderiza HTML **sin sanitizar** proveniente del campo `TyC` configurado en [`AdminSettings.tsx`](./components-admin-settings.md), que tampoco sanitiza al guardar — riesgo de XSS almacenado si una cuenta con acceso de administrador se ve comprometida o si el campo alguna vez es editable por un rol de menor confianza. Ver [ARQUITECTURA.md §5.1, punto 2](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos).
