# API de categorías

Todas las rutas requieren sesión. Las categorías pertenecen al usuario autenticado.
Los identificadores ajenos devuelven el mismo `404 CategoryNotFound` que los inexistentes.
POST, PATCH y DELETE requieren además `Origin` o `Referer` del `WEB_ORIGIN` configurado.

| Método y ruta | Resultado |
| --- | --- |
| `GET /categories` | Array de categorías propias, ordenado por nombre e ID. Admite `?kind=income` o `?kind=expense`. |
| `GET /categories/:categoryId` | Detalle de una categoría propia. |
| `POST /categories` | Crea una categoría y devuelve su DTO (200). |
| `PATCH /categories/:categoryId` | Actualiza nombre, emoji o color y devuelve su DTO (200). |
| `DELETE /categories/:categoryId` | Devuelve `{ "deleted": true }`. |

Creación:

```json
{
  "name": "Alimentación",
  "kind": "expense",
  "emoji": "🥗",
  "color": "#22c55e"
}
```

`name` se recorta y debe tener entre 1 y 100 caracteres. `kind` es `income` o
`expense` y es inmutable para conservar la compatibilidad con transacciones y
presupuestos. `emoji` es opcional, admite hasta 32 caracteres o null. `color` es
opcional y admite un hexadecimal `#RRGGBB` o null. PATCH exige al menos un campo
editable; omitir un campo lo conserva y null elimina emoji o color. Se rechazan
campos desconocidos. Se permiten nombres duplicados.

DTO:

```json
{
  "id": "00000000-0000-4000-8000-000000000040",
  "name": "Alimentación",
  "kind": "expense",
  "emoji": "🥗",
  "color": "#22c55e",
  "created_at": "2026-10-19T12:00:00.000Z",
  "updated_at": "2026-10-19T12:00:00.000Z"
}
```

Las categorías empiezan vacías; la API no crea categorías predeterminadas.
Eliminar una categoría deja sus transacciones sin categoría. Si un presupuesto
la utiliza, devuelve `409 CategoryInUse`: primero hay que modificar o eliminar
ese presupuesto. No se convierte un presupuesto de categoría en uno global.

Errores: `400 ValidationError`, `401 UnauthorizedError`, `404 CategoryNotFound`,
`409 CategoryInUse`, `500 DatabaseError`. Todos usan el contrato común
`{ "error": { "code": "…", "requestId": "…" } }`.

La asignación y los filtros de transacciones se documentan en
[transactions-api.md](transactions-api.md).
