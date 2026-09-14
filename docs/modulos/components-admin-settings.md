# Módulo: `Components/Admin-Settings` — Configuración global

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Servicios](./services.md) · [Ports](./ports.md)

Pestaña "Administración" (`selected === 'admin'` en `App.tsx`).

## `AdminSettings.tsx` (307 líneas)
`Props = {settingsSvc: SettingsService, settingsItemId?: string (default '1')}`.

Formulario de configuración global: número de días visibles para reservar (`VisibleDays`), Términos y Condiciones (textarea HTML libre), y horarios AM/PM (`InicioManana/FinalManana/InicioTarde/FinalTarde`, expuestos en el `FormState` con el nombre interno de SharePoint `InicioHorarioMa_x00f1_ana`/`FinalMa_x00f1_ana` — artefacto de codificación de "Mañana" que SharePoint genera cuando no puede usar tildes en el nombre interno de columna).

- Convierte valores de hora heterogéneos (numérico o texto tipo `"7:00 a. m."`) mediante un parser propio `fromHH` (líneas 29-59): quita espacios NBSP, normaliza variantes de `a.m./p.m.`, y cae a interpretación de 24 horas si no reconoce el formato.
- Renderiza inputs `<input type="time" step={3600}>` para las 4 horas, convirtiendo ida y vuelta con `toHH`/`fromHH` en cada cambio.
- Validación cliente: `horariosInvalid` exige `InicioAM < FinalAM` y `InicioTarde < FinalTarde`; deshabilita "Guardar" si no se cumple, con mensaje de advertencia inline.
- `save()` mapea el formulario de vuelta al campo real `TerminosyCondiciones` y llama `settingsSvc.update(...)`.

## Patrones de programación
- Helpers puros de parseo/formateo (`clamp`, `clampHour`, `toHH`, `fromHH`) definidos a nivel de módulo (no dentro de handlers JSX) — testeables de forma aislada, aunque por su naturaleza (parsing de convenciones de SharePoint) encajarían mejor en `Models/time.ts` o un util dedicado.
- Componente pequeño, de una sola responsabilidad — uno de los más contenidos del proyecto.

## Notas de calidad (deuda técnica)
- `row: any` al leer el ítem cargado desde el servicio (línea 85) — sin tipo real pese a que `SettingsService` sí está tipado.
- El artefacto de SharePoint `Ma_x00f1_ana` se filtra directamente hasta el tipo `FormState` y a los `id` de JSX, en vez de quedar aislado detrás de una capa de mapeo — ver también [Models — `Settings.ts`](./models.md).
- El campo `TyC` (Términos y Condiciones) se guarda **sin sanitizar**, y se renderiza después vía `dangerouslySetInnerHTML` en [`Components/Modals/modals.tsx`](./components-modals.md) — riesgo de XSS almacenado si una cuenta admin se ve comprometida. Ver [ARQUITECTURA.md §5.1, punto 2](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos).
- Sin capa de i18n (textos y tooltips hardcodeados en español), consistente con el resto de la app.
