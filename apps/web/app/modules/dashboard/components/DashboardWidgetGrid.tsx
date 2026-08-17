import type { DragEvent } from "react";
import { useState } from "react";
import {
  dashboardWidgetSizeRules,
  type DashboardWidgetId,
  type DashboardWidgetSizes,
} from "../dashboard-layout.js";
import {
  dashboardWidgetRegistry,
  dashboardWidgetSizeClassNames,
  dashboardWidgetSizeLabels,
} from "../widgets/widget-registry.js";
import { WidgetFrame } from "../widgets/WidgetFrame.js";

interface DashboardWidgetGridProps {
  widgetOrder: DashboardWidgetId[];
  widgetSizes: DashboardWidgetSizes;
  isEditing: boolean;
  onMove: (widgetId: DashboardWidgetId, targetIndex: number) => void;
  onMoveRelative: (widgetId: DashboardWidgetId, offset: -1 | 1) => void;
  onResize: (widgetId: DashboardWidgetId, direction: -1 | 1) => void;
  onRemove: (widgetId: DashboardWidgetId) => void;
  onOpenCatalog: () => void;
  onLayoutMessage: (message: string) => void;
}

export function DashboardWidgetGrid({ widgetOrder, widgetSizes, isEditing, onMove, onMoveRelative, onResize, onRemove, onOpenCatalog, onLayoutMessage }: DashboardWidgetGridProps) {
  const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null);

  function handleDragStart(event: DragEvent<HTMLButtonElement>, widgetId: DashboardWidgetId) {
    setDraggedWidgetId(widgetId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", widgetId);
  }

  function handleDragEnter(targetId: DashboardWidgetId) {
    if (!draggedWidgetId || draggedWidgetId === targetId) return;
    const targetIndex = widgetOrder.indexOf(targetId);
    onMove(draggedWidgetId, targetIndex);
  }

  if (widgetOrder.length === 0) {
    return (
      <section className="grid min-h-[360px] place-items-center rounded-[14px] border border-dashed border-[#cbd6cd] bg-white/55 px-6 text-center">
        <div className="max-w-sm"><span className="mx-auto grid size-11 place-items-center rounded-[10px] bg-[#e8efe9] text-xl text-[#386148]">+</span><h2 className="mt-4 text-[19px] font-semibold tracking-[-0.025em] text-[#2a3931]">Tu espacio está listo para personalizar</h2><p className="mt-2 text-[13px] leading-5 text-[#7c8780]">Añade los widgets que mejor encajen con la forma en que gestionas tu dinero.</p><button type="button" onClick={onOpenCatalog} className="action-primary mt-5 rounded-control px-4 py-2.5 text-[12px] font-semibold">Añadir mi primer widget</button></div>
      </section>
    );
  }

  return (
    <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-12">
      {widgetOrder.map((widgetId, index) => {
        const definition = dashboardWidgetRegistry[widgetId];
        const Widget = definition.component;
        const widgetSize = widgetSizes[widgetId];
        const allowedSizes = dashboardWidgetSizeRules[widgetId].allowedSizes;
        const sizeIndex = allowedSizes.indexOf(widgetSize);
        const sizeLabel = dashboardWidgetSizeLabels[widgetSize];
        return (
          <WidgetFrame
            key={widgetId}
            id={widgetId}
            title={definition.title}
            className={dashboardWidgetSizeClassNames[widgetSize]}
            isEditing={isEditing}
            isDragging={draggedWidgetId === widgetId}
            canMovePrevious={index > 0}
            canMoveNext={index < widgetOrder.length - 1}
            canShrink={sizeIndex > 0}
            canGrow={sizeIndex < allowedSizes.length - 1}
            sizeLabel={sizeLabel}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={() => {
              setDraggedWidgetId(null);
              onLayoutMessage(`${definition.title} movido.`);
            }}
            onMovePrevious={() => {
              onMoveRelative(widgetId, -1);
              onLayoutMessage(`${definition.title} movido hacia atrás.`);
            }}
            onMoveNext={() => {
              onMoveRelative(widgetId, 1);
              onLayoutMessage(`${definition.title} movido hacia delante.`);
            }}
            onShrink={() => {
              onResize(widgetId, -1);
              onLayoutMessage(`${definition.title} reducido.`);
            }}
            onGrow={() => {
              onResize(widgetId, 1);
              onLayoutMessage(`${definition.title} ampliado.`);
            }}
            onRemove={() => onRemove(widgetId)}
          >
            <Widget />
          </WidgetFrame>
        );
      })}
    </div>
  );
}
