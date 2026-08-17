import { useCallback, useEffect, useState } from "react";
import {
  addWidget,
  defaultDashboardLayout,
  moveWidget,
  removeWidget,
  resizeWidget,
  sanitizeDashboardLayout,
  type DashboardLayoutState,
  type DashboardWidgetId,
} from "../dashboard-layout.js";

const STORAGE_KEY = "finex.dashboard.widgets.v2";
const LEGACY_STORAGE_KEY = "finex.dashboard.widgets.v1";

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayoutState>(defaultDashboardLayout);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedLayout = window.localStorage.getItem(STORAGE_KEY)
        ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (savedLayout) {
        setLayout(sanitizeDashboardLayout(JSON.parse(savedLayout)));
      }
    } catch {
      setLayout({
        order: [...defaultDashboardLayout.order],
        sizes: { ...defaultDashboardLayout.sizes },
      });
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // The layout remains usable for the current session when storage is unavailable.
    }
  }, [hydrated, layout]);

  const add = useCallback((widgetId: DashboardWidgetId) => {
    setLayout((current) => ({ ...current, order: addWidget(current.order, widgetId) }));
  }, []);

  const remove = useCallback((widgetId: DashboardWidgetId) => {
    setLayout((current) => ({ ...current, order: removeWidget(current.order, widgetId) }));
  }, []);

  const move = useCallback((widgetId: DashboardWidgetId, targetIndex: number) => {
    setLayout((current) => ({ ...current, order: moveWidget(current.order, widgetId, targetIndex) }));
  }, []);

  const moveRelative = useCallback((widgetId: DashboardWidgetId, offset: -1 | 1) => {
    setLayout((current) => {
      const currentIndex = current.order.indexOf(widgetId);
      return { ...current, order: moveWidget(current.order, widgetId, currentIndex + offset) };
    });
  }, []);

  const resize = useCallback((widgetId: DashboardWidgetId, direction: -1 | 1) => {
    setLayout((current) => ({
      ...current,
      sizes: resizeWidget(current.sizes, widgetId, direction),
    }));
  }, []);

  const reset = useCallback(() => {
    setLayout({
      order: [...defaultDashboardLayout.order],
      sizes: { ...defaultDashboardLayout.sizes },
    });
  }, []);

  return {
    widgetOrder: layout.order,
    widgetSizes: layout.sizes,
    add,
    remove,
    move,
    moveRelative,
    resize,
    reset,
  };
}
