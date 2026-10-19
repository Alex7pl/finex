import { formatEuro } from "./chart-utils.js";

const income = 3240;
const expenses = 1913.28;
const available = income - expenses;
const spentPercent = Math.round((expenses / income) * 100);

export function CashFlowWidget() {
  return (
    <section className="flex h-full min-h-[300px] flex-col gap-4 bg-ivory-soft p-7" aria-labelledby="cash-flow-title">
      <h2 id="cash-flow-title" className="font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-ink-muted">Balance de agosto</h2>
      <p className="font-serif text-[48px] leading-none tracking-[-0.015em] lining-nums tabular-nums text-ink">+1.326,72 €</p>
      <div
        role="img"
        aria-label={`De ${formatEuro(income)} de ingresos se ha gastado el ${spentPercent}% y queda disponible el ${100 - spentPercent}%`}
        className="flex h-2.5 gap-0.5"
      >
        <div className="bg-terracotta" style={{ flex: `${expenses} 1 0` }} />
        <div className="bg-petrol" style={{ flex: `${available} 1 0` }} />
      </div>
      <div className="flex justify-between text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2 bg-terracotta" />Gastado {spentPercent}%</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2 bg-petrol" />Disponible {100 - spentPercent}%</span>
      </div>
      <dl className="mt-auto grid grid-cols-2 border-t border-stone-line">
        <div className="pt-3.5"><dt className="text-xs text-ink-muted">Ingresos</dt><dd className="mt-1 text-base font-semibold tabular-nums text-ink">3.240,00 €</dd></div>
        <div className="border-l border-stone-line pl-4 pt-3.5"><dt className="text-xs text-ink-muted">Gastos</dt><dd className="mt-1 text-base font-semibold tabular-nums text-ink">1.913,28 €</dd></div>
      </dl>
    </section>
  );
}
