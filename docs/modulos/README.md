# Índice de módulos — Parking EDM

> Documentación técnica por módulo. Ver primero [../ARQUITECTURA.md](../ARQUITECTURA.md) para la visión general (stack, capas, flujo de auth, deuda técnica priorizada).

## Núcleo de la aplicación

| Módulo | Descripción |
|---|---|
| [Arranque de la app](./app-raiz.md) | `App.tsx`, `main.tsx` — composición raíz, pestañas, sesión y rol |
| [Autenticación](./auth.md) | `src/auth` — MSAL/Azure AD (implementación activa + implementación paralela sin usar) |
| [Capa Graph](./graph.md) | `src/graph` — `GraphRest` (cliente HTTP) y `GraphServicesContext` (DI de servicios) |
| [Servicios](./services.md) | `src/Services` — un repositorio por lista de SharePoint |
| [Ports](./ports.md) | `src/Ports` — adaptadores hacia forma de UI (solo 2 de ~11 servicios) |
| [Hooks](./hooks.md) | `src/Hooks` — estado de UI (loading/error/paginación) sobre los servicios |
| [Models](./models.md) | `src/Models` — tipos de dominio, modelos crudos de SharePoint y modelos de vista |
| [Utils](./utils.md) | `src/utils` — helpers puros (fechas, Excel, correo, color de estado) |

## Componentes — Administración

| Módulo | Descripción |
|---|---|
| [AdminCells](./components-admincells.md) | Pestaña "Celdas" — dashboard de capacidad, reserva rápida, detalle/asignación de celda (módulo más grande del proyecto) |
| [Admin-Settings](./components-admin-settings.md) | Pestaña "Administración" — días visibles, horarios, Términos y Condiciones |
| [Colaboradores-Permanentes](./components-colaboradores-permanentes.md) | Sub-tab "Colaboradores Fijos" |
| [AgregarColaborador](./components-agregar-colaborador.md) | Modal de alta de colaborador fijo |
| [DetallesColaborador](./components-detalles-colaborador.md) | Modal de solo lectura (hoy inalcanzable en producción) |
| [PermisosApp](./components-permisos-app.md) | Sub-tab "Usuarios APP" — membresía del grupo de acceso a la app |
| [AddGraphUsers](./components-add-graph-users.md) | Modal para otorgar acceso a la app |
| [RegistroVehicular](./components-registro-vehicular.md) | Sub-tab "Registro vehicular" |
| [AgregarRegistroVehicular](./components-agregar-registro-vehicular.md) | Modal de alta de registro vehicular |
| [Modals](./components-modals.md) | Modal de confirmación genérico (con Términos y Condiciones opcionales) |
| [ToggleSwitch](./components-toggle-switch.md) | Switch accesible genérico (sin uso actualmente) |

## Componentes — Reservas, Pico y Placa, Reportes y UI compartida

| Módulo | Descripción |
|---|---|
| [Mis-Reservas](./components-mis-reservas.md) | Tabla de reservas propias (o de todos, en modo admin) |
| [Reservar](./components-reservar.md) | Pantalla de creación de reserva — **no montada actualmente** |
| [PicoPlaca](./components-picoplaca.md) | Pestaña "Pico y placa" — reglas de restricción vehicular (hoy no aplicadas en la reserva) |
| [ReporteRegistros](./components-reporte-registros.md) | Reporte de registro vehicular |
| [Reportes](./components-reportes.md) | Pestaña "Reportes" (contenedor) — aforo de celdas + reporte de registro |
| [Notices](./components-notices.md) | Aviso y *feature flag* de reservas deshabilitadas |
| [Toast](./components-toast.md) | Sistema de notificaciones (toasts) de toda la app |

---
Para el resumen priorizado de deuda técnica (con severidad crítica/alta/media/baja) y recomendaciones, ver [../ARQUITECTURA.md §5](../ARQUITECTURA.md#5-deuda-técnica).
