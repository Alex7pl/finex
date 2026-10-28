# API de transacciones

Todos los endpoints requieren la sesión existente (cookie de acceso). Cada consulta
queda limitada al usuario autenticado. Una transacción ajena o inexistente devuelve
el mismo `404 TransactionNotFound`. Una asociación incoherente con cuentas de otro
usuario se oculta por completo.

## Listado

`GET /transactions`

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 25,
  "has_more": false
}
```

`total` cuenta movimientos completos después de aplicar los filtros y antes de
paginar. Una página sin resultados mantiene ese total. Todos los filtros se
combinan con AND; dentro de `accountId`, `categoryId` o `type` se usa OR.

| Parámetro | Valores / significado |
| --- | --- |
| `accountId` | UUID; admite varios separados por comas o parámetros repetidos. Busca tanto en origen como en destinos. |
| `categoryId` | UUID de categoría; admite varios separados por comas o parámetros repetidos. |
| `uncategorized` | `true` para movimientos sin categoría; `false` para movimientos con categoría. No admite `true` junto con `categoryId`. |
| `dateFrom` | Fecha `YYYY-MM-DD` o instante ISO con zona horaria, límite inclusivo. |
| `dateTo` | Fecha completa inclusiva (hasta el comienzo del día siguiente) o instante ISO inclusivo. |
| `search` | Texto contenido en la descripción, sin distinguir mayúsculas; `%`, `_` y `\` se buscan literalmente. Máximo 200 caracteres. |
| `type` | `Fixed_income`, `Variable_income`, `Fixed_expense`, `Variable_expense`, `Transfer`; admite varios. |
| `kind` | `income`, `expense`, `transfer`. |
| `state` | `Completed`, `Pending`, `Mixed`. Estado global de todas las partes. |
| `minAmount`, `maxAmount` | Límites inclusivos sobre el valor absoluto del importe total; decimal sin signo, hasta 2 decimales. |
| `isActive` | `true` o `false`; filtra el indicador existente `is_active`. Los valores nulos no coinciden. |
| `internalTransfer` | `true` o `false`; filtra transferencias internas identificadas. |
| `page` | Entero entre 1 y 1.000.000, por defecto 1. |
| `limit` | Entero entre 1 y 100, por defecto 25. |
| `sortBy` | `date`, `amount` (valor absoluto), `description`; por defecto `date`. |
| `sortOrder` | `asc`, `desc`; por defecto `desc`. |

Las fechas se aplican a `created_at`, la fecha disponible en el modelo actual.
Las fechas sin hora se interpretan en UTC. Los instantes admiten `Z` o un desfase
como `+02:00` (codificar el `+` como `%2B` en la URL). Los resultados usan UTC.
La ordenación desempata por UUID en la misma dirección y sitúa descripciones
nulas al final. Las inserciones concurrentes pueden desplazar páginas al usar
paginación por número.

Ejemplo:

```text
GET /transactions?accountId=<uuid>&dateFrom=2026-10-01&dateTo=2026-10-31&type=Transfer&state=Completed&sortBy=amount&sortOrder=desc&limit=20
```

Los parámetros desconocidos, UUID inválidos, rangos invertidos y valores fuera
de límites devuelven `400 ValidationError`.

## Detalle y transferencias

`GET /transactions/:transactionId`

El detalle devuelve el mismo DTO que cada elemento del listado:

```json
{
  "id": "00000000-0000-4000-8000-000000000020",
  "type": "Transfer",
  "kind": "transfer",
  "description": "Ahorro mensual",
  "category_id": null,
  "category": null,
  "amount": "100.10",
  "created_at": "2026-10-19T12:00:00.000000Z",
  "updated_at": "2026-10-19T12:00:00.000000Z",
  "cycle": null,
  "is_active": null,
  "state": "Completed",
  "is_internal_transfer": true,
  "from_account": {
    "id": "00000000-0000-4000-8000-000000000010",
    "name": "Principal",
    "emoji": null,
    "color": null
  },
  "splits": [{
    "id": "00000000-0000-4000-8000-000000000030",
    "account": {
      "id": "00000000-0000-4000-8000-000000000011",
      "name": "Ahorro",
      "emoji": "🏦",
      "color": "#ffffff"
    },
    "amount": "100.10",
    "state": "Completed"
  }]
}
```

Una transacción representa un movimiento, aunque tenga varias partes. Una
transferencia interna se identifica por `type=Transfer`, un origen propio y uno
o más destinos propios distintos del origen. El modelo ya enlaza estos datos
mediante `transaction_id`; no se emparejan movimientos por coincidencia de fecha
o importe. Filtrar por una cuenta siempre devuelve todas las partes del movimiento.

Para una UI de transferencia, usar `is_internal_transfer`, `from_account` y
`splits[].account`. Cada cuenta incluye nombre, emoji y color. `from_account`
puede ser nulo en otros movimientos. Los importes conservan la precisión del
modelo como texto decimal; `amount` mantiene el signo almacenado y `kind` permite
distinguir ingresos, gastos y transferencias sin inferirlo del signo.

`state` es `Completed` si todas las partes están completadas, `Mixed` si hay partes
completadas y pendientes, y `Pending` si todas están pendientes o no hay partes.
No existe un estado independiente para el débito de origen en el modelo actual.

Los errores usan el contrato común `{ "error": { "code": "…", "requestId": "…" } }`:
`401 UnauthorizedError`, `400 ValidationError`, `404 TransactionNotFound` y
`500 DatabaseError`.

## Categorizar movimientos

`PATCH /transactions/:transactionId/category`

Requiere sesión y `Origin` o `Referer` del `WEB_ORIGIN` configurado. El cuerpo
es `{ "category_id": "<uuid>" }` para asignar o `{ "category_id": null }` para
quitar la categoría. Devuelve el DTO completo actualizado. Se rechazan campos
extra, UUID inválidos y cuerpos sin `category_id`.

La categoría debe pertenecer al usuario y coincidir con el tipo de movimiento:
`income` para `Fixed_income` / `Variable_income` y `expense` para `Fixed_expense`
/ `Variable_expense`. Las transferencias no admiten categorías. Un tipo
incompatible devuelve `400 ValidationError`; una categoría inexistente o ajena
produce `404 CategoryNotFound`. Los movimientos propios existentes siguen
limitados a sus cuentas propias.

Tanto listado como detalle incluyen `category_id` y `category`, el DTO de
[categorías](categories-api.md), o null cuando no hay categoría. La agrupación
de transferencias conserva el mismo comportamiento. El borrado de una categoría
deja sus movimientos sin categoría; los filtros `uncategorized` incluyen también
las transferencias, que por definición no tienen categoría.

## Verificación

```bash
pnpm --filter @finex/api typecheck
pnpm --filter @finex/api test
# Incluye pruebas reales de SQL con tablas TEMP en una conexión aislada:
TRANSACTIONS_TEST_DATABASE_URL=postgres://usuario:clave@localhost/base_de_pruebas pnpm --filter @finex/api test
```

La prueba PostgreSQL requiere permiso para crear tablas temporales. Sin esa
variable se omite únicamente la integración SQL; las pruebas de validación,
servicio y HTTP siguen ejecutándose.
