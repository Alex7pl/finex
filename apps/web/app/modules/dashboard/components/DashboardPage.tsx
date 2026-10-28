import { useNavigate, useNavigation } from "react-router";
import type { DashboardData } from "../dashboard.types.js";
import { dashboardHref } from "../dashboard-period.js";
import { ProfileDialog } from "./ProfileDialog.js";
import { TransactionDialog } from "./TransactionDialog.js";
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  ListIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import { PaintDefs } from "@/components/art/Paint.js";
import { notify } from "@/libs/notifications.js";
import {
  dashboardWidgetIds,
  type DashboardWidgetId,
} from "../dashboard-layout.js";
import { useDashboardLayout } from "../hooks/useDashboardLayout.js";
import { dashboardWidgetRegistry } from "../widgets/widget-registry.js";
import { DashboardBackdrop } from "./DashboardBackdrop.js";
import { DashboardSidebar, MobileNavigation } from "./DashboardNavigation.js";
import { DashboardWidgetGrid } from "./DashboardWidgetGrid.js";
import { WidgetCatalog } from "./WidgetCatalog.js";

export function DashboardPage({ dashboard }: { dashboard: DashboardData }) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [profileOpen, setProfileOpen] = useState(false);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [layoutMessage, setLayoutMessage] = useState("");
  const {
    widgetOrder,
    widgetSizes,
    add,
    remove,
    move,
    moveRelative,
    resize,
    reset,
  } = useDashboardLayout();
  const hiddenWidgetCount = useMemo(
    () => dashboardWidgetIds.length - widgetOrder.length,
    [widgetOrder],
  );

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
    <div className="relative min-h-screen bg-canvas font-sans text-ink">
      <PaintDefs />
      <DashboardBackdrop />
      <DashboardSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={dashboard.user}
        onOpenProfile={() => {
          setMenuOpen(false);
          setProfileOpen(true);
        }}
      />
      <div className="relative z-10 lg:pl-[248px]">
        <main
          aria-busy={navigation.state !== "idle"}
          className="mx-auto max-w-[1320px] px-4 pb-32 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-16"
        >
          <div className="fx-in mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-ink">
                {new Intl.DateTimeFormat("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/Madrid",
                }).format(new Date(dashboard.now))}
              </p>
              <h1 className="font-serif text-[44px] font-normal leading-none tracking-[-0.015em] sm:text-[52px]">
                Hola, <em className="italic">{dashboard.user.username}</em>
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Aquí tienes una vista clara de cómo va tu dinero.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menú"
                aria-expanded={menuOpen}
                className="action-secondary grid size-11 place-items-center rounded-control lg:hidden"
              >
                <ListIcon size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing((current) => !current)}
                aria-pressed={isEditing}
                className="action-secondary flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-medium"
              >
                {isEditing ? (
                  <CheckIcon size={16} aria-hidden="true" />
                ) : (
                  <SlidersHorizontalIcon size={16} aria-hidden="true" />
                )}
                {isEditing ? "Terminar" : "Personalizar"}
              </button>
            </div>
          </div>

          {isEditing ? (
            <section
              className="fx-in mb-6 flex flex-col justify-between gap-4 border border-[#dcc9a4] bg-parchment p-4 sm:flex-row sm:items-center"
              aria-label="Controles de personalización"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-ink">
                  Personaliza tu resumen
                </p>
                <p className="max-w-[560px] text-xs text-[#4a3a20]">
                  Arrastra, mueve o ajusta el ancho de cada widget. Los límites
                  protegen la legibilidad y los cambios se guardan en este
                  dispositivo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCatalogOpen(true)}
                  className="action-primary flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold"
                >
                  <PlusIcon size={16} aria-hidden="true" /> Añadir widgets
                  {hiddenWidgetCount > 0 ? ` (${hiddenWidgetCount})` : ""}
                </button>
                <button
                  type="button"
                  onClick={resetLayout}
                  className="action-secondary flex min-h-11 items-center gap-2 rounded-control border-transparent px-4 text-sm font-medium"
                >
                  <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />{" "}
                  Restablecer
                </button>
              </div>
            </section>
          ) : null}

          <p className="sr-only" aria-live="polite">
            {layoutMessage}
          </p>
          <DashboardWidgetGrid
            dashboard={dashboard}
            widgetOrder={widgetOrder}
            widgetSizes={widgetSizes}
            isEditing={isEditing}
            onMove={move}
            onMoveRelative={moveRelative}
            onResize={resize}
            onRemove={removeWidget}
            onOpenCatalog={() => setCatalogOpen(true)}
            onLayoutMessage={setLayoutMessage}
          />
        </main>
      </div>
      <MobileNavigation
        user={dashboard.user}
        onOpenProfile={() => setProfileOpen(true)}
      />
      {navigation.state !== "idle" ? (
        <p
          role="status"
          className="fixed bottom-20 right-5 z-30 bg-night p-3 text-sm text-ivory lg:bottom-5"
        >
          Actualizando datos…
        </p>
      ) : null}
      {profileOpen ? (
        <ProfileDialog user={dashboard.user} onClose={closeProfile} />
      ) : null}
      {dashboard.transaction ? (
        <TransactionDialog
          transaction={dashboard.transaction}
          onClose={() =>
            navigate(dashboardHref(dashboard.filters, {}), {
              preventScrollReset: true,
              replace: true,
            })
          }
        />
      ) : null}
      <WidgetCatalog
        open={catalogOpen}
        visibleWidgetIds={widgetOrder}
        onAdd={addWidget}
        onClose={() => setCatalogOpen(false)}
      />
    </div>
  );
}
