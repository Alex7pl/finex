import { PlusIcon } from "@phosphor-icons/react";

const accounts = [
  { name: "Cuenta principal", mask: "•••• 4821", balance: "3.742,40 €" },
  { name: "Ahorro", mask: "•••• 1098", balance: "1.150,00 €" },
];

export function AccountsWidget() {
  return (
    <section className="flex h-full min-h-[300px] flex-col gap-4 bg-ivory-soft p-7" aria-labelledby="accounts-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="accounts-title" className="text-[15px] font-semibold text-ink">Mis cuentas</h2>
        <button type="button" aria-label="Añadir cuenta" className="action-secondary grid size-9 place-items-center rounded-control"><PlusIcon size={14} aria-hidden="true" /></button>
      </div>
      <div role="img" aria-label="Reparto del saldo: 76% en la cuenta principal y 24% en ahorro" className="flex h-1.5 gap-0.5">
        <span className="bg-primary" style={{ flex: "76 1 0" }} />
        <span className="bg-gold-deep" style={{ flex: "24 1 0" }} />
      </div>
      <ul className="mt-auto flex flex-col">
        {accounts.map(({ name, mask, balance }, index) => (
          <li key={mask} className={`flex items-center justify-between gap-3 py-3 ${index < accounts.length - 1 ? "border-b border-stone-line" : ""}`}>
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className={`size-2 ${index === 0 ? "bg-primary" : "bg-gold-deep"}`} />
              <span className="flex flex-col"><strong className="text-[13px] font-semibold text-ink">{name}</strong><span className="font-mono text-[11px] text-ink-muted">{mask}</span></span>
            </span>
            <strong className="text-sm font-semibold tabular-nums text-ink">{balance}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
