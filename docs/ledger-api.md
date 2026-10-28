# Deudas, ingresos y devengo

Los movimientos tienen tres tipos: `income`, `expense`, `transfer`. Se han eliminado las variantes
fixed/variable y los campos `cycle` / `is_active` de las transacciones. Una deuda o una definición de ingreso
es el origen opcional de movimientos independientes. No existe programación ni generación automática periódica.

## Gestionar los orígenes

Todos los endpoints requieren sesión; las escrituras requieren el origen web permitido.

| Operación | Deudas | Ingresos |
| --- | --- | --- |
| Listar | `GET /debts` | `GET /incomes` |
| Detalle con totales | `GET /debts/:id` | `GET /incomes/:id` |
| Crear | `POST /debts` | `POST /incomes` |
| Modificar | `PATCH /debts/:id` | `PATCH /incomes/:id` |
| Eliminar | `DELETE /debts/:id` | `DELETE /incomes/:id` |
| Devengar | `POST /debts/:id/accrue` | `POST /incomes/:id/accrue` |

La creación de un origen no crea movimientos. El listado devuelve `{ "items": [...] }`.
El detalle, creación y modificación devuelven un `SourceDto`. Un origen ajeno o inexistente devuelve
`404 SourceNotFound`. Los identificadores malformados y campos inválidos devuelven `400 ValidationError`.

Datos comunes de creación:

```json
{
  "name": "Alquiler",
  "amount": "850.00",
  "account_id": "<uuid>",
  "category_id": null,
  "is_active": true
}
```

`name`, `amount` y `account_id` son obligatorios. La categoría por defecto es null, el estado activo por defecto es true.
La API usa `amount` para el importe habitual de ambos orígenes; en la tabla `debts` se almacena en `quota`.
Las cuentas deben ser propias. Una categoría de deuda debe ser de gasto; la de un ingreso, de ingreso.
Los PATCH aceptan un subconjunto no vacío de los campos de creación.

Una deuda añade `capital`, `interests` y `time_limit` (opcionales, null por defecto). `capital` es positivo o null.
Con `capital=null`, representa un compromiso sin importe total definido (alquiler, suscripción, suministros).
`interests` es un importe monetario total no negativo, requiere capital y se suma a este para obtener
el total a devolver. No es un porcentaje y no se calcula amortización ni interés automático.
`time_limit` es una fecha ISO con zona horaria o null, solo informativa. Los ingresos no admiten estos campos.

Cambiar nombre, importe, cuenta o categoría del origen solo afecta a futuros devengos. Desactivarlo impide
nuevos devengos. Eliminarlo conserva sus movimientos y splits, dejando su vínculo en null;
para conservar la relación y poder consultar totales históricos, se puede desactivar en lugar de eliminar.

## Devengar

El cuerpo puede ser `{}`. Devuelve el movimiento creado con su `debt_id` o `income_id`.
Se copian el nombre, importe habitual y categoría del origen; se crea un split `Pending` en su cuenta habitual.
Así devengar no modifica los saldos completados. Se pueden proporcionar `amount`, `description` y `splits`
para cambiar el importe concreto, el concepto o las cuentas y estados de esta operación:

```json
{
  "amount": "2100.00",
  "splits": [
    { "account_id": "<uuid-principal>", "amount": "1600.00", "state": "Completed" },
    { "account_id": "<uuid-ahorro>", "amount": "500.00", "state": "Completed" }
  ]
}
```

En los splits explícitos, el estado por defecto es `Completed`. Su suma debe ser exactamente `amount`,
o el importe habitual si no se especifica. Una deuda genera `expense`; un ingreso genera `income`.
Un devengo es una nueva operación: repetir la petición crea otro movimiento. No hay deduplicación por periodo.
En una deuda finita, la suma devengada no puede superar `capital + interests`; se comprueban también los
movimientos pendientes bajo bloqueo del origen. La última cuota se puede ajustar con `amount`.
No se puede reducir el total de una deuda por debajo de lo que ya se ha devengado.

Para pagar/cobrar más tarde o repartir el cobro entre cuentas, usar
[`PUT /transactions/:id/splits`](transactions-api.md). No se crea un segundo movimiento.

## Progreso e historial

Cada origen incluye `id`, `kind` (`debt` / `income`), datos comunes, `created_at`, `updated_at` y:

| Campo | Significado |
| --- | --- |
| `accrued_amount` | Suma de los movimientos generados; cada movimiento cuenta una vez. |
| `settled_amount` | Suma de sus splits `Completed`: pagado en deudas, cobrado en ingresos. |
| `pending_amount` | Suma de sus splits `Pending`. |
| `transaction_count` | Número de movimientos vinculados. |
| `total_amount` | `capital + interests` en deuda finita; null en deuda sin capital o ingreso. |
| `remaining_amount` | Total menos lo pagado, con mínimo cero; null si no hay total definido. |

Todos los importes son texto decimal. `capital`, `interests` y `time_limit` son null en ingresos.
Los totales incluyen todo el historial propio, tanto si el origen está activo como inactivo; excluyen
movimientos con asociaciones de cuentas de otro usuario. El reparto entre cuentas no duplica el importe.
El historial paginado se obtiene con `GET /transactions?debtId=<uuid>` o `?incomeId=<uuid>`.

La migración `0005_chunky_crystal.sql` convierte los tipos existentes y los filtros de presupuesto,
crea `incomes`, añade los vínculos y retira los metadatos de periodicidad de las transacciones.
Los movimientos antiguos se conservan; el seed demo enlaza los ejemplos conocidos con sus orígenes.
Los presupuestos y saldos operan sobre los nuevos tipos. No se crean pantallas nuevas.
