import { BellIcon, CalendarBlankIcon, CaretDownIcon, ListIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

const control = "action-secondary flex h-10 items-center rounded-control";

export function DashboardHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-canvas/92 px-4 py-3.5 backdrop-blur-sm sm:px-6 lg:px-10">
      <button type="button" onClick={onOpenMenu} className={`${control} size-10 shrink-0 justify-center lg:hidden`} aria-label="Abrir menú"><ListIcon size={18} aria-hidden="true" /></button>
      <label className="field hidden h-10 max-w-[340px] flex-1 items-center gap-2.5 px-3 text-ink-muted md:flex">
        <MagnifyingGlassIcon size={16} aria-hidden="true" />
        <input aria-label="Buscar movimientos" placeholder="Buscar movimientos" className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-[#8a8478]" />
        <kbd className="border border-border px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">⌘K</kbd>
      </label>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" className={`${control} hidden gap-2 px-3 text-[13px] font-medium sm:flex`}><CalendarBlankIcon size={16} weight="light" aria-hidden="true" /> Agosto 2026 <CaretDownIcon size={12} aria-hidden="true" /></button>
        <button type="button" className={`${control} relative size-10 justify-center`} aria-label="Notificaciones"><BellIcon size={18} weight="light" aria-hidden="true" /><span aria-hidden="true" className="absolute right-2.5 top-2 size-1.5 bg-terracotta" /></button>
        <button type="button" className={`${control} gap-2.5 py-1 pl-1 pr-1 sm:pr-3`} aria-label="Abrir perfil de Ana López">
          <span className="grid size-8 place-items-center rounded-[999px_999px_0_0] bg-primary font-serif text-base text-ivory">AL</span>
          <span className="hidden text-left sm:block"><strong className="block text-xs font-semibold text-ink">Ana López</strong><small className="block text-xs text-ink-muted">Cuenta personal</small></span>
        </button>
      </div>
    </header>
  );
}
