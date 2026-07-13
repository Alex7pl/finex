import { useSyncExternalStore } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  state: "entering" | "visible" | "exiting";
}

interface NotificationStore {
  items: ToastItem[];
  subscribers: Set<() => void>;
  timers: Map<string, ReturnType<typeof setTimeout>>;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

const MAX_VISIBLE = 3;
const EXIT_DURATION = 180;

const store: NotificationStore = {
  items: [],
  subscribers: new Set(),
  timers: new Map(),
};

const SERVER_SNAPSHOT: readonly ToastItem[] = Object.freeze([]);

function emit(): void {
  for (const cb of store.subscribers) {
    cb();
  }
}

function subscribe(callback: () => void): () => void {
  store.subscribers.add(callback);
  return () => {
    store.subscribers.delete(callback);
  };
}

function getSnapshot(): ToastItem[] {
  return store.items;
}

export function getServerSnapshot(): ToastItem[] {
  return SERVER_SNAPSHOT as ToastItem[];
}

export function beginExit(id: string): void {
  const item = store.items.find((candidate) => candidate.id === id);
  if (!item || item.state === "exiting") return;

  const existing = store.timers.get(id);
  if (existing !== undefined) {
    clearTimeout(existing);
    store.timers.delete(id);
  }

  store.items = store.items.map((candidate) =>
    candidate.id === id ? { ...candidate, state: "exiting" } : candidate,
  );
  emit();

  // Animation events are presentation details and are not guaranteed to fire
  // (for example when the tab is backgrounded). Always remove as a fallback.
  const removalTimer = setTimeout(() => {
    remove(id);
  }, EXIT_DURATION);
  store.timers.set(id, removalTimer);
}

export function markVisible(id: string): void {
  const item = store.items.find((i) => i.id === id);
  if (!item || item.state !== "entering") return;

  store.items = store.items.map((candidate) =>
    candidate.id === id ? { ...candidate, state: "visible" } : candidate,
  );
  emit();
}

export function remove(id: string): void {
  const existing = store.timers.get(id);
  if (existing !== undefined) {
    clearTimeout(existing);
    store.timers.delete(id);
  }
  store.items = store.items.filter((i) => i.id !== id);
  emit();
}

export function notify(
  message: string,
  options?: { type?: ToastType; duration?: number },
): string {
  const type: ToastType = options?.type ?? "info";
  const requestedDuration = options?.duration ?? DEFAULT_DURATIONS[type];
  const duration = Number.isFinite(requestedDuration)
    ? Math.max(0, requestedDuration)
    : DEFAULT_DURATIONS[type];
  const id = crypto.randomUUID();

  const activeItems = store.items.filter((item) => item.state !== "exiting");
  if (activeItems.length >= MAX_VISIBLE) {
    const oldest = activeItems[activeItems.length - 1];
    if (oldest) {
      beginExit(oldest.id);
    }
  }

  // Prepend so newest is at index 0
  store.items = [{ id, message, type, duration, state: "entering" }, ...store.items];

  // Start the lifetime as soon as the toast enters the store. Its behaviour
  // must never depend on a CSS animation completing.
  const dismissTimer = setTimeout(() => {
    beginExit(id);
  }, duration);
  store.timers.set(id, dismissTimer);

  emit();
  return id;
}

notify.success = (message: string, duration?: number): string =>
  notify(message, { type: "success", duration: duration ?? DEFAULT_DURATIONS.success });

notify.error = (message: string, duration?: number): string =>
  notify(message, { type: "error", duration: duration ?? DEFAULT_DURATIONS.error });

notify.info = (message: string, duration?: number): string =>
  notify(message, { type: "info", duration: duration ?? DEFAULT_DURATIONS.info });

notify.warning = (message: string, duration?: number): string =>
  notify(message, { type: "warning", duration: duration ?? DEFAULT_DURATIONS.warning });

export function useNotifications(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Exposed for testing — resets the store to a clean state. */
export function _resetStore(): void {
  for (const timer of store.timers.values()) {
    clearTimeout(timer);
  }
  store.timers.clear();
  store.items = [];
  store.subscribers.clear();
}

/** Exposed for testing — returns a snapshot of current items. */
export function _getItems(): ToastItem[] {
  return [...store.items];
}
