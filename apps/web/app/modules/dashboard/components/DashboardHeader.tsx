import { Bell, CalendarDays, ChevronDown, Menu, Search } from "lucide-react";

export function DashboardHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-[#e2e6df] bg-[#f5f6f2]/90 px-4 backdrop-blur-md sm:px-7 lg:px-9">
      <button type="button" onClick={onOpenMenu} className="grid size-9 shrink-0 place-items-center rounded-[7px] border border-[#dfe4de] text-[#57625c] lg:hidden" aria-label="Abrir menú"><Menu size={18} /></button>
      <div className="relative hidden max-w-[300px] flex-1 md:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a938e]" /><input aria-label="Buscar movimientos" placeholder="Buscar movimientos..." className="h-9 w-full rounded-[7px] border border-[#e0e4de] bg-white/70 pl-9 pr-3 text-[12px] text-[#37443d] outline-none placeholder:text-[#a0a6a2] focus:border-[#9fb5a7] focus:ring-2 focus:ring-[#dfe9e2]" /></div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button type="button" className="hidden items-center gap-2 rounded-[7px] border border-[#dfe4de] bg-white px-3 py-2 text-[12px] font-medium text-[#4c5952] hover:bg-[#f8faf7] sm:flex"><CalendarDays size={15} /> Agosto 2026 <ChevronDown size={14} /></button>
        <button type="button" className="relative grid size-9 place-items-center rounded-[7px] border border-[#dfe4de] bg-white text-[#5d6862] hover:bg-[#f8faf7]" aria-label="Notificaciones"><Bell size={17} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#d4715d]" /></button>
        <button type="button" className="flex items-center gap-2 rounded-[7px] py-1 pl-1 pr-1 sm:pr-2" aria-label="Abrir perfil de Ana López"><span className="grid size-8 place-items-center rounded-[7px] bg-[#254f3b] text-[11px] font-semibold text-white">AL</span><span className="hidden text-left sm:block"><strong className="block text-[12px] font-semibold text-[#3a453f]">Ana López</strong><small className="block text-[10px] text-[#8c938f]">Cuenta personal</small></span><ChevronDown size={14} className="hidden text-[#7d8681] sm:block" /></button>
      </div>
    </header>
  );
}
