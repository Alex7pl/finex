import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomePage } from "./HomePage.js";

function render(authOpen: boolean) {
  return renderToStaticMarkup(
    <HomePage
      authOpen={authOpen}
      authPanel={<aside data-auth-slot="true">Auth panel</aside>}
      onLogin={() => {}}
      onRegister={() => {}}
    />,
  );
}

test("HomePage preserves its static landmarks, content, assets, and auth slot order", () => {
  const html = render(false);

  assert.match(html, /<main class="min-h-screen/);
  assert.match(html, /<header class=/);
  assert.match(html, /<nav aria-label="Principal"/);
  assert.match(html, /Iniciar sesión/);
  assert.match(html, /Registrarse/);
  assert.match(html, /src="\/hero-background\.mp4"/);
  assert.match(html, /aria-label="Animación abstracta de fondo"/);
  assert.match(html, /Digitaliza tus<br\/>finanzas/);
  assert.match(html, /FineX usa inteligencia artificial/);
  assert.match(html, /Noticias/);
  assert.match(html, /Asistente IA/);
  assert.match(html, /src="\/jakub-zerdzicki-U4-I4oH4xlg-unsplash\.jpg"/);
  assert.match(html, /alt="Visualización abstracta de datos financieros"/);
  assert.ok(html.indexOf("hero-background.mp4") < html.indexOf("data-auth-slot"));
  assert.ok(html.indexOf("data-auth-slot") < html.indexOf("Digitaliza tus"));
});

test("HomePage preserves the auth-open visual state class", () => {
  assert.doesNotMatch(render(false), /scale-\[0\.985\] opacity-65 blur-\[1px\]/);
  assert.match(render(true), /scale-\[0\.985\] opacity-65 blur-\[1px\]/);
});
