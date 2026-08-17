import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChartNoAxesCombined,
  Lightbulb,
  ListChecks,
  PiggyBank,
  ReceiptText,
  Target,
  WalletCards,
} from "lucide-react";
import type { DashboardWidgetId, DashboardWidgetSize } from "../dashboard-layout.js";
import { AccountsWidget } from "./AccountsWidget.js";
import { BalanceWidget } from "./BalanceWidget.js";
import { BudgetsWidget } from "./BudgetsWidget.js";
import { CashFlowWidget } from "./CashFlowWidget.js";
import { GoalWidget } from "./GoalWidget.js";
import { InsightWidget } from "./InsightWidget.js";
import { TransactionsWidget } from "./TransactionsWidget.js";

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  title: string;
  description: string;
  icon: LucideIcon;
  component: ComponentType;
}

export const dashboardWidgetSizeClassNames: Record<DashboardWidgetSize, string> = {
  standard: "xl:col-span-4",
  wide: "md:col-span-2 xl:col-span-8",
  full: "md:col-span-2 xl:col-span-12",
};

export const dashboardWidgetSizeLabels: Record<DashboardWidgetSize, string> = {
  standard: "normal",
  wide: "ancho",
  full: "completo",
};

export const dashboardWidgetRegistry: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
  balance: {
    id: "balance",
    title: "Dinero disponible",
    description: "Saldo consolidado y evolución del periodo.",
    icon: ChartNoAxesCombined,
    component: BalanceWidget,
  },
  insight: {
    id: "insight",
    title: "Insight de finex",
    description: "Una recomendación prioritaria basada en tus hábitos.",
    icon: Lightbulb,
    component: InsightWidget,
  },
  "cash-flow": {
    id: "cash-flow",
    title: "Balance del mes",
    description: "Ingresos y gastos del periodo actual.",
    icon: ListChecks,
    component: CashFlowWidget,
  },
  budgets: {
    id: "budgets",
    title: "Presupuestos",
    description: "Seguimiento de límites por categoría.",
    icon: Target,
    component: BudgetsWidget,
  },
  accounts: {
    id: "accounts",
    title: "Mis cuentas",
    description: "Saldos de las cuentas conectadas.",
    icon: WalletCards,
    component: AccountsWidget,
  },
  transactions: {
    id: "transactions",
    title: "Últimos movimientos",
    description: "Actividad reciente de todas tus cuentas.",
    icon: ReceiptText,
    component: TransactionsWidget,
  },
  goal: {
    id: "goal",
    title: "Objetivo de ahorro",
    description: "Progreso de tu próximo objetivo financiero.",
    icon: PiggyBank,
    component: GoalWidget,
  },
};
