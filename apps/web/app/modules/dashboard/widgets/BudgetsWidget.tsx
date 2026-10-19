import { CaretRightIcon } from "@phosphor-icons/react";
import { formatEuro } from "./chart-utils.js";

const budgets = [
  { name: "Alimentación", spent: 326, total: 450, percent: 72 },
  { name: "Restaurantes", spent: 184, total: 220, percent: 84 },
  { name: "Transporte", spent: 96, total: 180, percent: 53 },
];

/* A partir de este consumo el presupuesto pasa a terracota como aviso. */
const warningPercent = 80;

export function BudgetsWidget() {
  return (
    <section className="flex h-full min-h-[300px] flex-col gap-6 bg-ivory-soft p-7" aria-labelledby="budget-title">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1"><h2 id="budget-title" className="text-[15px] font-semibold text-ink">Presupuestos</h2><p className="text-xs text-ink-muted">Agosto · 19 días restantes</p></div>
        <a href="#presupuestos" className="flex min-h-6 items-center gap-1 text-xs font-semibold text-petrol transition-colors duration-500 hover:text-primary">Ver todos <CaretRightIcon size={12} aria-hidden="true" /></a>
      </div>
      <ul className="flex flex-col gap-5">
        {budgets.map(({ name, spent, total, percent }) => {
          const warning = percent >= warningPercent;
          return (
            <li key={name} className="flex flex-col gap-2">
              <div className="flex justify-between gap-2 text-[13px]">
                <span className="flex items-center gap-2 text-ink">
                  {name}
                  {warning ? <span className="bg-terracotta-deep px-1.5 py-px text-[11px] font-semibold tabular-nums text-ivory-soft">{percent}%</span> : null}
                </span>
                <span className={`tabular-nums ${warning ? "text-terracotta-deep" : "text-ink-muted"}`}>{formatEuro(spent)} de {formatEuro(total)}</span>
              </div>
              <div
                role="img"
                aria-label={`${name}: ${percent}% consumido${warning ? ", cerca del límite" : ""}`}
                className={`relative h-1 ${warning ? "bg-[#ebd9cc]" : "bg-stone-line"}`}
              >
                <div className={`h-full ${warning ? "bg-terracotta" : "bg-petrol"}`} style={{ width: `${percent}%` }} />
                {warning ? <span aria-hidden="true" className="fx-node absolute -top-0.5 size-2 bg-terracotta shadow-[0_0_10px_rgba(169,80,44,0.6)]" style={{ left: `calc(${percent}% - 4px)` }} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
