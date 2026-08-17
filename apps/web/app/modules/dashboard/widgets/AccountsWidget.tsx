import { CreditCard, Plus, WalletCards } from "lucide-react";

export function AccountsWidget() {
  return (
    <section className="h-full min-h-[270px] rounded-[12px] border border-[#e4e7e1] bg-white p-5 sm:p-6" aria-labelledby="accounts-title">
      <div className="flex items-center justify-between"><h2 id="accounts-title" className="text-[17px] font-semibold tracking-[-0.02em] text-[#26322c]">Mis cuentas</h2><button type="button" aria-label="Añadir cuenta" className="grid size-8 place-items-center rounded-[7px] border border-[#dfe4de] text-[#356148] hover:bg-[#f2f5f1]"><Plus size={16} /></button></div>
      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3 rounded-[9px] bg-[#f6f7f4] p-3.5"><div className="grid size-9 place-items-center rounded-[8px] bg-[#e2ebe5] text-[#1f5a40]"><WalletCards size={17} /></div><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[#3b4640]">Cuenta principal</p><p className="mt-0.5 text-[11px] text-[#929995]">•••• 4821</p></div><strong className="text-[13px] text-[#354039]">3.742,40 €</strong></div>
        <div className="flex items-center gap-3 rounded-[9px] p-3.5"><div className="grid size-9 place-items-center rounded-[8px] bg-[#f1ece3] text-[#8a6832]"><CreditCard size={17} /></div><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[#3b4640]">Ahorro</p><p className="mt-0.5 text-[11px] text-[#929995]">•••• 1098</p></div><strong className="text-[13px] text-[#354039]">1.150,00 €</strong></div>
      </div>
    </section>
  );
}
