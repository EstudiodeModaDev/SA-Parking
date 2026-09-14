# Módulo: Capa Graph (`src/graph`)

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Servicios](./services.md)

## `src/graph/GraphRest.ts`
Wrapper `fetch` genérico para Microsoft Graph API v1.0. Es la clase pensada como único cliente HTTP de la aplicación.

```ts
class GraphRest {
  constructor(getToken: () => Promise<string>, baseUrl?: string)
  get<T>(path, init?)
  post<T>(path, body, init?)
  patch<T>(path, body, init?)
  delete(path, init?)
}
```

El método privado `call()`:
- agrega `Authorization: Bearer <token>` (obtenido llamando a `getToken()` en cada request) y `Content-Type: application/json` si hay body,
- agrega el header `Prefer: HonorNonIndexedQueriesWarningMayFailRandomly` (permite que ciertas consultas OData no indexadas no fallen),
- maneja `204 No Content` devolviendo `undefined`,
- parsea la respuesta según `content-type` (JSON o texto), tolerando cuerpo vacío,
- ante error HTTP, intenta extraer `error.message` del cuerpo JSON de Graph y lanza un `Error` con mensaje detallado: `` `${method} ${path} → ${status} ${statusText}: ${detail}` ``.

## `src/graph/GraphServicesContext.tsx`
El punto central de *dependency injection* de la aplicación.

- `GraphSiteConfig`: `{hostname, sitePath, lists: {parkingSlots, colaboradoresFijos, reservations, usuariosParking, settings, picoYPlaca, registroVeh}}`, con valores por defecto en `DEFAULT_CONFIG` (línea 58): sitio `estudiodemoda.sharepoint.com/sites/TransformacionDigital/IN/SA`.
- `GraphServicesProvider`: crea un único `GraphRest` (memoizado sobre `getToken` del `AuthProvider`) y luego una instancia de cada `*Service` (memoizadas sobre `graph` + config), incluyendo `SharedServices`, que depende de `UsuariosParkingService` — la única composición explícita servicio→servicio realizada vía constructor.
- `useGraphServices(): GraphServices` — hook de consumo; lanza error si se usa fuera del provider.

Servicios expuestos: `graph, parkingSlots, colaboradoresFijos, reservations, usuariosParking, settings, picoYPlaca, shared, registroVeh`.

## Patrones de programación
- *Dependency Injection* vía React Context: un único punto (`GraphServicesProvider`) construye el grafo de dependencias de toda la capa de datos.
- Memoización agresiva (`useMemo`) para evitar recrear instancias de servicio en cada render.
- *Config override* opcional (`config?: Partial<GraphSiteConfig>`) permitiendo, en teoría, apuntar a otro sitio/listas sin tocar código — aunque en la práctica no se usa en ningún punto de montaje.

## Notas de calidad (deuda técnica)
- Los valores por defecto de `hostname`/`sitePath`/nombres de lista definidos aquí en `DEFAULT_CONFIG` **se repiten** como valores por defecto en el constructor de cada `*Service` individual (ver [Servicios](./services.md)) — dos fuentes de la misma configuración que podrían divergir si se edita una sin la otra.
- No hay actualmente ningún otro archivo que apunte a un sitio/lista distinto — el mecanismo de `config` override existe pero no se usa, es una capacidad no ejercitada.
- Además de `GraphRest`, existen 3-4 clientes HTTP independientes hacia Graph en otras partes del código (`Services/GraphUsers.service.ts`, `Services/GruposCorreo.service.ts`, `Hooks/GraphUsers.ts`, `Hooks/useWorkers.ts`, `Hooks/usePicoPlaca.ts`) que no pasan por `GraphRest` ni por este contexto — ver [Servicios](./services.md) y [Hooks](./hooks.md).
