import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import { Link } from "react-router";
import type { TransactionDto } from "@finex/shared/transactions/transactions.schema.js";
import type { DashboardWidgetProps } from "../dashboard.types.js";
import { dateTime, formatMoney } from "../dashboard-money.js";
import { dashboardHref } from "../dashboard-period.js";

export function transactionAmount(transaction: TransactionDto) {
  const abs = transaction.amount.replace(/^-/, "");
  return `${transaction.kind === "income" ? "+" : transaction.kind === "expense" ? "−" : ""}${formatMoney(abs)}`;
}
export function transferRoute(transaction: TransactionDto) {
  const destinations = [
    ...new Set(transaction.splits.map((split) => split.account.name)),
  ];
  return `${transaction.from_account?.name ?? "Origen sin cuenta"} → ${destinations.join(", ") || "Sin destino"}`;
}
export const stateLabel = (state: string) =>
  ({
    Completed: "Completado",
    Pending: "Pendiente",
    Mixed: "Parcialmente completado",
  })[state] ?? state;

export function TransactionsWidget({
  dashboard: { transactions, filters },
}: DashboardWidgetProps) {
  return (
    <section
      id="movimientos"
      className="flex h-full flex-col gap-4 bg-ivory-soft p-7"
      aria-labelledby="transactions-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="transactions-title" className="text-[15px] font-semibold">
            Movimientos
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {transactions.total}{" "}
            {transactions.total === 1 ? "resultado" : "resultados"} en el
            periodo{filters.search ? ` para “${filters.search}”` : ""}
          </p>
        </div>
      </div>
      {transactions.items.length === 0 ? (
        <p className="my-auto py-6 text-sm text-ink-muted">
          No hay movimientos para estos filtros.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                {["Concepto", "Categoría / estado", "Fecha", "Importe"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="border-b border-stone-line py-2.5 font-normal last:text-right"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.items.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={`border-b border-stone-line last:border-0 ${transaction.is_internal_transfer ? "bg-parchment/50" : "hover:bg-canvas"}`}
                >
                  <td className="py-3 pr-3">
                    <Link
                      preventScrollReset
                      to={dashboardHref(filters, {
                        transactionId: transaction.id,
                      })}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {transaction.is_internal_transfer ? (
                        <ArrowsLeftRightIcon
                          size={16}
                          className="mr-1 inline"
                          aria-hidden="true"
                        />
                      ) : null}
                      {transaction.description ||
                        (transaction.kind === "transfer"
                          ? "Transferencia"
                          : "Movimiento sin descripción")}
                    </Link>
                    {transaction.is_internal_transfer ? (
                      <p className="mt-1 text-xs text-ink-muted">
                        {transferRoute(transaction)}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 text-ink-muted">
                    {transaction.category
                      ? `${transaction.category.emoji ?? ""} ${transaction.category.name}`
                      : transaction.kind === "transfer"
                        ? "Transferencia"
                        : "Sin categoría"}
                    <span className="mt-1 block text-xs">
                      {stateLabel(transaction.state)}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-xs tabular-nums text-ink-muted">
                    {dateTime(transaction.created_at)}
                  </td>
                  <td
                    className={`py-3 text-right font-semibold tabular-nums ${transaction.kind === "income" ? "text-petrol" : "text-ink"}`}
                  >
                    {transactionAmount(transaction)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav
        aria-label="Paginación de movimientos"
        className="mt-auto flex items-center justify-between gap-3 border-t border-stone-line pt-3 text-xs"
      >
        {filters.page > 1 ? (
          <Link
            preventScrollReset
            className="action-secondary p-2"
            to={dashboardHref(filters, { page: String(filters.page - 1) })}
          >
            Anterior
          </Link>
        ) : (
          <span />
        )}
        <span>
          Página {filters.page}
          {transactions.total > 0
            ? ` de ${Math.ceil(transactions.total / transactions.limit)}`
            : ""}
        </span>
        {transactions.has_more ? (
          <Link
            preventScrollReset
            className="action-secondary p-2"
            to={dashboardHref(filters, { page: String(filters.page + 1) })}
          >
            Siguiente
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
