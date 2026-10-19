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
import { PaintTexture } from "@/components/art/Paint.js";

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
      <section className="grid min-h-[420px] place-items-center border border-[#d3c8b3] bg-ivory-soft px-6 py-12 text-center" aria-labelledby="empty-dashboard-title">
        <div className="flex max-w-[380px] flex-col items-center gap-4">
          <svg aria-hidden="true" viewBox="0 0 300 200" className="h-[200px] w-full max-w-[300px]">
            <defs><clipPath id="empty-arch"><path d="M60 200 V90 A90 90 0 0 1 240 90 V200 Z" /></clipPath></defs>
            <g clipPath="url(#empty-arch)">
              <rect width="300" height="200" fill="url(#paint-sky)" />
              <rect y="160" width="300" height="40" fill="#94482a" />
              <g className="fx-sway" style={{ transformOrigin: "150px 0" }}>
                <path d="M150 0 V118" stroke="#ddbf8a" strokeWidth={1.2} />
                <circle cx="150" cy="122" r="4" fill="url(#paint-orb)" />
              </g>
              <g filter="url(#paint-cloud)">
                <ellipse cx="200" cy="140" rx="70" ry="8" fill="#7e8072" />
                <ellipse cx="192" cy="136" rx="44" ry="4" fill="#e6d6b8" />
              </g>
              <path d="M120 172 L230 196 L232 192 L124 168 Z" fill="#2b140c" opacity="0.4" />
              <rect x="112" y="150" width="16" height="20" fill="#e3cfa9" />
              <PaintTexture width={300} height={200} />
            </g>
            <path d="M60 200 V90 A90 90 0 0 1 240 90 V200" fill="none" stroke="#c9b48e" />
          </svg>
          <h2 id="empty-dashboard-title" className="font-serif text-[30px] font-normal leading-tight text-balance text-ink">Tu espacio está listo para personalizar</h2>
          <p className="text-sm text-pretty text-ink-muted">Añade los widgets que mejor encajen con la forma en que gestionas tu dinero.</p>
          <button type="button" onClick={onOpenCatalog} className="action-primary mt-1 min-h-11 rounded-control px-5 text-sm font-semibold">Añadir mi primer widget</button>
        </div>
      </section>
    );
  }

  return (
    <div className="polyptych items-stretch md:grid-cols-2 xl:grid-cols-12">
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
