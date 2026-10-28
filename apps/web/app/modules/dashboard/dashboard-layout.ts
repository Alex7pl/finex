export const dashboardWidgetIds = [
  "balance",
  "cash-flow",
  "budgets",
  "accounts",
  "transactions",
  "goal",
] as const;

export type DashboardWidgetId = (typeof dashboardWidgetIds)[number];
export type DashboardWidgetSize = "standard" | "wide" | "full";
export type DashboardWidgetSizes = Record<
  DashboardWidgetId,
  DashboardWidgetSize
>;

export interface DashboardLayoutState {
  order: DashboardWidgetId[];
  sizes: DashboardWidgetSizes;
}

export const defaultDashboardOrder: DashboardWidgetId[] = [
  "balance",
  "cash-flow",
  "budgets",
  "accounts",
  "transactions",
  "goal",
];

export const dashboardWidgetSizeRules: Record<
  DashboardWidgetId,
  {
    defaultSize: DashboardWidgetSize;
    allowedSizes: readonly DashboardWidgetSize[];
  }
> = {
  balance: { defaultSize: "wide", allowedSizes: ["wide", "full"] },
  "cash-flow": { defaultSize: "standard", allowedSizes: ["standard", "wide"] },
  budgets: { defaultSize: "standard", allowedSizes: ["standard", "wide"] },
  accounts: { defaultSize: "standard", allowedSizes: ["standard", "wide"] },
  transactions: { defaultSize: "wide", allowedSizes: ["wide", "full"] },
  goal: { defaultSize: "standard", allowedSizes: ["standard", "wide"] },
};

export const defaultDashboardSizes = Object.fromEntries(
  dashboardWidgetIds.map((widgetId) => [
    widgetId,
    dashboardWidgetSizeRules[widgetId].defaultSize,
  ]),
) as DashboardWidgetSizes;

export const defaultDashboardLayout: DashboardLayoutState = {
  order: [...defaultDashboardOrder],
  sizes: { ...defaultDashboardSizes },
};

const widgetIdSet = new Set<string>(dashboardWidgetIds);

export function isDashboardWidgetId(
  value: unknown,
): value is DashboardWidgetId {
  return typeof value === "string" && widgetIdSet.has(value);
}

export function sanitizeWidgetOrder(value: unknown): DashboardWidgetId[] {
  if (!Array.isArray(value)) return [...defaultDashboardOrder];

  return value.reduce<DashboardWidgetId[]>((order, candidate) => {
    if (isDashboardWidgetId(candidate) && !order.includes(candidate)) {
      order.push(candidate);
    }
    return order;
  }, []);
}

export function sanitizeWidgetSizes(value: unknown): DashboardWidgetSizes {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Partial<Record<DashboardWidgetId, unknown>>)
      : {};

  return Object.fromEntries(
    dashboardWidgetIds.map((widgetId) => {
      const requestedSize = candidate[widgetId];
      const rule = dashboardWidgetSizeRules[widgetId];
      const size =
        typeof requestedSize === "string" &&
        rule.allowedSizes.includes(requestedSize as DashboardWidgetSize)
          ? requestedSize
          : rule.defaultSize;
      return [widgetId, size];
    }),
  ) as DashboardWidgetSizes;
}

export function sanitizeDashboardLayout(value: unknown): DashboardLayoutState {
  if (Array.isArray(value)) {
    return {
      order: sanitizeWidgetOrder(value),
      sizes: { ...defaultDashboardSizes },
    };
  }

  if (typeof value !== "object" || value === null) {
    return {
      order: [...defaultDashboardOrder],
      sizes: { ...defaultDashboardSizes },
    };
  }

  const candidate = value as { order?: unknown; sizes?: unknown };
  return {
    order: sanitizeWidgetOrder(candidate.order),
    sizes: sanitizeWidgetSizes(candidate.sizes),
  };
}

export function moveWidget(
  order: DashboardWidgetId[],
  widgetId: DashboardWidgetId,
  targetIndex: number,
): DashboardWidgetId[] {
  const currentIndex = order.indexOf(widgetId);
  if (currentIndex < 0 || order.length < 2) return order;

  const nextIndex = Math.max(0, Math.min(targetIndex, order.length - 1));
  if (nextIndex === currentIndex) return order;

  const nextOrder = [...order];
  nextOrder.splice(currentIndex, 1);
  nextOrder.splice(nextIndex, 0, widgetId);
  return nextOrder;
}

export function removeWidget(
  order: DashboardWidgetId[],
  widgetId: DashboardWidgetId,
): DashboardWidgetId[] {
  return order.filter((candidate) => candidate !== widgetId);
}

export function addWidget(
  order: DashboardWidgetId[],
  widgetId: DashboardWidgetId,
): DashboardWidgetId[] {
  return order.includes(widgetId) ? order : [...order, widgetId];
}

export function resizeWidget(
  sizes: DashboardWidgetSizes,
  widgetId: DashboardWidgetId,
  direction: -1 | 1,
): DashboardWidgetSizes {
  const allowedSizes = dashboardWidgetSizeRules[widgetId].allowedSizes;
  const currentIndex = allowedSizes.indexOf(sizes[widgetId]);
  const nextIndex = Math.max(
    0,
    Math.min(currentIndex + direction, allowedSizes.length - 1),
  );
  const nextSize = allowedSizes[nextIndex];
  if (!nextSize || nextSize === sizes[widgetId]) return sizes;
  return { ...sizes, [widgetId]: nextSize };
}
