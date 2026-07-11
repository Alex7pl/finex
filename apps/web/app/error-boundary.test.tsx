import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { data } from "react-router";
import { ErrorBoundary } from "./error-boundary.js";

function render(error: unknown) {
  return renderToStaticMarkup(<ErrorBoundary error={error} />);
}

test("renders a generic 404 without exposing route error details", () => {
  const html = render({
    status: 404,
    statusText: "private route detail",
    internal: false,
    data: { requestId: "request-404", code: "UserNotFound" },
  });

  assert.match(html, />404</);
  assert.match(html, /The requested page could not be found/);
  assert.match(html, /Request ID: request-404/);
  assert.doesNotMatch(html, /private route detail|UserNotFound/);
});

test("renders transformed 5xx route data with a stable public message", () => {
  const transformed = data(
    {
      requestId: "request-500",
      code: "InternalDatabaseError",
      detail: "db host",
    },
    { status: 500, statusText: "private upstream detail" },
  );
  const html = render({
    status: transformed.init?.status ?? 500,
    statusText: transformed.init?.statusText ?? "",
    internal: false,
    data: transformed.data,
  });

  assert.match(html, /Something went wrong/);
  assert.match(html, /The service is temporarily unavailable/);
  assert.match(html, /Request ID: request-500/);
  assert.doesNotMatch(
    html,
    /private upstream detail|InternalDatabaseError|db host/,
  );
});
