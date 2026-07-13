import { useNotifications } from "@/libs/notifications.js";
import { Toast } from "./Toast.js";

export function ToastContainer() {
  const items = useNotifications();
  const visible = [...items].slice(0, 3);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col gap-2.5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[min(420px,calc(100vw-3rem))]"
    >
      {visible.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
