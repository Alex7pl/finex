import type { AnimationEvent, ReactNode } from "react";
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, XIcon } from "@phosphor-icons/react";
import type { ToastItem } from "@/libs/notifications.js";
import { beginExit, markVisible, remove } from "@/libs/notifications.js";

/* Avisos de El hilo: el éxito llega sobre noche con su nodo de luz; el resto, sobre marfil. */
const TYPE_META: Record<
  ToastItem["type"],
  {
    title: string;
    icon: ReactNode;
    surface: string;
    titleColor: string;
    messageColor: string;
    iconColor: string;
    progress: string;
  }
> = {
  success: {
    title: "Todo en orden",
    icon: <CheckCircleIcon size={18} weight="light" />,
    surface: "bg-primary shadow-[0_24px_48px_-24px_rgba(13,26,33,0.6)]",
    titleColor: "text-ivory",
    messageColor: "text-[#c9c0af]",
    iconColor: "text-gold",
    progress: "bg-gold shadow-[0_0_8px_rgba(221,191,138,0.9)]",
  },
  error: {
    title: "Algo no ha ido bien",
    icon: <XCircleIcon size={18} weight="light" />,
    surface: "border border-[#ddb39c] bg-[#f6e3d8]",
    titleColor: "text-[#5a2412]",
    messageColor: "text-[#5a2412]",
    iconColor: "text-danger",
    progress: "bg-danger",
  },
  info: {
    title: "Actualización",
    icon: <InfoIcon size={18} weight="light" />,
    surface: "border border-stone bg-ivory-soft shadow-[0_24px_48px_-28px_rgba(13,26,33,0.35)]",
    titleColor: "text-ink",
    messageColor: "text-ink-muted",
    iconColor: "text-petrol",
    progress: "bg-petrol",
  },
  warning: {
    title: "Tenlo en cuenta",
    icon: <WarningIcon size={18} weight="light" />,
    surface: "border border-[#dcc9a4] bg-parchment",
    titleColor: "text-ink",
    messageColor: "text-[#4a3a20]",
    iconColor: "text-gold-ink",
    progress: "bg-gold-deep",
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
      className={`pointer-events-auto relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 overflow-hidden p-3.5 ${meta.surface} ${animationClass}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <span
        aria-hidden="true"
        className={`flex size-8 items-center justify-center ${meta.iconColor}`}
      >
        {meta.icon}
      </span>

      <span className="min-w-0 pt-0.5">
        <span className={`block text-sm font-semibold ${meta.titleColor}`}>
          {meta.title}
        </span>
        <span className={`mt-1 block text-sm font-normal ${meta.messageColor}`}>
          {toast.message}
        </span>
      </span>

      <button
        type="button"
        aria-label="Cerrar notificación"
        title="Cerrar"
        className={`flex size-8 items-center justify-center opacity-70 transition-opacity duration-500 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep ${meta.titleColor}`}
        onClick={() => beginExit(toast.id)}
      >
        <XIcon size={16} aria-hidden="true" />
      </button>

      {toast.state !== "exiting" ? (
        <span
          aria-hidden="true"
          className={`toast-progress absolute inset-x-0 bottom-0 h-px origin-left ${meta.progress}`}
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      ) : null}
    </div>
  );
}
