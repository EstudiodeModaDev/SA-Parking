# Módulo: Autenticación (`src/auth`)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md)

Este módulo integra la app con Azure AD (Entra ID) vía MSAL (`@azure/msal-browser`). Contiene **dos implementaciones paralelas**; solo una está activa.

## `src/auth/msal.ts` — implementación activa (bajo nivel)
Instancia única de `PublicClientApplication` con `clientId`/`authority` **hardcodeados** directamente en el código (no usa variables de entorno). `cache.cacheLocation = 'localStorage'`.

`SCOPES` solicitados: `openid, profile, email, User.Read, Sites.ReadWrite.All, Directory.Read.All, Mail.Send` (con `Group.ReadWrite.All` dejado comentado).

Funciones exportadas:
- `initMSAL()`: inicializa MSAL una sola vez (guard `initialized`).
- `ensureActiveAccount()`: garantiza que siempre haya una "active account" seleccionada en MSAL.
- `ensureLogin(): Promise<AccountInfo>`: login interactivo vía **popup** (`msal.loginPopup`).
- `getAccessToken(): Promise<string>`: intenta `acquireTokenSilent`; si requiere interacción (`InteractionRequiredAuthError`), hace *fallback* a `acquireTokenPopup`.
- `logout()`: `msal.logoutPopup`.

## `src/auth/AuthProvider.tsx` — implementación activa (contexto React)
Contexto React que envuelve `msal.ts` y es el que efectivamente consume el resto de la app vía `useAuth()`:
```ts
type AuthCtx = { ready, account, getToken, signIn, signOut };
```
No fuerza login automático al montar — solo inicializa MSAL (`initMSAL()`) y deja `ready = true`; el login ocurre cuando el usuario pulsa "Iniciar sesión" en `App.tsx`.

## `src/auth/authContext.tsx` — **implementación paralela sin usar (código muerto)**
Segundo archivo con una implementación de auth completa e independiente:
- Instancia propia de `PublicClientApplication`.
- Lee configuración desde variables de entorno `import.meta.env.VITE_AAD_TENANT_ID` / `VITE_AAD_CLIENT_ID` / `VITE_AAD_REDIRECT_URI` (que sí existen en el `.env` versionado del repo, pero no las usa nadie más).
- Usa flujo de **redirect** (`loginRedirect`/`acquireTokenRedirect`) en vez de popup.
- Define su propio `useAuth()`/`AuthProvider` con la **misma firma pública** (`ready, account, getToken`) que la versión activa, más `logout` en vez de `signIn`/`signOut`.

Ningún componente de la app importa este archivo — se verificó por búsqueda en todo `src/`. Es la implementación "descartada" de un rediseño de auth que no se completó ni se limpió.

## Patrones de programación
- Context + hook de consumo (`useAuth()`) con guard de error si se usa fuera del provider — patrón estándar repetido en otros contextos de la app (`GraphServicesContext`, `ToastProvider`).
- `useMemo`/`useCallback` para mantener estable la identidad de `value` del contexto entre renders.

## Notas de calidad (deuda técnica)
- Tener dos implementaciones de auth completas y con la misma interfaz pública es una fuente de confusión para cualquier persona nueva en el proyecto: hay que verificar cuál se usa realmente (`AuthProvider.tsx`, importado desde `main.tsx`) antes de tocar código de sesión.
- El archivo `.env` versionado en git alimenta únicamente a la implementación muerta (`authContext.tsx`) — ver [ARQUITECTURA.md §5.1, punto 1](../ARQUITECTURA.md#51-crítica--riesgos-de-seguridad-y-bugs-funcionales-activos).
- Recomendación: eliminar `authContext.tsx` si no hay planes de migrar a flujo *redirect*, o documentar por qué se mantiene.
