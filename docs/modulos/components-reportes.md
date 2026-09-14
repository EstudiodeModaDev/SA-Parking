# Módulo: `Components/Reportes` — Reportería de parqueadero (contenedor)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Hooks (`useReportes.ts`)](./hooks.md) · [Reporte de registro vehicular](./components-reporte-registros.md) · [Utils (`exportExcel`)](./utils.md)

Pestaña "Reportes" (`selected === 'reportes'` en `App.tsx`, solo admin).

> **Nota de nombre**: este archivo se llama igual (`reportes.tsx`) que [`Components/ReporteRegistros/reportes.tsx`](./components-reporte-registros.md), pero son funcionalidades distintas — ver el veredicto de comparación al final de este documento.

## `reportes.tsx` (232 líneas, exporta `Reporteria`)
Pantalla contenedora con un selector entre dos tipos de reporte: **"Aforo de celdas"** (implementado inline en este mismo archivo) y **"Vehículos registrados"** (delega por completo en el componente [`ReporteriaRegistro`](./components-reporte-registros.md)).

- Sin props. Estado local: `reporte: 'celdas' | 'registro'`.
- Usa `reservations`, `parkingSlots` de `useGraphServices()`, y delega el reporte de aforo a `useReporteria` (importado con alias `useReporteriaAforo`) de `Hooks/useReportes.ts` — **un hook distinto**, pese al mismo nombre exportado, del que usa el reporte de registro vehicular.
- Rama "celdas" (por defecto): subcomponente local `AforoView` con filtros `desde/hasta` (sobre `Date` de reserva, no `Created`), `persona` (`contains` + `tolower`, más amplio que el prefijo usado en el reporte de registros), `tipoVehiculo`. Capacidad y % de aforo calculados en `useReportes.ts` (ver [Hooks](./hooks.md)).
- Rama "registro": renderiza `<ReporteriaRegistro />` sin props — completamente autocontenido.
- Exporta a Excel con `exportRowsToExcel(data, 'reporte-aforo.xlsx')`.

## Patrones de programación
Composición contenedor/subvista mixta: una rama es un subcomponente local (`AforoView`) definido en el mismo archivo, la otra delega en un árbol de componentes externo completamente independiente — un estilo de composición inconsistente entre las dos ramas del mismo selector.

## Notas de calidad (deuda técnica)
- `rows: any[]`, `onExport: (rows: any[]) => void` en las props de `AforoView`, pese a existir un tipo real (`RowAforo`) usado correctamente en `ReporteAforoTabla` dentro del mismo archivo — tipado inconsistente entre dos capas del mismo componente.
- Rama muerta en el cálculo de aforo (`Hooks/useReportes.ts`): las tres ramas de un `if/else` por tipo de vehículo suman siempre `1`.
- Comentario huérfano duplicado (`/* ---------- Tabla AFORO ---------- */`) al final del archivo, sin nada después — indicio de una edición dejada a medias.

## Veredicto: ¿son duplicados los dos archivos `reportes.tsx`?
**No.** Son funcionalidades genuinamente distintas que comparten nombre de archivo y carpeta con nombre similar (y, además, una hoja CSS idéntica copiada). `Components/Reportes/reportes.tsx` reporta ocupación/aforo de celdas (fuente: `Reservations` + `ParkingSlots`, filtro por fecha de reserva, exporta `reporte-aforo.xlsx`) y actúa como contenedor; `Components/ReporteRegistros/reportes.tsx` reporta el registro de vehículos (fuente: `RegistroVehicular`, filtro por fecha de creación, exporta `reporte-parqueadero.xlsx`). Sus hooks (`useReporteria` en ambos casos, ver [Hooks](./hooks.md)) comparten un mismo nombre y un esqueleto similar de estado/filtros, pero operan sobre datos y reglas distintas — es duplicación de *andamiaje*, no de lógica de negocio. La recomendación práctica es renombrar los archivos (p. ej. `AforoReport.tsx` / `VehicleRegistryReport.tsx`) y unificar el CSS Module duplicado, sin tocar la lógica de ninguno de los dos.
