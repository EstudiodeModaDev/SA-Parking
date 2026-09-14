# Módulo: `Components/AgregarRegistroVehicular` — Alta de registro vehicular

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Registro vehicular](./components-registro-vehicular.md)

Modal invocado desde [`RegistroVehicular.tsx`](./components-registro-vehicular.md).

## `ModalAgregarRegistro.tsx` (298 líneas)
Modal para crear un registro vehicular (Nombre, Cédula, Tipo, Placa, Correo de reporte), con combobox sobre el directorio de trabajadores para prellenar el nombre.

- Tercer clon casi idéntico del patrón "elegir trabajador del directorio + validar + guardar" (junto con [`ModalAgregarColaborador`](./components-agregar-colaborador.md) y [`ModalAgregarPermiso`](./components-add-graph-users.md)).
- El autocompletado de correo al elegir un trabajador está implementado pero **comentado**: `// CorreoReporte: w.mail || f.CorreoReporte, // ← descomenta si también quieres autollenar el correo`.
- Valida solo presencia de `Title`, `Cedula`, `TipoVeh`, `PlacaVeh`, `CorreoReporte` — sin validación de formato para Cédula ni Placa, pese a que la placa se auto-mayuriza (sugiriendo una expectativa de formato nunca aplicada).
- Como `ModalAgregarPermiso`, **no** aplica `nameProve()` — inconsistencia de la regla "sin cuentas genéricas" en 2 de los 4 puntos donde se elige un trabajador del directorio.

## Notas de calidad (deuda técnica)
- Línea de autocompletado dejada comentada en vez de resuelta con una decisión explícita (activar o eliminar).
- Validación solo de presencia (no de formato) en campos que claramente esperan un formato específico (Cédula, Placa).
- Es el tercer archivo con ~95% de estructura idéntica a `ModalAgregarColaborador` sin un componente base compartido (p. ej. un `WorkerPickerField` reutilizable) — ver deuda de duplicación en [ARQUITECTURA.md §5.2, punto 14](../ARQUITECTURA.md#52-alta--duplicación-estructural-y-decisiones-de-arquitectura).
