import { Check, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { notify } from "@/libs/notifications.js";
import { dashboardWidgetIds, type DashboardWidgetId } from "../dashboard-layout.js";
import { useDashboardLayout } from "../hooks/useDashboardLayout.js";
import { dashboardWidgetRegistry } from "../widgets/widget-registry.js";
import { DashboardHeader } from "./DashboardHeader.js";
import { DashboardSidebar, MobileNavigation } from "./DashboardNavigation.js";
import { DashboardWidgetGrid } from "./DashboardWidgetGrid.js";
import { WidgetCatalog } from "./WidgetCatalog.js";

export function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [layoutMessage, setLayoutMessage] = useState("");
  const { widgetOrder, widgetSizes, add, remove, move, moveRelative, resize, reset } = useDashboardLayout();
  const hiddenWidgetCount = useMemo(() => dashboardWidgetIds.length - widgetOrder.length, [widgetOrder]);

  function addWidget(widgetId: DashboardWidgetId) {
    add(widgetId);
    const title = dashboardWidgetRegistry[widgetId].title;
    setLayoutMessage(`${title} añadido al dashboard.`);
    notify.success(`${title} añadido.`);
  }

  function removeWidget(widgetId: DashboardWidgetId) {
    remove(widgetId);
    const title = dashboardWidgetRegistry[widgetId].title;
    setLayoutMessage(`${title} quitado del dashboard.`);
    notify.info(`${title} ocultado. Puedes recuperarlo desde Añadir widgets.`);
  }

  function resetLayout() {
    reset();
    setLayoutMessage("Se ha restablecido la disposición predeterminada.");
    notify.success("Dashboard restablecido.");
  }

  return (
    <div className="min-h-screen bg-[#f5f6f2] font-sans text-[#334039]">
      <DashboardSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-[264px]">
        <DashboardHeader onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-[1500px] px-4 pb-28 pt-7 sm:px-7 sm:pt-9 lg:px-9 lg:pb-12">
          <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-[13px] font-medium text-[#728078]">Lunes, 17 de agosto</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[#1d2923] sm:text-[32px]">Buenos días, Ana</h1><p className="mt-2 text-[13px] text-[#7e8782]">Aquí tienes una vista clara de cómo va tu dinero.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setIsEditing((current) => !current)} className={`flex items-center gap-2 rounded-control border px-4 py-2.5 text-[12px] font-semibold transition-colors ${isEditing ? "border-[#aec1b2] bg-[#e7efe9] text-[#28563d]" : "border-[#d9dfd9] bg-white text-[#536159] hover:bg-[#f9faf8]"}`}>{isEditing ? <Check size={16} /> : <SlidersHorizontal size={16} />}{isEditing ? "Terminar" : "Personalizar"}</button>
              <button type="button" className="action-primary flex items-center gap-2 rounded-control px-4 py-2.5 text-[12px] font-semibold"><Plus size={16} /> Añadir movimiento</button>
            </div>
          </div>

          {isEditing ? (
            <section className="mb-5 flex flex-col justify-between gap-4 rounded-[11px] border border-[#d6e0d8] bg-[#edf3ee] px-4 py-4 sm:flex-row sm:items-center" aria-label="Controles de personalización">
              <div><p className="text-[13px] font-semibold text-[#315b42]">Personaliza tu resumen</p><p className="mt-1 text-[12px] text-[#718078]">Arrastra, mueve o ajusta el ancho de cada widget. Los límites protegen la legibilidad y los cambios se guardan en este dispositivo.</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCatalogOpen(true)} className="flex items-center gap-2 rounded-[7px] border border-[#cbd8ce] bg-white px-3 py-2 text-[12px] font-semibold text-[#315f45] hover:bg-[#f8faf8]"><Plus size={15} /> Añadir widgets{hiddenWidgetCount > 0 ? ` (${hiddenWidgetCount})` : ""}</button>
                <button type="button" onClick={resetLayout} className="flex items-center gap-2 rounded-[7px] px-3 py-2 text-[12px] font-medium text-[#647169] hover:bg-white/65"><RotateCcw size={14} /> Restablecer</button>
              </div>
            </section>
          ) : null}

          <p className="sr-only" aria-live="polite">{layoutMessage}</p>
          <DashboardWidgetGrid widgetOrder={widgetOrder} widgetSizes={widgetSizes} isEditing={isEditing} onMove={move} onMoveRelative={moveRelative} onResize={resize} onRemove={removeWidget} onOpenCatalog={() => setCatalogOpen(true)} onLayoutMessage={setLayoutMessage} />
        </main>
      </div>
      <MobileNavigation />
      <WidgetCatalog open={catalogOpen} visibleWidgetIds={widgetOrder} onAdd={addWidget} onClose={() => setCatalogOpen(false)} />
    </div>
  );
}
