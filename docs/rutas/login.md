# Página `login`

[← Rutas y páginas](../rutas.md) · [Flujo de datos](../flujo-de-datos.md)

Inicio de sesión con la cuenta corporativa de Microsoft y pantallas de mensaje para usuarios sin acceso o rutas inexistentes. Son las únicas rutas que no están dentro de `RequireAuth`.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| [pages/Login.tsx](../../src/pages/Login.tsx) | Pantalla de inicio de sesión. |
| [components/mensajeVolver.component.tsx](../../src/components/mensajeVolver.component.tsx) | Mensaje con botón "Volver" (usado en `sin-acceso` y en la 404). |
| [auth/msal.ts](../../src/auth/msal.ts) | Configuración de MSAL. |
| [auth/redirectByRole.tsx](../../src/auth/redirectByRole.tsx) | Redirección posterior al login según el rol. |

## `/login`

- **Componente:** `Login` — [Login.tsx:20](../../src/pages/Login.tsx#L20)
- **Lógica:**
  - Si el usuario ya está autenticado, redirige a `/` (y de ahí `RedirectByRole` lo lleva a su página).
  - El botón **Iniciar sesión con Microsoft** llama a `instance.loginRedirect` con el scope `VITE_AZURE_API_SCOPE`. Se deshabilita mientras MSAL tiene una interacción en curso.
  - Al volver de Microsoft, [main.tsx](../../src/main.tsx) procesa la respuesta y deja la cuenta activa (ver [flujo de datos](../flujo-de-datos.md#1-arranque-de-la-app)).
- **Backend:** ninguno.

## Después del login: `/`

`RedirectByRole` pide `GET /usuarios/getRole`:

| Resultado | Destino |
| --- | --- |
| `Admin` | `/reserva` |
| `Usuario` | `/mi-reserva` |
| Error (401) o rol vacío/desconocido | `/sin-acceso` |

## `/sin-acceso`

- **Componente:** `MensajeVolver` con `cerrarSesion` — [router.tsx:18](../../src/router.tsx#L18)
- **Lógica:** el botón **Volver** hace `logoutRedirect` y vuelve a `/login`. Cerrar la sesión evita el bucle `login → / → sin-acceso` que ocurriría si la sesión de Microsoft siguiera activa.
- **Cuándo aparece:** cuando el backend no encuentra al usuario en la lista de usuarios de la app ni en el grupo de Microsoft. Para darle acceso, un administrador debe agregarlo en [Colaboradores › Usuarios app](colaboradores.md#pestaña-usuarios-app).

## Página no encontrada

- **Ruta:** `*` — [router.tsx:46](../../src/router.tsx#L46)
- **Lógica:** `MensajeVolver` sin `cerrarSesion`; el botón navega a `/login`.

## Cerrar sesión

El botón de salida de [layouts/adminAppBar.tsx](../../src/layouts/adminAppBar.tsx#L12) (presente en todas las páginas protegidas) llama a `logoutRedirect` con `postLogoutRedirectUri = <origen>/login`.

---

[← Flujo de datos](../flujo-de-datos.md) | [Página `reserva` →](reservas.md)
