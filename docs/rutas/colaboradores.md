# Página `colaboradores`

[← Rutas y páginas](../rutas.md) · [Flujo de datos](../flujo-de-datos.md)

Administración de las personas que usan el parqueadero. La página tiene tres pestañas, controladas por `useVistaColaboradores`:

- **Colaboradores fijos:** personas con celda asignada de forma permanente.
- **Usuarios app:** miembros del grupo de Microsoft que pueden entrar a la app con rol `Usuario`.
- **Registro vehicular:** vehículos registrados en la institución.

**Ruta:** `/colaboradores` · **Roles:** Admin · **Layout:** `MainLayout`

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| [pages/Colaboradores.tsx](../../src/pages/Colaboradores.tsx) | Encabezado y pestañas. |
| [components/vistaAdmin/colaboradores/colaboradoresFijos.component.tsx](../../src/components/vistaAdmin/colaboradores/colaboradoresFijos.component.tsx) | Formulario y tabla de colaboradores fijos. |
| [components/vistaAdmin/colaboradores/usuariosApp.comoponent.tsx](../../src/components/vistaAdmin/colaboradores/usuariosApp.comoponent.tsx) | Búsqueda, alta y baja de usuarios del grupo. |
| [components/vistaAdmin/colaboradores/registroVehicular.component.tsx](../../src/components/vistaAdmin/colaboradores/registroVehicular.component.tsx) | Formulario y tabla del registro vehicular. |
| [hooks/useColaboradores.ts](../../src/hooks/useColaboradores.ts) | Consultas y mutaciones de las tres pestañas. |
| [hooks/useVistaColaboradores.ts](../../src/hooks/useVistaColaboradores.ts) | Pestaña activa. |
| [services/colaboradores.service.ts](../../src/services/colaboradores.service.ts) | `colaboradoresFijosService`, `usuariosApp`, `registroVeh`. |
| [types/colaboradores.ts](../../src/types/colaboradores.ts) | `colaboradoresFijos`, `usermailList`, `registroVehicular`. |

## Pestaña Colaboradores fijos

- **Componentes:** `FormNuevoColaboradorFijo` y `ColaboradoresFijos` — [colaboradoresFijos.component.tsx:24](../../src/components/vistaAdmin/colaboradores/colaboradoresFijos.component.tsx#L24)
- **Lógica:** al crear, la placa se guarda en mayúsculas y el correo sin espacios. El formulario se limpia solo si se crea.

| Acción | Hook | Endpoint |
| --- | --- | --- |
| Listar | `useColaboradores` | `GET /colaboradores/fijos` |
| Crear | `useCreateColaborador` | `POST /colaboradores/createFijo` |
| Eliminar | `useDeleteColaborador` | `DELETE /colaboradores/deleteFijo/:id` |

**Modelo `colaboradoresFijos`:** `ID`, `Title` (nombre), `Correo`, `TipoVehiculo` (`Carro`/`Moto`), `Placa`, `CodigoCelda`, `SpotAsignado` (código real de la celda).

## Pestaña Usuarios app

- **Componente:** `UsuariosApp` — [usuariosApp.comoponent.tsx:19](../../src/components/vistaAdmin/colaboradores/usuariosApp.comoponent.tsx#L19)
- **Lógica:**
  - La búsqueda filtra por nombre, sin distinguir mayúsculas ni tildes, al enviar el formulario. Al vaciar el campo se muestra de nuevo la lista completa.
  - **Agregar** abre un popup que pide el correo; se envía en minúsculas y sin espacios.
  - Al eliminar un usuario se limpia el filtro para mostrar la lista actualizada.
- **Efecto en el acceso:** quien está en este grupo obtiene rol `Usuario` y puede entrar a [Mi reserva](mi-reserva.md). Quien no está (ni en la lista de usuarios de la app) ve [`/sin-acceso`](login.md#sin-acceso).

| Acción | Hook | Endpoint |
| --- | --- | --- |
| Listar | `useUserMailList` | `GET /colaboradores/mailList` |
| Agregar | `useAddToMail` | `POST /colaboradores/addUser?email=` |
| Quitar | `useRemoveFromMail` | `DELETE /colaboradores/remove?email=` |

**Modelo `usermailList`:** `id`, `displayName`, `jobTitle`, `mail`.

## Pestaña Registro vehicular

- **Componentes:** `FormNuevoRegistro` y `RegistroVehicular` — [registroVehicular.component.tsx:23](../../src/components/vistaAdmin/colaboradores/registroVehicular.component.tsx#L23)
- **Lógica:** al crear, nombre y cédula se guardan sin espacios sobrantes, la placa en mayúsculas y el correo en minúsculas. El formulario se limpia solo si se crea.

| Acción | Hook | Endpoint |
| --- | --- | --- |
| Listar | `useGetVehiculos` | `GET /registro-vehicular` |
| Crear | `useCreateVehiculo` | `POST /registro-vehicular/create` |
| Eliminar | `useDeleteVehiculo` | `DELETE /registro-vehicular/delete/:id` |

**Modelo `registroVehicular`:** `ID`, `Title` (nombre), `Cedula`, `TipoVeh` (`Carro`/`Moto`), `PlacaVeh`, `CorreoReporte`.

---

[← Página `celdas`](celdas.md) | [Página `configuraciones` →](configuraciones.md)
