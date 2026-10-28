# API de objetivos de ahorro

Todas las rutas requieren sesión. POST, PATCH y DELETE requieren `Origin` o `Referer` del origen web autorizado. Un objetivo inexistente o ajeno devuelve `404 SavingsNotFound`.

| Método | Ruta                         | Resultado                           |
| ------ | ---------------------------- | ----------------------------------- |
| GET    | `/savings?accountId=<uuid>`  | `{ items: SavingsDto[] }`           |
| GET    | `/savings/:id`               | `SavingsDto`                        |
| POST   | `/savings`                   | Objetivo creado                     |
| PATCH  | `/savings/:id`               | Objetivo actualizado                |
| DELETE | `/savings/:id`               | `{ deleted: true }`                 |
| POST   | `/savings/:id/contributions` | Objetivo tras aporte/retiro atómico |

Crear:

```json
{
  "name": "Viaje",
  "account_id": "00000000-0000-4000-8000-000000000010",
  "target_amount": "1500.00",
  "current_amount": "100.00"
}
```

`name`, `account_id` y `target_amount` son obligatorios. La cuenta debe ser propia. `current_amount` es opcional y comienza en cero; es una reserva inicial declarada, no el saldo bancario calculado. PATCH permite `name`, `account_id` y `target_amount`; para modificar el acumulado se usa el endpoint de aportaciones, que evita actualizaciones perdidas. Campos desconocidos y PATCH vacío se rechazan.

Aportación:

```json
{ "amount": "50.00", "direction": "deposit" }
```

Para retirar usa `direction: "withdraw"`. Todos los importes son strings decimales con hasta 10 cifras enteras y 2 decimales, sin exponentes ni signos. `target_amount` y aportaciones deben ser positivos; `current_amount` inicial permite cero. Un objetivo puede superar su meta. Un retiro que deje el acumulado negativo o un aporte que supere `9999999999.99` devuelve `400 ValidationError` y no modifica el acumulado. El incremento/decremento y sus límites se comprueban en una única actualización SQL, incluso con peticiones concurrentes.

DTO:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "name": "Viaje",
  "account_id": "00000000-0000-4000-8000-000000000010",
  "target_amount": "1500.00",
  "current_amount": "150.00",
  "remaining": "1350.00",
  "progress_percent": 10,
  "completed": false,
  "created_at": "2026-10-19T12:00:00.000Z",
  "updated_at": "2026-10-19T12:00:00.000Z"
}
```

`remaining = max(target - current, 0)`, `completed = current >= target`. El porcentaje se trunca a dos decimales y puede superar 100. No se estima una fecha de finalización sin un plan de aportaciones.

Estos objetivos registran progreso manual: aportar o retirar no crea un movimiento bancario ni modifica el saldo de la cuenta. No existe un libro de aportaciones ni una garantía de que la suma reservada en varios objetivos no supere el saldo real de la cuenta. La cuenta sirve para vincular y filtrar los objetivos; eliminar un objetivo elimina su progreso guardado.

Cuenta inexistente/ajena o input inválido: `400 ValidationError`. Fallos de BD: `500 DatabaseError` sin detalles internos en HTTP. Las respuestas de éxito usan 200 según la convención existente.
