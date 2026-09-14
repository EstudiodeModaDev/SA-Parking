# Módulo: Models (`src/Models`)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Hooks](./hooks.md) · [Servicios](./services.md)

Debería ser una capa de solo tipos/contratos; en la práctica también contiene lógica de negocio y, en un caso, un hook completo. Se documentan todos los archivos; ver [ARQUITECTURA.md §5.3](../ARQUITECTURA.md#53-media--inconsistencias-y-código-muerto) para el resumen de inconsistencias de nombres de campo entre modelos.

| Archivo | Contenido | Nota |
|---|---|---|
| `Commons.ts` | `GetAllOpts {filter?, orderby?, top?}` | tipo compartido correctamente reusado por la mayoría de Services |
| `shared.ts` | `VehicleType`, `TurnType`, `Worker` | pensado como fuente única de tipos de dominio; no todos los hooks lo usan (p. ej. `Hooks/useReservar.ts` redeclara sus propios `VehicleType`/`TurnDb` locales) |
| `Celdas.ts` | `SlotUI`, `Assignee`, `TurnFlags`, `CreateForm`, `Mode`, `mapSlotToUI()` | modelo de vista + mapeador para la pantalla de celdas; `Raw: any` en `SlotUI` es un escape de tipado |
| `Colaboradoresfijos.ts` | `Colaboradoresfijos {ID, Title?, Correo?, Tipodevehiculo, Placa?, CodigoCelda?, SpotAsignado?}` | campo `Tipodevehiculo` (todo junto, minúscula) rompe la convención PascalCase del resto del archivo |
| `Parkingslot.ts` | `ParkingSlot {ID: string, Title?, TipoCelda?, Itinerancia?, Activa?}` | `ID: string`, inconsistente con `Colaboradoresfijos.ID: number` — el mismo concepto ("id de ítem SharePoint") tipado distinto según el modelo |
| `PicoPlaca.ts` | `PicoYPlaca {ID: string, Title?, Moto?, Carro?}` | duplicado por un tipo local equivalente (`PicoPlacaRow`) definido dentro de `Components/PicoPlaca/PicoPlaca.tsx` en vez de importar este |
| `RegistroVehicular.ts` | `RegistroVehicularSP` (modelo crudo) + `RegistroVehicularMail` (payload de correo) | dos convenciones de nombre de campo distintas en el mismo archivo (PascalCase SP vs. camelCase de payload) |
| `Reservation.ts` | `Reservations` (crudo, con columnas *lookup*), `ReservationUI` + `mapReservationToUI()`, `ReserveArgs`, `ReserveResult` (unión discriminada `{ok:true|false}`) | segundo mapeador "crudo→UI" independiente del que define `Hooks/useMisReservas.ts` (`mapModelToUI`) — dos implementaciones de la misma conversión |
| `Reportes.ts` | `Filtros`, `Row`, `ReservaUI` | `Row` no parece tener consumidores; `ReservaUI` es un **tercer** modelo de vista de "reserva para tabla", con nombres de campo distintos (`Fecha`/`Turno`/`Celda`) a los de `ReservationUI` (`Date`/`Turn`/`Spot`) |
| `Settings.ts` | `FormState` (incluye el artefacto de SharePoint `Ma_x00f1_ana`), `Props` | **importa un tipo desde `Services/Setting.service.ts`**, invirtiendo la dirección de dependencia Models→Services que se espera en la arquitectura |
| `UsuariosParking.ts` | ~30 campos, en su mayoría metadatos de sistema de SharePoint/Power Platform (`OData__ColorTag`, `{ModerationStatus}`, `{Attachments}`, etc.) | solo 4 campos (`ID, Title, Rol, Permitidos`) son poblados realmente por `UsuariosParkingService.toModel()` — el resto es ruido, aparentemente pegado desde un esquema autogenerado |
| `GraphUsers.ts` | `GraphUser`, `GraphListResponse<T>`, `OData`, `GraphUserLite`, `newAccess` | nombre colisiona con `Hooks/GraphUsers.ts` y `Services/GraphUsers.service.ts` (conceptos distintos en cada capa); `newAccess` rompe la convención PascalCase de nombres de tipo |
| `users.ts` | `UserMe` (perfil `/me`) | distinto de `GraphUsers.ts` (listado de directorio); el trío `users.ts`/`GraphUsers.ts`/`UsuariosParking.ts` para tres conceptos distintos genera fricción de navegación por similitud de nombres |
| `colaboradores.ts` | `Collaborator`, `NewCollaborator` (vista de UI) | mezcla camelCase (`nombre`, `correo`) y PascalCase (`CodigoCelda`, `IdSpot`) dentro del mismo tipo |
| `misReservas.ts` | `FilterMode` | **código muerto**: nadie lo importa; `Hooks/useMisReservas.ts` redeclara el mismo tipo literal localmente en vez de importarlo |
| `ModalModel.ts` | `reserveModal` (props de modal genérico de confirmación) | nombre de tipo en minúscula inicial (rompe convención) y engañoso: no es específico de reservas, lo usa un modal genérico |
| `Modals.ts` | `Props` (props del modal de detalle de colaborador) | exporta un identificador genérico `Props`; nombre de archivo casi idéntico a `ModalModel.ts` para un contrato no relacionado |
| `time.ts` | `Hours`, `fmtHour`, `deriveHoursLabels`, `getCurrentTurnFromHours` | contiene lógica de negocio, no solo tipos (atípico para "Models"); duplica el `clampHour` que también define, por separado, `Hooks/useSettingHour.ts` |
| `toast.ts` | `Toast`, `ToastKind` | limpio, sin hallazgos |
| `useCeldas.ts` | **un hook de React completo**, no un tipo (`useState`/`useEffect`/`useCallback`, CRUD, paginación) | copia antigua/desactualizada de `Hooks/useCeldas.ts` (sin filtro `estado`, sin debounce, sin `reqIdRef`); **código muerto** confirmado — nadie lo importa — pero comparte el mismo nombre exportado (`useCeldas`) que el hook real, riesgo de importarlo por error |

## Patrones de programación
- Separación nominal entre "modelo crudo" (mirror de columnas SharePoint) y "modelo de vista" (`*UI`) con una función `map*ToUI()` — patrón correcto en principio, aplicado de forma inconsistente (a veces hay 2-3 mapeadores para el mismo concepto, ver tabla arriba).

## Notas de calidad (deuda técnica) — resumen
El problema principal de esta capa es *scope creep*: además de tipos, alberga lógica de negocio (`time.ts`), un hook completo huérfano (`useCeldas.ts`), un tipo muerto de una sola línea (`misReservas.ts`) y un esquema sobre-extendido copiado de una herramienta externa (`UsuariosParking.ts`). Ver el detalle priorizado en [ARQUITECTURA.md §5.3, puntos 16, 22-24](../ARQUITECTURA.md#53-media--inconsistencias-y-código-muerto).
