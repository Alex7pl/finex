import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomePage } from "./HomePage.js";

function render(authOpen: boolean) {
  return renderToStaticMarkup(
    <HomePage
      userAuthenticated={false}
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
  assert.match(html, /src="\/landing-video\.mp4"/);
  assert.match(html, /poster="\/landing-video-poster\.jpg"/);
  assert.match(html, /aria-label="Escena pintada: una figura en la llanura sostiene el hilo de un orbe dorado"/);
  assert.match(html, /Sostén el hilo <em class="italic text-gold">de tu dinero\.<\/em>/);
  assert.match(html, /FineX usa inteligencia artificial/);
  assert.match(html, /Tres gestos, un solo hilo/);
  assert.match(html, /Todo tu dinero, en/);
  assert.ok(html.indexOf("landing-video.mp4") < html.indexOf("data-auth-slot"));
  assert.ok(html.indexOf("data-auth-slot") < html.indexOf("Sostén el hilo"));
});

test("HomePage renders the hero CTA and the word-by-word tagline", () => {
  const html = render(false);

  assert.match(html, /Crear mi cuenta/);
  assert.match(html, /Saltar al contenido/);
  assert.equal((html.match(/class="fx-word"/g) ?? []).length, 9);
  assert.match(html, /accionables\./);
});

test("HomePage preserves the auth-open visual state class", () => {
  assert.doesNotMatch(render(false), /scale-\[0\.985\] opacity-65 blur-\[1px\]/);
  assert.match(render(true), /scale-\[0\.985\] opacity-65 blur-\[1px\]/);
});
