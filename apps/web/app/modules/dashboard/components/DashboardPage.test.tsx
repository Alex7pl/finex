import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { DashboardPage } from "./DashboardPage.js";
import { dashboardFixture } from "../dashboard.fixtures.test-support.js";
import type { DashboardData } from "../dashboard.types.js";

function render(dashboard: DashboardData) {
  const router = createMemoryRouter(
    [{ path: "/dashboard", element: <DashboardPage dashboard={dashboard} /> }],
    { initialEntries: ["/dashboard"] },
  );
  try {
    return renderToStaticMarkup(<RouterProvider router={router} />);
  } finally {
    router.dispose();
  }
}
test("DashboardPage renders API data, transfer routing and real profile without example figures or insights", () => {
  const html = render(dashboardFixture);
  for (const expected of [
    "Usuario de prueba",
    "150,25 €",
    "Comida real",
    "Mi cuenta real",
    "Mi viaje real",
    "25% completado",
    "Destino real",
    "Transferencia real",
    "octubre de 2026",
    "Siguiente",
    "Abrir perfil de Usuario de prueba",
    "60,00 €",
    'data-widget-id="balance"',
  ])
    assert.ok(html.includes(expected), expected);
  for (const removed of [
    "Ana López",
    "4.892",
    "Insight de FineX",
    "Mercadona",
    "•••• 4821",
    "7 meses al ritmo actual",
  ])
    assert.ok(!html.includes(removed), removed);
  assert.ok(html.includes("transactionId="));
  assert.ok(html.includes("Filtrar por cuenta"));
});
test("empty API results display empty states and zero amounts instead of sample data", () => {
  const html = render({
    ...dashboardFixture,
    accounts: [],
    budgets: [],
    goals: [],
    transactions: { items: [], total: 0, page: 1, limit: 10, has_more: false },
    balance: {
      ...dashboardFixture.balance,
      total_balance: "0.00",
      initial_balance: "0.00",
      income: "0.00",
      expenses: "0.00",
      history: [],
    },
    monthly: {
      ...dashboardFixture.monthly,
      total_balance: "0.00",
      income: "0.00",
      expenses: "0.00",
    },
  });
  for (const text of [
    "Todavía no tienes cuentas",
    "No tienes presupuestos",
    "Aún no tienes objetivos",
    "No hay movimientos",
    "Sin ingresos ni gastos",
    "0,00 €",
  ])
    assert.ok(html.includes(text), text);
  assert.ok(!html.includes("Siguiente"));
});
