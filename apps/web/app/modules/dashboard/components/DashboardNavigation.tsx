import { CircleHelp, LayoutDashboard, LogOut, PiggyBank, ReceiptText, Settings, Sparkles, Target, WalletCards, X } from "lucide-react";

const navItems = [
  { label: "Resumen", icon: LayoutDashboard, active: true },
  { label: "Cuentas", icon: WalletCards },
  { label: "Movimientos", icon: ReceiptText },
  { label: "Presupuestos", icon: Target },
  { label: "Objetivos", icon: PiggyBank },
];

export function DashboardSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open ? <button type="button" aria-label="Cerrar menú" onClick={onClose} className="fixed inset-0 z-40 bg-[#10271e]/30 backdrop-blur-sm lg:hidden" /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-[#e6e9e3] bg-[#f8f9f6] px-4 py-5 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-3"><a href="/dashboard" aria-label="FineX, resumen" className="text-[27px] font-semibold tracking-[-0.05em] text-[#153e2d]">FineX</a><button type="button" onClick={onClose} className="grid size-9 place-items-center text-[#657069] lg:hidden" aria-label="Cerrar menú"><X size={19} /></button></div>
        <nav aria-label="Navegación principal" className="mt-10 space-y-1">
          {navItems.map(({ label, icon: Icon, active }) => <a key={label} href={active ? "/dashboard" : `#${label.toLowerCase()}`} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-[8px] px-3 py-3 text-[14px] font-medium transition-colors ${active ? "bg-[#e7eee9] text-[#153e2d]" : "text-[#68716c] hover:bg-[#eef1ec] hover:text-[#25332c]"}`}><Icon size={18} strokeWidth={active ? 2.2 : 1.8} />{label}</a>)}
        </nav>
        <div className="mt-auto">
          <div className="mb-4 rounded-[10px] border border-[#dfe5dd] bg-white p-4"><div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#718078]"><Sparkles size={14} /> Plan esencial</div><p className="mt-2 text-[13px] leading-5 text-[#69716d]">Tus finanzas están sincronizadas y al día.</p></div>
          <a href="#ayuda" className="flex items-center gap-3 px-3 py-2.5 text-[14px] text-[#68716c] hover:text-[#153e2d]"><CircleHelp size={18} /> Ayuda</a>
          <a href="#ajustes" className="flex items-center gap-3 px-3 py-2.5 text-[14px] text-[#68716c] hover:text-[#153e2d]"><Settings size={18} /> Ajustes</a>
          <button type="button" className="mt-4 flex w-full items-center gap-3 border-t border-[#e1e5df] px-3 pt-5 text-left text-[14px] text-[#68716c] hover:text-[#153e2d]"><LogOut size={18} /> Cerrar sesión</button>
        </div>
      </aside>
    </>
  );
}

export function MobileNavigation() {
  return (
    <nav aria-label="Navegación móvil" className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-[12px] border border-[#dfe5de] bg-white/95 px-2 py-2 shadow-[0_12px_40px_rgba(24,52,43,0.16)] backdrop-blur lg:hidden">
      {[{ label: "Resumen", icon: LayoutDashboard, active: true }, { label: "Cuentas", icon: WalletCards }, { label: "Movimientos", icon: ReceiptText }, { label: "Objetivos", icon: Target }].map(({ label, icon: Icon, active }) => <a key={label} href={active ? "/dashboard" : `#${label.toLowerCase()}`} className={`flex flex-col items-center gap-1 rounded-[8px] py-1.5 text-[10px] font-medium ${active ? "bg-[#eaf0eb] text-[#194932]" : "text-[#7b847f]"}`}><Icon size={18} />{label}</a>)}
    </nav>
  );
}
