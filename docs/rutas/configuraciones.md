# Página `configuraciones`

[← Rutas y páginas](../rutas.md) · [Flujo de datos](../flujo-de-datos.md)

Configuración general del parqueadero. Los valores que se guardan aquí afectan al resto de la app: los horarios definen los turnos que se muestran al reservar y el turno actual del AppBar, y los días visibles limitan las fechas que se pueden reservar.

**Ruta:** `/configuraciones` · **Roles:** Admin · **Layout:** `MainLayout`

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| [pages/Configuration.tsx](../../src/pages/Configuration.tsx) | Formulario de configuración. |
| [hooks/useSettings.ts](../../src/hooks/useSettings.ts) | `useSettings` y `useEditSettings`. |
| [hooks/useTurnoActual.ts](../../src/hooks/useTurnoActual.ts) | Turno actual a partir de los horarios. |
| [services/settings.service.ts](../../src/services/settings.service.ts) | Llamadas a `/settings`. |
| [types/settings.ts](../../src/types/settings.ts) | `settings`. |

## Formulario

- **Página:** `Configuration` — [Configuration.tsx:15](../../src/pages/Configuration.tsx#L15)
- **Lógica:**
  - `useSettings` trae la configuración (`GET /settings/get`); la app usa siempre el primer ítem (`settings[0]`).
  - Mientras carga muestra un spinner; si falla o no hay configuración, muestra el mensaje correspondiente.
  - Al enviar, lee los campos con `FormData` y llama a `useEditSettings` (`PUT /settings/put`). Notifica el éxito o el error.

| Sección | Campo del formulario | Campo de `settings` |
| --- | --- | --- |
| Parámetros de reserva | Contador de días (botones − / +) | `VisibleDays` |
| Términos y condiciones | `TyC` | `TerminosyCondiciones` |
| Turno mañana | `inicioManana`, `finalManana` | `InicioHorarioMa_x00f1_ana`, `FinalMa_x00f1_ana` |
| Turno tarde | `inicioTarde`, `finalTarde` | `InicioTarde`, `FinalTarde` |
| — | — | `PicoPlaca` (siempre se envía `false`) |

> Los nombres `InicioHorarioMa_x00f1_ana` y `FinalMa_x00f1_ana` son los nombres internos de SharePoint para las columnas con "ñ".

## Dónde se usa la configuración

| Valor | Uso |
| --- | --- |
| `VisibleDays` | Fecha máxima de los selectores de fecha en [Mi reserva](mi-reserva.md) y [Celdas](celdas.md) (`sumarDias(VisibleDays)`). La mínima siempre es mañana. |
| Horarios de turnos | Texto de los turnos en los formularios y tablas de reservas; turno actual del AppBar (`useTurnoActual`, hora de Bogotá, intervalo `[inicio, fin)`). |
| `TerminosyCondiciones` | Popup que el usuario debe aceptar antes de reservar en [Mi reserva](mi-reserva.md). |

## Modelo `settings`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | string (opcional) | ID del ítem. |
| `VisibleDays` | string | Días hacia adelante que se pueden reservar. |
| `InicioHorarioMa_x00f1_ana` | string (`HH:mm`) | Inicio del turno mañana. |
| `FinalMa_x00f1_ana` | string (`HH:mm`) | Fin del turno mañana. |
| `InicioTarde` | string (`HH:mm`) | Inicio del turno tarde. |
| `FinalTarde` | string (`HH:mm`) | Fin del turno tarde. |
| `TerminosyCondiciones` | string | Texto de términos y condiciones. |
| `PicoPlaca` | boolean | Reservado; hoy no se edita desde la app. |

---

[← Página `colaboradores`](colaboradores.md) | [Página `mi-reserva` →](mi-reserva.md)
