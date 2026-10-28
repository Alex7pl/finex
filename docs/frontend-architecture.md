# Arquitectura frontend de FineX

## Decisión

FineX usa React Router en modo framework como **Backend For Frontend (BFF)**.
Express continúa siendo el backend de negocio y el único propietario de la
base de datos, autorización, tokens y reglas financieras. El navegador no llama
directamente a Express: loaders y actions de React Router adaptan la API para la
interfaz web.

```text
Navegador
    │ mismo origen: páginas, formularios y navegación
    ▼
React Router BFF
    │ red interna: JSON + Cookie/Set-Cookie
    ▼
Express API
    ▼
Servicios, repositorios y PostgreSQL
```

Esta frontera es una regla del proyecto. Una excepción debe quedar justificada
en una decisión de arquitectura antes de introducir llamadas directas desde el
navegador al API.

`scripts/check-web-architecture.mjs` aplica la frontera automáticamente durante
test, typecheck y build: rechaza `VITE_API_URL`, módulos `*.api.ts` públicos y
usos de `fetch` fuera de código `.server.ts`.

## Responsabilidades

### Navegador y componentes React

- Renderizan datos recibidos por rutas.
- Mantienen estado visual efímero: paneles, foco o visibilidad de contraseña.
- Envían mutations mediante `Form`, `fetcher.Form` o `fetcher.submit`.
- No conocen `API_URL`, tokens ni endpoints internos de Express.
- No implementan refresh de sesión.

### Rutas React Router

- `loader`: lee datos mediante módulos de API `.server.ts`.
- `action`: procesa formularios y ejecuta mutations mediante `routeAction`.
- Propaga los headers devueltos por el módulo de API.
- Convierte errores técnicos con `routeHandler`.
- Compone módulos y componentes; no contiene reglas de negocio.

### Módulos de frontend

- Encapsulan un dominio: `auth`, `transactions`, `accounts`, `budgets`.
- Los archivos `*.api.server.ts` hablan con Express y validan sus respuestas.
- Los archivos `*.action.server.ts` procesan un caso de uso de formulario.
- `components/` contiene la UI propia del dominio.
- La validación compartida se importa desde `@finex/shared` cuando sea posible.

### Express API

- Autentica y autoriza.
- Ejecuta reglas de negocio.
- Emite y rota cookies de sesión.
- Accede a base de datos y servicios externos.
- Devuelve contratos estables definidos en `@finex/shared`.

## Flujo HTTP y sesión

`app/libs/http.server.ts` es la única infraestructura HTTP para hablar con
Express desde la web.

1. Acepta solo rutas bajo el `API_URL` configurado.
2. Reenvía el header `Cookie` de la petición web.
3. Envía a Express el origen público de la petición web.
4. Recoge todos los headers `Set-Cookie` de Express.
5. Ante un `401`, hace un solo refresh y reintenta con las cookies rotadas.
6. Devuelve `{ data, headers }` para que la ruta responda al navegador.
7. Si falla, `ApiError` conserva los headers; así también se propagan cookies
   borradas por una sesión inválida.

Nunca se debe convertir esta API en una función que devuelva solamente el JSON:
perder los headers rompería login, logout y rotación de sesión.

Las mutations usan `routeAction`, que valida `Origin`/`Referer` contra el origen
de la petición antes de ejecutar el caso de uso. Los loaders, que no mutan
estado, usan `routeHandler`.

## Organización

```text
apps/web/app/
├── routes.ts
├── routes/
│   └── home.tsx
├── modules/
│   └── auth/
│       ├── auth.api.server.ts
│       ├── auth.action.server.ts
│       ├── auth.types.ts
│       ├── auth.validation.ts
│       └── components/
├── components/
│   └── ui/
└── libs/
    ├── api-error.ts
    ├── http.server.ts
    ├── route-handler.server.ts
    └── notifications.ts
```

Los sufijos `.server.ts` son obligatorios para código que conozca Express,
`API_URL`, cookies o credenciales. Evitan incorporarlo al bundle del navegador.

## Patrón para un módulo nuevo

El cliente del dominio conserva tanto el dato validado como los headers:

```ts
// modules/transactions/transactions.api.server.ts
import { serverHttp } from "@/libs/http.server.js";
import { ApiError } from "@/libs/api-error.js";
import { Schema } from "effect";
import { TransactionDto } from "@finex/shared/transactions/transactions.schema.js";

export async function getTransactions(request: Request) {
  const result = await serverHttp<unknown>("/transactions", { request });

  try {
    return {
      data: Schema.decodeUnknownSync(Schema.Array(TransactionDto))(result.data),
      headers: result.headers,
    };
  } catch {
    throw new ApiError(502, "InvalidApiResponse", undefined, result.headers);
  }
}
```

La ruta se limita a orquestar y propagar la respuesta:

```tsx
// routes/transactions.tsx
import { data } from "react-router";
import { routeHandler } from "@/libs/route-handler.server.js";
import { getTransactions } from "@/modules/transactions/transactions.api.server.js";
import type { Route } from "./+types/transactions";

export const loader = routeHandler(async ({ request }: Route.LoaderArgs) => {
  const result = await getTransactions(request);
  return data({ transactions: result.data }, { headers: result.headers });
});

export default function Transactions({ loaderData }: Route.ComponentProps) {
  return <TransactionList transactions={loaderData.transactions} />;
}
```

Una mutation usa `routeAction`, no `clientAction`:

```ts
export const action = routeAction(async ({ request }: Route.ActionArgs) => {
  const input = await parseTransactionForm(request);
  const result = await createTransaction(input, request);
  return data({ transaction: result.data }, { headers: result.headers });
});
```

`clientLoader` y `clientAction` quedan reservados para datos exclusivamente
locales del navegador, como IndexedDB o una API de navegador. No se usan para
llamar a Express.

## Estado React

- Datos remotos: `loaderData`, `actionData`, `useFetcher` y revalidación.
- Filtros, búsqueda, orden y paginación: URL/search params.
- Estado visual temporal: `useState` en el propietario más cercano.
- Preferencias persistentes: cookie o backend, según el caso.
- No añadir Redux, Zustand o una caché cliente sin una necesidad demostrada que
  React Router no cubra.

## Rutas privadas

El loader de `/dashboard` se autentica mediante `GET /users/me`, conserva las
cookies de sesión y las reutiliza en sus consultas posteriores. `AuthLayout`
compone el `Outlet` y no lanza una segunda comprobación paralela de sesión.

Cada nuevo loader/action privado debe proteger su propia petición: React Router
puede ejecutar loaders padre e hijo en paralelo. Las mutations siguen pasando
por `routeAction` y por la autorización de Express. El refresh compartido de
`http.server.ts` evita rotaciones duplicadas dentro del mismo cliente BFF.

La conexión del dashboard, sus filtros y las APIs utilizadas se documentan en
[dashboard-api-integration.md](dashboard-api-integration.md).

## Configuración

- Web/BFF: `API_URL`, por defecto `http://localhost:3000`.
- Express: `WEB_ORIGIN`, por defecto `http://localhost:5173`.
- `API_URL` es solo de servidor y nunca debe usar el prefijo `VITE_`.
- En producción, Express debería estar en una red interna o aceptar tráfico
  únicamente del BFF.

## Pruebas obligatorias

Cada módulo nuevo debe cubrir:

- Decodificación del DTO compartido.
- Propagación de `Cookie` y `Set-Cookie` cuando aplique.
- Validación y normalización del formulario.
- Traducción de errores esperados a feedback seguro.
- Conversión de errores inesperados en `ApiError`/route error.
- Rechazo de mutations con origen ausente o ajeno.

Antes de entregar:

```bash
pnpm --filter @finex/web test
pnpm --filter @finex/web typecheck
pnpm --filter @finex/web build
```

## Checklist de revisión

- [ ] El navegador no llama directamente a Express.
- [ ] Los módulos que conocen el API terminan en `.server.ts`.
- [ ] `pnpm --filter @finex/web check:architecture` pasa.
- [ ] La respuesta de API conserva `{ data, headers }`.
- [ ] Los DTO se validan con Effect Schema.
- [ ] Los loaders usan `routeHandler`.
- [ ] Las mutations usan `routeAction`.
- [ ] La ruta solo orquesta; el caso de uso vive en su módulo.
- [ ] Los componentes no conocen cookies, tokens ni `API_URL`.
- [ ] Los filtros compartibles viven en la URL.
- [ ] Tests, TypeScript y build pasan.
