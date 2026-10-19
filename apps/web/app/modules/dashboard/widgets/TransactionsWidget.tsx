import { CaretRightIcon } from "@phosphor-icons/react";

const transactions = [
  { name: "Nómina", category: "Trabajo", date: "Hoy, 09:14", amount: "+2.840,00 €", positive: true },
  { name: "Mercadona", category: "Alimentación", date: "Ayer, 18:42", amount: "−64,28 €", positive: false },
  { name: "Restaurante Nómada", category: "Restaurantes", date: "16 ago, 21:08", amount: "−38,90 €", positive: false },
  { name: "Repsol", category: "Transporte", date: "15 ago, 08:31", amount: "−52,10 €", positive: false },
];

/* Tabla densa: aquí manda la lectura, no la decoración. */
export function TransactionsWidget() {
  return (
    <section className="flex h-full flex-col gap-2 bg-ivory-soft px-7 pb-3 pt-6" aria-labelledby="transactions-title">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1"><h2 id="transactions-title" className="text-[15px] font-semibold text-ink">Últimos movimientos</h2><p className="text-xs text-ink-muted">Todas tus cuentas</p></div>
        <a href="#movimientos" className="flex min-h-6 items-center gap-1 text-xs font-semibold text-petrol transition-colors duration-500 hover:text-primary">Ver todos <CaretRightIcon size={12} aria-hidden="true" /></a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[13px]">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              <th scope="col" className="border-b border-stone-line py-2.5 font-normal">Concepto</th>
              <th scope="col" className="border-b border-stone-line py-2.5 font-normal">Categoría</th>
              <th scope="col" className="border-b border-stone-line py-2.5 font-normal">Fecha</th>
              <th scope="col" className="border-b border-stone-line py-2.5 text-right font-normal">Importe</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(({ name, category, date, amount, positive }, index) => {
              const cell = `py-3 ${index < transactions.length - 1 ? "border-b border-[#ece4d6]" : ""}`;
              return (
                <tr key={`${name}-${date}`} className="transition-colors duration-300 hover:bg-canvas">
                  <td className={`${cell} font-semibold text-ink`}>{name}</td>
                  <td className={`${cell} text-ink-muted`}>{category}</td>
                  <td className={`${cell} tabular-nums text-ink-muted`}>{date}</td>
                  <td className={`${cell} text-right font-semibold tabular-nums ${positive ? "text-petrol" : "text-ink"}`}>{amount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
