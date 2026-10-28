import type { TransactionDto } from "@finex/shared/transactions/transactions.schema.js";
import { dateTime, formatMoney } from "../dashboard-money.js";
import {
  stateLabel,
  transactionAmount,
  transferRoute,
} from "../widgets/TransactionsWidget.js";
import { DashboardDialog } from "./DashboardDialog.js";

export function TransactionDialog({
  transaction,
  onClose,
}: {
  transaction: TransactionDto;
  onClose: () => void;
}) {
  return (
    <DashboardDialog
      title={transaction.description || "Detalle del movimiento"}
      onClose={onClose}
    >
      <p className="mb-5 font-serif text-4xl">
        {transactionAmount(transaction)}
      </p>
      {transaction.is_internal_transfer ? (
        <p className="mb-5 border border-gold-deep bg-parchment p-3 text-sm">
          Transferencia entre tus cuentas
          <br />
          <strong>{transferRoute(transaction)}</strong>
        </p>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
        <dt className="text-ink-muted">Fecha</dt>
        <dd>{dateTime(transaction.created_at)}</dd>
        <dt className="text-ink-muted">Estado</dt>
        <dd>{stateLabel(transaction.state)}</dd>
        <dt className="text-ink-muted">Tipo</dt>
        <dd>
          {transaction.kind === "income"
            ? "Ingreso"
            : transaction.kind === "expense"
              ? "Gasto"
              : "Transferencia"}
          {transaction.type.startsWith("Fixed_") ? " fijo" : ""}
        </dd>
        <dt className="text-ink-muted">Categoría</dt>
        <dd>{transaction.category?.name ?? "Sin categoría"}</dd>
        {transaction.from_account ? (
          <>
            <dt className="text-ink-muted">Origen</dt>
            <dd>{transaction.from_account.name}</dd>
          </>
        ) : null}
      </dl>
      <h3 className="mb-2 mt-6 text-sm font-semibold">
        Asignaciones por cuenta
      </h3>
      {transaction.splits.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin asignaciones.</p>
      ) : (
        <ul>
          {transaction.splits.map((split) => (
            <li
              key={split.id}
              className="flex items-center justify-between gap-3 border-b border-stone-line py-3 text-sm last:border-0"
            >
              <span>
                {split.account.emoji} {split.account.name}
                <small className="mt-1 block text-ink-muted">
                  {stateLabel(split.state)}
                </small>
              </span>
              <strong className="tabular-nums">
                {formatMoney(split.amount)}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </DashboardDialog>
  );
}
