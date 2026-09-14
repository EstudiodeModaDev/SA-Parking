# Módulo: Servicios (`src/Services`)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Capa Graph](./graph.md) · [Ports](./ports.md)

Cada servicio de lista sigue el mismo patrón base ("repository" por lista de SharePoint): constructor `(graph: GraphRest, hostname, sitePath, listName)` con defaults hardcodeados; método privado `ensureIds()` que resuelve `siteId`/`listId` una vez (vía `/sites/{hostname}:{sitePath}` y filtro por `displayName`) y los cachea en `localStorage` (clave `sp:{hostname}{sitePath}:{listName}`); CRUD estándar (`get/getAll/create/update/delete`) construido sobre `GraphRest`; `getAll(opts: GetAllOpts)` arma `$filter/$orderby/$top/$expand=fields` a partir de [`Models/Commons.ts::GetAllOpts`](./models.md).

## `ParkingSlotsService` (`ParkingSlot.service.ts`)
Repositorio de la lista `ParkingSlots` (celdas de parqueo). `getAll()` es el *query builder* más elaborado del proyecto: reescribe tokens de filtro/orderby (`ID`→`id`, `Title`→`fields/Title`), re-escapa literales, sustituye `+` por `%20` en la query final ("porque algunos proxies se quejan", según comentario del código), y si el primer intento lanza `itemNotFound` **reintenta sin `$filter`**, degradando silenciosamente a una consulta sin filtrar. También expone `findByCodigo(codigo, top=1)` y `getDisponibles(top=100)` (`filter: 'fields/Disponible eq true'`).

- *Nota de consistencia*: resuelve el sitio con dos-puntos finales (`/sites/{hostname}:{sitePath}:`), a diferencia del resto de servicios de esta lista, que no lo usan — indicio de que el bloque `ensureIds` ya divergió entre copias.

## `ColaboradoresFijosService` (`Colaboradoresfijos.service.ts`)
Repositorio de la lista `Colaboradores fijos`. Además del CRUD estándar, expone `getAllPaged(opts)`/`getNextPage(nextLink)` con paginación manual vía `@odata.nextLink` (recorta el host hardcodeado del link antes de reenviarlo a `GraphRest`, que lo vuelve a anteponer).

## `ReservationsService` (`Reservations.service.ts`)
Repositorio de la entidad central de negocio, la lista `Reservations`.
- `toModel` mapea columnas *lookup* (`SpotIdLookupId`, `AuthorLookupId`/`EditorLookupId`) con guards de tipo (`typeof f.X === 'number' ? f.X : null`).
- Contiene un *fallback* sin efecto: `VehicleType: f.VehicleType ?? f.VehicleType` (comparación de una expresión consigo misma) — casi seguro un resto de una segunda variante de nombre de campo que nunca se completó.
- `create()` deja `console.table(record)`/`console.log(...)` de depuración en el flujo de producción.
- `reservationCode(number)` calcula `format5(number + 1)`; el llamador (`slotDetailsModal.tsx`) ya incrementa `total` en 1 antes de invocar `create()` — el resultado es un desfase de +2 respecto al conteo real, y además una condición de carrera si dos reservas se crean casi simultáneamente (ver [ARQUITECTURA.md §5.1, punto 3](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos)).
- Consultas auxiliares: `findBySpotId`, `findByDateRange`, `findByUser`.

## `SettingsService` (`Setting.service.ts`)
Repositorio de la lista `Settings` (registro único de configuración global). Redefine localmente su propia interfaz `Settings` y su propio `GetAllOpts` en vez de importar el tipo compartido de `Models/Commons.ts` — inconsistencia respecto al resto de servicios. `toModel` aplica horarios por defecto hardcodeados (`'07:00'`/`'12:00'`/`'12:00'`/`'18:00'`) si el campo viene nulo. `getVisibleDaysFromId1()` asume que el ítem de configuración siempre tiene `id='1'` — frágil si la fila se recrea alguna vez en SharePoint (recibiría un nuevo id).

## `PicoYPlacaService` (`PicoPlaca.ts`, sin sufijo `.service`)
Repositorio de la lista `Pico y Placa`. Es el único archivo de Services que aloja lógica de negocio "de dominio" real:
- `findByDia(dia, tipoVehiculo?, onlyActive=true)`: arma el `$filter` combinando día, tipo de vehículo y estado activo.
- `isRestringido(placa, fecha, tipoVehiculo?)`: calcula el día de la semana en español con un array hardcodeado, extrae el último dígito de la placa, evalúa listas/rangos de dígitos y ventanas horarias con *parsing* manual (`HH:mm` → minutos). Sin ventana horaria configurada, la regla se interpreta como "restringido todo el día" (documentado solo en un comentario, no en el modelo ni en tests).
- Comentarios propios reconocen incertidumbre sobre el esquema real de la lista ("ajusta a tu formato real si es distinto").

## `RegistroVehicularService` (`RegistroVehicular.service.ts`)
Repositorio de la lista `RegistroVehicular`. `toModel` mapea correctamente a `RegistroVehicularSP`, pero **`create`/`update` están tipados contra `Omit<Colaboradoresfijos,'ID'>`** — residuo evidente de haber copiado el archivo de `Colaboradoresfijos.service.ts` sin actualizar los tipos genéricos. TypeScript no puede detectar campos mal escritos en las llamadas a estos dos métodos. Ver [ARQUITECTURA.md §5.1, punto 4](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos).

## `UsuariosParkingService` (`UsuariosParking.service.ts`)
Repositorio de la lista `usuariosparking` (rol/permiso por usuario). `toModel` solo puebla `ID, Title, Rol, Permitidos` de los ~30 campos que declara `Models/UsuariosParking.ts`. `findByCorreo(correo)` filtra por un campo `Correo` que `toModel` **nunca** lee/expone — inconsistencia interna entre el método de búsqueda y el modelo resultante (posible método muerto/roto).

## `SharedServices` (`Shared.service.ts`)
No representa una lista propia: envuelve `UsuariosParkingService` (inyectado por constructor, única composición explícita servicio→servicio del proyecto) para exponer `getRole(userEmail)`. Busca por `fields/Title eq '<email>'` (con variante `tolower` como *fallback*) — es decir, el email del usuario se guarda en el campo `Title` de `usuariosparking`, una convención implícita no documentada en el modelo. Ante cualquier error de red/consulta, **retorna `null` de forma silenciosa y sin log** — usado para autorización, este es un punto sensible (ver [ARQUITECTURA.md §3.2](../ARQUITECTURA.md#32-autorización-roles)).

## `UserService` (`User.Service.ts`)
Envuelve los endpoints `/me` de Graph. `getMeBasic()` trae el perfil básico tipado (`Models/users.ts::UserMe`). `getMyPhotoDataUrl()` **rompe encapsulamiento**: accede a `(this.graph as any).getToken()` (miembro privado de `GraphRest`) para hacer un `fetch` binario directo a `/me/photo/$value`, ya que `GraphRest` solo sabe parsear JSON/texto. Errores completamente silenciados (`catch { return null }`).

## `GraphUsers.service.ts` — funciones sueltas, no una clase
Pese al sufijo `.service.ts`, exporta funciones planas (no una clase): `removeMemberByUserId`, `getUserIdByEmail`, `removeMemberByEmail`, `removeMembersBulk` (recorre en **serie**, no en paralelo, un arreglo de ids/emails). Implementa su propio cliente `fetch` (bypasea `GraphRest`). No está registrado en `GraphServicesContext` — se importa directo desde `Components/PermisosApp/usuariosApp.tsx`. Su propio comentario de cabecera dice `// src/Services/GroupMembers.service.ts`, desalineado con el nombre real del archivo.

## `GruposCorreo.service.ts`
Una única función, `getGroupUsers(groupID, getToken, transitive=true)`, para listar miembros (transitivos o directos) de un grupo de Azure AD, paginando por `@odata.nextLink` y filtrando a `@odata.type` de usuario. **Código muerto**: ningún archivo del proyecto la importa (`Hooks/GraphUsers.ts` reimplementa la misma lógica de forma independiente, ver [Hooks](./hooks.md)).

## `Log.service.ts`
Duplicado byte-a-byte de `Colaboradoresfijos.service.ts` (mismo hash MD5, misma clase exportada `ColaboradoresFijosService`). No implementa ninguna funcionalidad de logging pese a su nombre. No se usa en ningún lado — candidato directo a eliminar. Ver [ARQUITECTURA.md §5.2, punto 9](../ARQUITECTURA.md#52-alta--duplicación-estructural-y-decisiones-de-arquitectura).

## `Name.Service.ts`
`nameProve(name): Promise<boolean>` — declarado `async` sin ningún `await` interno (síncrono en la práctica). Normaliza acentos/mayúsculas y rechaza nombres que coincidan (exacto o por substring) con una lista negra hardcodeada de palabras genéricas (`practicante, aprendiz, admin, facturas, cedi, ...`). Se usa para evitar asignar celdas/reservas a cuentas de rol/genéricas en vez de personas reales — aplicado de forma inconsistente entre los distintos modales que seleccionan colaboradores del directorio (ver componentes en el índice).

## Patrones de programación
- *Repository pattern* por lista SharePoint, con resolución perezosa de ids (`ensureIds`) cacheada en `localStorage`.
- *Query builder* manual sobre OData (`$filter`/`$orderby`/`$top`/`$expand`) — sin una librería de queries tipada.
- Un único punto de composición servicio→servicio (`SharedServices` sobre `UsuariosParkingService`); el resto de servicios son independientes entre sí.

## Notas de calidad (deuda técnica) — resumen
Ver detalle completo en [ARQUITECTURA.md §5](../ARQUITECTURA.md#5-deuda-técnica). En síntesis: el bloque `ensureIds`/caché/escape está duplicado literalmente en 7-8 archivos sin una clase base compartida; existen 3-4 clientes HTTP paralelos a `GraphRest`; el manejo de errores va de silencioso (`catch {return null}`) a coincidencia de texto sobre mensajes de error (`msg.includes("404")`); y el tipado `any` es extendido en casi todos los `toModel(item: any)` y payloads de escritura.
