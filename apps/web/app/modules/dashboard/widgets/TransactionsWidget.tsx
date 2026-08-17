import { ArrowDownLeft, Car, ChevronRight, ShoppingBag, Utensils } from "lucide-react";

const transactions = [
  { name: "Nómina", detail: "Trabajo · Hoy, 09:14", amount: "+2.840,00 €", positive: true, icon: ArrowDownLeft, tone: "bg-emerald-50 text-emerald-700" },
  { name: "Mercadona", detail: "Alimentación · Ayer, 18:42", amount: "−64,28 €", positive: false, icon: ShoppingBag, tone: "bg-amber-50 text-amber-700" },
  { name: "Restaurante Nómada", detail: "Restaurantes · 16 ago, 21:08", amount: "−38,90 €", positive: false, icon: Utensils, tone: "bg-rose-50 text-rose-700" },
  { name: "Repsol", detail: "Transporte · 15 ago, 08:31", amount: "−52,10 €", positive: false, icon: Car, tone: "bg-sky-50 text-sky-700" },
];

export function TransactionsWidget() {
  return (
    <section className="h-full rounded-[12px] border border-[#e4e7e1] bg-white" aria-labelledby="transactions-title">
      <div className="flex items-center justify-between border-b border-[#eceeea] px-5 py-5 sm:px-6">
        <div><h2 id="transactions-title" className="text-[17px] font-semibold tracking-[-0.02em] text-[#26322c]">Últimos movimientos</h2><p className="mt-1 text-[12px] text-[#8a918d]">Todas tus cuentas</p></div>
        <a href="#movimientos" className="flex items-center gap-1 text-[12px] font-semibold text-[#286649]">Ver todos <ChevronRight size={14} /></a>
      </div>
      <div className="divide-y divide-[#eff1ed] px-5 sm:px-6">
        {transactions.map(({ name, detail, amount, positive, icon: Icon, tone }) => (
          <div key={`${name}-${detail}`} className="flex items-center gap-3 py-4">
            <div className={`grid size-9 shrink-0 place-items-center rounded-[8px] ${tone}`}><Icon size={17} /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-[#354039]">{name}</p><p className="mt-0.5 truncate text-[11px] text-[#929895]">{detail}</p></div>
            <span className={`text-[13px] font-semibold ${positive ? "text-[#2d7453]" : "text-[#3b4540]"}`}>{amount}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
