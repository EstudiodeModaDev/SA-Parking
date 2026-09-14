# Módulo: Hooks (`src/Hooks`)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Servicios](./services.md) · [Models](./models.md)

Los hooks encapsulan estado de React (loading/error/rows/paginación) alrededor de un Service. La mayoría recibe el Service **por parámetro** (inyección explícita); algunos (`useSettingHour`, `useWorkers`, `GraphUsers.ts`, `usePicoPlaca.ts`) acceden a Graph directamente vía `useAuth()`/`useGraphServices()`/`fetch` propio, sin pasar por un Service — dos convenciones de inyección de dependencias coexistiendo en la misma capa.

## `useCeldas.ts` — el hook más completo
CRUD + búsqueda + filtros (`tipo`, `itinerancia`, `estado`) + paginación para la lista de celdas (`ParkingSlotsService`). *Debounce* de búsqueda (300 ms) vía `useRef`+`setTimeout`; usa un **`reqIdRef`** ("la última petición gana") para descartar respuestas obsoletas — el patrón de concurrencia más robusto de toda la capa de Hooks. `create()` implementa la regla de negocio: crear una celda `Moto` genera **5 sub-celdas** sufijadas `A`-`E` (`Promise.allSettled`); crear una `Carro` genera solo 1. `toggleEstado` reporta error vía `alert()` en vez de usar el `error` de estado del propio hook. Filtro `estado` (Activa/Inactiva/Todas) es la adición más reciente de la app (commit "Bloqueo de reservas").

## `useColaboradores.ts` (exporta `useCollaborators`)
Trae **todo** el listado de la lista `Colaboradores fijos` (`top: 2000`) y filtra/pagina 100% en cliente sobre un `masterRef` (caché en memoria fuera de React state), con normalización de acentos (`normalize('NFD')`) para la búsqueda. Inserta de forma optimista el nuevo colaborador en `masterRef` tras `addCollaborator`. El nombre exportado (`useCollaborators`, inglés) no coincide con el nombre de archivo (español).

## `useRegistroVehicular.ts`
Estructuralmente casi idéntico a `useColaboradores.ts` (mismo patrón `masterRef` + debounce 250ms + filtro local), aplicado a la lista `RegistroVehicular` — duplicación de código casi total entre ambos hooks, con nombres de función (`mapToCollaborator`) copiados sin renombrar.

## `useMisReservas.ts`
Soporta dos modos: `upcoming-active` (reservas futuras y activas del usuario) e `history` (rango de fechas libre, cualquier estado). No-admins quedan fijados a su propio email en el filtro OData (`fields/Title eq '<email>'`). `cancelReservation(id)` actualiza `Status` a `'Cancelada'` y refresca. La paginación (`pageIndex`/`pageSize`/`hasNext`) se calcula pero **no se aplica** — el componente consumidor siempre recibe el arreglo completo de filas. Contiene un `console.log` de depuración con las filas obtenidas.

## `useReservar.ts` — núcleo del flujo de reserva
`useReservar(reservationsSvc, slotsSvc, settingsSvc, userMail, userName)` → `{minDate, maxDate, loading, error, reservar, countReservations}`.
- Ventana de reserva: `minDate = hoy`, `maxDate = hoy + Settings.VisibleDays` (default 3 si falta/es inválido).
- Regla "una reserva por usuario por día": bloquea un "Día completo" si ya existe cualquier reserva activa ese día; bloquea un turno si ya hay una reserva en ese turno o un "Día completo" ya existente.
- Orden de asignación de celdas: un conjunto hardcodeado `LAST_GROUP_IDS = new Set([5])` se deja para el final de la lista de candidatas — regla de negocio sin documentar en ningún lado más que en el propio código.
- Verifica disponibilidad contando reservas activas por celda/turno candidato (recorrido secuencial, no paralelo — el tiempo de búsqueda crece linealmente con el número de celdas activas).
- Genera `Codigo` contando **todas** las reservas existentes (`getAll({top: 20000})`) y sumando 1 — no atómico, condición de carrera bajo reservas concurrentes (ver [ARQUITECTURA.md §5.1, punto 3](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos)).
- En cada montaje dispara además un `getAll({top:2000})` completo solo para hacer `console.log` de depuración del primer registro — costo de red real pagado únicamente para debugging.
- Redeclara localmente sus propios `VehicleType`/`TurnDb` en vez de reusar `Models/shared.ts::VehicleType`/`TurnType`.

## `useReportes.ts` (exporta `useReporteria` — reporte de aforo/ocupación)
Combina `ReservationsService` + `ParkingSlotsService`. `loadCapacidad()`: capacidad total = (# celdas activas Carro) + (# celdas activas Moto × `MOTO_CAPACITY`, constante hardcodeada en 1). El cálculo de "% de aforo" suma 1 unidad por reserva sin distinguir tipo de vehículo — las tres ramas de un `if/else` de tipo de vehículo son en la práctica equivalentes (rama muerta: `unidades += 1` en los tres casos).

## `reporteRegistro.ts` (exporta `useReporteria` — reporte de registro vehicular; **nombre duplicado** con el hook anterior**)
Filtra la lista `RegistroVehicular` por rango de fecha (`Created`), tipo de vehículo y nombre (`startswith`, no `contains`). Contiene dos bloques `useEffect` con cuerpo idéntico (uno "carga inicial", otro "recarga al cambiar filtro") — ambos disparan la misma recarga de forma redundante. Filtra por `fields/TipeVeh` (posible typo respecto a `TipoVeh`, usado en otros lugares) — riesgo de estar filtrando un campo que no existe.

## `useTodayOccupancy.ts`
Calcula ocupación de celdas **para hoy** por turno (AM/PM) a partir de reservas activas, para el dashboard de capacidad. Cualquier valor de turno no reconocido como mañana/tarde (p. ej. "Día completo") marca **ambos** turnos como ocupados. Formatea fechas manualmente en vez de reusar `utils/date.ts`.

## `useSettingHour.ts` (exporta `useSettingsHours`)
Trae y normaliza los 4 campos de horario (`InicioManana/FinalManana/InicioTarde/FinalTarde`) del ítem de Settings (id fijo `"1"`), tolerando formatos `"07:00"`, `"7"` o `7` (`toHourNumber`). Es el único hook CRUD que obtiene su Service directo de `useGraphServices()` en vez de recibirlo por parámetro — convención de DI distinta al resto de la capa. Duplica lógica de `clampHour` ya existente en `Models/time.ts`.

## `useAsignarCeldas.ts`
Pese al prefijo `use*` y vivir en `Hooks/`, **no es un hook de React** (no usa `useState`/`useEffect`) sino un módulo de funciones async puras para asignar/desasignar una celda fija a un colaborador (`fetchAssignee`, `assignSlotToCollaborator`, `unassignSlotFromCollaborator`, `searchUnassignedCollaborators` con doble filtro server+cliente "por si el backend no filtró bien").

## `useWorkers.ts`
Directorio completo de usuarios de Microsoft 365 para *pickers*/autocompletado. Implementa una **caché global a nivel de módulo** (`const cache = {}` fuera del ciclo de vida de React, con deduplicación de promesas en vuelo) — nunca se invalida al cerrar sesión/cambiar de usuario, riesgo de fuga de datos de directorio entre sesiones si no hay recarga completa de página.

## `usePicoPlaca.ts` — nombre engañoso
En realidad exporta `useRecipients`, un hook para armar listas de destinatarios de correo desde el directorio de Graph (filtro de dominio, deduplicación, límite de previsualización). **No tiene relación con la funcionalidad de Pico y Placa**; la pantalla de Pico y Placa (`Components/PicoPlaca/PicoPlaca.tsx`) no lo importa y reimplementa su propia validación en el componente.

## `GraphUsers.ts` — nombre engañoso
En realidad exporta `useGroupMembers(groupId)`: lista/pagina/busca miembros de un grupo de Azure AD y expone `addCollaboratorByUserId`/`deleteByUserId`/`deleteByEmail`. Implementa su propio cliente `fetch` (no pasa por ningún Service ni por `GraphRest`). Colisiona en nombre con `Services/GraphUsers.service.ts` y con `Models/GraphUsers.ts` (conceptos distintos en los tres casos).

## `utils.ts`
Funciones puras compartidas: `dayLabel(title)` (día de la semana en español), `isValidPattern(v)` (valida listas de dígitos separadas por coma — la validación que, en teoría, debería usar la pantalla de Pico y Placa), `normalizeResult(res)` (normaliza distintas formas de resultado `{ok}`/`{success}` que devuelven los distintos Services, evidencia de que el contrato de retorno entre servicios no es uniforme).

## Patrones de programación
- Estado *loading/error/rows* + acciones expuestas como `useCallback`, repetido en casi todos los hooks CRUD.
- Tres estrategias de seguridad de concurrencia distintas coexisten: bandera booleana `cancel` en cleanup del efecto (la mayoría), `reqIdRef` de "última petición gana" (`useCeldas.ts`), o ninguna (`useTodayOccupancy`, `useWorkers`, `usePicoPlaca.ts`). Ninguna usa `AbortController` para cancelar el `fetch` subyacente.
- Caché en memoria fuera de React (`masterRef`, caché de módulo en `useWorkers.ts`) para evitar refetch en filtros/búsquedas locales.

## Notas de calidad (deuda técnica) — resumen
Ver detalle completo en [ARQUITECTURA.md §5](../ARQUITECTURA.md#5-deuda-técnica). En síntesis: el esqueleto de fetch/filtro/paginación/debounce está duplicado casi verbatim en `useCeldas.ts`, `useColaboradores.ts` y `useRegistroVehicular.ts`; hay dos hooks distintos llamados `useReporteria`; dos archivos (`usePicoPlaca.ts`, `GraphUsers.ts`) tienen nombre que no corresponde a lo que exportan; y la lógica de reserva (`useReservar.ts`) tiene riesgos de condición de carrera con impacto de negocio real.
