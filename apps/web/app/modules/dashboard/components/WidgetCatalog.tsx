import { CheckIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
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
    <div className="fixed inset-0 z-[70] grid place-items-end bg-night/45 p-4 sm:place-items-center sm:p-6" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="widget-catalog-title" className="fx-in max-h-[86vh] w-full max-w-[680px] overflow-y-auto bg-background shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)] [animation-duration:700ms]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-7 py-6">
          <div className="flex flex-col gap-1.5"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-ink">Biblioteca</p><h2 id="widget-catalog-title" className="font-serif text-[36px] font-normal leading-none text-ink">Añadir widgets</h2><p className="text-sm text-ink-muted">Elige qué información quieres tener más a mano.</p></div>
          <button type="button" autoFocus onClick={onClose} className="action-secondary grid size-10 shrink-0 place-items-center rounded-control border-transparent" aria-label="Cerrar biblioteca"><XIcon size={18} aria-hidden="true" /></button>
        </div>
        <div className="polyptych m-7 sm:grid-cols-2">
          {Object.values(dashboardWidgetRegistry).map(({ id, title, description, icon: Icon }) => {
            const isVisible = visibleWidgetIds.includes(id);
            return (
              <article key={id} className="flex min-h-44 flex-col gap-3 bg-ivory-soft p-5">
                <div className="flex items-center justify-between gap-2"><span className="grid size-10 place-items-center border border-border text-petrol"><Icon size={18} weight="light" aria-hidden="true" /></span>{isVisible ? <span className="flex items-center gap-1 text-xs font-semibold text-petrol"><CheckIcon size={14} aria-hidden="true" /> Añadido</span> : null}</div>
                <div className="flex flex-col gap-1"><h3 className="text-sm font-semibold text-ink">{title}</h3><p className="text-xs text-ink-muted">{description}</p></div>
                <button type="button" disabled={isVisible} onClick={() => onAdd(id)} className={`mt-auto flex min-h-11 items-center justify-center gap-2 rounded-control px-3 text-sm font-semibold disabled:cursor-default ${isVisible ? "action-secondary text-ink-muted" : "action-primary"}`}>{isVisible ? "Ya está en tu panel" : <><PlusIcon size={14} aria-hidden="true" /> Añadir al panel</>}</button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
