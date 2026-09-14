# Módulo: `Components/Toast` — Notificaciones (toasts)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Models (`toast.ts`)](./models.md) · [Arranque de la app](./app-raiz.md)

## `ToastProvider.tsx` (63 líneas)
Sistema de notificaciones de toda la app, vía Context + `createPortal` a `document.body`. Se monta envolviendo toda la app autenticada en `App.tsx` (`<ToastProvider>...</ToastProvider>`), por lo que `useToast()` está disponible para cualquier descendiente.

- `ToastProvider: React.FC<{children}>`. Estado: `toasts: Toast[]` (tipo en [`Models/toast.ts`](./models.md)).
- `useToast()` expone `{show, success, error, info}` (todos con `duration` opcional).
- `push()` genera un id (`crypto.randomUUID?.() ?? String(Date.now()+Math.random())`, con *fallback* razonable), agrega el toast al estado, y agenda su remoción vía un `window.setTimeout` **independiente por toast** (no hay una cola ni límite de cantidad simultánea). Duración por defecto: 3500 ms (`show`/`info`/`success`), 4500 ms para `error`.
- Render vía `createPortal` a `document.body` — patrón correcto para una capa de notificación global que debe escapar de cualquier `overflow`/`z-index` local.

## Patrones de programación
Context + Portal, actualizaciones funcionales de estado (`setToasts(ts => ...)`), valor de contexto memoizado (`useMemo`) atado a `push` (`useCallback`).

## Notas de calidad (deuda técnica)
- **Comportamiento a validar con producto**: `onMouseEnter={() => remove(t.id)}` (línea 52, con comentario `/* opcional: cerrar al hover */`) **cierra** el toast en cuanto el mouse entra, el inverso del patrón habitual de "pausar el autodescarte al pasar el mouse por encima" (que normalmente sirve para dar tiempo a leer el mensaje).
- Sin de-duplicación: llamar `toast.error()` repetidamente (p. ej. en un bucle de reintentos) apila un toast nuevo cada vez.
- No hay limpieza de los `setTimeout` pendientes si el provider se desmonta (poco probable dado el ciclo de vida de esta app, pero no es una implementación defensiva).
- Es, junto con [`utils`](./utils.md), uno de los módulos con menor deuda técnica del proyecto — sin tipado `any`, sin código muerto.
