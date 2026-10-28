import { useEffect, useRef, useId, type ReactNode } from "react";

export function DashboardDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[90vh] w-[min(92vw,560px)] overflow-y-auto border border-border bg-ivory-soft p-7 text-ink shadow-xl backdrop:bg-night/50"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id={titleId} className="font-serif text-3xl">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="action-secondary grid size-10 place-items-center"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
