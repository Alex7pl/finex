import type { DashboardWidgetProps } from "../dashboard.types.js";
import { formatMoney } from "../dashboard-money.js";
import { monthLabel } from "../dashboard-period.js";

export function BudgetsWidget({
  dashboard: { budgets, filters },
}: DashboardWidgetProps) {
  return (
    <section
      id="presupuestos"
      className="flex h-full min-h-[300px] flex-col gap-6 bg-ivory-soft p-7"
      aria-labelledby="budget-title"
    >
      <div>
        <h2 id="budget-title" className="text-[15px] font-semibold">
          Presupuestos
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          {monthLabel(filters.month)}
        </p>
      </div>
      {budgets.length === 0 ? (
        <p className="my-auto text-sm text-ink-muted">
          No tienes presupuestos definidos.
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {budgets.map((budget) => {
            const percent = budget.progress_percent;
            const width = Math.max(0, Math.min(100, percent));
            const warning = percent >= 80;
            return (
              <li key={budget.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <strong className="text-[13px] font-semibold">
                    {budget.name ?? "Presupuesto"}
                  </strong>
                  <span
                    className={
                      warning ? "text-terracotta-deep" : "text-ink-muted"
                    }
                  >
                    {formatMoney(budget.spent)} de{" "}
                    {formatMoney(budget.monthly_limit)}
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`${budget.name ?? "Presupuesto"}: ${percent}% consumido${warning ? ", cerca del límite" : ""}`}
                  className="h-1 bg-stone-line"
                >
                  <div
                    className={`h-full ${warning ? "bg-terracotta" : "bg-petrol"}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="text-xs text-ink-muted">
                  {Number(budget.exceeded) > 0
                    ? `Excedido en ${formatMoney(budget.exceeded)}`
                    : `Quedan ${formatMoney(budget.remaining)}`}
                  {Number(budget.pending) > 0
                    ? ` · ${formatMoney(budget.pending)} pendientes`
                    : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
