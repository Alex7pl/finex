import { ArrowLeft, ArrowRight, GripVertical, Maximize2, Minimize2, X } from "lucide-react";
import type { DragEvent, ReactNode } from "react";
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

export function WidgetFrame({ id, title, className, isEditing, isDragging, canMovePrevious, canMoveNext, canShrink, canGrow, sizeLabel, children, onDragStart, onDragEnter, onDragEnd, onMovePrevious, onMoveNext, onShrink, onGrow, onRemove }: WidgetFrameProps) {
  return (
    <div
      data-widget-id={id}
      data-widget-size={sizeLabel}
      className={`${className} relative min-w-0 transition-[opacity,transform] duration-150 ${isDragging ? "scale-[0.985] opacity-45" : ""} ${isEditing ? "rounded-[14px] ring-2 ring-[#7fa58c]/45 ring-offset-2 ring-offset-[#f5f6f2]" : ""}`}
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
        <div className="absolute right-2 top-2 z-10 flex items-center rounded-[8px] border border-[#d9e1da] bg-white p-1 shadow-[0_6px_18px_rgba(24,52,43,0.12)]">
          <button type="button" draggable onDragStart={(event) => onDragStart(event, id)} onDragEnd={onDragEnd} className="grid size-8 cursor-grab place-items-center rounded-[6px] text-[#68766e] hover:bg-[#eef2ed] active:cursor-grabbing" aria-label={`Arrastrar ${title}`} title="Arrastrar widget"><GripVertical size={16} /></button>
          <span className="mx-1 h-5 w-px bg-[#e5e9e4]" />
          <button type="button" onClick={onMovePrevious} disabled={!canMovePrevious} className="grid size-8 place-items-center rounded-[6px] text-[#68766e] hover:bg-[#eef2ed] disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Mover ${title} hacia atrás`}><ArrowLeft size={15} /></button>
          <button type="button" onClick={onMoveNext} disabled={!canMoveNext} className="grid size-8 place-items-center rounded-[6px] text-[#68766e] hover:bg-[#eef2ed] disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Mover ${title} hacia delante`}><ArrowRight size={15} /></button>
          <span className="mx-1 h-5 w-px bg-[#e5e9e4]" />
          <button type="button" onClick={onShrink} disabled={!canShrink} className="grid size-8 place-items-center rounded-[6px] text-[#526d5d] hover:bg-[#eef2ed] disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Reducir ${title}; tamaño actual ${sizeLabel}`} title="Reducir widget"><Minimize2 size={15} /></button>
          <button type="button" onClick={onGrow} disabled={!canGrow} className="grid size-8 place-items-center rounded-[6px] text-[#526d5d] hover:bg-[#eef2ed] disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Ampliar ${title}; tamaño actual ${sizeLabel}`} title="Ampliar widget"><Maximize2 size={15} /></button>
          <span className="mx-1 h-5 w-px bg-[#e5e9e4]" />
          <button type="button" onClick={onRemove} className="grid size-8 place-items-center rounded-[6px] text-[#9a5a50] hover:bg-[#fbefec]" aria-label={`Quitar ${title} del dashboard`}><X size={15} /></button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
