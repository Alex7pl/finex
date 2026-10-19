import { ArrowLeftIcon, ArrowRightIcon, ArrowsInSimpleIcon, ArrowsOutSimpleIcon, DotsSixVerticalIcon, XIcon } from "@phosphor-icons/react";
import type { DragEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DashboardWidgetId } from "../dashboard-layout.js";

interface WidgetFrameProps {
  id: DashboardWidgetId;
  title: string;
  className: string;
  isEditing: boolean;
  isDragging: boolean;
  canMovePrevious: boolean;
  canMoveNext: boolean;
  canShrink: boolean;
  canGrow: boolean;
  sizeLabel: string;
  children: ReactNode;
  onDragStart: (event: DragEvent<HTMLButtonElement>, id: DashboardWidgetId) => void;
  onDragEnter: (id: DashboardWidgetId) => void;
  onDragEnd: () => void;
  onMovePrevious: () => void;
  onMoveNext: () => void;
  onShrink: () => void;
  onGrow: () => void;
  onRemove: () => void;
}

const toolClassName = "grid size-8 place-items-center text-ink-muted transition-[background-color,color,transform] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:bg-[#eae2d2] hover:text-ink active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-deep";

export function WidgetFrame({ id, title, className, isEditing, isDragging, canMovePrevious, canMoveNext, canShrink, canGrow, sizeLabel, children, onDragStart, onDragEnter, onDragEnd, onMovePrevious, onMoveNext, onShrink, onGrow, onRemove }: WidgetFrameProps) {
  return (
    <div
      data-widget-id={id}
      data-widget-size={sizeLabel}
      className={`${className} fx-cell relative min-w-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDragging ? "scale-[0.985] opacity-45" : ""} ${isEditing ? "outline-1 -outline-offset-8 outline-dashed outline-gold-deep/70" : ""}`}
      onDragEnter={(event) => {
        if (!isEditing) return;
        event.preventDefault();
        onDragEnter(id);
      }}
      onDragOver={(event) => {
        if (isEditing) event.preventDefault();
      }}
    >
      {isEditing ? (
        <div role="toolbar" aria-label={`Opciones de ${title}`} className="absolute right-3 top-3 z-10 flex items-center gap-0.5 border border-border bg-ivory-soft p-1 shadow-[0_16px_32px_-16px_rgba(13,26,33,0.4)]">
          <button type="button" draggable onDragStart={(event) => onDragStart(event, id)} onDragEnd={onDragEnd} className={cn(toolClassName, "cursor-grab active:cursor-grabbing")} aria-label={`Arrastrar ${title}`} title="Arrastrar widget"><DotsSixVerticalIcon size={16} aria-hidden="true" /></button>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <button type="button" onClick={onMovePrevious} disabled={!canMovePrevious} className={toolClassName} aria-label={`Mover ${title} hacia atrás`}><ArrowLeftIcon size={16} aria-hidden="true" /></button>
          <button type="button" onClick={onMoveNext} disabled={!canMoveNext} className={toolClassName} aria-label={`Mover ${title} hacia delante`}><ArrowRightIcon size={16} aria-hidden="true" /></button>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <button type="button" onClick={onShrink} disabled={!canShrink} className={toolClassName} aria-label={`Reducir ${title}; tamaño actual ${sizeLabel}`} title="Reducir widget"><ArrowsInSimpleIcon size={16} aria-hidden="true" /></button>
          <button type="button" onClick={onGrow} disabled={!canGrow} className={toolClassName} aria-label={`Ampliar ${title}; tamaño actual ${sizeLabel}`} title="Ampliar widget"><ArrowsOutSimpleIcon size={16} aria-hidden="true" /></button>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <button type="button" onClick={onRemove} className={cn(toolClassName, "text-danger hover:bg-danger/10 hover:text-danger")} aria-label={`Quitar ${title} del dashboard`}><XIcon size={16} aria-hidden="true" /></button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
