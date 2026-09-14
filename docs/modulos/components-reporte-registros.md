# Módulo: `Components/ReporteRegistros` — Reporte de registro vehicular

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Hooks (`reporteRegistro.ts`)](./hooks.md) · [Reportes (contenedor)](./components-reportes.md) · [Utils (`exportExcel`)](./utils.md)

> **Nota de nombre**: existe otro archivo llamado igual, `Components/Reportes/reportes.tsx` (ver [ese módulo](./components-reportes.md)). Son features distintas que comparten nombre de archivo, no un duplicado de lógica — ver la comparación completa en ese documento.

## `reportes.tsx` (125 líneas, exporta `ReporteriaRegistro`)
Reporte independiente sobre la lista de **registro vehicular** (cédula, nombre, tipo de vehículo, placa, correo al que se solicitó), con filtros y exportación a Excel. No se monta directo desde `App.tsx`; lo renderiza [`Components/Reportes/reportes.tsx`](./components-reportes.md) cuando el admin elige "Vehículos registrados" en el selector de reporte.

- Sin props. Usa `registroVeh` de `useGraphServices()`, delegando toda la lógica de filtro/carga a `useReporteria(registroVeh)` de `Hooks/reporteRegistro.ts` (ver [Hooks](./hooks.md) — **nombre de hook compartido** con otro hook distinto de `Hooks/useReportes.ts`).
- Filtros: `desde`/`hasta` (sobre `Created`), texto libre `persona` (`startswith`, coincidencia solo por prefijo), `tipoVehiculo`.
- "Aplicar filtros" dispara `loadRegistros()` explícito — parcialmente redundante, ya que el hook subyacente también recarga automáticamente en un `useEffect` cuando cambian los filtros.
- "Exportar a Excel" llama `exportRowsToExcel(rows, 'reporte-parqueadero.xlsx')`.

## Notas de calidad (deuda técnica)
- La fila vacía usa `colSpan={6}` pese a que la tabla declara 5 columnas — desajuste menor mas incorrecto.
- `onChange={(e) => onChange({ tipoVehiculo: e.target.value as any })}` — cast `any` en vez del tipo de unión real.
- El módulo CSS `reporteria.module.css` de esta carpeta es **idéntico byte a byte** al de `Components/Reportes/reporteria.module.css` — una hoja de estilos duplicada que puede divergir silenciosamente si se edita una sin la otra.
