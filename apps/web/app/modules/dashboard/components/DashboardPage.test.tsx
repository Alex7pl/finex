import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardPage } from "./DashboardPage.js";

test("DashboardPage renders the main financial overview", () => {
  const html = renderToStaticMarkup(<DashboardPage />);

  assert.match(html, /Buenos días, Ana/);
  assert.match(html, /Dinero disponible/);
  assert.match(html, /4\.892,40 €/);
  assert.match(html, /Balance de agosto/);
  assert.match(html, /Presupuestos/);
  assert.match(html, /Últimos movimientos/);
  assert.match(html, /Insight de finex/);
  assert.match(html, /Mis cuentas/);
  assert.match(html, /Fondo de emergencia/);
  assert.match(html, /Personalizar/);
  assert.match(html, /data-widget-id="balance"/);
  assert.match(html, /data-widget-size="ancho"/);
  assert.match(html, /data-widget-id="transactions"/);
  assert.equal((html.match(/data-slot="chart"/g) ?? []).length, 5);
  assert.match(html, /aria-label="Navegación principal"/);
  assert.match(html, /aria-label="Navegación móvil"/);
});
