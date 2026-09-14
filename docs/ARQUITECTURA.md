# Parking EDM — Arquitectura y Deuda Técnica

> Documento generado a partir de una revisión completa del código fuente (`src/`) a fecha 2026-09-14, rama `main`. Complementa al [índice de módulos](./modulos/README.md), donde cada módulo (capa técnica o carpeta de componente) tiene su propio archivo `.md` con componentes, funciones y patrones de programación.

## 1. ¿Qué es esta aplicación?

**Parking EDM** es una SPA (Single Page Application) interna de Estudio de Moda para administrar el parqueadero de la compañía: reserva de celdas (parqueaderos), asignación fija de celdas a colaboradores, registro vehicular, control de "Pico y Placa", permisos de acceso a la app y reportería/ocupación.

No existe backend propio: **Microsoft SharePoint Online actúa como base de datos** (listas) y **Microsoft Graph API** es la única capa de acceso a datos, consumida directamente desde el navegador con el token del usuario autenticado (Azure AD / MSAL). Es, en esencia, una aplicación *serverless* apoyada 100% en el tenant de Microsoft 365 de la empresa.

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript, sin router (una sola vista con pestañas controladas por estado) |
| Build/dev | Vite 7, `@vitejs/plugin-react` |
| Estilo | CSS Modules (`*.module.css`) en la mayoría de componentes; estilos inline en algunos (ver deuda técnica) |
| Autenticación | `@azure/msal-browser` (MSAL) contra Azure AD, flujo *popup* |
| Datos | Microsoft Graph REST API v1.0, contra listas de SharePoint Online (no hay API propia ni base de datos SQL/NoSQL) |
| Export | `xlsx` (SheetJS) para exportar reportes a Excel |
| Lint | ESLint 9 + `typescript-eslint` + `eslint-plugin-react-hooks` |
| CI/CD | GitHub Actions → Azure Static Web Apps (despliegue estático del `dist/`) |

No hay framework de testing configurado (no hay Jest/Vitest/Playwright, ni scripts de test en `package.json`).

## 3. Arquitectura por capas

La aplicación sigue, con intención, una arquitectura en capas inspirada en *repository pattern*:

```
Components (React)
      │  usan
      ▼
Hooks (src/Hooks) ──────────────► estado de UI (loading/error/rows/paginación)
      │  usan
      ▼
Services (src/Services) ───────► un "repositorio" por lista de SharePoint
      │  (algunos, vía)
      ▼
Ports (src/Ports) ──────────────► adaptadores opcionales hacia forma de UI
      │  usan
      ▼
GraphRest (src/graph/GraphRest.ts) ► wrapper fetch genérico para Graph API v1.0
      │
      ▼
Microsoft Graph API → listas de SharePoint Online
```

En paralelo:
- **`src/auth`**: integración con MSAL/Azure AD, expone `useAuth()` (cuenta activa, `getToken()`, `signIn`/`signOut`).
- **`src/graph/GraphServicesContext.tsx`**: contexto React que instancia **un Service por lista** (usando `getToken` de `useAuth`) y los expone vía `useGraphServices()`. Es el punto central de *dependency injection* de la app.
- **`src/Models`**: tipos TypeScript — deberían ser solo contratos, pero en la práctica también contienen lógica (ver deuda técnica).
- **`src/utils`**: helpers puros (fechas, export a Excel, envío de correo, resolución de usuario, color de estado).

### 3.1 Flujo de autenticación

1. `main.tsx` monta `<AuthProvider>` (envolviendo toda la app) y dentro `<App>`.
2. `AuthProvider` (`src/auth/AuthProvider.tsx`) inicializa MSAL (`initMSAL()`) sin forzar login automático; expone `{ready, account, getToken, signIn, signOut}`.
3. `App.tsx` muestra pantalla de login si no hay `account`; al autenticar (`msal.loginPopup`), monta `<GraphServicesProvider>` → `<AppInner>`.
4. `GraphServicesProvider` crea un `GraphRest` con el `getToken` del contexto de auth y construye instancias de cada Service (parkingSlots, colaboradoresFijos, reservations, usuariosParking, settings, picoYPlaca, registroVeh, shared).
5. Todo *fetch* a Graph pasa por `GraphRest.call()`, que adjunta `Authorization: Bearer <token>` obtenido vía `acquireTokenSilent` (con *fallback* a popup si se requiere interacción).

**Importante**: existe un segundo archivo de autenticación completo y no usado, `src/auth/authContext.tsx`, con su propia implementación de MSAL (flujo *redirect*, variables de entorno `VITE_AAD_*`, `logLevel`). No se importa desde ningún componente activo — es una implementación paralela abandonada (ver §5.1).

### 3.2 Autorización (roles)

No hay un sistema de roles de Azure AD ni App Roles: el rol de usuario (`admin` / `usuario`) se guarda como un campo de texto (`Rol`) en la lista SharePoint **UsuariosParking**, indexada por email en el campo `Title` (convención implícita, no documentada en el modelo). `SharedServices.getRole(email)` hace la consulta y, ante cualquier error, **retorna `null` silenciosamente** — un fallo de red se interpreta igual que "sin rol", sin registro (log) de la causa real. Cualquier usuario autenticado con permiso `Permitidos=true` puede however cambiar su propio rol vía un botón "Cambiar rol" en la cabecera (`App.tsx`), lo cual es una decisión de producto a validar con negocio (el control de acceso depende de un campo editable por Graph API con los mismos permisos delegados que el resto de la app).

### 3.3 Persistencia (listas de SharePoint)

El sitio de SharePoint (`estudiodemoda.sharepoint.com/sites/TransformacionDigital/IN/SA`) actúa como base de datos, con estas listas activas:

| Lista (display name) | Service | Propósito |
|---|---|---|
| `parkingslots` | `ParkingSlotsService` | Celdas de parqueo (Tipo Carro/Moto, Activa, Itinerancia) |
| `Colaboradores fijos` | `ColaboradoresFijosService` | Colaboradores con celda fija asignada |
| `reservations` | `ReservationsService` | Reservas de celda (fecha, turno, código, estado) |
| `usuariosparking` | `UsuariosParkingService` | Rol/permiso de cada usuario de la app |
| `settings` | `SettingsService` | Configuración global (horarios, T&C, días visibles, flag Pico y Placa) — un único registro fijo |
| `pico y placa` | `PicoYPlacaService` | Reglas de restricción vehicular por día/dígito |
| `RegistroVehicular` | `RegistroVehicularService` | Registro de vehículos reportados/inscritos |

Además, el grupo de Microsoft 365/Entra ID con GUID hardcodeado `79012669-3208-412c-bae2-97d79f5f5f15` (en `usuariosApp.tsx`) controla quién tiene "acceso a la app" a nivel de directorio (independiente de la lista `usuariosparking`) — dos mecanismos de control de acceso distintos y no sincronizados explícitamente entre sí.

Todos los ids de sitio/lista se resuelven una vez y se cachean en `localStorage` bajo la clave `sp:{hostname}{sitePath}:{listName}` (patrón "ensureIds", repetido en 7-8 servicios).

### 3.4 Despliegue

Dos workflows de GitHub Actions (`azure-static-web-apps-proud-mushroom-*.yml` y `...-purple-mushroom-*.yml`) despliegan **el mismo build** (`dist/`) a **dos Azure Static Web Apps distintas** en cada push a `main` (y en cada PR). No hay separación de entornos (staging/producción), ni paso de `lint`/`build` de verificación previo al deploy más allá del propio build de SWA, ni ejecución de tests (no existen).

## 4. Panorama de tamaño por capa (líneas de código)

| Carpeta | LOC aprox. | Nota |
|---|---|---|
| `src/Components/AdminCells` | 1801 | el módulo más grande, con mucho margen; contiene el componente `slotDetailsModal.tsx` (955 líneas) |
| `src/Hooks` | 2394 | 14 archivos, con duplicación estructural significativa |
| `src/Services` | 1683 | 13 archivos, alto nivel de código repetido (patrón `ensureIds`) |
| `src/Models` | 625 | 20 archivos, mezcla tipos + lógica + un hook duplicado |
| `src/auth` | 294 | dos implementaciones paralelas (una muerta) |
| `src/graph` | 226 | `GraphRest` + `GraphServicesContext` (DI) |
| `src/utils` | 213 | helpers puros, bajo nivel de deuda |
| `src/Ports` | 126 | solo cubre 2 de ~11 servicios |

## 5. Deuda técnica

Organizada por severidad/impacto. Cada punto fue verificado leyendo el código fuente completo de los archivos involucrados (no se listan sospechas sin evidencia).

### 5.1 Crítica — riesgos de seguridad y bugs funcionales activos

1. **Archivo `.env` versionado en git** (`git ls-files` lo confirma) con `VITE_AZURE_CLIENT_ID`, `VITE_AZURE_TENANT_ID`, `VITE_AZURE_REDIRECT_URI`, pese a que `.gitignore` excluye `.env` — fue forzado al repositorio en algún momento anterior. Estas variables, además, **no las usa el flujo de auth activo** (`src/auth/msal.ts` hardcodea el `clientId`/`authority` directamente en el código); solo las lee la implementación muerta `authContext.tsx`. Recomendación: purgar el archivo del historial si contiene algo sensible más allá de un Client ID público, y decidir una única fuente de verdad para la config de MSAL.
2. **HTML sin sanitizar renderizado con `dangerouslySetInnerHTML`**: el campo "Términos y Condiciones" se edita como texto libre en `AdminSettings.tsx` (sin sanitización al guardar) y se inyecta tal cual en el DOM desde `Components/Modals/modals.tsx` (sin sanitización al leer). Cualquier cuenta admin comprometida podría inyectar HTML/script ejecutado en el navegador de todo usuario que intente reservar.
3. **Condición de carrera en la creación de reservas** (`useReservar.ts`): el flujo es "verificar disponibilidad → crear" sin bloqueo/transacción; dos usuarios pueden reservar simultáneamente la misma celda/turno. El campo `Codigo` (consecutivo legible) se calcula contando **todas** las reservas existentes (`getAll({top: 20000})`) e incrementando — no es atómico y puede duplicarse bajo concurrencia. Hay además un segundo `+1` redundante en `ReservationsService.reservationCode`, generando un desfase adicional en la numeración.
4. **`RegistroVehicularService.create`/`update` están tipados contra el modelo equivocado** (`Colaboradoresfijos` en vez de `RegistroVehicularSP`) — TypeScript no puede detectar campos mal escritos en tiempo de compilación; es un bug de tipos con impacto real en runtime si los campos no coinciden.
5. **La regla de negocio de "Pico y Placa" no se aplica en ningún punto de la reserva.** La pantalla admin permite configurar qué dígitos de placa están restringidos por día, pero `useReservar.ts` nunca consulta esa lista — la restricción vehicular es puramente decorativa hoy.
6. **`ReservationsDisabledNotice`'s prop `compact` es un no-op** (`{compact ? '.' : '.'}` — ambas ramas retornan lo mismo) pese a que dos pantallas (`AdminCells`, `slotDetailsModal`) lo pasan esperando un render distinto.
7. **`useAdminCells.ts` invoca hooks de React de forma condicional** (`slotsSvc ? useCeldas(slotsSvc) : {...}`), violando las Reglas de los Hooks. Funciona hoy porque `ready` se estabiliza rápido, pero es una fuente latente de comportamiento indefinido si el ciclo de auth cambia.

### 5.2 Alta — duplicación estructural y decisiones de arquitectura

8. **Patrón `ensureIds`/caché/escape de OData duplicado literalmente en 7-8 servicios** (`Colaboradoresfijos`, `Log` (ver #9), `ParkingSlot`, `PicoPlaca`, `RegistroVehicular`, `Reservations`, `Setting`, `UsuariosParking`), sin una clase base compartida (`SharePointListRepository<T>`). Las copias ya divergieron entre sí (p. ej. `ParkingSlot.service.ts` agrega dos-puntos finales al *site path* que ninguno de los demás usa).
9. **`src/Services/Log.service.ts` es un duplicado byte-a-byte de `Colaboradoresfijos.service.ts`** (mismo hash MD5), exporta la misma clase `ColaboradoresFijosService`, y no tiene ninguna funcionalidad de logging pese a su nombre. No se usa en ningún lado — código muerto que además podría causar colisión de nombres de clase si algún día se importa.
10. **Tres a cuatro implementaciones independientes de cliente HTTP para Graph** coexisten junto al wrapper "oficial" `GraphRest`: `Services/GraphUsers.service.ts`, `Services/GruposCorreo.service.ts`, `Hooks/GraphUsers.ts` (casi idéntico al anterior) y un acceso directo con `as any` a un método privado de `GraphRest` en `User.Service.ts` para descargar la foto de perfil. La lógica de membresía de grupos de Azure AD está duplicada en al menos dos archivos que no se reutilizan entre sí.
11. **`Ports/` no es una capa de arquitectura consistente**: solo 2 de ~11 servicios (`PicoYPlacaService`, `SettingsService`) tienen un adaptador `*.port.ts`; el resto se consume directo desde componentes/hooks vía `useGraphServices()`. Además, `Ports/settingsPort.ts` construye un payload con un campo `TyC` que el modelo real de `SettingsService` nunca lee (usa `as any` para evitar el error de tipos) — el valor se escribe pero nunca se recupera, un bug de integridad de datos silenciado por el cast.
12. **Componente "todo en uno" de 955 líneas**: `Components/AdminCells/slotDetailsModal.tsx` maneja 4 flujos distintos (asignar/desasignar celda fija, reservar, editar celda, eliminar celda), instanciando sus propios servicios de Graph con constantes hardcodeadas (duplicando lo que ya expone `useGraphServices()`), con estilos 100% inline y arrays de dependencias de `useCallback` ajustados a mano e incorrectos.
13. **Módulo de creación de reservas duplicado, uno de los dos muerto**: `Components/Reservar/Reservar.tsx` (exportado como `Availability`) implementa un flujo completo de reserva pero **no está montado en ningún punto de `App.tsx`** — la UI real de reserva vive dentro de `AdminCells`/`slotDetailsModal.tsx`, que sí respeta el flag `RESERVATIONS_DISABLED` (cosa que `Reservar.tsx` ignora si algún día se remonta).
14. **Tres modales de "elegir colaborador del directorio + prellenar + validar + guardar" casi idénticos** (`ModalAgregarColaborador`, `ModalAgregarPermiso`, `ModalAgregarRegistro`) sin componente compartido — y aplicando la regla de "nombre genérico no permitido" (`nameProve`) de forma inconsistente (2 de 4 puntos de selección de trabajador la aplican, 2 no).
15. **Tres pantallas de "lista + filtro segmentado + búsqueda + tabla + paginación" casi idénticas** (`Colaboradores.tsx`, `usuariosApp.tsx`, `RegistroVehicular.tsx`) con la misma estructura pero ya divergentes (opciones de tamaño de página distintas: `[5]`, `[5]`, `[5,10,20]`).
16. **Modelos y Hooks con capas cruzadas**: `Models/Settings.ts` importa un tipo desde `Services/Setting.service.ts`, invirtiendo la dirección de dependencia esperada (Models no debería depender de Services). `Models/useCeldas.ts` es en realidad un **hook de React completo** (no un tipo), duplicado y desactualizado respecto a `Hooks/useCeldas.ts` real — vive en la carpeta equivocada y no se usa, pero podría importarse por error dado que comparte nombre con el hook real.

### 5.3 Media — inconsistencias y código muerto

17. **Archivos con nombre que no corresponde a su contenido**: `Hooks/usePicoPlaca.ts` en realidad exporta `useRecipients` (nada que ver con Pico y Placa — la lógica real de esa regla de negocio vive, sin usarse desde la pantalla que la necesita, en `Hooks/utils.ts`); `Hooks/GraphUsers.ts` exporta `useGroupMembers`; `Services/GraphUsers.service.ts` trae en su propio comentario de cabecera el nombre `GroupMembers.service.ts`.
18. **Dos hooks distintos llamados `useReporteria`** (`Hooks/reporteRegistro.ts` y `Hooks/useReportes.ts`), con estructura similar pero fuentes de datos distintas — solo se distinguen por el alias de import.
19. **`Components/ToggleSwitch/ToggleSwitch.tsx`** es la única implementación accesible (ARIA, teclado) de un switch en toda la app, y **no se usa en ningún lado** — mientras que la funcionalidad `toggleEstado` de `useCeldas` (activar/desactivar celda) existe en el hook pero nunca se expone en la UI de `AdminCells`.
20. **Paginación "decorativa" en `Mis-Reservas`**: los controles de página (`pageIndex`/`pageSize`) existen y calculan `hasNext`, pero la tabla siempre renderiza todas las filas obtenidas — cambiar de página dispara un refetch completo al servidor sin necesidad.
21. **`ToastProvider` cierra el toast al pasar el mouse por encima** (`onMouseEnter={() => remove(t.id)}`), el comportamiento inverso al patrón habitual de "pausar al pasar el mouse".
22. **Nombres de campo inconsistentes para el mismo concepto** entre modelos de distintas listas: "tipo de vehículo" aparece como `TipoCelda`, `TipoVeh`, `Tipodevehiculo` y `VehicleType` según el archivo; el campo `ID` es `string` en un modelo y `number` en otro, forzando *casts* defensivos en cada hook consumidor.
23. **`Models/UsuariosParking.ts` modela ~30 campos** (aparentemente copiados de un esquema autogenerado de Power Automate/Power Platform) **de los cuales el servicio solo usa 4** (`ID, Title, Rol, Permitidos`) — ruido significativo en el tipo.
24. Múltiples **mapeadores duplicados** para la misma conversión "reserva cruda → fila de UI" (`Reservation.ts::mapReservationToUI` vs. un `mapModelToUI` independiente dentro de `useMisReservas.ts`, y un tercer modelo de vista `Reportes.ts::ReservaUI` con nombres de campo distintos para el mismo dato).
25. Uso extendido de **`any`**: prácticamente todo `toModel(item: any)`, casts `as any` en payloads de creación/actualización, y varios `catch (e: any)` — no hay validación de esquema en tiempo de ejecución entre la respuesta cruda de Graph y el modelo tipado.

### 5.4 Baja — estilo, limpieza y comentarios muertos

26. Bloques comentados de código dejado en producción: implementación alterna de envío de correo en `RegistroVehicular.tsx` (con un typo `;2`), autocompletado de correo comentado en `ModalAgregarRegistro.tsx`.
27. `console.log`/`console.table`/`console.warn` de depuración en varios hooks de producción (`useReservar.ts`, `useMisReservas.ts`, `Reservations.service.ts`).
28. Props no usadas ("dead props"): `slots`/`slotsLoading` en `ModalAgregarColaborador`/`ModalAgregarPermiso`; botón para abrir `ModalVerColaborador` comentado en `Colaboradores.tsx` (el modal queda inalcanzable en producción).
29. Estilo inconsistente: mezcla de CSS Modules, clases globales sueltas y objetos de estilo inline (`slotDetailsModal.tsx`, `PicoPlaca.tsx`) dentro del mismo conjunto de pantallas.
30. Mensajes al usuario vía `alert()`/`window.confirm()` en vez del `ToastProvider` ya existente en la app (`admin-cells.tsx`, `slotDetailsModal.tsx`, `PicoPlaca.tsx`, confirmaciones de borrado en varias pantallas).
31. Sin capa de i18n: todos los textos están hardcodeados en español directamente en JSX — aceptable para una herramienta interna de un solo idioma, pero a tener en cuenta si se planea extender a otros países/idiomas.
32. Dos workflows de despliegue duplicados en `.github/workflows/` sin diferenciación de entorno.

## 6. Recomendaciones priorizadas

1. **Cerrar el hueco de seguridad de `dangerouslySetInnerHTML`** (sanitizar en guardado o en render con una librería como DOMPurify) y decidir qué hacer con el `.env` versionado.
2. **Arreglar la condición de carrera de reservas**: mover la generación de `Codigo` y la verificación de disponibilidad a una operación atómica del lado de Graph/SharePoint (o aceptar el riesgo documentándolo) antes de reactivar la creación de reservas.
3. **Extraer una clase base `SharePointListRepository`** para eliminar la duplicación de `ensureIds`/caché/escape en los 7+ servicios, y eliminar `Log.service.ts` y `Models/useCeldas.ts` (código muerto confirmado).
4. **Decidir una única implementación de autenticación** (eliminar `src/auth/authContext.tsx` si no se va a usar) y una única fuente de configuración de MSAL (env vars *o* hardcode, no ambas).
5. **Consolidar el patrón repetido "lista + filtro + búsqueda + paginación"** en un hook/componente compartido, y el patrón "elegir colaborador del directorio" en un componente reutilizable — reduciría ~3 archivos a 1 en cada caso y evitaría que seguir divergiendo.
6. **Decidir el futuro de `Reservar.tsx`** (código muerto) y de la regla de "Pico y Placa" (implementarla en `useReservar.ts` o remover la pantalla de configuración si no se va a aplicar).
7. Antes de cualquier refactor grande, **introducir un mínimo de pruebas automatizadas** (no existe ninguna hoy) sobre todo en `useReservar.ts` y los servicios con lógica de negocio (`PicoPlaca.ts`, `Reservations.service.ts`).

---
Ver el [índice de módulos](./modulos/README.md) para el detalle módulo por módulo (un `.md` por cada capa técnica y por cada carpeta de componente), con firmas, comportamiento y hallazgos puntuales por archivo.
