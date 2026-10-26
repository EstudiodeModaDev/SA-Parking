# Página `celdas`

[← Rutas y páginas](../rutas.md) · [Flujo de datos](../flujo-de-datos.md)

Gestión de las celdas de parqueo y creación de reservas a nombre de terceros. Hay dos formas de reservar desde esta página:

- **Rápida:** el administrador elige colaborador, fecha, turno y tipo de vehículo; el backend asigna una celda libre al azar.
- **Puntual:** desde el menú de una celda, el administrador la reserva para un colaborador en una fecha y turno.

**Ruta:** `/celdas` · **Roles:** Admin · **Layout:** `MainLayout`

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| [pages/Celdas.tsx](../../src/pages/Celdas.tsx) | Encabezado, reserva rápida, grilla de celdas y popup de creación. |
| [components/vistaAdmin/celdas/celda.component.tsx](../../src/components/vistaAdmin/celdas/celda.component.tsx) | Tarjeta de una celda: ocupación, menú, edición y reserva puntual. |
| [components/vistaAdmin/celdas/quickReservAdmin.component.tsx](../../src/components/vistaAdmin/celdas/quickReservAdmin.component.tsx) | Formulario de reserva rápida a nombre de un tercero. |
| [components/vistaAdmin/celdas/selectColaborador.component.tsx](../../src/components/vistaAdmin/celdas/selectColaborador.component.tsx) | Selector con búsqueda de usuarios de la compañía. |
| [components/menuContextual.component.tsx](../../src/components/menuContextual.component.tsx) | Menú flotante de opciones de la celda. |
| [components/popup.component.tsx](../../src/components/popup.component.tsx) | Ventana modal (se cierra con `Escape`). |
| [hooks/useCeldas.ts](../../src/hooks/useCeldas.ts) | Consulta y mutaciones de celdas. |
| [hooks/useReserva.ts](../../src/hooks/useReserva.ts) | `useCreateReservaAdmin`, `useCreateReservaPuntualAdmin`. |
| [hooks/useCompanyUsers.ts](../../src/hooks/useCompanyUsers.ts) | Usuarios de la compañía para el selector. |
| [services/celdas.service.ts](../../src/services/celdas.service.ts) | Llamadas a `/parkingSlots`. |
| [types/celdas.ts](../../src/types/celdas.ts) | `celda`, `createCelda`, `Itinerancia`, `ocupacion`. |

## Grilla de celdas

- **Página:** `Celdas` — [Celdas.tsx:22](../../src/pages/Celdas.tsx#L22)
- **Lógica:** `useCeldas` trae las celdas con su ocupación del día por turno y se pinta una tarjeta `Celda` por cada una.
- **Estado visual de la tarjeta** ([celda.component.tsx:44](../../src/components/vistaAdmin/celdas/celda.component.tsx#L44)):
  - **Inactiva** si `Activa = "Inactiva"`.
  - **En uso** si está activa y tiene ocupado el turno de mañana o de tarde.
  - Indicadores **AM** y **PM** según `Ocupacion.Manana` y `Ocupacion.Tarde`.

## Crear una celda

- **Ubicación:** botón **Añadir celda** → popup — [Celdas.tsx:48](../../src/pages/Celdas.tsx#L48)
- **Campos:** nombre (`Title`), tipo de vehículo (`Carro`/`Moto`), itinerancia (`Empleado Itinerante`, `Empleado Fijo`, `Directivo`) y si se crea activa.
- **Validación:** el nombre no puede estar vacío ni repetirse (se compara sin distinguir mayúsculas), porque las reservas apuntan a la celda por su `Title`.
- **Hook / endpoint:** `useCreateCelda` → `POST /parkingSlots/createSlot`. Solo se envían columnas de la lista; `ID` y `Ocupacion` no existen en SharePoint.

## Menú de una celda

El botón de tres puntos abre `MenuContextual` con estas opciones ([celda.component.tsx:149](../../src/components/vistaAdmin/celdas/celda.component.tsx#L149)):

| Opción | Hook | Endpoint |
| --- | --- | --- |
| Desactivar / Activar celda | `useDeactivateCelda` / `useActivateCelda` | `PUT /parkingSlots/inactiveSlot/:id` / `PUT /parkingSlots/activeSlot/:id` |
| Editar | `useEditCelda` | `PUT /parkingSlots/editSlot/:id` (body: `Title`, `TipoCelda`, `Itinerancia`, `Activa`) |
| Reservar | `useCreateReservaPuntualAdmin` | `POST /reserva/createPuntAdm` |

Todas invalidan `['celdas', 'get']`, así que la grilla se refresca al terminar.

## Reserva puntual

- **Ubicación:** `guardarPuntual` — [celda.component.tsx:127](../../src/components/vistaAdmin/celdas/celda.component.tsx#L127)
- **Campos:** colaborador (obligatorio), fecha y turno.
- **Body enviado:** fecha y turno del formulario; `VehicleType` = tipo de la celda; `SpotId` = `Title` de la celda; `Title` y `NombreUsuario` = correo y nombre del colaborador; `Codigo = ""`, `Notify = false`.
- **Fechas permitidas:** desde mañana hasta hoy + `VisibleDays` de la configuración.

## Reserva rápida (administrador)

- **Componente:** `QuickReservAdmin` — [quickReservAdmin.component.tsx:26](../../src/components/vistaAdmin/celdas/quickReservAdmin.component.tsx#L26)
- **Campos:** colaborador, fecha, turno y tipo de vehículo.
- **Hook / endpoint:** `useCreateReservaAdmin` → `POST /reserva/createQuickAdm`.
- **Lógica:** no envía si no hay colaborador. El formulario solo se limpia si la reserva se crea; si falla, se notifica el mensaje del backend (por ejemplo, que no hay celdas libres).

## Selector de colaborador

`SelectColaborador` ([selectColaborador.component.tsx:15](../../src/components/vistaAdmin/celdas/selectColaborador.component.tsx#L15)) recibe la lista de `useCompanyUsers` (`GET /colaboradores/all`) y filtra por nombre o correo, sin distinguir mayúsculas ni tildes. Se cierra al hacer clic por fuera.

## Modelo `celda`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `ID` | string | ID del ítem. |
| `Title` | string | Nombre de la celda (lo usan las reservas como `SpotId`). |
| `TipoCelda` | `"Carro" \| "Moto"` | Tipo de vehículo. |
| `Itinerancia` | `"Empleado Itinerante" \| "Directivo" \| "Empleado Fijo"` | A quién se destina. |
| `Activa` | `"Activa" \| "Inactiva"` | Estado. |
| `Ocupacion` | `{ Manana: boolean, Tarde: boolean }` | Calculada por el backend; no es columna de la lista. |

---

[← Página `reserva`](reservas.md) | [Página `colaboradores` →](colaboradores.md)
