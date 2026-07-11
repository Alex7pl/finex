# Developer Guide — Finex

Stack: **Effect + Express 5 + Drizzle + React Router v7 + pnpm workspaces**

---

## Regla de oro: `@finex/shared`

Trata `packages/shared` como un paquete npm. Nunca importes desde `/src/`.

```ts
// ✅ CORRECTO — importa desde dist/ vía exports map
import { LoginInput } from "@finex/shared/auth/auth.schema.js";

// ❌ INCORRECTO — cruza la frontera del paquete
import { LoginInput } from "@finex/shared/src/auth/auth.schema";
```

Cada vez que añadas un archivo a `packages/shared/src/`, debes compilar:

```bash
cd packages/shared && pnpm build
```

---

## Estructura de un módulo

### Backend (`apps/api/src/modules/{module}/`)

```
{module}.router.ts      ← rutas + handlers inline (Express)
{module}.service.ts     ← lógica de negocio (Effect puro)
{module}.repository.ts  ← acceso a BD (Effect + Drizzle)
```

### Shared (`packages/shared/src/{module}/`)

```
{module}.schema.ts      ← inputs y DTOs (Effect Schema)
{module}.errors.ts      ← errores de dominio (TaggedError)
```

### Frontend (`apps/web/app/`)

```
routes/{module}.tsx                   ← page: loader + action + componente
modules/{module}/{module}.api.ts      ← fetch al API con validación de respuesta
modules/{module}/components/*.tsx     ← componentes presentacionales
```

---

## Backend — paso a paso

### 1. DB Schema (`apps/api/src/db/schema/{module}.ts`)

```ts
import { pgTable, varchar } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns, moneyColumn } from "../helpers.js";
import { users } from "./users.js";

export const transactions = pgTable("transactions", {
  ...idColumn,                                              // id: uuid (uuidv7, PK)
  userId:      varchar("user_id").notNull().references(() => users.id),
  description: varchar("description").notNull(),
  amount:      moneyColumn("amount").notNull(),             // numeric(12,2)
  ...timestampColumns,                                      // created_at, updated_at
});
```

Registra la tabla en `apps/api/src/db/schema/index.ts`.

---

### 2. Shared — Schema y errores

**`packages/shared/src/{module}/{module}.schema.ts`**

```ts
import { Schema } from "effect";

// Lo que el cliente envía
export class CreateTransactionInput extends Schema.Class<CreateTransactionInput>(
  "CreateTransactionInput",
)({
  description: Schema.String,
  amount:      Schema.Number,
  date:        Schema.Date,
}) {}

// Lo que la API devuelve
export class TransactionDto extends Schema.Class<TransactionDto>(
  "TransactionDto",
)({
  id:          Schema.String,
  description: Schema.String,
  amount:      Schema.Number,
  date:        Schema.Date,
  created_at:  Schema.Date,
}) {}
```

**`packages/shared/src/{module}/{module}.errors.ts`**

```ts
import { Schema } from "effect";

export class TransactionNotFound extends Schema.TaggedError<TransactionNotFound>()(
  "TransactionNotFound",
  { id: Schema.String },
) {}
```

Añade el error nuevo al `STATUS` map de `apps/api/src/middleware/make-handler.ts`:

```ts
const STATUS: Record<AppError["_tag"], number> = {
  UnauthorizedError:    401,
  ValidationError:      400,
  TransactionNotFound:  404,  // ← añadir aquí
};
```

Y a la unión `AppError`:

```ts
type AppError = UnauthorizedError | ValidationError | TransactionNotFound;
```

Después de modificar shared:

```bash
cd packages/shared && pnpm build
```

---

### 3. Repository (`apps/api/src/modules/{module}/{module}.repository.ts`)

Solo habla con la BD. Sin lógica de negocio.

```ts
import { Context, Effect } from "effect";
import { DatabaseService } from "../../db/db.service.js";
import { transactions } from "../../db/schema/transactions.js";
import { eq } from "drizzle-orm";
import type { TransactionDto } from "@finex/shared/transactions/transactions.schema.js";

// 1. Definir el tag (interfaz del repositorio)
export class TransactionsRepository extends Context.Tag(
  "TransactionsRepository",
)<
  TransactionsRepository,
  {
    findAllByUser: (userId: string) => Effect.Effect<TransactionDto[]>;
    create: (data: {
      userId: string;
      description: string;
      amount: number;
      date: Date;
    }) => Effect.Effect<TransactionDto>;
  }
>() {}

// 2. Implementación concreta
export const TransactionsRepositoryLive = TransactionsRepository.of({
  findAllByUser: (userId) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService;
      return yield* Effect.promise(() =>
        db.select().from(transactions).where(eq(transactions.userId, userId)),
      );
    }),

  create: (data) =>
    Effect.gen(function* () {
      const db = yield* DatabaseService;
      const [row] = yield* Effect.promise(() =>
        db.insert(transactions).values(data).returning(),
      );
      return row;
    }),
});

// 3. Layer para inyección
import { Layer } from "effect";
export const TransactionsRepositoryLayer = Layer.succeed(
  TransactionsRepository,
  TransactionsRepositoryLive,
);
```

Añade el layer al `AppLayer` en `apps/api/src/runtime/app-layer.ts`:

```ts
export const AppLayer = Layer.mergeAll(
  DatabaseLayer,
  TransactionsRepositoryLayer,
);
```

---

### 4. Service (`apps/api/src/modules/{module}/{module}.service.ts`)

Lógica de negocio pura. Usa Context tags — no importa implementaciones concretas.

```ts
import { Effect } from "effect";
import { Schema } from "effect";
import { CurrentUser } from "../../runtime/request-context.js";
import { TransactionsRepository } from "./transactions.repository.js";
import {
  CreateTransactionInput,
  TransactionDto,
} from "@finex/shared/transactions/transactions.schema.js";
import { ValidationError } from "@finex/shared/errors.js";

export function getMyTransactions(): Effect.Effect<
  TransactionDto[],
  never,
  CurrentUser | TransactionsRepository
> {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* TransactionsRepository;
    return yield* repo.findAllByUser(user.id);
  });
}

export function createTransaction(
  raw: unknown,
): Effect.Effect<
  TransactionDto,
  ValidationError,
  CurrentUser | TransactionsRepository
> {
  return Effect.gen(function* () {
    // Validar input con Effect Schema
    const input = yield* Schema.decodeUnknown(CreateTransactionInput)(raw).pipe(
      Effect.mapError(() => new ValidationError({
        message: "Invalid input",
        issues: [],
      })),
    );

    const user = yield* CurrentUser;
    const repo = yield* TransactionsRepository;

    return yield* repo.create({
      userId:      user.id,
      description: input.description,
      amount:      input.amount,
      date:        input.date,
    });
  });
}
```

**Reglas del service:**

| Regla | Razón |
|-------|-------|
| Solo `Context.Tag`, nunca implementaciones | Hexagonal: el dominio no conoce la infra |
| Errores de dominio en el canal `E` | `makeHandler` los mapea a HTTP automáticamente |
| Defectos (bugs, DB down) NO se capturan | Suben como defects → Express 500 |
| No importa nada de Express | El service es agnóstico al transporte |

---

### 5. Router (`apps/api/src/modules/{module}/{module}.router.ts`)

El handler es inline — no necesita archivo propio.

```ts
import express from "express";
import { makeHandler } from "../../middleware/make-handler.js";
import { runPublic, runProtected } from "../../runtime/run-request.js";
import { getMyTransactions, createTransaction } from "./transactions.service.js";

export const transactionsRouter = express.Router();

// runPublic  → accesible sin autenticación
// runProtected → requiere usuario; devuelve 401 automáticamente si no hay sesión

transactionsRouter.get("/",
  makeHandler(runProtected)((req) => getMyTransactions()),
);

transactionsRouter.post("/",
  makeHandler(runProtected)((req) => createTransaction(req.body)),
);
```

Registra el router en `apps/api/src/app.ts`:

```ts
import { transactionsRouter } from "./modules/transactions/transactions.router.js";

app.use("/transactions", transactionsRouter);
```

---

## Frontend — paso a paso

### 1. API client (`apps/web/app/modules/{module}/{module}.api.ts`)

Usa el cliente HTTP centralizado y valida la respuesta con el mismo Schema del backend. El `Request` entrante es opcional y solo se usa durante SSR para reenviar la cookie al origen de API configurado.

```ts
import { Schema } from "effect";
import { http } from "../../libs/http.js";
import {
  CreateTransactionInput,
  TransactionDto,
} from "@finex/shared/transactions/transactions.schema.js";

export async function fetchTransactions(request?: Request): Promise<TransactionDto[]> {
  const raw = await http<unknown>("/transactions", { request });
  return Schema.decodeUnknownSync(Schema.Array(TransactionDto))(raw);
}

export async function createTransaction(
  input: typeof CreateTransactionInput.Type,
  request?: Request,
): Promise<TransactionDto> {
  const raw = await http<unknown>("/transactions", {
    method: "POST",
    body: input,
    request,
  });
  return Schema.decodeUnknownSync(TransactionDto)(raw);
}
```

---

### 2. Componentes presentacionales (`apps/web/app/modules/{module}/components/`)

Sin fetch, sin lógica de negocio. Solo props y renderizado.

```tsx
import type { TransactionDto } from "@finex/shared/transactions/transactions.schema.js";

interface Props {
  transactions: TransactionDto[];
  onDelete?: (id: string) => void;
}

export function TransactionList({ transactions, onDelete }: Props) {
  return (
    <ul>
      {transactions.map((t) => (
        <li key={t.id}>
          <span>{t.description}</span>
          <span>{t.amount}</span>
          {onDelete && (
            <button onClick={() => onDelete(t.id)}>Delete</button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

---

### 3. Route module (`apps/web/app/routes/{module}.tsx`)

La page orquesta: llama al API en `loader`/`action`, pasa datos a componentes.

```tsx
import { useLoaderData } from "react-router";
import type { Route } from "./+types/{module}";
import { fetchTransactions, createTransaction } from "../modules/transactions/transactions.api.js";
import { TransactionList } from "../modules/transactions/components/TransactionList.js";
import { routeHandler } from "../libs/route-handler.js";

// Corre en servidor (SSR) o cliente según config de React Router
export const loader = routeHandler(async ({ request }: Route.LoaderArgs) => {
  const transactions = await fetchTransactions(request);
  return { transactions };
});

export const action = routeHandler(async ({ request }: Route.ActionArgs) => {
  const body = await request.json();
  await createTransaction(body, request);
  return null;
});

export default function TransactionsPage() {
  const { transactions } = useLoaderData<typeof loader>();
  return <TransactionList transactions={transactions} />;
}
```

Registra la ruta en `apps/web/app/routes.ts`:

```ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("transactions", "routes/transactions.tsx"),
] satisfies RouteConfig;
```

---

## Flujo completo de una petición

```
Browser → POST /transactions (cookie httpOnly)
  │
  ▼
authMiddleware
  ├── verifica JWT del cookie
  ├── res.locals.requestId = crypto.randomUUID()
  └── res.locals.user = { id, email } | null → next()
  │
  ▼
transactionsRouter POST /
  └── makeHandler(runProtected)((req) => createTransaction(req.body))
        │
        ▼
      runProtected(ctx, program)
        ├── user === null → UnauthorizedError → 401
        └── provide(AppLayer + requestLayer) → Effect.runPromiseExit
              │
              ├── Success        → res.json(value)            200
              ├── ValidationError → { error: { code, requestId } } 400
              ├── NotFoundError  → { error: { code, requestId } } 404
              └── Defect         → { error: { code, requestId } } 500
```

---

## Checklist — módulo nuevo

### Backend

- [ ] `apps/api/src/db/schema/{module}.ts` — tabla con `idColumn` + `timestampColumns`
- [ ] `apps/api/src/db/schema/index.ts` — exportar la tabla nueva
- [ ] `packages/shared/src/{module}/{module}.schema.ts` — `Input` + `Dto`
- [ ] `packages/shared/src/{module}/{module}.errors.ts` — errores de dominio
- [ ] `apps/api/src/middleware/make-handler.ts` — añadir errores a `AppError` y `STATUS`
- [ ] `apps/api/src/modules/{module}/{module}.repository.ts` — `Context.Tag` + layer
- [ ] `apps/api/src/runtime/app-layer.ts` — añadir el `RepositoryLayer`
- [ ] `apps/api/src/modules/{module}/{module}.service.ts` — lógica de negocio
- [ ] `apps/api/src/modules/{module}/{module}.router.ts` — rutas + handlers inline
- [ ] `apps/api/src/app.ts` — `app.use("/{module}", {module}Router)`
- [ ] `cd packages/shared && pnpm build` — compilar shared

### Frontend

- [ ] Configurar `VITE_API_URL` cuando el API no esté en `http://localhost:3000`
- [ ] Configurar `WEB_ORIGIN` en el API cuando el frontend no esté en `http://localhost:5173`
- [ ] `apps/web/app/modules/{module}/{module}.api.ts` — fetch + decode con Schema
- [ ] `apps/web/app/modules/{module}/components/*.tsx` — componentes presentacionales
- [ ] `apps/web/app/routes/{module}.tsx` — loader + action + page
- [ ] `apps/web/app/routes.ts` — registrar la ruta

---

## Referencia rápida

### Helpers de BD

| Helper | Tipo Postgres | Uso |
|--------|--------------|-----|
| `idColumn` | `uuid` (uuidv7, PK) | Siempre en todas las tablas |
| `timestampColumns` | `timestamp with tz` | Siempre en todas las tablas |
| `moneyColumn(name)` | `numeric(12,2)` | Importes de dinero |
| `rateColumn(name)` | `numeric(5,2)` | Porcentajes / tipos |

### Runners HTTP

| Runner | Cuándo usarlo |
|--------|--------------|
| `runPublic` | Endpoint sin autenticación (login, registro, público) |
| `runProtected` | Endpoint que requiere sesión; 401 automático si no hay usuario |

### Context tags disponibles en services

| Tag | Qué provee | Disponible en |
|-----|-----------|---------------|
| `CurrentUser` | `{ id, email }` del usuario autenticado | `runProtected` |
| `RequestContext` | `{ requestId, user }` | `runPublic` y `runProtected` |
| `DatabaseService` | instancia de Drizzle | Vía `AppLayer` |
| `{Module}Repository` | métodos de BD del módulo | Vía `AppLayer` |

### Errores de dominio → HTTP

| Error | Status | Cuándo usarlo |
|-------|--------|--------------|
| `ValidationError` | 400 | Input inválido (Schema decode fail) |
| `UnauthorizedError` | 401 | Acción no permitida (automático en `runProtected`) |
| `NotFoundError` | 404 | Recurso no existe |

### Import paths de shared

```ts
// Schemas
import { MyInput, MyDto } from "@finex/shared/{module}/{module}.schema.js";

// Errores base
import { ValidationError, UnauthorizedError } from "@finex/shared/errors.js";

// Errores de módulo
import { MyError } from "@finex/shared/{module}/{module}.errors.js";
```

> **Nunca** uses `/src/` en imports de `@finex/shared`. Si añades un archivo nuevo, ejecuta `pnpm build` en `packages/shared`.

### Centralized HTTP error handling

- Set `VITE_API_URL` to the trusted API base URL. A pathname is supported: with `VITE_API_URL=https://host/api`, the module path `/transactions` resolves to `https://host/api/transactions`.
- `http` uses `credentials: "include"` and forwards an incoming SSR `Cookie` only to the configured API origin. Cross-origin target URLs are rejected before a request is sent.
- API modules never redirect or render UI, and they never handle 401 individually. `http` normalizes HTTP, network (`503 NetworkError`), and malformed successful JSON (`502 InvalidJsonResponse`) failures as `ApiError`.
- `routeHandler` owns navigation policy: it redirects 401 failures to `/login` and converts every other `ApiError` into a route error for the `ErrorBoundary`.
- Non-success responses retain their HTTP status. If their body does not match the shared `{ error: { code: string, requestId: string } }` schema, `http` uses the safe `HttpError` code and does not expose the response body.
- Validation errors that belong beside a form may be caught locally before they reach the boundary.
