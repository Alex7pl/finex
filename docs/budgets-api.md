# API de presupuestos

Todas las rutas requieren sesión. POST, PATCH y DELETE requieren `Origin` o `Referer` del origen web autorizado, igual que el resto de mutaciones. Un ID de presupuesto inexistente o ajeno devuelve `404 BudgetNotFound`.

| Método | Ruta                                      | Resultado                                          |
| ------ | ----------------------------------------- | -------------------------------------------------- |
| GET    | `/budgets?month=2026-10&accountId=<uuid>` | `{ items: BudgetDto[], month: "2026-10" }`         |
| GET    | `/budgets/:id?month=2026-10`              | `BudgetDto`                                        |
| POST   | `/budgets`                                | Presupuesto creado con resumen del mes actual      |
| PATCH  | `/budgets/:id`                            | Presupuesto actualizado con resumen del mes actual |
| DELETE | `/budgets/:id`                            | `{ deleted: true }`                                |

Crear:

```json
{
  "name": "Alimentación",
  "monthly_limit": "350.00",
  "category_id": "00000000-0000-4000-8000-000000000020"
}
```

`name` y `monthly_limit` son obligatorios. Los importes son strings decimales positivos de hasta 10 cifras enteras y 2 decimales (`numeric(12,2)`); números JSON, exponentes, negativos y precisión adicional se rechazan. `category_id` es opcional, nullable y debe identificar una categoría propia de tipo `expense`; null abarca todos los gastos. Una categoría vinculada no se puede eliminar hasta quitar el vínculo. PATCH admite cualquier subconjunto no vacío de los mismos campos; campos desconocidos se rechazan. Un cambio en el presupuesto afecta a su definición para todos los meses: no hay versiones mensuales.

El filtro opcional legacy `about_type` permite `Fixed_expense`, `Variable_expense` o null; se combina con la categoría como intersección. Null abarca ambos tipos. Nuevos presupuestos de ingresos y transferencias se rechazan; registros legacy con estos valores tienen consumo cero.

`month` usa `YYYY-MM`, por defecto el mes actual en `Europe/Madrid`. Los límites del mes son inclusivo al inicio y exclusivo al final y respetan horario de verano. La fecha del movimiento es `transactions.created_at`, igual que en el listado de movimientos; no se inventan fechas de liquidación de splits. `accountId` limita el consumo a las asignaciones de esa cuenta propia y no modifica el límite del presupuesto. Una cuenta inexistente/ajena devuelve `400 ValidationError`.

DTO:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "name": "Alimentación",
  "monthly_limit": "350.00",
  "category_id": "00000000-0000-4000-8000-000000000020",
  "about_type": null,
  "month": "2026-10",
  "spent": "125.30",
  "pending": "12.00",
  "remaining": "224.70",
  "exceeded": "0.00",
  "progress_percent": 35.8,
  "created_at": "2026-10-19T12:00:00.000Z",
  "updated_at": "2026-10-19T12:00:00.000Z"
}
```

`spent` suma el valor absoluto de cada split `Completed` una sola vez; `pending` suma los `Pending` por separado. Solo se incluyen gastos propios con cuentas propias en todas sus asociaciones. Transferencias e ingresos se excluyen. Un movimiento sin splits consume cero. `remaining = max(limit - spent, 0)`, `exceeded = max(spent - limit, 0)` y `progress_percent = spent / limit * 100`, truncado a dos decimales y sin tope de 100. Los pendientes no reducen `remaining`. No se suma `transactions.amount` además de sus splits.

Los presupuestos pueden solaparse (por ejemplo uno global y otro por categoría); no deben sumarse como si fueran partidas disjuntas. No hay conversión de divisa, acorde al modelo actual de cuentas sin divisa.

Validación inválida: `400 ValidationError`. Fallos de BD: `500 DatabaseError` sin detalles internos en HTTP. Las respuestas de éxito usan 200, incluyendo creación y eliminación, según la convención existente.
