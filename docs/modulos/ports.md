# Módulo: Ports (`src/Ports`)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Servicios](./services.md)

Capa de adaptación **parcial**: solo existe para 2 de los ~11 servicios de dominio (`PicoYPlacaService`, `SettingsService`). El resto de servicios se consume directo desde componentes/hooks vía `useGraphServices()`, sin pasar por ningún Port. Ver [ARQUITECTURA.md §5.2, punto 11](../ARQUITECTURA.md#52-alta--duplicación-estructural-y-decisiones-de-arquitectura) para el análisis de por qué esto no constituye una capa arquitectónica consistente.

## `PicoPlaca.port.ts`
`makePicoPlacaPort(svc: PicoYPlacaService): PicoPlacaPort` adapta el servicio a un `PicoPlacaRow`/`PicoPlacaPort` orientado a UI (`getAll`, `update`).

- `toRow()` (líneas 19-24) vuelve a resolver mayúsculas/minúsculas de campo (`i.Moto ?? i.moto`, `i.Carro ?? i.carro`) que el propio `toModel()` del servicio **ya normaliza** a PascalCase — código defensivo redundante que nunca se activa en la práctica (las variantes en minúscula nunca llegan del servicio).
- Re-ordena numéricamente en cliente (`rows.sort((a,b) => Number(a.Title) - Number(b.Title))`) tras pedir `orderby: 'fields/Title asc'` al servicio, porque OData ordena `Title` como texto (`"1","10","2",...`) — corrección legítima, pero delatando que el `orderby` del servicio subyacente no sirve para valores numéricos.
- `update()` es un paso directo, sin observaciones.

## `settingsPort.ts`
`makeSettingsPortSingle(svc?: SettingsService): SettingsPort` adapta `SettingsService` a un formulario de UI (`SettingsForm`/`SettingsRecord`).

**Bug de integridad de datos confirmado**: el payload de creación por defecto usa un campo `TyC` (no `TerminosyCondiciones`, el nombre real del modelo de `SettingsService`) y horas numéricas (`7`, `12`) en vez de strings `"HH:mm"` — todo forzado con `as any` para evadir el chequeo de tipos:
```ts
const created = await svc.create({
  VisibleDays: 7, TyC: '', InicioManana: 7, FinalManana: 12,
  InicioTarde: 12, FinalTarde: 18, PicoPlaca: false,
} as any);
```
Como `SettingsService.toModel()` nunca produce un campo `TyC`, la lectura posterior `rec.TyC ?? rec.TerminosyCondiciones` (líneas 47, 60) siempre cae al segundo operando — el valor de `TyC` escrito aquí **nunca se recupera**, y los valores numéricos de hora quedan en un formato distinto al que espera el resto de la app (`"HH:mm"`).

Riesgo adicional (no confirmado contra el esquema real de SharePoint): `svc.getAll({top: 1, orderby: 'fields/ID asc'})` ordena por `fields/ID`, mientras que el id de un ítem de SharePoint normalmente se expone en el nivel superior (`id`), no anidado bajo `fields` — puede que este `$orderby` no corresponda a ningún campo indexado real.

## Patrones de programación
- Función *factory* (`make*Port(svc)`) que cierra sobre el servicio real y devuelve un objeto con métodos de UI — un patrón de adaptador ligero, sin clases.

## Notas de calidad (deuda técnica)
- El Port no elimina duplicación de lógica OData/CRUD (delega correctamente en el Service), pero sí duplica y a veces **contradice** las suposiciones de forma de campo del Service que envuelve — ver el caso `TyC` arriba.
- Al cubrir solo 2 de ~11 servicios, "Port" no es una capa consistente de la arquitectura sino una envoltura aplicada ad hoc a dos pantallas específicas (Settings admin, Pico y Placa admin).
