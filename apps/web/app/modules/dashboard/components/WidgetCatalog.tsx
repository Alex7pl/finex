import { Check, Plus, X } from "lucide-react";
import { useEffect } from "react";
import type { DashboardWidgetId } from "../dashboard-layout.js";
import { dashboardWidgetRegistry } from "../widgets/widget-registry.js";

interface WidgetCatalogProps {
  open: boolean;
  visibleWidgetIds: DashboardWidgetId[];
  onAdd: (widgetId: DashboardWidgetId) => void;
  onClose: () => void;
}

export function WidgetCatalog({ open, visibleWidgetIds, onAdd, onClose }: WidgetCatalogProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-[#10271e]/35 p-3 backdrop-blur-sm sm:place-items-center sm:p-6" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="widget-catalog-title" className="max-h-[86vh] w-full max-w-[620px] overflow-y-auto rounded-[14px] border border-[#dfe5de] bg-[#f8f9f6] p-5 shadow-[0_24px_80px_rgba(17,45,32,0.22)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[#4f765f]">Biblioteca</p><h2 id="widget-catalog-title" className="mt-1 text-[23px] font-semibold tracking-[-0.035em] text-[#203029]">Añadir widgets</h2><p className="mt-2 text-[13px] text-[#7a847e]">Elige qué información quieres tener más a mano.</p></div>
          <button type="button" autoFocus onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-[8px] border border-[#dce2dc] bg-white text-[#66736b] hover:bg-[#f0f3ef]" aria-label="Cerrar biblioteca"><X size={17} /></button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Object.values(dashboardWidgetRegistry).map(({ id, title, description, icon: Icon }) => {
            const isVisible = visibleWidgetIds.includes(id);
            return (
              <article key={id} className="flex min-h-[150px] flex-col rounded-[10px] border border-[#e0e5df] bg-white p-4">
                <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-[8px] bg-[#eaf0eb] text-[#315f45]"><Icon size={18} /></span>{isVisible ? <span className="flex items-center gap-1 text-[11px] font-semibold text-[#5d7c69]"><Check size={13} /> Añadido</span> : null}</div>
                <h3 className="mt-4 text-[14px] font-semibold text-[#334139]">{title}</h3>
                <p className="mt-1 text-[12px] leading-4 text-[#87908a]">{description}</p>
                <button type="button" disabled={isVisible} onClick={() => onAdd(id)} className="mt-auto flex items-center justify-center gap-1.5 rounded-[7px] border border-[#d7dfd8] px-3 py-2 text-[12px] font-semibold text-[#2d6345] hover:bg-[#eef3ef] disabled:cursor-default disabled:border-transparent disabled:bg-[#f2f4f1] disabled:text-[#969e99]"><Plus size={14} /> {isVisible ? "Ya está en tu panel" : "Añadir al panel"}</button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
