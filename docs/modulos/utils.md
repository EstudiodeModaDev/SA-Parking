# Módulo: Utils (`src/utils`)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md)

Helpers puros, sin estado ni dependencia de React (salvo `SendEmail.ts`, que recibe un cliente Graph-like por parámetro).

## `date.ts`
- `ymdLocal(d: Date)`: formatea una fecha local como `YYYY-MM-DD`.
- `last30Days()`: retorna `{from, to}` cubriendo los últimos 30 días.
- `addDays(date, days)`.
- `toISODate(d: Date|null)` / `todayISO()`.
- `formatDateTime(iso, locale='es-CO')` / `formatDateLocal(iso, locale='es-CO')` / `formatDateUTC(iso, locale='es-CO')`: formatean usando `Intl.DateTimeFormat`, fijando la zona horaria a `America/Bogota` (los dos primeros) o `UTC` (el tercero, para evitar que una fecha "solo fecha" se corra de día por huso horario).
- `formatRelative(iso, locale='es')`: formato relativo tipo "hace 3 horas" vía `Intl.RelativeTimeFormat`.

## `exportExcel.ts`
`exportRowsToExcel<T>(rows: T[], filename='reporte.xlsx')`: usa la librería `xlsx` (SheetJS) para convertir un arreglo de objetos a una hoja (`json_to_sheet`), calcula un autoancho simple de columna (basado en la longitud máxima de contenido, acotado entre 10 y 60 caracteres) y descarga el archivo (`XLSX.writeFile`). Usado por ambas pantallas de Reportes.

## `number.ts`
`format5(n: number|string)`: formatea un número como cadena de 5 dígitos con ceros a la izquierda, vía `Intl.NumberFormat` con `minimumIntegerDigits: 5`. Usado para generar el código legible de reserva.

## `resolveUserUpnOrId.ts`
`resolveUserUpnOrId(graph, {email?, useCurrent?})`: dado un cliente Graph-like (`{get}`), resuelve `{upn, id}` de un usuario por su email (`$filter=mail eq '...'`) o del usuario actual (`/me`).

## `SendEmail.ts`
Construye y envía el correo HTML de "solicitud de inscripción de vehículo":
- `buildHtml(...)`: arma el cuerpo HTML con escape básico de entidades (`esc()`).
- `buildPayload(data: RegistroVehicularMail)`: arma el payload de Graph `sendMail`.
- `sendRegistroVehicularEmail(graph, data)`: envía desde el usuario actual (`/me/sendMail`).
- `sendRegistroVehicularEmailFrom(graph, userKey, data)`: envía desde un buzón específico (`/users/{userKey}/sendMail`).
- Soporta tanto un cliente `GraphRest`-like (`.post()`) como un cliente tipo SDK (`.api().post()`) mediante un *type guard* (`isGraphRest`).

## `status.ts`
`statusColor(status: string)`: mapea substrings de estado (`cancel`, `termin`, `act`) a colores hexadecimales para badges de UI; cualquier otro valor cae a un azul por defecto.

## Patrones de programación
- Funciones puras, sin efectos secundarios (salvo el envío de correo y la descarga del Excel), fácilmente reutilizables y testeables en aislamiento — el módulo con menor deuda técnica de todo el proyecto.
- Uso consistente de las APIs `Intl.*` del navegador en vez de librerías de fecha externas (no hay `date-fns`/`dayjs` en las dependencias).

## Notas de calidad
- `date.ts` fija la zona horaria a `America/Bogota` de forma hardcodeada — correcto para una app de un solo país/oficina, pero a tener en cuenta si la empresa opera en otra zona horaria en el futuro.
- Ningún otro módulo del proyecto reutiliza sistemáticamente estos helpers: varios hooks (`useTodayOccupancy.ts`, partes de `useMisReservas.ts`) formatean fechas manualmente en vez de importar `ymdLocal`/`todayISO` desde aquí — ver [Hooks](./hooks.md).
