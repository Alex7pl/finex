import type { AnimationEvent, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ToastItem } from "@/libs/notifications.js";
import { beginExit, markVisible, remove } from "@/libs/notifications.js";

const TYPE_META: Record<
  ToastItem["type"],
  {
    title: string;
    icon: ReactNode;
    card: string;
    iconSurface: string;
    progress: string;
  }
> = {
  success: {
    title: "Todo en orden",
    icon: <CheckCircle2 className="size-[18px]" strokeWidth={2.2} />,
    card: "border-[#dce8df] bg-[#fbfdf9]",
    iconSurface: "bg-primary text-primary-foreground",
    progress: "bg-primary",
  },
  error: {
    title: "Algo no ha ido bien",
    icon: <XCircle className="size-[18px]" strokeWidth={2.2} />,
    card: "border-[#f0d9d2] bg-[#fffaf7]",
    iconSurface: "bg-[#9b3d2f] text-white",
    progress: "bg-[#9b3d2f]",
  },
  info: {
    title: "Actualización",
    icon: <Info className="size-[18px]" strokeWidth={2.2} />,
    card: "border-[#e7e1c7] bg-[#fffdf4]",
    iconSurface: "bg-secondary text-secondary-foreground",
    progress: "bg-[#c2a94f]",
  },
  warning: {
    title: "Tenlo en cuenta",
    icon: <AlertTriangle className="size-[18px]" strokeWidth={2.2} />,
    card: "border-[#ecd9b9] bg-[#fffaf0]",
    iconSurface: "bg-[#8a6424] text-white",
    progress: "bg-[#b98631]",
  },
};

interface ToastProps {
  toast: ToastItem;
}

const STATE_CLASS: Record<ToastItem["state"], string> = {
  entering: "toast-enter",
  visible: "toast-visible",
  exiting: "toast-exit",
};

export function Toast({ toast }: ToastProps) {
  const animationClass = STATE_CLASS[toast.state];
  const meta = TYPE_META[toast.type];

  const a11yProps =
    toast.type === "error"
      ? { role: "alert" as const, "aria-live": "assertive" as const }
      : { role: "status" as const };

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    // Ignore the lifetime indicator's own animation.
    if (event.target !== event.currentTarget) return;

    if (toast.state === "entering") {
      markVisible(toast.id);
    } else if (toast.state === "exiting") {
      remove(toast.id);
    }
    // "visible" state has no animation — early return (no-op)
  }

  return (
    <div
      {...a11yProps}
      className={`pointer-events-auto relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 overflow-hidden rounded-2xl border p-3.5 shadow-[0_18px_50px_rgba(24,52,43,0.14),0_2px_10px_rgba(24,52,43,0.06)] backdrop-blur-sm ${meta.card} ${animationClass}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <span
        aria-hidden="true"
        className={`flex size-9 items-center justify-center rounded-xl ${meta.iconSurface}`}
      >
        {meta.icon}
      </span>

      <span className="min-w-0 pt-0.5">
        <span className="block text-[13px] font-semibold leading-4 tracking-[-0.01em] text-[#34443d]">
          {meta.title}
        </span>
        <span className="mt-1 block text-sm font-normal leading-5 text-[#616b66]">
          {toast.message}
        </span>
      </span>

      <button
        type="button"
        aria-label="Cerrar notificación"
        title="Cerrar"
        className="-mr-1 -mt-1 flex size-8 items-center justify-center rounded-full text-[#79817d] transition-colors hover:bg-black/5 hover:text-[#34443d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={() => beginExit(toast.id)}
      >
        <X className="size-4" aria-hidden="true" />
      </button>

      {toast.state !== "exiting" ? (
        <span
          aria-hidden="true"
          className={`toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-70 ${meta.progress}`}
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      ) : null}
    </div>
  );
}
