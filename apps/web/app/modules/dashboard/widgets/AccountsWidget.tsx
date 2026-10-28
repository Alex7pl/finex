import type { DashboardWidgetProps } from "../dashboard.types.js";
import { formatMoney } from "../dashboard-money.js";

export function AccountsWidget({
  dashboard: { accounts },
}: DashboardWidgetProps) {
  const positive = accounts.reduce(
    (sum, account) => sum + Math.max(0, Number(account.balance)),
    0,
  );
  return (
    <section
      id="cuentas"
      className="flex h-full min-h-[300px] flex-col gap-4 bg-ivory-soft p-7"
      aria-labelledby="accounts-title"
    >
      <h2 id="accounts-title" className="text-[15px] font-semibold text-ink">
        Mis cuentas
      </h2>
      <p className="text-xs text-ink-muted">
        Saldos actuales · movimientos completados
      </p>
      {accounts.length === 0 ? (
        <p className="my-auto text-sm text-ink-muted">
          Todavía no tienes cuentas.
        </p>
      ) : (
        <>
          {positive > 0 && (
            <div
              aria-label="Distribución de saldos positivos"
              className="flex h-1.5 gap-0.5"
            >
              {accounts
                .filter((account) => Number(account.balance) > 0)
                .map((account) => (
                  <span
                    key={account.id}
                    title={account.name}
                    className="bg-primary"
                    style={{
                      flex: `${Number(account.balance) / positive} 1 0`,
                      backgroundColor: account.color ?? undefined,
                    }}
                  />
                ))}
            </div>
          )}
          <ul className="mt-auto flex flex-col">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between gap-3 border-b border-stone-line py-3 last:border-0"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden="true">{account.emoji ?? "◈"}</span>
                  <strong className="text-[13px] font-semibold text-ink">
                    {account.name}
                  </strong>
                </span>
                <strong className="text-sm font-semibold tabular-nums text-ink">
                  {formatMoney(account.balance)}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
