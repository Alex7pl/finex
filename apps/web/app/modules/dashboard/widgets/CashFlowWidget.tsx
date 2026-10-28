import type { DashboardWidgetProps } from "../dashboard.types.js";
import { cents, decimal, formatMoney } from "../dashboard-money.js";
import { monthLabel } from "../dashboard-period.js";

export function CashFlowWidget({
  dashboard: { monthly, filters },
}: DashboardWidgetProps) {
  const income = cents(monthly.income),
    expenses = cents(monthly.expenses);
  const net = income - expenses;
  const percent =
    income > 0n ? Number((expenses * 10000n) / income) / 100 : null;
  return (
    <section
      className="flex h-full min-h-[300px] flex-col gap-4 bg-ivory-soft p-7"
      aria-labelledby="cash-flow-title"
    >
      <h2
        id="cash-flow-title"
        className="font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-ink-muted"
      >
        Balance de {monthLabel(filters.month)}
      </h2>
      <p className="font-serif text-[48px] leading-none tracking-[-0.015em] lining-nums tabular-nums text-ink">
        {net > 0n ? "+" : ""}
        {formatMoney(decimal(net))}
      </p>
      {income === 0n && expenses === 0n ? (
        <p className="text-sm text-ink-muted">
          Sin ingresos ni gastos completados en este periodo.
        </p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`${formatMoney(monthly.income)} de ingresos y ${formatMoney(monthly.expenses)} de gastos`}
            className="flex h-2.5 gap-0.5 bg-stone-line"
          >
            <div
              className="bg-terracotta"
              style={{ flexGrow: Number(expenses) }}
            />
            <div
              className="bg-petrol"
              style={{ flexGrow: Number(net > 0n ? net : 0n) }}
            />
          </div>
          <p className="text-xs text-ink-muted">
            {percent === null
              ? "Gastos sin ingresos en este periodo"
              : `${percent.toLocaleString("es-ES")}% de los ingresos gastado`}
          </p>
        </>
      )}
      <dl className="mt-auto grid grid-cols-2 border-t border-stone-line">
        <div className="pt-3.5">
          <dt className="text-xs text-ink-muted">Ingresos</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums">
            {formatMoney(monthly.income)}
          </dd>
        </div>
        <div className="border-l border-stone-line pl-4 pt-3.5">
          <dt className="text-xs text-ink-muted">Gastos</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums">
            {formatMoney(monthly.expenses)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-ink-muted">
        Solo movimientos completados. Transferencias excluidas.
      </p>
    </section>
  );
}
